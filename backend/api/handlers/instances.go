package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Instance represents a customer Solobase instance
type Instance struct {
	ID                    uuid.UUID              `json:"id"`
	UserID                uuid.UUID              `json:"user_id"`
	Name                  string                 `json:"name"`
	Subdomain             string                 `json:"subdomain"`
	CustomDomain          *string                `json:"custom_domain,omitempty"`
	Status                string                 `json:"status"`
	ComputeTier           string                 `json:"compute_tier"`
	DatabaseTier          string                 `json:"database_tier"`
	URL                   string                 `json:"url"`
	StorageUsedBytes      int64                  `json:"storage_used_bytes"`
	DatabaseSizeBytes     int64                  `json:"database_size_bytes"`
	APIRequestsToday      int                    `json:"api_requests_today"`
	APIRequestsThisMonth  int64                  `json:"api_requests_this_month"`
	StorageQuotaGB        int                    `json:"storage_quota_gb"`
	DatabaseQuotaGB       int                    `json:"database_quota_gb"`
	APIRequestsQuotaDaily int                    `json:"api_requests_quota_daily"`
	HealthStatus          string                 `json:"health_status"`
	LastHealthCheck       *time.Time             `json:"last_health_check,omitempty"`
	LastRequestAt         *time.Time             `json:"last_request_at,omitempty"`
	IsSleeping            bool                   `json:"is_sleeping"`
	SolobaseVersion       string                 `json:"solobase_version"`
	CreatedAt             time.Time              `json:"created_at"`
	UpdatedAt             time.Time              `json:"updated_at"`
	EnvironmentVariables  map[string]interface{} `json:"environment_variables,omitempty"`
}

// CreateInstanceRequest represents the request body for creating an instance
type CreateInstanceRequest struct {
	Name                 string                 `json:"name"`
	Subdomain            string                 `json:"subdomain"`
	AdminEmail           string                 `json:"admin_email"`
	AdminPassword        string                 `json:"admin_password"`
	EnvironmentVariables map[string]interface{} `json:"environment_variables,omitempty"`
}

// InstanceMetrics represents instance usage metrics
type InstanceMetrics struct {
	InstanceID           uuid.UUID `json:"instance_id"`
	Date                 string    `json:"date"`
	APIRequests          int       `json:"api_requests"`
	StorageBytes         int64     `json:"storage_bytes"`
	DatabaseBytes        int64     `json:"database_bytes"`
	ComputeHours         float64   `json:"compute_hours"`
	BandwidthBytes       int64     `json:"bandwidth_bytes"`
	TotalCost            int       `json:"total_cost"` // In cents
}

// ListInstances returns all instances for the authenticated user
func ListInstances(w http.ResponseWriter, r *http.Request) {
	// Get user ID from auth context
	userID := getUserIDFromContext(r.Context())

	// TODO: Query database for user's instances
	// For now, return mock data
	instances := []Instance{
		{
			ID:                    uuid.New(),
			UserID:                userID,
			Name:                  "My First Instance",
			Subdomain:             "myapp",
			Status:                "running",
			ComputeTier:           "lambda",
			DatabaseTier:          "shared",
			URL:                   "https://myapp.solobase.cloud",
			StorageUsedBytes:      524288000, // 500MB
			DatabaseSizeBytes:     104857600, // 100MB
			APIRequestsToday:      1234,
			APIRequestsThisMonth:  45678,
			StorageQuotaGB:        2,
			DatabaseQuotaGB:       1,
			APIRequestsQuotaDaily: 33333, // ~1M/month
			HealthStatus:          "healthy",
			LastHealthCheck:       timePtr(time.Now().Add(-5 * time.Minute)),
			LastRequestAt:         timePtr(time.Now().Add(-2 * time.Minute)),
			IsSleeping:            false,
			SolobaseVersion:       "v0.1.0",
			CreatedAt:             time.Now().AddDate(0, 0, -7),
			UpdatedAt:             time.Now(),
		},
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"instances": instances,
		"total":     len(instances),
	})
}

// GetInstance returns a single instance by ID
func GetInstance(w http.ResponseWriter, r *http.Request) {
	// Get instance ID from URL path
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// TODO: Query database
	// Verify user owns this instance

	instance := Instance{
		ID:                    uuid.MustParse(instanceID),
		UserID:                userID,
		Name:                  "My First Instance",
		Subdomain:             "myapp",
		Status:                "running",
		ComputeTier:           "lambda",
		DatabaseTier:          "shared",
		URL:                   "https://myapp.solobase.cloud",
		StorageUsedBytes:      524288000,
		DatabaseSizeBytes:     104857600,
		APIRequestsToday:      1234,
		APIRequestsThisMonth:  45678,
		StorageQuotaGB:        2,
		DatabaseQuotaGB:       1,
		APIRequestsQuotaDaily: 33333,
		HealthStatus:          "healthy",
		LastHealthCheck:       timePtr(time.Now().Add(-5 * time.Minute)),
		LastRequestAt:         timePtr(time.Now().Add(-2 * time.Minute)),
		IsSleeping:            false,
		SolobaseVersion:       "v0.1.0",
		CreatedAt:             time.Now().AddDate(0, 0, -7),
		UpdatedAt:             time.Now(),
	}

	respondJSON(w, http.StatusOK, instance)
}

// CreateInstance provisions a new Solobase instance
func CreateInstance(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	// Parse request body
	var req CreateInstanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate request
	if req.Name == "" || req.Subdomain == "" || req.AdminEmail == "" || req.AdminPassword == "" {
		respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	// TODO: Check user's subscription plan and quota
	// TODO: Validate subdomain is available
	// TODO: Validate subdomain format (alphanumeric + hyphens only)

	// Create instance record in database
	instanceID := uuid.New()

	// TODO: Insert into database with status "provisioning"
	// TODO: Trigger async provisioning job (Lambda + RDS + B2 + CloudFront)

	instance := Instance{
		ID:              instanceID,
		UserID:          userID,
		Name:            req.Name,
		Subdomain:       req.Subdomain,
		Status:          "provisioning",
		ComputeTier:     "lambda", // Based on plan
		DatabaseTier:    "shared",
		URL:             "https://" + req.Subdomain + ".solobase.cloud",
		SolobaseVersion: "latest",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Log instance creation event
	// TODO: Insert into instance_events table

	respondJSON(w, http.StatusCreated, instance)
}

// UpdateInstance updates an instance's configuration
func UpdateInstance(w http.ResponseWriter, r *http.Request) {
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// TODO: Verify user owns this instance

	var req struct {
		Name                 *string                 `json:"name,omitempty"`
		CustomDomain         *string                 `json:"custom_domain,omitempty"`
		EnvironmentVariables *map[string]interface{} `json:"environment_variables,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// TODO: Update database
	// TODO: If env vars changed, restart instance

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Instance updated successfully",
		"instance_id": instanceID,
	})
}

// DeleteInstance soft-deletes an instance
func DeleteInstance(w http.ResponseWriter, r *http.Request) {
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// TODO: Verify user owns this instance
	// TODO: Update database with deleted_at timestamp
	// TODO: Trigger async cleanup job:
	//   - Delete Lambda function
	//   - Drop database from shared RDS (or delete dedicated RDS)
	//   - Delete B2 bucket
	//   - Delete CloudFront distribution

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Instance deletion initiated",
		"instance_id": instanceID,
	})
}

// StartInstance starts a stopped instance
func StartInstance(w http.ResponseWriter, r *http.Request) {
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// TODO: Verify user owns this instance
	// TODO: For Lambda instances, just wake from sleep
	// TODO: For ECS instances, scale service to 1

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Instance started successfully",
		"instance_id": instanceID,
	})
}

// StopInstance stops a running instance
func StopInstance(w http.ResponseWriter, r *http.Request) {
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// TODO: Verify user owns this instance
	// TODO: For ECS instances, scale service to 0
	// TODO: Lambda instances auto-sleep, so just mark as stopped

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Instance stopped successfully",
		"instance_id": instanceID,
	})
}

// RestartInstance restarts an instance
func RestartInstance(w http.ResponseWriter, r *http.Request) {
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// TODO: Verify user owns this instance
	// TODO: For Lambda, invalidate CloudFront cache and force cold start
	// TODO: For ECS, force new deployment

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Instance restart initiated",
		"instance_id": instanceID,
	})
}

// GetInstanceLogs returns recent logs for an instance
func GetInstanceLogs(w http.ResponseWriter, r *http.Request) {
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// Query parameters
	level := r.URL.Query().Get("level")    // filter by level
	limit := getIntParam(r, "limit", 100)  // default 100 logs
	offset := getIntParam(r, "offset", 0)

	// TODO: Verify user owns this instance
	// TODO: Query instance_logs table

	logs := []map[string]interface{}{
		{
			"id":         uuid.New().String(),
			"level":      "info",
			"message":    "Server started successfully",
			"created_at": time.Now().Add(-1 * time.Hour),
		},
		{
			"id":         uuid.New().String(),
			"level":      "info",
			"message":    "Database connection established",
			"created_at": time.Now().Add(-59 * time.Minute),
		},
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"logs":  logs,
		"total": len(logs),
		"limit": limit,
		"offset": offset,
	})
}

// GetInstanceMetrics returns usage metrics for an instance
func GetInstanceMetrics(w http.ResponseWriter, r *http.Request) {
	instanceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// Query parameters
	startDate := r.URL.Query().Get("start_date") // YYYY-MM-DD
	endDate := r.URL.Query().Get("end_date")     // YYYY-MM-DD

	// TODO: Verify user owns this instance
	// TODO: Query instance_usage table

	metrics := []InstanceMetrics{
		{
			InstanceID:     uuid.MustParse(instanceID),
			Date:           time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
			APIRequests:    12345,
			StorageBytes:   524288000,
			DatabaseBytes:  104857600,
			ComputeHours:   2.5,
			BandwidthBytes: 1073741824,
			TotalCost:      15, // $0.15
		},
		{
			InstanceID:     uuid.MustParse(instanceID),
			Date:           time.Now().Format("2006-01-02"),
			APIRequests:    8901,
			StorageBytes:   524288000,
			DatabaseBytes:  104857600,
			ComputeHours:   1.8,
			BandwidthBytes: 805306368,
			TotalCost:      12, // $0.12
		},
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"metrics": metrics,
		"total":   len(metrics),
	})
}

// Helper functions

func timePtr(t time.Time) *time.Time {
	return &t
}

func getUserIDFromContext(ctx interface{}) uuid.UUID {
	// TODO: Extract from JWT or session
	return uuid.New()
}

func getURLParam(r *http.Request, key string) string {
	// TODO: Extract from URL path using router (chi, gorilla/mux, etc.)
	return ""
}

func getIntParam(r *http.Request, key string, defaultValue int) int {
	// TODO: Parse query parameter
	return defaultValue
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]interface{}{
		"error": message,
	})
}
