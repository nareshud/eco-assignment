# EKS control plane, managed node group, core add-ons, IRSA — native resources (no public modules).
locals {
  # AL2 (AL2_x86_64) node AMIs are only for Kubernetes <= 1.32. 1.33+ requires Amazon Linux 2023.
  k8s_minor     = tonumber(split(".", var.cluster_version)[1])
  node_ami_type = local.k8s_minor <= 32 ? "AL2_x86_64" : "AL2023_x86_64_STANDARD"
}

resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.cluster_version

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = var.cluster_endpoint_public_access
  }

  tags = { Project = var.project_name }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_cluster_vpc_controller,
  ]
}

# Install Amazon VPC CNI add-on before nodes so interfaces can register cleanly.
resource "aws_eks_addon" "vpc_cni" {
  cluster_name  = aws_eks_cluster.this.name
  addon_name    = "vpc-cni"
  addon_version = data.aws_eks_addon_version.vpc_cni.version
  depends_on    = [aws_eks_cluster.this]
}

resource "aws_eks_node_group" "default" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.project_name}-ng"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = var.node_instance_types
  ami_type       = local.node_ami_type
  capacity_type  = "ON_DEMAND"

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  update_config { max_unavailable = 1 }

  labels = { role = "general" }

  tags = { Project = var.project_name }

  depends_on = [
    aws_eks_addon.vpc_cni,
    aws_iam_role_policy_attachment.eks_worker_node,
    aws_iam_role_policy_attachment.eks_cni,
    aws_iam_role_policy_attachment.eks_container_registry,
  ]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name  = aws_eks_cluster.this.name
  addon_name    = "kube-proxy"
  addon_version = data.aws_eks_addon_version.kube_proxy.version
  depends_on    = [aws_eks_node_group.default]
}

resource "aws_eks_addon" "coredns" {
  cluster_name  = aws_eks_cluster.this.name
  addon_name    = "coredns"
  addon_version = data.aws_eks_addon_version.coredns.version
  depends_on    = [aws_eks_addon.kube_proxy]
}

# Pin add-on line to requested Kubernetes version (avoids read cycles on new clusters).
data "aws_eks_addon_version" "vpc_cni" {
  addon_name         = "vpc-cni"
  kubernetes_version = var.cluster_version
  most_recent        = true
}

data "aws_eks_addon_version" "kube_proxy" {
  addon_name         = "kube-proxy"
  kubernetes_version = var.cluster_version
  most_recent        = true
}

data "aws_eks_addon_version" "coredns" {
  addon_name         = "coredns"
  kubernetes_version = var.cluster_version
  most_recent        = true
}

# IRSA: OIDC provider for the cluster (same role as "enable_irsa" in the old public module)
data "tls_certificate" "eks_oidc" {
  url = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  url             = aws_eks_cluster.this.identity[0].oidc[0].issuer
  thumbprint_list = [data.tls_certificate.eks_oidc.certificates[0].sha1_fingerprint]
  tags = {
    Name    = "${var.project_name}-eks-irsa"
    Project = var.project_name
  }
  depends_on = [aws_eks_cluster.this]
}
