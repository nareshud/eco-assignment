/**
 * Jenkins Declarative Pipeline — SCM “Pipeline script from SCM” + Build Now.
 *
 * AWS auth: attach an IAM instance profile (or equivalent) to the Jenkins agent / server.
 * Terraform, AWS CLI, and Helm then use the default credential chain — no access keys in Jenkins.
 *
 * Prerequisites on the agent: git, terraform (>= 1.3), docker, aws CLI v2, helm v3, kubectl.
 * IAM permissions: Terraform state (S3/DynamoDB), EKS, ECR, EC2/VPC as required by terraform/aws-eks.
 *
 * Jenkins: New Item → Pipeline → Definition: Pipeline script from SCM → point at this repo + branch → Build Now.
 */

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'AWS_REGION', defaultValue: 'ap-south-1', description: 'AWS region for Terraform, ECR, and EKS')
    string(name: 'ECR_REPOSITORY', defaultValue: 'eco-web', description: 'ECR repository name (created if it does not exist)')
    string(name: 'HELM_RELEASE', defaultValue: 'eco-web', description: 'Helm release name')
    string(name: 'HELM_NAMESPACE', defaultValue: 'eco', description: 'Kubernetes namespace for Helm')
    string(
      name: 'TERRAFORM_BACKEND_FILE',
      defaultValue: 'terraformbackend.conf',
      description: 'Backend config file name inside terraform/aws-eks (terraform init -backend-config=file). Clear only if init works without it.'
    )
    string(
      name: 'INGRESS_HOST',
      defaultValue: 'eco-app.local',
      description: 'Hostname in the app Ingress (open http://INGRESS_HOST in a browser; map this name in /etc/hosts to the ingress-nginx LoadBalancer DNS in AWS).'
    )
  }

  environment {
    AWS_DEFAULT_REGION = "${params.AWS_REGION}"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    APP_DIR = 'apps/eco-web'
    TF_DIR = 'terraform/aws-eks'
    HELM_CHART = 'charts/eco-web'
    ECR_REPOSITORY = "${params.ECR_REPOSITORY}"
    HELM_RELEASE = "${params.HELM_RELEASE}"
    HELM_NAMESPACE = "${params.HELM_NAMESPACE}"
    TERRAFORM_BACKEND_FILE = "${params.TERRAFORM_BACKEND_FILE}"
    INGRESS_HOST = "${params.INGRESS_HOST}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Terraform (provision infra)') {
      steps {
        dir(env.TF_DIR) {
          sh '''
            set -eu
            if [ -n "${TERRAFORM_BACKEND_FILE}" ] && [ -f "${TERRAFORM_BACKEND_FILE}" ]; then
              terraform init -input=false -backend-config="${TERRAFORM_BACKEND_FILE}"
            else
              echo "TERRAFORM_BACKEND_FILE missing or file not found; running: terraform init -input=false"
              terraform init -input=false
            fi
            terraform validate
            terraform plan -out=tfplan
            terraform apply -input=false -auto-approve tfplan
          '''
        }
      }
    }

    stage('Docker build (application image)') {
      steps {
        dir(env.APP_DIR) {
          sh '''
            set -eu
            docker build -t "eco-web:${IMAGE_TAG}" .
          '''
        }
      }
    }

    stage('Push image to ECR') {
      steps {
        sh '''
          set -eu
          ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
          ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
          echo "Using ECR registry: ${ECR_REGISTRY}"

          if ! aws ecr describe-repositories --repository-names "${ECR_REPOSITORY}" >/dev/null 2>&1; then
            aws ecr create-repository \
              --repository-name "${ECR_REPOSITORY}" \
              --image-scanning-configuration scanOnPush=true
          fi

          aws ecr get-login-password --region "${AWS_DEFAULT_REGION}" \
            | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

          docker tag "eco-web:${IMAGE_TAG}" "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
          docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
        '''
      }
    }

    stage('Helm deploy to EKS') {
      steps {
        dir(env.TF_DIR) {
          sh '''
            set -eu
            CLUSTER_NAME="$(terraform output -raw cluster_name)"
            echo "Configuring kubectl for cluster: ${CLUSTER_NAME}"
            aws eks update-kubeconfig --region "${AWS_DEFAULT_REGION}" --name "${CLUSTER_NAME}"
          '''
        }
        sh '''
          set -eu
          # ingress-nginx: public LoadBalancer (see charts/values-ingress-nginx-aws.yaml) + IngressClass nginx.
          helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
          helm repo update
          helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
            --namespace ingress-nginx \
            --create-namespace \
            -f "${WORKSPACE}/charts/values-ingress-nginx-aws.yaml" \
            --wait --timeout 15m
        '''
        sh '''
          set -eu
          ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
          ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
          helm upgrade --install "${HELM_RELEASE}" "${HELM_CHART}" \
            --namespace "${HELM_NAMESPACE}" \
            --create-namespace \
            --set "image.repository=${ECR_REGISTRY}/${ECR_REPOSITORY}" \
            --set "image.tag=${IMAGE_TAG}" \
            --set image.pullPolicy=Always \
            --set service.type=ClusterIP \
            --set ingress.enabled=true \
            --set ingress.className=nginx \
            --set "ingress.host=${INGRESS_HOST}" \
            --atomic \
            --wait \
            --timeout 15m
        '''
      }
    }
  }

  post {
    failure {
      echo 'Pipeline failed — check Terraform state locks, IAM role permissions, and EKS API access from the Jenkins agent.'
    }
    success {
      echo "See charts/values-ingress-nginx-aws.yaml and INGRESS_HOST: get ELB with kubectl get svc -n ingress-nginx; on your *laptop* add /etc/hosts or a public DNS CNAME to that address, then open http://${env.INGRESS_HOST}/"
    }
  }
}
