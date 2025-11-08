-- Seed data for plans table
-- Pricing plans for Solobase SaaS Platform

INSERT INTO plans (
    id, name, description, price_monthly, price_yearly,
    max_instances, database_storage_gb, file_storage_gb, api_requests_monthly,
    database_tier, compute_tier, auto_sleep, custom_domain, daily_backups,
    sla_percentage, support_tier, support_response_hours
) VALUES
(
    'hobby',
    'Hobby',
    'Perfect for side projects and experimentation',
    500, -- $5.00/month
    5000, -- $50.00/year (2 months free)
    1, -- 1 instance
    1, -- 500MB database (will enforce 0.5GB in code)
    2, -- 2GB storage
    1000000, -- 1M API requests/month
    'shared',
    'lambda',
    TRUE, -- auto-sleep after 15 min
    FALSE, -- no custom domain
    FALSE, -- no daily backups
    NULL, -- no SLA
    'community',
    NULL
),
(
    'starter',
    'Starter',
    'For small projects and MVPs',
    1500, -- $15.00/month
    15000, -- $150.00/year (2 months free)
    1, -- 1 instance
    5, -- 5GB database
    10, -- 10GB storage
    10000000, -- 10M API requests/month
    'shared',
    'lambda',
    FALSE, -- always-on
    FALSE, -- no custom domain
    FALSE, -- no daily backups
    NULL, -- no SLA
    'email',
    48 -- 48-hour response time
),
(
    'professional',
    'Professional',
    'For growing startups and production apps',
    7900, -- $79.00/month
    79000, -- $790.00/year (2 months free)
    3, -- 3 instances
    20, -- 20GB database (total across instances)
    50, -- 50GB storage
    100000000, -- 100M API requests/month
    'shared',
    'ecs', -- ECS for better performance
    FALSE, -- always-on
    TRUE, -- custom domain support
    TRUE, -- daily backups
    99.9, -- 99.9% SLA
    'email',
    24 -- 24-hour response time
),
(
    'business',
    'Business',
    'For established businesses at scale',
    19900, -- $199.00/month
    199000, -- $1,990.00/year (2 months free)
    10, -- 10 instances
    100, -- 100GB dedicated database
    200, -- 200GB storage
    -1, -- unlimited API requests
    'dedicated',
    'ecs',
    FALSE, -- always-on
    TRUE, -- custom domain support
    TRUE, -- real-time backups
    99.9, -- 99.9% SLA
    'priority',
    12 -- 12-hour response time
),
(
    'enterprise',
    'Enterprise',
    'Custom solutions for large organizations',
    49900, -- $499.00/month (starting price, customizable)
    NULL, -- Custom yearly pricing
    -1, -- unlimited instances
    -1, -- unlimited database
    -1, -- unlimited storage
    -1, -- unlimited API requests
    'dedicated',
    'ecs',
    FALSE, -- always-on
    TRUE, -- custom domain support
    TRUE, -- real-time backups
    99.99, -- 99.99% SLA
    'white-glove',
    4 -- 4-hour response time
);
