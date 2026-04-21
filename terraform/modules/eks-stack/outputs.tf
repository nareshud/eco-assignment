output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnets
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}

output "nat_gateway_public_ips" {
  value = module.vpc.nat_public_ips
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  value     = module.eks.cluster_certificate_authority_data
  sensitive = true
}

output "configure_kubectl" {
  description = "Run locally after apply"
  value       = "aws eks update-kubeconfig --region ${data.aws_region.current.name} --name ${module.eks.cluster_name}"
}

output "cluster_iam_role_arn" {
  value = aws_iam_role.eks_cluster.arn
}

output "node_iam_role_arn" {
  value = aws_iam_role.eks_node.arn
}
