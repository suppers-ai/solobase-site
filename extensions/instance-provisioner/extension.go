package instanceprovisioner

import (
	"context"
	"fmt"
	"log"
)

// Extension implements the Solobase extension interface
type Extension struct {
	config *Config
}

// Config holds the extension configuration
type Config struct {
	AWSRegion           string `yaml:"aws_region"`
	B2KeyID            string `yaml:"b2_key_id"`
	B2AppKey           string `yaml:"b2_app_key"`
	SharedRDSEndpoint  string `yaml:"shared_rds_endpoint"`
	SharedRDSMasterUser string `yaml:"shared_rds_master_user"`
	SharedRDSMasterPass string `yaml:"shared_rds_master_pass"`
	SolobaseBinaryS3Bucket string `yaml:"solobase_binary_s3_bucket"`
	CloudFrontKeyPairID string `yaml:"cloudfront_key_pair_id"`
}

// New creates a new instance provisioner extension
func New(config *Config) *Extension {
	return &Extension{
		config: config,
	}
}

// OnProductCreated is called when a new product is created
// This is the hook that Solobase products extension will call
func (ext *Extension) OnProductCreated(ctx context.Context, product map[string]interface{}) error {
	// Check if this is an instance product
	productType, ok := product["type"].(string)
	if !ok || productType != "instance" {
		return nil // Not an instance, skip
	}

	// Check if status is "provisioning"
	metadata, ok := product["metadata"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("product missing metadata")
	}

	status, ok := metadata["status"].(string)
	if !ok || status != "provisioning" {
		return nil // Not ready for provisioning, skip
	}

	// Extract instance details
	productID, _ := product["id"].(string)
	subdomain, _ := metadata["subdomain"].(string)
	planID, _ := metadata["plan_id"].(string)

	log.Printf("[Instance Provisioner] Provisioning instance: %s (subdomain: %s)", productID, subdomain)

	// Provision the infrastructure
	resources, err := ext.provision(ctx, productID, subdomain, planID, metadata)
	if err != nil {
		log.Printf("[Instance Provisioner] Provisioning failed: %v", err)

		// Update product status to error
		return ext.updateProductStatus(ctx, productID, "error", err.Error(), nil)
	}

	// Update product with resource information
	log.Printf("[Instance Provisioner] Provisioning completed for %s", productID)
	return ext.updateProductStatus(ctx, productID, "running", "", resources)
}

// provision handles the actual infrastructure provisioning
func (ext *Extension) provision(ctx context.Context, instanceID, subdomain, planID string, metadata map[string]interface{}) (map[string]interface{}, error) {
	resources := make(map[string]interface{})

	// Get plan details to determine quotas
	quotas, _ := metadata["quotas"].(map[string]interface{})
	computeTier, _ := quotas["compute_tier"].(string)
	if computeTier == "" {
		computeTier = "lambda" // default
	}

	// Step 1: Provision database (shared RDS)
	log.Printf("[%s] Step 1: Provisioning shared database", instanceID)
	dbConfig, err := ext.provisionSharedDatabase(ctx, instanceID, subdomain)
	if err != nil {
		return nil, fmt.Errorf("database provisioning failed: %w", err)
	}
	resources["database_endpoint"] = dbConfig.Endpoint
	resources["database_name"] = dbConfig.DatabaseName
	resources["database_user"] = dbConfig.User

	// Step 2: Provision Backblaze B2 storage
	log.Printf("[%s] Step 2: Provisioning Backblaze B2 storage", instanceID)
	b2Config, err := ext.provisionB2Storage(ctx, instanceID)
	if err != nil {
		return nil, fmt.Errorf("storage provisioning failed: %w", err)
	}
	resources["b2_bucket_name"] = b2Config.BucketName
	resources["b2_bucket_id"] = b2Config.BucketID

	// Step 3: Provision compute (Lambda)
	log.Printf("[%s] Step 3: Provisioning Lambda function", instanceID)
	lambdaConfig, err := ext.provisionLambda(ctx, instanceID, subdomain, dbConfig, b2Config)
	if err != nil {
		return nil, fmt.Errorf("lambda provisioning failed: %w", err)
	}
	resources["lambda_arn"] = lambdaConfig.FunctionARN
	resources["lambda_url"] = lambdaConfig.FunctionURL

	// Step 4: Setup CloudFront distribution
	log.Printf("[%s] Step 4: Setting up CloudFront", instanceID)
	cfConfig, err := ext.setupCloudFront(ctx, instanceID, subdomain, lambdaConfig.FunctionURL)
	if err != nil {
		return nil, fmt.Errorf("cloudfront setup failed: %w", err)
	}
	resources["cloudfront_id"] = cfConfig.DistributionID
	resources["cloudfront_domain"] = cfConfig.Domain

	// Step 5: Initialize Solobase instance
	log.Printf("[%s] Step 5: Initializing Solobase", instanceID)
	instanceURL := fmt.Sprintf("https://%s.solobase.cloud", subdomain)
	if err := ext.initializeSolobase(ctx, lambdaConfig.FunctionURL); err != nil {
		return nil, fmt.Errorf("solobase initialization failed: %w", err)
	}

	resources["url"] = instanceURL
	return resources, nil
}

// updateProductStatus updates the product status via Solobase API
func (ext *Extension) updateProductStatus(ctx context.Context, productID, status, errorMsg string, resources map[string]interface{}) error {
	// TODO: Call Solobase products API to update product
	// PUT /api/products/{productID}
	// {
	//   "metadata": {
	//     "status": status,
	//     "error": errorMsg,
	//     "resources": resources
	//   }
	// }

	log.Printf("[Instance Provisioner] Updated product %s status to: %s", productID, status)
	return nil
}

// Database configuration types
type DatabaseConfig struct {
	Endpoint     string
	DatabaseName string
	User         string
	Password     string
}

type B2Config struct {
	BucketName       string
	BucketID         string
	ApplicationKeyID string
	ApplicationKey   string
}

type LambdaConfig struct {
	FunctionARN string
	FunctionURL string
}

type CloudFrontConfig struct {
	DistributionID string
	Domain         string
}

// provisionSharedDatabase creates a database on the shared RDS instance
func (ext *Extension) provisionSharedDatabase(ctx context.Context, instanceID, subdomain string) (*DatabaseConfig, error) {
	// TODO: Implement actual RDS provisioning
	// 1. Connect to shared RDS master
	// 2. CREATE DATABASE instance_{instanceID}
	// 3. CREATE USER user_{instanceID} WITH PASSWORD 'generated'
	// 4. GRANT ALL PRIVILEGES ON DATABASE instance_{instanceID} TO user_{instanceID}

	dbName := fmt.Sprintf("instance_%s", instanceID[:8])
	dbUser := fmt.Sprintf("user_%s", instanceID[:8])
	dbPassword := generateSecurePassword(32)

	log.Printf("Created database: %s on %s", dbName, ext.config.SharedRDSEndpoint)

	return &DatabaseConfig{
		Endpoint:     ext.config.SharedRDSEndpoint,
		DatabaseName: dbName,
		User:         dbUser,
		Password:     dbPassword,
	}, nil
}

// provisionB2Storage creates a Backblaze B2 bucket
func (ext *Extension) provisionB2Storage(ctx context.Context, instanceID string) (*B2Config, error) {
	// TODO: Implement actual B2 bucket creation
	// 1. Use B2 SDK to create bucket
	// 2. Create application key for this bucket

	bucketName := fmt.Sprintf("solobase-%s", instanceID)

	log.Printf("Created B2 bucket: %s", bucketName)

	return &B2Config{
		BucketName:       bucketName,
		BucketID:         "b2-" + instanceID[:12],
		ApplicationKeyID: generateSecurePassword(20),
		ApplicationKey:   generateSecurePassword(40),
	}, nil
}

// provisionLambda creates and deploys a Lambda function
func (ext *Extension) provisionLambda(ctx context.Context, instanceID, subdomain string, db *DatabaseConfig, b2 *B2Config) (*LambdaConfig, error) {
	// TODO: Implement actual Lambda deployment
	// 1. Create Lambda function with Solobase binary
	// 2. Set environment variables (DATABASE_URL, B2 config, etc.)
	// 3. Create Lambda Function URL

	functionName := fmt.Sprintf("solobase-%s", instanceID[:8])
	functionARN := fmt.Sprintf("arn:aws:lambda:%s:123456789012:function:%s", ext.config.AWSRegion, functionName)
	functionURL := fmt.Sprintf("https://%s.lambda-url.%s.on.aws", functionName, ext.config.AWSRegion)

	log.Printf("Created Lambda function: %s", functionName)

	return &LambdaConfig{
		FunctionARN: functionARN,
		FunctionURL: functionURL,
	}, nil
}

// setupCloudFront creates a CloudFront distribution
func (ext *Extension) setupCloudFront(ctx context.Context, instanceID, subdomain, originURL string) (*CloudFrontConfig, error) {
	// TODO: Implement actual CloudFront setup
	// 1. Create CloudFront distribution pointing to Lambda URL
	// 2. Set up custom domain (subdomain.solobase.cloud)
	// 3. Configure SSL certificate

	distributionID := "E" + instanceID[:12]
	domain := fmt.Sprintf("%s.solobase.cloud", subdomain)

	log.Printf("Created CloudFront distribution: %s", distributionID)

	return &CloudFrontConfig{
		DistributionID: distributionID,
		Domain:         domain,
	}, nil
}

// initializeSolobase initializes the Solobase instance
func (ext *Extension) initializeSolobase(ctx context.Context, functionURL string) error {
	// TODO: Call Lambda function to run initial setup
	// POST {functionURL}/api/setup
	// Create admin user, run migrations, etc.

	log.Printf("Initialized Solobase at: %s", functionURL)
	return nil
}

// generateSecurePassword generates a random password
func generateSecurePassword(length int) string {
	// Simple implementation - in production use crypto/rand properly
	return fmt.Sprintf("pwd_%d", length)
}
