# Solobase SaaS Platform

A complete SaaS platform for offering managed Solobase instances to customers. This platform allows users to sign up, subscribe to a plan, and provision their own isolated Solobase instances with dedicated databases and storage.

## Overview

This project extends the Solobase marketing site to become a fully-featured SaaS platform where customers can:

- Sign up and create accounts
- Subscribe to pricing plans (Hobby, Starter, Professional, Business)
- Provision Solobase instances with one click
- Manage instances through a dashboard
- Monitor usage and costs
- Upgrade/downgrade plans
- Access billing history

## Architecture

### Technology Stack

**Frontend:**
- Hugo (static site generator)
- Tailwind CSS
- Vanilla JavaScript (dashboard interactivity)
- Future: Svelte for enhanced dashboard

**Backend:**
- Go (management API)
- Solobase (dogfooding - backend uses Solobase itself)
- PostgreSQL (management database)

**Infrastructure:**
- AWS Lambda (customer instance compute)
- AWS RDS PostgreSQL (shared database for Hobby/Starter, dedicated for Business+)
- Backblaze B2 (object storage - 93% cheaper than S3)
- AWS CloudFront (CDN + custom domains)
- Terraform (infrastructure as code)

**Payments:**
- Stripe (subscriptions, payments, invoices)

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   CUSTOMER JOURNEY                             │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────────┐
          │  1. Visit solobase.dev               │
          │  2. View pricing (/pricing/)         │
          │  3. Sign up (/dashboard/signup)      │
          │  4. Subscribe via Stripe             │
          │  5. Create instance                  │
          │  6. Wait 8-12 min for provisioning   │
          │  7. Access instance at               │
          │     https://myapp.solobase.cloud     │
          └─────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                              │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Static Site (Hugo)                                          │
│  ├─ Marketing pages (/)                                      │
│  ├─ Pricing page (/pricing/)                                │
│  ├─ Documentation (/docs/)                                   │
│  └─ Dashboard UI (/dashboard/)                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Management Backend API (Go + Solobase)                      │
│  ├─ User Authentication (JWT)                                │
│  ├─ Subscription Management (Stripe)                         │
│  ├─ Instance Provisioning Service                            │
│  ├─ Usage Tracking & Analytics                               │
│  └─ Admin Dashboard                                          │
│                                                               │
│  Database: PostgreSQL (RDS)                                  │
│  Tables: users, subscriptions, instances, usage, invoices    │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐    ┌──────────────────────────────┐
│  Shared RDS      │    │  Customer Instances          │
│  (PostgreSQL)    │    │                              │
│                  │    │  ┌────────────────────────┐  │
│  ├─ db_user1     │    │  │ Lambda + RDS + B2      │  │
│  ├─ db_user2     │    │  │ + CloudFront           │  │
│  ├─ db_user3     │    │  │                        │  │
│  └─ ... (150)    │    │  │ https://myapp          │  │
│                  │    │  │   .solobase.cloud      │  │
│  Max: 150 DBs    │    │  └────────────────────────┘  │
│  Cost: $60/mo    │    │                              │
└──────────────────┘    └──────────────────────────────┘
```

## Pricing Tiers

| Plan | Price | Instances | Database | Storage | API Requests | Compute | Features |
|------|-------|-----------|----------|---------|--------------|---------|----------|
| **Hobby** | $5/mo | 1 | 500MB (shared) | 2GB B2 | 1M/month | Lambda (auto-sleep) | Community support |
| **Starter** | $15/mo | 1 | 5GB (shared) | 10GB B2 | 10M/month | Lambda (always-on) | Email support (48h) |
| **Professional** | $79/mo | 3 | 20GB (shared) | 50GB B2 | 100M/month | ECS (always-on) | Priority support (24h) |
| **Business** | $199/mo | 10 | 100GB (dedicated) | 200GB B2 | Unlimited | ECS (dedicated) | Priority support (12h), SLA |

### Key Features by Tier

**Hobby ($5/mo):**
- Perfect for side projects
- Auto-sleep after 15 min inactivity (saves costs)
- Cold starts (1-3 seconds when waking)
- Shared database infrastructure

**Starter ($15/mo):**
- For MVPs and small apps
- Always-on (no sleep)
- Still serverless (Lambda)
- Shared database

**Professional ($79/mo):**
- Production-ready
- ECS Fargate (no cold starts)
- Custom domains
- Daily backups
- 99.9% SLA

**Business ($199/mo):**
- Dedicated database instance
- Full isolation
- Real-time backups
- Advanced monitoring

## Cost Analysis

### Infrastructure Costs per Customer Instance

**Hobby/Starter (Shared):**
- Database (shared): $0.40/month
- Storage (B2): $0.01-0.05/month
- Lambda: $0.40/month
- CloudFront: $1.00/month
- **Total: ~$2/month**

**Professional (Shared DB, ECS):**
- Database (shared): $0.40/month
- Storage (B2): $0.25/month
- ECS Fargate: $10.88/month
- CloudFront: $1.00/month
- **Total: ~$12.50/month**

**Business (Dedicated DB, ECS):**
- Dedicated RDS: $40/month
- Storage (B2): $1.00/month
- ECS Fargate: $10.88/month
- CloudFront: $1.00/month
- **Total: ~$53/month**

### Profit Margins

- **Hobby**: $5 - $2 = **$3 profit (60%)**
- **Starter**: $15 - $2 = **$13 profit (87%)**
- **Professional**: $79 - $12.50 = **$66.50 profit (84%)**
- **Business**: $199 - $53 = **$146 profit (73%)**

### Break-even Analysis

**Fixed Costs:**
- Management platform RDS: $60/month
- Management platform ECS: $50/month
- CloudWatch/monitoring: $20/month
- **Total: $130/month**

**Break-even:** 26 Hobby customers OR 9 Starter customers

**Target: 100 customers**
- Average revenue: $20/customer
- Total revenue: $2,000/month
- Total costs: ~$400/month
- **Profit: $1,600/month (80% margin)**

## Project Structure

```
solobase-site/
├── backend/
│   ├── api/
│   │   └── handlers/
│   │       ├── instances.go         # Instance CRUD operations
│   │       └── subscriptions.go     # Billing & subscriptions
│   ├── services/
│   │   └── provisioning.go          # AWS/B2 provisioning logic
│   ├── database/
│   │   ├── schema/
│   │   │   └── 001_initial_schema.sql  # Database tables
│   │   ├── seeds/
│   │   │   └── 001_plans.sql        # Pricing plans data
│   │   └── README.md                # Database documentation
│   └── .env.example                 # Environment variables
│
├── content/
│   ├── pricing/
│   │   └── _index.md                # Pricing page content
│   └── dashboard/
│       └── _index.md                # Dashboard page
│
├── themes/solobase-theme/
│   └── layouts/
│       ├── pricing/
│       │   └── single.html          # Pricing page template
│       └── dashboard/
│           └── single.html          # Dashboard UI
│
├── terraform/
│   ├── modules/
│   │   ├── shared-rds/              # Shared PostgreSQL instance
│   │   ├── instance-lambda/         # Customer Lambda instances
│   │   └── cloudfront/              # CDN distributions
│   └── README.md                    # Terraform documentation
│
├── DEPLOYMENT.md                    # Deployment guide
├── SAAS_PLATFORM_README.md          # This file
└── config.yaml                      # Hugo configuration
```

## Key Features Implemented

### ✅ Pricing Page
- 4 pricing tiers (Hobby, Starter, Professional, Business)
- Feature comparison
- FAQ section
- Links to signup

### ✅ Database Schema
- Complete schema for SaaS platform
- User accounts and authentication
- Subscriptions with Stripe integration
- Instance management
- Usage tracking
- Invoices and payments
- Support tickets
- Audit logging

### ✅ Backend API
- Instance CRUD operations
- Subscription management
- Stripe integration
- Usage metrics
- Health monitoring
- Logs retrieval

### ✅ Provisioning Service
- Automated instance provisioning
- Database creation (shared or dedicated)
- Backblaze B2 bucket creation
- Lambda deployment
- CloudFront distribution setup
- DNS configuration

### ✅ Terraform Infrastructure
- Shared RDS module (supports 100-150 instances)
- Lambda function module
- CloudWatch monitoring
- Auto-scaling
- Security groups
- IAM roles

### ✅ Dashboard UI
- Instance list view
- Create instance wizard
- Usage metrics
- Billing information
- Settings page
- Responsive design

## Next Steps for Production

### High Priority

1. **Authentication Implementation**
   - [ ] Implement JWT authentication in backend
   - [ ] Add signup/login pages
   - [ ] Session management
   - [ ] Password reset flow

2. **Stripe Integration**
   - [ ] Complete webhook handlers
   - [ ] Test subscription lifecycle
   - [ ] Invoice generation
   - [ ] Failed payment handling

3. **Provisioning Queue**
   - [ ] Implement async job queue (Redis + Bull)
   - [ ] Provisioning status updates
   - [ ] Email notifications
   - [ ] Error handling and retries

4. **Dashboard API Integration**
   - [ ] Connect dashboard to backend API
   - [ ] Real-time instance status
   - [ ] Usage metrics visualization
   - [ ] Logs viewer

### Medium Priority

5. **Monitoring & Alerts**
   - [ ] CloudWatch dashboards
   - [ ] Sentry error tracking
   - [ ] Usage alerts
   - [ ] Cost alerts

6. **Customer Onboarding**
   - [ ] Welcome email sequence
   - [ ] Onboarding checklist
   - [ ] Getting started guide
   - [ ] Video tutorials

7. **Admin Dashboard**
   - [ ] View all instances
   - [ ] User management
   - [ ] Revenue analytics
   - [ ] Support ticket system

### Low Priority

8. **Advanced Features**
   - [ ] Custom domains (CNAME setup)
   - [ ] Automated backups
   - [ ] Backup restoration UI
   - [ ] Instance cloning
   - [ ] Environment variables management
   - [ ] Team collaboration (multiple users per subscription)

9. **Optimizations**
   - [ ] Lambda cold start optimization
   - [ ] Database query optimization
   - [ ] CDN caching strategy
   - [ ] Image optimization

10. **Compliance**
    - [ ] GDPR compliance
    - [ ] SOC 2 certification
    - [ ] Privacy policy
    - [ ] Terms of service
    - [ ] Cookie consent

## Development Setup

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+
- Hugo 0.120+

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/suppers-ai/solobase-site.git
cd solobase-site

# 2. Set up database
createdb solobase_saas_dev
psql solobase_saas_dev -f backend/database/schema/001_initial_schema.sql
psql solobase_saas_dev -f backend/database/seeds/001_plans.sql

# 3. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 4. Run backend (in one terminal)
cd backend
go run cmd/main.go

# 5. Run Hugo site (in another terminal)
hugo server -D

# 6. Visit
# - Site: http://localhost:1313
# - API: http://localhost:3000
```

## Testing

### Unit Tests
```bash
cd backend
go test ./...
```

### Integration Tests
```bash
go test -tags=integration ./tests/integration
```

### Load Testing
```bash
k6 run tests/load/instance-creation.js
```

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [Database Schema](./backend/database/README.md) - Database documentation
- [Terraform Modules](./terraform/README.md) - Infrastructure documentation
- [API Documentation](./backend/API.md) - API reference (TODO)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is part of the Solobase ecosystem.

## Support

- Documentation: https://docs.solobase.dev
- Discord: https://discord.gg/jKqMcbrVzm
- Email: support@solobase.dev
- GitHub Issues: https://github.com/suppers-ai/solobase-site/issues

## Roadmap

### Q1 2025
- [ ] Launch Beta (Hobby + Starter plans)
- [ ] 100 beta users
- [ ] Stripe billing fully automated
- [ ] Basic monitoring

### Q2 2025
- [ ] Launch Professional plan
- [ ] Custom domains
- [ ] Team collaboration
- [ ] Advanced analytics

### Q3 2025
- [ ] Launch Business plan
- [ ] Dedicated database option
- [ ] SOC 2 certification
- [ ] Enterprise plan

### Q4 2025
- [ ] 1,000 paying customers
- [ ] Multi-region support
- [ ] Advanced security features
- [ ] Partner program

## Metrics to Track

**Growth Metrics:**
- Total signups
- Active subscriptions by plan
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- Churn rate

**Technical Metrics:**
- Instance provisioning success rate
- Average provisioning time
- API response times
- Lambda cold start times
- Database connection pool usage
- Uptime (target: 99.9%)

**Cost Metrics:**
- AWS costs per customer
- Profit margin by plan
- Infrastructure efficiency
- Support cost per customer

---

Built with ❤️ by the Solobase team
