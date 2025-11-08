-- Initial database schema for Solobase SaaS Platform
-- Management database schema (runs on its own Solobase instance)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Solobase auth system)
-- This table is automatically created by Solobase, but we define custom fields here
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles (additional user information)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    country VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL, -- 'hobby', 'starter', 'professional', 'business', 'enterprise'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing', 'paused'

    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),

    -- Billing period
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- Trial info
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id)
);

-- Plans configuration table
CREATE TABLE plans (
    id VARCHAR(50) PRIMARY KEY, -- 'hobby', 'starter', 'professional', 'business', 'enterprise'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly INTEGER NOT NULL, -- In cents (e.g., 500 = $5.00)
    price_yearly INTEGER, -- In cents (optional, for yearly billing)

    -- Quotas
    max_instances INTEGER NOT NULL,
    database_storage_gb INTEGER NOT NULL,
    file_storage_gb INTEGER NOT NULL,
    api_requests_monthly BIGINT NOT NULL, -- -1 = unlimited

    -- Features
    database_tier VARCHAR(50) NOT NULL, -- 'shared' or 'dedicated'
    compute_tier VARCHAR(50) NOT NULL, -- 'lambda' or 'ecs'
    auto_sleep BOOLEAN DEFAULT FALSE,
    custom_domain BOOLEAN DEFAULT FALSE,
    daily_backups BOOLEAN DEFAULT FALSE,
    sla_percentage DECIMAL(5,2), -- e.g., 99.9
    support_tier VARCHAR(50), -- 'community', 'email', 'priority'
    support_response_hours INTEGER, -- e.g., 24, 12, 4

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared RDS instances (for capacity management)
CREATE TABLE shared_rds_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rds_instance_id VARCHAR(255) NOT NULL UNIQUE,
    rds_endpoint VARCHAR(500) NOT NULL,
    instance_class VARCHAR(50) NOT NULL, -- 'db.t3.medium', etc.
    region VARCHAR(50) NOT NULL,

    -- Capacity
    max_databases INTEGER NOT NULL DEFAULT 150,
    current_databases INTEGER DEFAULT 0,
    storage_total_gb INTEGER NOT NULL,
    storage_used_gb INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'full', 'draining', 'offline'

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_health_check TIMESTAMP
);

-- Customer instances table
CREATE TABLE instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Instance details
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'myapp' for myapp.solobase.cloud
    custom_domain VARCHAR(255), -- e.g., 'admin.myapp.com'
    status VARCHAR(50) NOT NULL DEFAULT 'provisioning', -- 'provisioning', 'running', 'stopped', 'error', 'deleted'

    -- Infrastructure tier
    compute_tier VARCHAR(50) NOT NULL, -- 'lambda', 'ecs'
    database_tier VARCHAR(50) NOT NULL, -- 'shared', 'dedicated'

    -- Database configuration (SHARED tier)
    shared_rds_id UUID REFERENCES shared_rds_instances(id),
    database_name VARCHAR(255),
    database_user VARCHAR(255),
    database_password_secret VARCHAR(500), -- AWS Secrets Manager ARN or encrypted password

    -- Database configuration (DEDICATED tier)
    rds_instance_id VARCHAR(255),
    rds_endpoint VARCHAR(500),

    -- Storage configuration (Backblaze B2)
    b2_bucket_name VARCHAR(255),
    b2_bucket_id VARCHAR(255),
    b2_application_key_id VARCHAR(255),
    b2_application_key_secret VARCHAR(500), -- Encrypted

    -- Compute configuration
    lambda_function_arn VARCHAR(500),
    lambda_function_url VARCHAR(500),
    ecs_cluster_arn VARCHAR(500),
    ecs_service_arn VARCHAR(500),
    ecs_task_definition_arn VARCHAR(500),

    -- CloudFront / CDN
    cloudfront_distribution_id VARCHAR(255),
    cloudfront_domain VARCHAR(500),

    -- Solobase configuration
    solobase_version VARCHAR(50) DEFAULT 'latest',
    admin_email VARCHAR(255),
    environment_variables JSONB, -- Custom env variables

    -- Resource quotas (from plan)
    storage_quota_gb INTEGER,
    database_quota_gb INTEGER,
    api_requests_quota_daily INTEGER,

    -- Current usage
    storage_used_bytes BIGINT DEFAULT 0,
    database_size_bytes BIGINT DEFAULT 0,
    api_requests_today INTEGER DEFAULT 0,
    api_requests_this_month BIGINT DEFAULT 0,

    -- Health monitoring
    last_health_check TIMESTAMP,
    health_status VARCHAR(50) DEFAULT 'unknown', -- 'healthy', 'degraded', 'unhealthy', 'unknown'
    last_error TEXT,

    -- Activity tracking
    last_request_at TIMESTAMP,
    is_sleeping BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete
);

-- Instance usage tracking (for billing and analytics)
CREATE TABLE instance_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Usage metrics
    api_requests INTEGER DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    database_bytes BIGINT DEFAULT 0,
    compute_hours DECIMAL(10,2) DEFAULT 0,
    bandwidth_bytes BIGINT DEFAULT 0,

    -- Costs (in cents)
    compute_cost INTEGER DEFAULT 0,
    storage_cost INTEGER DEFAULT 0,
    database_cost INTEGER DEFAULT 0,
    bandwidth_cost INTEGER DEFAULT 0,
    total_cost INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(instance_id, date)
);

-- Instance logs (for debugging and monitoring)
CREATE TABLE instance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,

    level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warn', 'error', 'fatal'
    message TEXT NOT NULL,
    metadata JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instance events (audit log)
CREATE TABLE instance_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    event_type VARCHAR(100) NOT NULL, -- 'created', 'started', 'stopped', 'deleted', 'updated', 'error'
    description TEXT,
    metadata JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Payment details
    amount INTEGER NOT NULL, -- In cents
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'

    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),

    -- Description
    description TEXT,
    metadata JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Invoice details
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount_due INTEGER NOT NULL, -- In cents
    amount_paid INTEGER DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'

    -- Stripe integration
    stripe_invoice_id VARCHAR(255),

    -- Billing period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE,
    paid_at TIMESTAMP,

    -- PDF
    invoice_pdf_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backups
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,

    -- Backup details
    backup_type VARCHAR(50) NOT NULL, -- 'automatic', 'manual'
    size_bytes BIGINT,

    -- Storage location
    s3_bucket VARCHAR(255),
    s3_key VARCHAR(500),

    -- RDS snapshot (for dedicated instances)
    rds_snapshot_id VARCHAR(255),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    error_message TEXT,

    -- Retention
    expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- API tokens (for programmatic access)
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,

    -- Permissions
    scopes JSONB, -- e.g., ["instances:read", "instances:write"]

    -- Expiration
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Notification details
    type VARCHAR(100) NOT NULL, -- 'instance_created', 'quota_exceeded', 'payment_failed', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,

    -- Action link
    action_url VARCHAR(500),
    action_text VARCHAR(100),

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,

    -- Ticket details
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'waiting', 'resolved', 'closed'

    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP
);

-- Support ticket messages
CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    message TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

CREATE INDEX idx_instances_user_id ON instances(user_id);
CREATE INDEX idx_instances_status ON instances(status);
CREATE INDEX idx_instances_subdomain ON instances(subdomain);
CREATE INDEX idx_instances_shared_rds_id ON instances(shared_rds_id);

CREATE INDEX idx_instance_usage_instance_id ON instance_usage(instance_id);
CREATE INDEX idx_instance_usage_date ON instance_usage(date);

CREATE INDEX idx_instance_logs_instance_id ON instance_logs(instance_id);
CREATE INDEX idx_instance_logs_level ON instance_logs(level);
CREATE INDEX idx_instance_logs_created_at ON instance_logs(created_at);

CREATE INDEX idx_instance_events_instance_id ON instance_events(instance_id);
CREATE INDEX idx_instance_events_created_at ON instance_events(created_at);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE INDEX idx_backups_instance_id ON backups(instance_id);
CREATE INDEX idx_backups_created_at ON backups(created_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
