output "vpc_id" {
  value = module.eks_stack.vpc_id
}

output "public_subnet_ids" {
  value = module.eks_stack.public_subnet_ids
}

output "private_subnet_ids" {
  value = module.eks_stack.private_subnet_ids
}

output "nat_gateway_public_ips" {
  value = module.eks_stack.nat_gateway_public_ips
}

output "cluster_name" {
  value = module.eks_stack.cluster_name
}

output "cluster_endpoint" {
  value = module.eks_stack.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  value     = module.eks_stack.cluster_certificate_authority_data
  sensitive = true
}

output "configure_kubectl" {
  value = module.eks_stack.configure_kubectl
}

output "cluster_iam_role_arn" {
  value = module.eks_stack.cluster_iam_role_arn
}

output "node_iam_role_arn" {
  value = module.eks_stack.node_iam_role_arn
}
