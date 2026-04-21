module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  cluster_endpoint_public_access  = var.cluster_endpoint_public_access
  cluster_endpoint_private_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  create_iam_role = false
  iam_role_arn    = aws_iam_role.eks_cluster.arn

  enable_cluster_creator_admin_permissions = true

  enable_irsa = true

  eks_managed_node_groups = {
    default = {
      name = "${var.project_name}-ng"

      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      subnet_ids = module.vpc.private_subnets

      create_iam_role = false
      iam_role_arn    = aws_iam_role.eks_node.arn

      labels = {
        role = "general"
      }

      tags = { Project = var.project_name }
    }
  }

  tags = { Project = var.project_name }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_cluster_vpc_controller,
    module.vpc
  ]
}
