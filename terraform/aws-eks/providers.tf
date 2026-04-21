provider "aws" {
  region = var.aws_region

  # Prefer omitting keys and using env vars:
  #   export AWS_ACCESS_KEY_ID=...
  #   export AWS_SECRET_ACCESS_KEY=...
  # Or use `aws_profile` instead of static keys.
  access_key = var.aws_access_key_id != "" ? var.aws_access_key_id : null
  secret_key = var.aws_secret_access_key != "" ? var.aws_secret_access_key : null
  profile    = var.aws_profile != "" ? var.aws_profile : null
}
