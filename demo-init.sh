#!/bin/sh

# Demo Initialization Script for Solobase
# Sets up demo environment with sample data and security constraints

set -e

echo "Starting Solobase Demo Environment..."

# Load demo environment variables
export $(cat demo.env | grep -v '^#' | xargs)

# Create necessary directories
mkdir -p ./data ./storage

# Initialize SQLite database with demo data
echo "Initializing demo database..."

# Create demo data SQL script
cat > ./data/demo-seed.sql << 'EOF'
-- Demo data for Solobase demonstration
-- This data will be automatically loaded on container startup

-- Insert demo admin user (will be created by application if not exists)
-- The application handles user creation via DEFAULT_ADMIN_EMAIL/PASSWORD

-- Insert demo settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES 
('demo_mode', 'true', 'Demo mode enabled'),
('max_users', '10', 'Maximum users for demo'),
('session_timeout', '1800', 'Demo session timeout in seconds'),
('auto_cleanup', 'true', 'Auto cleanup demo data');

-- Insert demo collections for showcase
INSERT OR IGNORE INTO collections (id, name, description, created_at, updated_at) VALUES 
('demo-products', 'Demo Products', 'Sample product collection for demonstration', datetime('now'), datetime('now')),
('demo-users', 'Demo Users', 'Sample user collection for demonstration', datetime('now'), datetime('now')),
('demo-orders', 'Demo Orders', 'Sample order collection for demonstration', datetime('now'), datetime('now'));

-- Insert sample demo records
INSERT OR IGNORE INTO records (id, collection_id, data, created_at, updated_at) VALUES 
('prod-1', 'demo-products', '{"name": "Demo Widget", "price": 29.99, "description": "A sample product for demonstration", "category": "Electronics", "stock": 100}', datetime('now'), datetime('now')),
('prod-2', 'demo-products', '{"name": "Sample Service", "price": 99.99, "description": "A sample service offering", "category": "Services", "duration": "1 hour"}', datetime('now'), datetime('now')),
('prod-3', 'demo-products', '{"name": "Digital Download", "price": 19.99, "description": "A sample digital product", "category": "Digital", "file_size": "5MB"}', datetime('now'), datetime('now'));

-- Insert demo user records (non-admin users for demonstration)
INSERT OR IGNORE INTO records (id, collection_id, data, created_at, updated_at) VALUES 
('user-1', 'demo-users', '{"name": "John Demo", "email": "john@demo.local", "role": "customer", "status": "active", "joined": "2024-01-15"}', datetime('now'), datetime('now')),
('user-2', 'demo-users', '{"name": "Jane Sample", "email": "jane@demo.local", "role": "customer", "status": "active", "joined": "2024-02-20"}', datetime('now'), datetime('now'));

-- Insert demo orders
INSERT OR IGNORE INTO records (id, collection_id, data, created_at, updated_at) VALUES 
('order-1', 'demo-orders', '{"order_id": "ORD-001", "customer": "John Demo", "items": [{"product": "Demo Widget", "quantity": 2, "price": 29.99}], "total": 59.98, "status": "completed", "date": "2024-03-01"}', datetime('now'), datetime('now')),
('order-2', 'demo-orders', '{"order_id": "ORD-002", "customer": "Jane Sample", "items": [{"product": "Sample Service", "quantity": 1, "price": 99.99}], "total": 99.99, "status": "pending", "date": "2024-03-05"}', datetime('now'), datetime('now'));

EOF

# Set up demo storage structure
echo "Setting up demo storage..."
mkdir -p ./storage/uploads
mkdir -p ./storage/avatars
mkdir -p ./storage/documents

# Create sample files for demo
echo "Sample document content for demonstration" > ./storage/documents/sample.txt
echo "Demo file for testing uploads" > ./storage/uploads/demo-file.txt

# Set proper permissions
chmod -R 755 ./storage
chmod 644 ./storage/documents/* ./storage/uploads/* 2>/dev/null || true

# Create cleanup script for demo reset
cat > ./cleanup-demo.sh << 'EOF'
#!/bin/sh
echo "Cleaning up demo data..."
rm -f ./data/demo.db
rm -rf ./storage/uploads/*
rm -rf ./storage/avatars/*
echo "Demo data cleaned up"
EOF

chmod +x ./cleanup-demo.sh

# Set up automatic cleanup if enabled
if [ "$DEMO_AUTO_CLEANUP" = "true" ]; then
    echo "Setting up automatic demo cleanup..."
    # Create a background cleanup process
    (
        while true; do
            sleep ${DEMO_DATA_RESET_INTERVAL:-3600}
            echo "Auto-cleaning demo data..."
            ./cleanup-demo.sh
            # Restart the application to reinitialize with fresh data
            kill -HUP 1 2>/dev/null || true
        done
    ) &
fi

echo "Demo environment initialized successfully"
echo "Starting Solobase application..."

# Start the Solobase application
exec ./solobase