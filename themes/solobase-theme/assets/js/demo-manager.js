/**
 * Solobase Demo Session Manager
 * Handles container lifecycle, session management, and user interactions
 */

class DemoManager {
    constructor(config = {}) {
        this.config = {
            apiEndpoint: config.apiEndpoint || '/api/demo',
            demoUrl: config.demoUrl || 'https://demo.solobase.dev',
            sessionDuration: config.sessionDuration || 30 * 60, // 30 minutes
            warningTime: config.warningTime || 5 * 60, // 5 minutes
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 2000,
            healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
            ...config
        };

        this.state = {
            status: 'idle',
            sessionId: null,
            containerId: null,
            startTime: null,
            timeLeft: this.config.sessionDuration,
            retryCount: 0,
            healthCheckCount: 0,
            lastActivity: Date.now()
        };

        this.timers = {
            session: null,
            warning: null,
            healthCheck: null,
            activityCheck: null
        };

        this.eventListeners = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupActivityTracking();
        this.bindUIElements();
    }

    setupEventListeners() {
        // Custom event system for demo state changes
        this.addEventListener('statusChange', (event) => {
            this.updateUI(event.detail.status, event.detail.message);
        });

        this.addEventListener('sessionExpired', () => {
            this.handleSessionExpiry();
        });

        this.addEventListener('containerError', (event) => {
            this.handleContainerError(event.detail.error);
        });
    }

    setupActivityTracking() {
        // Track user activity to extend session
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });

        // Check for inactivity every minute
        this.timers.activityCheck = setInterval(() => {
            this.checkInactivity();
        }, 60000);
    }

    bindUIElements() {
        // Bind UI elements to demo manager methods
        const elements = {
            'refresh-demo': () => this.refreshDemo(),
            'restart-demo': () => this.restartDemo(),
            'demo-menu': () => this.toggleDemoMenu(),
            'toggle-tour': () => this.startTour()
        };

        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler.bind(this));
            }
        });
    }

    // Session Management
    async startDemo() {
        try {
            this.state.retryCount = 0;
            await this.initializeContainer();
        } catch (error) {
            console.error('Failed to start demo:', error);
            this.emit('containerError', { error: error.message });
        }
    }

    async initializeContainer() {
        this.emit('statusChange', { status: 'starting', message: 'Initializing Demo...' });
        this.showLoadingState();

        try {
            // Step 1: Request container
            this.updateLoadingStep('Requesting container...', 20, 1);
            const containerRequest = await this.requestContainer();
            
            // Step 2: Wait for container to start
            this.updateLoadingStep('Starting container...', 40, 2);
            await this.waitForContainer(containerRequest.containerId);
            
            // Step 3: Verify container health
            this.updateLoadingStep('Verifying container health...', 70, 3);
            await this.verifyContainerHealth(containerRequest.containerId);
            
            // Step 4: Load demo interface
            this.updateLoadingStep('Loading demo interface...', 90, 4);
            await this.loadDemoInterface(containerRequest.demoUrl);
            
            // Step 5: Complete initialization
            this.updateLoadingStep('Demo ready!', 100, 5);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.completeInitialization(containerRequest);
            
        } catch (error) {
            await this.handleInitializationError(error);
        }
    }

    async requestContainer() {
        try {
            // Use the API client to create a container
            const response = await window.demoAPI.createContainer({
                environment: {
                    DEMO_SESSION_ID: this.generateSessionId(),
                    DEMO_USER_AGENT: navigator.userAgent,
                    DEMO_TIMESTAMP: new Date().toISOString()
                }
            });

            return {
                containerId: response.containerId,
                sessionId: response.containerId, // Use container ID as session ID for simplicity
                demoUrl: response.accessUrl || this.config.demoUrl,
                expiresAt: new Date(response.expiresAt).getTime()
            };
        } catch (error) {
            console.error('Container request failed:', error);
            throw new Error(`Container allocation failed: ${error.message}`);
        }
    }

    async waitForContainer(containerId) {
        // Simulate container startup time
        return new Promise((resolve) => {
            setTimeout(resolve, 2000);
        });
    }

    async verifyContainerHealth(containerId) {
        try {
            const health = await window.demoAPI.healthCheck(containerId);
            if (health.status !== 'healthy') {
                throw new Error(`Container health check failed: ${health.status}`);
            }
            return health;
        } catch (error) {
            console.error('Health check failed:', error);
            throw new Error(`Container health check failed: ${error.message}`);
        }
    }

    async loadDemoInterface(demoUrl) {
        const frame = document.getElementById('demo-frame');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Demo interface load timeout'));
            }, 10000);

            frame.onload = () => {
                clearTimeout(timeout);
                resolve();
            };

            frame.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Demo interface load error'));
            };

            frame.src = demoUrl;
        });
    }

    completeInitialization(containerData) {
        this.state.sessionId = containerData.sessionId;
        this.state.containerId = containerData.containerId;
        this.state.startTime = Date.now();
        this.state.timeLeft = this.config.sessionDuration;

        // Show demo interface
        document.getElementById('demo-loading').classList.add('hidden');
        document.getElementById('demo-frame').classList.remove('hidden');

        this.emit('statusChange', { status: 'ready', message: 'Demo Ready' });
        this.enableControls();
        this.startSessionTimer();
        this.startHealthChecks();
    }

    async handleInitializationError(error) {
        console.error('Initialization error:', error);
        
        if (this.state.retryCount < this.config.retryAttempts) {
            this.state.retryCount++;
            this.emit('statusChange', { 
                status: 'starting', 
                message: `Retrying... (${this.state.retryCount}/${this.config.retryAttempts})` 
            });
            
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
            await this.initializeContainer();
        } else {
            this.showError('Unable to start demo after multiple attempts. Please try again later.');
        }
    }

    // Session Timer Management
    startSessionTimer() {
        this.clearTimer('session');
        
        const timerElement = document.getElementById('session-timer');
        timerElement?.classList.remove('hidden');

        this.timers.session = setInterval(() => {
            this.state.timeLeft--;
            this.updateSessionDisplay();

            if (this.state.timeLeft === this.config.warningTime) {
                this.showTimeoutWarning();
            }

            if (this.state.timeLeft <= 0) {
                this.expireSession();
            }
        }, 1000);
    }

    updateSessionDisplay() {
        const minutes = Math.floor(this.state.timeLeft / 60);
        const seconds = this.state.timeLeft % 60;
        const timerText = document.getElementById('timer-text');
        
        if (timerText) {
            timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update status for last 5 minutes
        if (this.state.timeLeft <= this.config.warningTime && this.state.status === 'ready') {
            this.emit('statusChange', { 
                status: 'ready', 
                message: `Demo Ready (${minutes}:${seconds.toString().padStart(2, '0')} remaining)` 
            });
        }
    }

    showTimeoutWarning() {
        const warning = document.getElementById('timeout-warning');
        const message = document.getElementById('timeout-message');
        
        if (warning && message) {
            const minutes = Math.floor(this.state.timeLeft / 60);
            message.textContent = `Your demo session will expire in ${minutes} minutes. Save any work you want to keep.`;
            warning.classList.remove('hidden');
        }
    }

    expireSession() {
        this.clearAllTimers();
        this.emit('sessionExpired');
    }

    handleSessionExpiry() {
        this.emit('statusChange', { status: 'expired', message: 'Session Expired' });
        
        const frame = document.getElementById('demo-frame');
        const error = document.getElementById('demo-error');
        const errorMessage = document.getElementById('error-message');
        
        if (frame) frame.classList.add('hidden');
        if (error) error.classList.remove('hidden');
        if (errorMessage) {
            errorMessage.textContent = 'Your demo session has expired. Click "Try Again" to start a new session.';
        }
        
        this.disableControls();
        this.cleanupContainer();
    }

    // Health Monitoring
    startHealthChecks() {
        this.clearTimer('healthCheck');
        
        this.timers.healthCheck = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.warn('Health check failed:', error);
                this.state.healthCheckCount++;
                
                if (this.state.healthCheckCount >= 3) {
                    this.emit('containerError', { error: 'Container became unresponsive' });
                }
            }
        }, this.config.healthCheckInterval);
    }

    async performHealthCheck() {
        if (!this.state.containerId) {
            throw new Error('No container to check');
        }

        try {
            const health = await window.demoAPI.healthCheck(this.state.containerId);
            this.state.healthCheckCount = 0;
            return health;
        } catch (error) {
            console.warn('Health check failed:', error);
            throw error;
        }
    }

    // Activity Tracking
    updateActivity() {
        this.state.lastActivity = Date.now();
    }

    checkInactivity() {
        const inactiveTime = Date.now() - this.state.lastActivity;
        const inactiveMinutes = Math.floor(inactiveTime / 60000);
        
        // Extend session if user is active
        if (inactiveMinutes < 5 && this.state.timeLeft < 300) {
            this.extendSession(300); // Add 5 minutes
        }
    }

    extendSession(seconds) {
        this.state.timeLeft = Math.min(this.state.timeLeft + seconds, this.config.sessionDuration);
        this.showNotification(`Session extended by ${Math.floor(seconds / 60)} minutes due to activity`);
    }

    // Container Management
    async cleanupContainer() {
        if (this.state.containerId) {
            try {
                // In a real implementation, this would call the cleanup API
                console.log('Cleaning up container:', this.state.containerId);
                await this.requestContainerCleanup(this.state.containerId);
            } catch (error) {
                console.error('Container cleanup failed:', error);
            }
        }
    }

    async requestContainerCleanup(containerId) {
        try {
            await window.demoAPI.deleteContainer(containerId);
            console.log('Container cleanup completed:', containerId);
        } catch (error) {
            console.error('Container cleanup failed:', error);
            // Don't throw here as cleanup failures shouldn't block the UI
        }
    }

    // Error Handling
    handleContainerError(error) {
        this.showError(`Container error: ${error}`);
        this.cleanupContainer();
    }

    // UI Management
    showLoadingState() {
        const loading = document.getElementById('demo-loading');
        const frame = document.getElementById('demo-frame');
        const error = document.getElementById('demo-error');
        
        loading?.classList.remove('hidden');
        frame?.classList.add('hidden');
        error?.classList.add('hidden');
        
        this.updateLoadingStep('Initializing...', 0, 0);
    }

    updateLoadingStep(message, progress, step) {
        const messageEl = document.getElementById('loading-message');
        const progressEl = document.getElementById('loading-progress');
        
        if (messageEl) messageEl.textContent = message;
        if (progressEl) progressEl.style.width = progress + '%';

        // Update step indicators
        for (let i = 1; i <= 5; i++) {
            const icon = document.getElementById(`step-${i}-icon`);
            if (icon) {
                icon.className = i <= step 
                    ? 'w-4 h-4 mr-2 rounded-full bg-blue-600'
                    : 'w-4 h-4 mr-2 rounded-full bg-gray-300';
            }
        }
    }

    showError(message) {
        const loading = document.getElementById('demo-loading');
        const frame = document.getElementById('demo-frame');
        const error = document.getElementById('demo-error');
        const errorMessage = document.getElementById('error-message');
        
        loading?.classList.add('hidden');
        frame?.classList.add('hidden');
        error?.classList.remove('hidden');
        
        if (errorMessage) errorMessage.textContent = message;
        
        this.emit('statusChange', { status: 'error', message: 'Demo Error' });
        this.disableControls();
    }

    updateUI(status, message) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        
        if (indicator) {
            indicator.className = 'w-3 h-3 rounded-full';
            
            switch (status) {
                case 'starting':
                    indicator.classList.add('bg-yellow-400', 'animate-pulse');
                    break;
                case 'ready':
                    indicator.classList.add('bg-green-400');
                    break;
                case 'error':
                    indicator.classList.add('bg-red-400');
                    break;
                case 'expired':
                    indicator.classList.add('bg-gray-400');
                    break;
            }
        }
        
        if (text) text.textContent = message;
        this.state.status = status;
    }

    enableControls() {
        const refreshBtn = document.getElementById('refresh-demo');
        const restartBtn = document.getElementById('restart-demo');
        
        if (refreshBtn) refreshBtn.disabled = false;
        if (restartBtn) restartBtn.disabled = false;
    }

    disableControls() {
        const refreshBtn = document.getElementById('refresh-demo');
        const restartBtn = document.getElementById('restart-demo');
        
        if (refreshBtn) refreshBtn.disabled = true;
        if (restartBtn) restartBtn.disabled = true;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        
        notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Control Methods
    refreshDemo() {
        if (this.state.status === 'ready') {
            const frame = document.getElementById('demo-frame');
            if (frame) {
                frame.src = frame.src;
                this.showNotification('Demo refreshed');
            }
        }
    }

    async restartDemo() {
        this.clearAllTimers();
        await this.cleanupContainer();
        this.resetState();
        await this.startDemo();
    }

    resetState() {
        this.state = {
            status: 'idle',
            sessionId: null,
            containerId: null,
            startTime: null,
            timeLeft: this.config.sessionDuration,
            retryCount: 0,
            healthCheckCount: 0,
            lastActivity: Date.now()
        };
    }

    // Utility Methods
    clearTimer(name) {
        if (this.timers[name]) {
            clearInterval(this.timers[name]);
            this.timers[name] = null;
        }
    }

    clearAllTimers() {
        Object.keys(this.timers).forEach(name => this.clearTimer(name));
    }

    generateSessionId() {
        return 'demo_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    generateContainerId() {
        return 'container_' + Math.random().toString(36).substr(2, 12);
    }

    // Event System
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data = {}) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                callback({ detail: data, type: event });
            });
        }
    }

    // Menu Functions
    toggleDemoMenu() {
        const dropdown = document.getElementById('demo-menu-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    showDemoInfo() {
        const info = `Demo Session Information:
Session ID: ${this.state.sessionId || 'Not started'}
Container ID: ${this.state.containerId || 'Not allocated'}
Status: ${this.state.status}
Time Remaining: ${Math.floor(this.state.timeLeft / 60)}:${(this.state.timeLeft % 60).toString().padStart(2, '0')}
Health Checks: ${this.state.healthCheckCount} failures`;
        
        alert(info);
        this.toggleDemoMenu();
    }

    showKeyboardShortcuts() {
        const shortcuts = `Keyboard Shortcuts:
Ctrl+R: Refresh demo
Ctrl+Shift+R: Restart demo
Esc: Close tour/dialogs
F11: Toggle fullscreen (if supported)`;
        
        alert(shortcuts);
        this.toggleDemoMenu();
    }

    reportIssue() {
        const subject = encodeURIComponent('Solobase Demo Issue Report');
        const body = encodeURIComponent(`Demo Session Information:
Session ID: ${this.state.sessionId}
Container ID: ${this.state.containerId}
Status: ${this.state.status}
Browser: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

Issue Description:
[Please describe the issue you encountered]`);
        
        window.open(`mailto:support@solobase.dev?subject=${subject}&body=${body}`);
        this.toggleDemoMenu();
    }

    // Tour Integration
    startTour() {
        // This would integrate with the tour system
        if (window.tourManager) {
            window.tourManager.startTour();
        }
    }

    // Cleanup
    destroy() {
        this.clearAllTimers();
        this.cleanupContainer();
        this.eventListeners.clear();
    }
}

// Export for use in other scripts
window.DemoManager = DemoManager;