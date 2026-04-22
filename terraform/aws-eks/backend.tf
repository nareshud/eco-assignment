# Optional remote state (recommended for teams / CI).
#
# 1. Create an S3 bucket (versioning + SSE enabled) and a DynamoDB table
#    (primary key = LockID, String) for locking, in ap-south-1.
# 2. Copy this file to backend.tf (same directory as versions.tf).
# 3. Replace REPLACE_* values below.
# 4. If you already have local .tfstate: terraform init -migrate-state
#
# Terraform merges this block with versions.tf — do not duplicate required_providers here.

terraform {
  backend "s3" {}
}
