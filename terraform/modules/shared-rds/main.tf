# Shared RDS PostgreSQL instance for customer instances
# This module creates a shared RDS instance that hosts multiple customer databases

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "instance_identifier" {
  description = "RDS instance identifier"
  type        = string
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum storage for autoscaling"
  type        = number
  default     = 500
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for RDS subnet group"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access RDS"
  type        = list(string)
  default     = []
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "solobase-shared-rds-${var.environment}-"
  description = "Security group for shared RDS instance"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "PostgreSQL access from allowed networks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "solobase-shared-rds-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# DB subnet group
resource "aws_db_subnet_group" "main" {
  name_prefix = "solobase-shared-rds-${var.environment}-"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "solobase-shared-rds-${var.environment}"
    Environment = var.environment
  }
}

# Generate random master password
resource "random_password" "master_password" {
  length  = 32
  special = true
}

# Store master password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_master_password" {
  name_prefix = "solobase-rds-master-${var.environment}-"
  description = "Master password for shared RDS instance"

  tags = {
    Environment = var.environment
    Purpose     = "RDS Master Password"
  }
}

resource "aws_secretsmanager_secret_version" "rds_master_password" {
  secret_id = aws_secretsmanager_secret.rds_master_password.id
  secret_string = jsonencode({
    username = "solobase_master"
    password = random_password.master_password.result
    engine   = "postgres"
    host     = aws_db_instance.shared_rds.endpoint
    port     = 5432
  })
}

# RDS PostgreSQL instance
resource "aws_db_instance" "shared_rds" {
  identifier     = var.instance_identifier
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.instance_class

  # Storage
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # Credentials
  username = "solobase_master"
  password = random_password.master_password.result

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  copy_tags_to_snapshot   = true
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.instance_identifier}-final-snapshot" : null

  # High availability (disabled for cost savings in dev)
  multi_az = var.environment == "prod"

  # Performance
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn

  # Parameters
  parameter_group_name = aws_db_parameter_group.main.name

  tags = {
    Name        = var.instance_identifier
    Environment = var.environment
    Purpose     = "Shared customer databases"
    ManagedBy   = "terraform"
  }
}

# Parameter group for PostgreSQL tuning
resource "aws_db_parameter_group" "main" {
  name_prefix = "solobase-shared-${var.environment}-"
  family      = "postgres15"
  description = "Parameter group for shared RDS instance"

  # Connection pooling settings
  parameter {
    name  = "max_connections"
    value = "300" # Support ~150 databases with 2 connections each
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}" # 25% of memory
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/2048}" # 50% of memory
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288" # 512MB
  }

  parameter {
    name  = "work_mem"
    value = "16384" # 16MB
  }

  # Logging
  parameter {
    name  = "log_statement"
    value = "ddl" # Log DDL statements
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries > 1 second
  }

  tags = {
    Name        = "solobase-shared-${var.environment}"
    Environment = var.environment
  }
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name_prefix = "solobase-rds-monitoring-${var.environment}-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "solobase-rds-monitoring-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch alarms
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${var.instance_identifier}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [] # TODO: Add SNS topic for alerts

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.shared_rds.id
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${var.instance_identifier}-database-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "250" # 80% of max_connections
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = [] # TODO: Add SNS topic for alerts

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.shared_rds.id
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "free_storage_space" {
  alarm_name          = "${var.instance_identifier}-free-storage-space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240" # 10 GB
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = [] # TODO: Add SNS topic for alerts

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.shared_rds.id
  }

  tags = {
    Environment = var.environment
  }
}

# Outputs
output "rds_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.shared_rds.id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.shared_rds.endpoint
}

output "rds_address" {
  description = "RDS instance address"
  value       = aws_db_instance.shared_rds.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.shared_rds.port
}

output "master_username" {
  description = "RDS master username"
  value       = aws_db_instance.shared_rds.username
  sensitive   = true
}

output "master_password_secret_arn" {
  description = "ARN of secret containing master password"
  value       = aws_secretsmanager_secret.rds_master_password.arn
}

output "security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}
