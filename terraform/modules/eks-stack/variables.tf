variable "project_name" {
  description = "Prefix for resource names"
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the control plane (must be a version EKS still offers AMIs for)"
  type        = string
  default     = "1.34"
}

variable "vpc_cidr" {
  description = "VPC IPv4 CIDR"
  type        = string
  default     = "10.0.0.0/16"
}

variable "node_instance_types" {
  description = "EC2 instance types for the managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 1
}

variable "node_max_size" {
  type    = number
  default = 4
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway (cheaper) vs one per AZ (HA)"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access" {
  description = "If false, API is reachable only from within the VPC (needs VPN/Direct Connect for kubectl from laptop)."
  type        = bool
  default     = true
}

variable "availability_zone_count" {
  description = "Number of AZs to spread public/private subnets across (min 2 for EKS)"
  type        = number
  default     = 2
}
