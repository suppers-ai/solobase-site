/**
 * Demo API Client
 * Handles communication with demo container management API
 */

class DemoAPI {
    constructor(config = {}) {
        this.config = {
            baseURL: config.baseURL || '/api/demo',
            timeout: config.timeout || 10000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };
    }

    // Container Management
    async createContainer(options = {}) {
        const payload = {
            image: 'solobase:latest',
            environment: {
                DATABASE_TYPE: 'sqlite',
                DATABASE_URL: 'file:./demo.db',
                DEFAULT_ADMIN_EMAIL: 'demo@solobase.dev',
                DEFAULT_ADMIN_PASSWORD: 'demo123',
                DEMO_MODE: 'true',
                SESSION_TIMEOUT: '1800', // 30 minutes
                ...options.environment
            },
            resources: {
                memory: '512M',
                cpu: '0.5',
                ...options.resources
            },
            network: {
                isolation: true,
                allowedPorts: [8080],
                ...options.network
            }
        };

        return this.request('POST', '/containers', payload);
    }

    async getContainer(containerId) {
        return this.request('GET', `/containers/${containerId}`);
    }

    async deleteContainer(containerId) {
        return this.request('DELETE', `/containers/${containerId}`);
    }

    async getContainerLogs(containerId, options = {}) {
        const params = new URLSearchParams({
            tail: options.tail || 100,
            follow: options.follow || false,
            timestamps: options.timestamps || true
        });

        return this.request('GET', `/containers/${containerId}/logs?${params}`);
    }

    async getContainerStats(containerId) {
        return this.request('GET', `/containers/${containerId}/stats`);
    }

    // Health Checks
    async healthCheck(containerId) {
        return this.request('GET', `/containers/${containerId}/health`);
    }

    async ping() {
        return this.request('GET', '/ping');
    }

    // Session Management
    async createSession(containerId, options = {}) {
        const payload = {
            containerId,
            duration: options.duration || 1800, // 30 minutes
            userId: options.userId || 'anonymous',
            metadata: options.metadata || {}
        };

        return this.request('POST', '/sessions', payload);
    }

    async getSession(sessionId) {
        return this.request('GET', `/sessions/${sessionId}`);
    }

    async extendSession(sessionId, duration) {
        return this.request('PATCH', `/sessions/${sessionId}`, { duration });
    }

    async deleteSession(sessionId) {
        return this.request('DELETE', `/sessions/${sessionId}`);
    }

    // Monitoring
    async getMetrics() {
        return this.request('GET', '/metrics');
    }

    async getSystemStatus() {
        return this.request('GET', '/status');
    }

    // Generic request handler
    async request(method, endpoint, data = null, options = {}) {
        const url = this.config.baseURL + endpoint;
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            requestOptions.body = JSON.stringify(data);
        }

        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        requestOptions.signal = controller.signal;

        try {
            const response = await this.retryRequest(() => fetch(url, requestOptions));
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new APIError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    await this.parseErrorResponse(response)
                );
            }

            return await this.parseResponse(response);
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 408, { timeout: this.config.timeout });
            }
            
            throw error;
        }
    }

    async retryRequest(requestFn) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) except 408 (timeout)
                if (error.status >= 400 && error.status < 500 && error.status !== 408) {
                    throw error;
                }
                
                if (attempt < this.config.retryAttempts) {
                    await this.delay(this.config.retryDelay * Math.pow(2, attempt));
                }
            }
        }
        
        throw lastError;
    }

    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    }

    async parseErrorResponse(response) {
        try {
            return await response.json();
        } catch {
            return { message: await response.text() };
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Custom error class for API errors
class APIError extends Error {
    constructor(message, status, details = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

// Mock API for development/demo purposes
class MockDemoAPI extends DemoAPI {
    constructor(config = {}) {
        super(config);
        this.containers = new Map();
        this.sessions = new Map();
        this.nextContainerId = 1;
        this.nextSessionId = 1;
    }

    async createContainer(options = {}) {
        await this.delay(1000 + Math.random() * 2000); // Simulate startup time
        
        // Simulate occasional failures
        if (Math.random() < 0.1) {
            throw new APIError('Container creation failed', 500, {
                reason: 'Resource allocation failed',
                retryable: true
            });
        }

        const containerId = `container_${this.nextContainerId++}`;
        const container = {
            id: containerId,
            status: 'running',
            created: new Date().toISOString(),
            image: 'solobase:latest',
            ports: { 8080: Math.floor(Math.random() * 10000) + 30000 },
            environment: options.environment || {},
            resources: options.resources || { memory: '512M', cpu: '0.5' },
            health: 'healthy'
        };

        this.containers.set(containerId, container);

        return {
            containerId,
            status: 'created',
            accessUrl: `https://demo-${containerId}.solobase.dev`,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        };
    }

    async getContainer(containerId) {
        await this.delay(100 + Math.random() * 200);
        
        const container = this.containers.get(containerId);
        if (!container) {
            throw new APIError('Container not found', 404);
        }

        return container;
    }

    async deleteContainer(containerId) {
        await this.delay(500 + Math.random() * 1000);
        
        const container = this.containers.get(containerId);
        if (!container) {
            throw new APIError('Container not found', 404);
        }

        this.containers.delete(containerId);
        
        // Also delete associated sessions
        for (const [sessionId, session] of this.sessions) {
            if (session.containerId === containerId) {
                this.sessions.delete(sessionId);
            }
        }

        return { status: 'deleted' };
    }

    async healthCheck(containerId) {
        await this.delay(200 + Math.random() * 300);
        
        const container = this.containers.get(containerId);
        if (!container) {
            throw new APIError('Container not found', 404);
        }

        // Simulate occasional health check failures
        if (Math.random() < 0.02) {
            throw new APIError('Health check failed', 503, {
                reason: 'Container unresponsive',
                retryable: true
            });
        }

        return {
            status: 'healthy',
            uptime: Math.floor(Math.random() * 3600),
            memory: {
                used: Math.floor(Math.random() * 400) + 100,
                limit: 512
            },
            cpu: {
                usage: Math.random() * 50
            }
        };
    }

    async createSession(containerId, options = {}) {
        await this.delay(200 + Math.random() * 300);
        
        const container = this.containers.get(containerId);
        if (!container) {
            throw new APIError('Container not found', 404);
        }

        const sessionId = `session_${this.nextSessionId++}`;
        const session = {
            id: sessionId,
            containerId,
            created: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (options.duration || 1800) * 1000).toISOString(),
            userId: options.userId || 'anonymous',
            metadata: options.metadata || {},
            status: 'active'
        };

        this.sessions.set(sessionId, session);

        return session;
    }

    async getSession(sessionId) {
        await this.delay(50 + Math.random() * 100);
        
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new APIError('Session not found', 404);
        }

        // Check if session has expired
        if (new Date() > new Date(session.expiresAt)) {
            session.status = 'expired';
        }

        return session;
    }

    async extendSession(sessionId, duration) {
        await this.delay(100 + Math.random() * 200);
        
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new APIError('Session not found', 404);
        }

        if (session.status === 'expired') {
            throw new APIError('Cannot extend expired session', 400);
        }

        session.expiresAt = new Date(Date.now() + duration * 1000).toISOString();
        
        return session;
    }

    async deleteSession(sessionId) {
        await this.delay(100 + Math.random() * 200);
        
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new APIError('Session not found', 404);
        }

        this.sessions.delete(sessionId);
        
        return { status: 'deleted' };
    }

    async ping() {
        await this.delay(50 + Math.random() * 100);
        return { status: 'ok', timestamp: new Date().toISOString() };
    }

    async getMetrics() {
        await this.delay(200 + Math.random() * 300);
        
        return {
            containers: {
                total: this.containers.size,
                running: Array.from(this.containers.values()).filter(c => c.status === 'running').length
            },
            sessions: {
                total: this.sessions.size,
                active: Array.from(this.sessions.values()).filter(s => s.status === 'active').length
            },
            resources: {
                memory: {
                    used: Math.floor(Math.random() * 8000) + 2000,
                    total: 16384
                },
                cpu: {
                    usage: Math.random() * 80 + 10
                }
            }
        };
    }

    async getSystemStatus() {
        await this.delay(100 + Math.random() * 200);
        
        return {
            status: 'operational',
            version: '1.0.0',
            uptime: Math.floor(Math.random() * 86400),
            components: {
                api: 'healthy',
                database: 'healthy',
                containerEngine: 'healthy',
                storage: 'healthy'
            }
        };
    }
}

// Export classes
window.DemoAPI = DemoAPI;
window.MockDemoAPI = MockDemoAPI;
window.APIError = APIError;

// Create default instance
window.demoAPI = new MockDemoAPI();