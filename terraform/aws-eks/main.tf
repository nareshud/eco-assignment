module "eks_stack" {
  source = "../modules/eks-stack"

  project_name    = var.project_name
  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_cidr = var.vpc_cidr

  node_instance_types = var.node_instance_types
  node_desired_size   = var.node_desired_size
  node_min_size       = var.node_min_size
  node_max_size       = var.node_max_size

  single_nat_gateway             = var.single_nat_gateway
  cluster_endpoint_public_access = var.cluster_endpoint_public_access
  availability_zone_count        = var.availability_zone_count
}
