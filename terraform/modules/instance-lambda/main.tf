# Lambda function for a customer Solobase instance
# This module creates a Lambda function with Function URL for serverless deployment

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "instance_id" {
  description = "Unique instance identifier (UUID)"
  type        = string
}

variable "subdomain" {
  description = "Subdomain for the instance (e.g., 'myapp' for myapp.solobase.cloud)"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "solobase_binary_s3_bucket" {
  description = "S3 bucket containing Solobase binary"
  type        = string
}

variable "solobase_binary_s3_key" {
  description = "S3 key for Solobase binary ZIP"
  type        = string
  default     = "solobase-latest.zip"
}

variable "database_url" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "b2_bucket_name" {
  description = "Backblaze B2 bucket name"
  type        = string
}

variable "b2_endpoint" {
  description = "Backblaze B2 S3-compatible endpoint"
  type        = string
  default     = "https://s3.us-west-004.backblazeb2.com"
}

variable "b2_key_id" {
  description = "Backblaze B2 application key ID"
  type        = string
  sensitive   = true
}

variable "b2_app_key" {
  description = "Backblaze B2 application key"
  type        = string
  sensitive   = true
}

variable "memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "Additional environment variables"
  type        = map(string)
  default     = {}
}

# Generate JWT secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# IAM role for Lambda
resource "aws_iam_role" "lambda" {
  name_prefix = "solobase-instance-${substr(var.instance_id, 0, 8)}-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    InstanceID  = var.instance_id
    Subdomain   = var.subdomain
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy for accessing secrets (if storing DB credentials in Secrets Manager)
resource "aws_iam_role_policy" "secrets_access" {
  name_prefix = "secrets-access-"
  role        = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = ["arn:aws:secretsmanager:*:*:secret:solobase-instance-${substr(var.instance_id, 0, 8)}-*"]
    }]
  })
}

# Lambda function
resource "aws_lambda_function" "instance" {
  function_name = "solobase-${substr(var.instance_id, 0, 8)}"
  role          = aws_iam_role.lambda.arn

  # Use S3 for deployment package
  s3_bucket = var.solobase_binary_s3_bucket
  s3_key    = var.solobase_binary_s3_key

  # Runtime
  runtime     = "provided.al2" # Custom runtime for Go binary
  handler     = "bootstrap"    # Entry point for custom runtime
  memory_size = var.memory_size
  timeout     = var.timeout

  # Environment variables
  environment {
    variables = merge(
      {
        DATABASE_URL  = var.database_url
        S3_ENDPOINT   = var.b2_endpoint
        S3_BUCKET     = var.b2_bucket_name
        S3_REGION     = "us-west-004"
        B2_KEY_ID     = var.b2_key_id
        B2_APP_KEY    = var.b2_app_key
        JWT_SECRET    = random_password.jwt_secret.result
        PORT          = "8080"
        INSTANCE_ID   = var.instance_id
        SUBDOMAIN     = var.subdomain
      },
      var.environment_variables
    )
  }

  # Reserved concurrency (prevent runaway costs)
  reserved_concurrent_executions = 10

  tags = {
    InstanceID  = var.instance_id
    Subdomain   = var.subdomain
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Lambda Function URL (replaces API Gateway)
resource "aws_lambda_function_url" "instance" {
  function_name      = aws_lambda_function.instance.function_name
  authorization_type = "NONE" # Public access (behind CloudFront)

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allow_headers     = ["*"]
    expose_headers    = ["*"]
    max_age           = 86400
  }
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.instance.function_name}"
  retention_in_days = 7 # Adjust based on plan

  tags = {
    InstanceID  = var.instance_id
    Environment = var.environment
  }
}

# CloudWatch alarms
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${aws_lambda_function.instance.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Lambda function errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.instance.function_name
  }

  tags = {
    InstanceID = var.instance_id
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${aws_lambda_function.instance.function_name}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Lambda function throttles"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.instance.function_name
  }

  tags = {
    InstanceID = var.instance_id
  }
}

# Outputs
output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.instance.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.instance.function_name
}

output "lambda_function_url" {
  description = "Lambda Function URL"
  value       = aws_lambda_function_url.instance.function_url
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "jwt_secret" {
  description = "Generated JWT secret"
  value       = random_password.jwt_secret.result
  sensitive   = true
}
