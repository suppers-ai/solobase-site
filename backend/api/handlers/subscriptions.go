package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Subscription represents a user's subscription
type Subscription struct {
	ID                   uuid.UUID  `json:"id"`
	UserID               uuid.UUID  `json:"user_id"`
	PlanID               string     `json:"plan_id"`
	Status               string     `json:"status"`
	StripeCustomerID     string     `json:"stripe_customer_id,omitempty"`
	StripeSubscriptionID string     `json:"stripe_subscription_id,omitempty"`
	CurrentPeriodStart   time.Time  `json:"current_period_start"`
	CurrentPeriodEnd     time.Time  `json:"current_period_end"`
	CancelAtPeriodEnd    bool       `json:"cancel_at_period_end"`
	TrialStart           *time.Time `json:"trial_start,omitempty"`
	TrialEnd             *time.Time `json:"trial_end,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// Plan represents a pricing plan
type Plan struct {
	ID                     string  `json:"id"`
	Name                   string  `json:"name"`
	Description            string  `json:"description"`
	PriceMonthly           int     `json:"price_monthly"` // In cents
	PriceYearly            *int    `json:"price_yearly,omitempty"`
	MaxInstances           int     `json:"max_instances"`
	DatabaseStorageGB      int     `json:"database_storage_gb"`
	FileStorageGB          int     `json:"file_storage_gb"`
	APIRequestsMonthly     int64   `json:"api_requests_monthly"` // -1 = unlimited
	DatabaseTier           string  `json:"database_tier"`
	ComputeTier            string  `json:"compute_tier"`
	AutoSleep              bool    `json:"auto_sleep"`
	CustomDomain           bool    `json:"custom_domain"`
	DailyBackups           bool    `json:"daily_backups"`
	SLAPercentage          *float64 `json:"sla_percentage,omitempty"`
	SupportTier            string  `json:"support_tier"`
	SupportResponseHours   *int    `json:"support_response_hours,omitempty"`
}

// Invoice represents a billing invoice
type Invoice struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	InvoiceNumber    string     `json:"invoice_number"`
	AmountDue        int        `json:"amount_due"` // In cents
	AmountPaid       int        `json:"amount_paid"`
	Currency         string     `json:"currency"`
	Status           string     `json:"status"`
	PeriodStart      time.Time  `json:"period_start"`
	PeriodEnd        time.Time  `json:"period_end"`
	DueDate          *time.Time `json:"due_date,omitempty"`
	PaidAt           *time.Time `json:"paid_at,omitempty"`
	InvoicePDFURL    string     `json:"invoice_pdf_url,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// CreateCheckoutSessionRequest represents checkout session creation
type CreateCheckoutSessionRequest struct {
	PlanID       string `json:"plan_id"`
	BillingCycle string `json:"billing_cycle"` // "monthly" or "yearly"
	SuccessURL   string `json:"success_url"`
	CancelURL    string `json:"cancel_url"`
}

// GetCurrentSubscription returns the user's active subscription
func GetCurrentSubscription(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	// TODO: Query database for subscription
	subscription := Subscription{
		ID:                 uuid.New(),
		UserID:             userID,
		PlanID:             "hobby",
		Status:             "active",
		CurrentPeriodStart: time.Now().AddDate(0, 0, -15),
		CurrentPeriodEnd:   time.Now().AddDate(0, 0, 15),
		CancelAtPeriodEnd:  false,
		CreatedAt:          time.Now().AddDate(0, 0, -15),
		UpdatedAt:          time.Now(),
	}

	respondJSON(w, http.StatusOK, subscription)
}

// ListPlans returns all available pricing plans
func ListPlans(w http.ResponseWriter, r *http.Request) {
	// TODO: Query database for active plans
	plans := []Plan{
		{
			ID:                   "hobby",
			Name:                 "Hobby",
			Description:          "Perfect for side projects and experimentation",
			PriceMonthly:         500,
			PriceYearly:          intPtr(5000),
			MaxInstances:         1,
			DatabaseStorageGB:    1,
			FileStorageGB:        2,
			APIRequestsMonthly:   1000000,
			DatabaseTier:         "shared",
			ComputeTier:          "lambda",
			AutoSleep:            true,
			CustomDomain:         false,
			DailyBackups:         false,
			SupportTier:          "community",
		},
		{
			ID:                   "starter",
			Name:                 "Starter",
			Description:          "For small projects and MVPs",
			PriceMonthly:         1500,
			PriceYearly:          intPtr(15000),
			MaxInstances:         1,
			DatabaseStorageGB:    5,
			FileStorageGB:        10,
			APIRequestsMonthly:   10000000,
			DatabaseTier:         "shared",
			ComputeTier:          "lambda",
			AutoSleep:            false,
			CustomDomain:         false,
			DailyBackups:         false,
			SupportTier:          "email",
			SupportResponseHours: intPtr(48),
		},
		{
			ID:                   "professional",
			Name:                 "Professional",
			Description:          "For growing startups and production apps",
			PriceMonthly:         7900,
			PriceYearly:          intPtr(79000),
			MaxInstances:         3,
			DatabaseStorageGB:    20,
			FileStorageGB:        50,
			APIRequestsMonthly:   100000000,
			DatabaseTier:         "shared",
			ComputeTier:          "ecs",
			AutoSleep:            false,
			CustomDomain:         true,
			DailyBackups:         true,
			SLAPercentage:        float64Ptr(99.9),
			SupportTier:          "email",
			SupportResponseHours: intPtr(24),
		},
		{
			ID:                   "business",
			Name:                 "Business",
			Description:          "For established businesses at scale",
			PriceMonthly:         19900,
			PriceYearly:          intPtr(199000),
			MaxInstances:         10,
			DatabaseStorageGB:    100,
			FileStorageGB:        200,
			APIRequestsMonthly:   -1, // unlimited
			DatabaseTier:         "dedicated",
			ComputeTier:          "ecs",
			AutoSleep:            false,
			CustomDomain:         true,
			DailyBackups:         true,
			SLAPercentage:        float64Ptr(99.9),
			SupportTier:          "priority",
			SupportResponseHours: intPtr(12),
		},
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"plans": plans,
		"total": len(plans),
	})
}

// CreateCheckoutSession creates a Stripe checkout session
func CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	var req CreateCheckoutSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate plan ID
	if req.PlanID == "" {
		respondError(w, http.StatusBadRequest, "plan_id is required")
		return
	}

	// TODO: Validate plan exists
	// TODO: Check if user already has active subscription

	// TODO: Create Stripe checkout session
	// stripe.CheckoutSession.New(&stripe.CheckoutSessionParams{
	//   Customer:   stripe.String(stripeCustomerID),
	//   Mode:       stripe.String("subscription"),
	//   LineItems:  []*stripe.CheckoutSessionLineItemParams{...},
	//   SuccessURL: stripe.String(req.SuccessURL),
	//   CancelURL:  stripe.String(req.CancelURL),
	// })

	checkoutURL := "https://checkout.stripe.com/session/xyz123" // Mock

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"checkout_url": checkoutURL,
		"session_id":   "cs_test_abc123",
	})
}

// CancelSubscription cancels the user's subscription at period end
func CancelSubscription(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	// TODO: Query user's subscription
	// TODO: Update subscription to cancel_at_period_end = true
	// TODO: Call Stripe API to cancel subscription

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":            "Subscription will be canceled at the end of the billing period",
		"cancel_at_period_end": true,
	})
}

// ReactivateSubscription reactivates a canceled subscription
func ReactivateSubscription(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	// TODO: Query user's subscription
	// TODO: Update subscription to cancel_at_period_end = false
	// TODO: Call Stripe API to reactivate

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Subscription reactivated successfully",
		"cancel_at_period_end": false,
	})
}

// UpdateSubscription upgrades or downgrades a subscription
func UpdateSubscription(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	var req struct {
		PlanID string `json:"plan_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// TODO: Validate new plan exists
	// TODO: Query current subscription
	// TODO: Update Stripe subscription with new plan
	// TODO: Prorate charges/credits
	// TODO: Update database

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Subscription updated successfully",
		"plan_id": req.PlanID,
	})
}

// ListInvoices returns user's invoices
func ListInvoices(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	limit := getIntParam(r, "limit", 20)
	offset := getIntParam(r, "offset", 0)

	// TODO: Query invoices table

	invoices := []Invoice{
		{
			ID:            uuid.New(),
			UserID:        userID,
			InvoiceNumber: "INV-2024-001",
			AmountDue:     500,
			AmountPaid:    500,
			Currency:      "USD",
			Status:        "paid",
			PeriodStart:   time.Now().AddDate(0, -1, 0),
			PeriodEnd:     time.Now(),
			PaidAt:        timePtr(time.Now().AddDate(0, 0, -25)),
			CreatedAt:     time.Now().AddDate(0, -1, 0),
		},
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"invoices": invoices,
		"total":    len(invoices),
		"limit":    limit,
		"offset":   offset,
	})
}

// GetInvoice returns a single invoice
func GetInvoice(w http.ResponseWriter, r *http.Request) {
	invoiceID := getURLParam(r, "id")
	userID := getUserIDFromContext(r.Context())

	// TODO: Query invoice and verify user owns it

	invoice := Invoice{
		ID:            uuid.MustParse(invoiceID),
		UserID:        userID,
		InvoiceNumber: "INV-2024-001",
		AmountDue:     500,
		AmountPaid:    500,
		Currency:      "USD",
		Status:        "paid",
		PeriodStart:   time.Now().AddDate(0, -1, 0),
		PeriodEnd:     time.Now(),
		PaidAt:        timePtr(time.Now().AddDate(0, 0, -25)),
		InvoicePDFURL: "https://invoices.solobase.cloud/inv-2024-001.pdf",
		CreatedAt:     time.Now().AddDate(0, -1, 0),
	}

	respondJSON(w, http.StatusOK, invoice)
}

// StripeWebhook handles Stripe webhook events
func StripeWebhook(w http.ResponseWriter, r *http.Request) {
	// TODO: Verify webhook signature
	// TODO: Parse webhook event
	// TODO: Handle different event types:
	//   - invoice.paid
	//   - invoice.payment_failed
	//   - customer.subscription.created
	//   - customer.subscription.updated
	//   - customer.subscription.deleted

	var event struct {
		Type string                 `json:"type"`
		Data map[string]interface{} `json:"data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}

	switch event.Type {
	case "invoice.paid":
		// TODO: Mark invoice as paid
		// TODO: Extend subscription period
	case "invoice.payment_failed":
		// TODO: Mark subscription as past_due
		// TODO: Send notification to user
	case "customer.subscription.created":
		// TODO: Create subscription in database
	case "customer.subscription.updated":
		// TODO: Update subscription in database
	case "customer.subscription.deleted":
		// TODO: Mark subscription as canceled
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"received": true,
	})
}

// GetUsageSummary returns user's current usage across all instances
func GetUsageSummary(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r.Context())

	// TODO: Aggregate usage from instance_usage table

	summary := map[string]interface{}{
		"total_instances":           1,
		"total_api_requests_month":  45678,
		"total_storage_bytes":       524288000,
		"total_database_bytes":      104857600,
		"quota_instances":           1,
		"quota_api_requests_month":  1000000,
		"quota_storage_gb":          2,
		"quota_database_gb":         1,
		"usage_percentage": map[string]float64{
			"instances":    100.0,
			"api_requests": 4.6,
			"storage":      24.4,
			"database":     9.8,
		},
	}

	respondJSON(w, http.StatusOK, summary)
}

// Helper functions

func intPtr(i int) *int {
	return &i
}

func float64Ptr(f float64) *float64 {
	return &f
}
