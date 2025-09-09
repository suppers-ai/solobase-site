/**
 * Solobase Demo Tour Manager
 * Handles guided tours and user onboarding
 */

class TourManager {
    constructor(config = {}) {
        this.config = {
            autoStart: config.autoStart || false,
            showProgress: config.showProgress !== false,
            allowSkip: config.allowSkip !== false,
            ...config
        };

        this.state = {
            active: false,
            currentStep: 0,
            completed: false,
            skipped: false
        };

        this.steps = [
            {
                id: 'welcome',
                title: "Welcome to Solobase Demo",
                content: `
                    <p class="text-gray-600 mb-4">Welcome to the interactive Solobase demo! This guided tour will help you explore the key features of this modern admin dashboard.</p>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 class="font-semibold text-blue-800 mb-2">What you'll learn:</h4>
                        <ul class="text-blue-700 text-sm space-y-1">
                            <li>• How to navigate the dashboard interface</li>
                            <li>• User management and authentication features</li>
                            <li>• Database browsing and query capabilities</li>
                            <li>• File storage and organization tools</li>
                        </ul>
                    </div>
                    <p class="text-sm text-gray-500">The tour takes about 3-4 minutes to complete.</p>
                `,
                action: null,
                highlight: null
            },
            {
                id: 'demo-interface',
                title: "Demo Interface Overview",
                content: `
                    <p class="text-gray-600 mb-4">This is your demo environment running in a secure container. The status bar shows the current state of your session.</p>
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                            <span class="text-sm"><strong>Green:</strong> Demo is ready and running</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                            <span class="text-sm"><strong>Yellow:</strong> Demo is starting up</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                            <span class="text-sm"><strong>Red:</strong> Demo encountered an error</span>
                        </div>
                    </div>
                    <p class="text-sm text-gray-500 mt-4">Your session will automatically expire after 30 minutes of use.</p>
                `,
                action: () => this.highlightElement('demo-status'),
                highlight: 'demo-status'
            },
            {
                id: 'login-credentials',
                title: "Demo Login Credentials",
                content: `
                    <p class="text-gray-600 mb-4">To access the demo, use these pre-configured credentials:</p>
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <div class="space-y-2">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Email:</label>
                                <code class="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">demo@solobase.dev</code>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Password:</label>
                                <code class="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">demo123</code>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm text-gray-500">These credentials give you full access to explore all demo features safely.</p>
                `,
                action: () => this.focusFrame(),
                highlight: 'demo-frame'
            },
            {
                id: 'dashboard-features',
                title: "Dashboard Features",
                content: `
                    <p class="text-gray-600 mb-4">Once logged in, you'll see the main dashboard with several key areas:</p>
                    <div class="space-y-3">
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                            <div>
                                <strong class="text-gray-800">Statistics Overview:</strong>
                                <span class="text-gray-600"> System metrics and key performance indicators</span>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                            </svg>
                            <div>
                                <strong class="text-gray-800">Navigation Menu:</strong>
                                <span class="text-gray-600"> Access to users, database, storage, and settings</span>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-purple-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <div>
                                <strong class="text-gray-800">Quick Actions:</strong>
                                <span class="text-gray-600"> Shortcuts to common administrative tasks</span>
                            </div>
                        </div>
                    </div>
                `,
                action: null,
                highlight: null
            },
            {
                id: 'explore-features',
                title: "Ready to Explore!",
                content: `
                    <p class="text-gray-600 mb-4">You're now ready to explore Solobase! Here are some suggested next steps:</p>
                    <div class="space-y-3">
                        <button onclick="window.tourManager.navigateToSection('users')" class="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                                </svg>
                                <div>
                                    <div class="font-medium text-blue-800">Try User Management</div>
                                    <div class="text-sm text-blue-600">Explore user accounts and permissions</div>
                                </div>
                            </div>
                        </button>
                        <button onclick="window.tourManager.navigateToSection('database')" class="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                                </svg>
                                <div>
                                    <div class="font-medium text-green-800">Browse Database</div>
                                    <div class="text-sm text-green-600">Explore tables and run queries</div>
                                </div>
                            </div>
                        </button>
                        <button onclick="window.tourManager.navigateToSection('storage')" class="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
                                </svg>
                                <div>
                                    <div class="font-medium text-purple-800">Test File Storage</div>
                                    <div class="text-sm text-purple-600">Upload and organize files</div>
                                </div>
                            </div>
                        </button>
                    </div>
                    <p class="text-sm text-gray-500 mt-4">Remember: All changes are temporary and will reset when your session ends.</p>
                `,
                action: null,
                highlight: null
            }
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTourState();
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.state.active) return;

            switch (e.key) {
                case 'Escape':
                    this.closeTour();
                    break;
                case 'ArrowRight':
                case 'Space':
                    e.preventDefault();
                    this.nextStep();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousStep();
                    break;
            }
        });

        // Auto-start tour for first-time visitors
        if (this.config.autoStart && !this.hasCompletedTour()) {
            setTimeout(() => this.startTour(), 2000);
        }
    }

    loadTourState() {
        try {
            const saved = localStorage.getItem('solobase-demo-tour');
            if (saved) {
                const state = JSON.parse(saved);
                this.state.completed = state.completed || false;
            }
        } catch (error) {
            console.warn('Failed to load tour state:', error);
        }
    }

    saveTourState() {
        try {
            localStorage.setItem('solobase-demo-tour', JSON.stringify({
                completed: this.state.completed,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to save tour state:', error);
        }
    }

    hasCompletedTour() {
        return this.state.completed;
    }

    startTour() {
        if (this.state.active) return;

        this.state.active = true;
        this.state.currentStep = 0;
        this.state.skipped = false;

        this.showTourOverlay();
        this.showCurrentStep();
        this.trackEvent('tour_started');
    }

    closeTour() {
        if (!this.state.active) return;

        this.state.active = false;
        this.hideTourOverlay();
        this.clearHighlights();

        if (this.state.currentStep < this.steps.length - 1) {
            this.state.skipped = true;
            this.trackEvent('tour_skipped', { step: this.state.currentStep });
        }
    }

    nextStep() {
        if (!this.state.active) return;

        if (this.state.currentStep < this.steps.length - 1) {
            this.state.currentStep++;
            this.showCurrentStep();
            this.trackEvent('tour_step_completed', { step: this.state.currentStep - 1 });
        } else {
            this.completeTour();
        }
    }

    previousStep() {
        if (!this.state.active || this.state.currentStep === 0) return;

        this.state.currentStep--;
        this.showCurrentStep();
    }

    completeTour() {
        this.state.completed = true;
        this.state.active = false;
        this.saveTourState();
        this.hideTourOverlay();
        this.clearHighlights();
        this.trackEvent('tour_completed');
        
        this.showCompletionMessage();
    }

    showCurrentStep() {
        const step = this.steps[this.state.currentStep];
        if (!step) return;

        // Update tour content
        this.updateTourContent(step);
        
        // Execute step action
        if (step.action) {
            step.action();
        }

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    updateTourContent(step) {
        const titleEl = document.getElementById('tour-title');
        const contentEl = document.getElementById('tour-content');
        const stepEl = document.getElementById('tour-step');

        if (titleEl) titleEl.textContent = step.title;
        if (contentEl) contentEl.innerHTML = step.content;
        if (stepEl) {
            stepEl.textContent = `Step ${this.state.currentStep + 1} of ${this.steps.length}`;
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('tour-prev');
        const nextBtn = document.getElementById('tour-next');

        if (prevBtn) {
            prevBtn.disabled = this.state.currentStep === 0;
        }

        if (nextBtn) {
            const isLastStep = this.state.currentStep === this.steps.length - 1;
            nextBtn.textContent = isLastStep ? 'Finish Tour' : 'Next';
        }
    }

    showTourOverlay() {
        const overlay = document.getElementById('tour-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            // Add fade-in animation
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
        }
    }

    hideTourOverlay() {
        const overlay = document.getElementById('tour-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 300);
        }
    }

    highlightElement(elementId) {
        this.clearHighlights();
        
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('tour-highlight');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    clearHighlights() {
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
    }

    focusFrame() {
        const frame = document.getElementById('demo-frame');
        if (frame && !frame.classList.contains('hidden')) {
            frame.focus();
            frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showCompletionMessage() {
        const message = document.createElement('div');
        message.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
        message.innerHTML = `
            <div class="flex items-center">
                <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                    <div class="font-semibold">Tour Complete!</div>
                    <div class="text-sm opacity-90">You're ready to explore Solobase</div>
                </div>
            </div>
        `;

        document.body.appendChild(message);

        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 300);
        }, 4000);
    }

    // Integration with demo navigation
    navigateToSection(section) {
        if (window.demoManager) {
            window.demoManager.navigateToSection(section);
        }
        
        // Close tour if active
        if (this.state.active) {
            this.closeTour();
        }
    }

    // Analytics and tracking
    trackEvent(event, data = {}) {
        // In a real implementation, this would send analytics data
        console.log('Tour Event:', event, data);
        
        // Example: Send to analytics service
        // if (window.gtag) {
        //     window.gtag('event', event, {
        //         event_category: 'demo_tour',
        //         ...data
        //     });
        // }
    }

    // Public API methods
    restartTour() {
        this.state.completed = false;
        this.state.currentStep = 0;
        this.saveTourState();
        this.startTour();
    }

    skipToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
            this.state.currentStep = stepIndex;
            this.showCurrentStep();
        }
    }

    getTourProgress() {
        return {
            currentStep: this.state.currentStep,
            totalSteps: this.steps.length,
            completed: this.state.completed,
            active: this.state.active
        };
    }

    // Configuration methods
    addStep(step, index = -1) {
        if (index === -1) {
            this.steps.push(step);
        } else {
            this.steps.splice(index, 0, step);
        }
    }

    removeStep(index) {
        if (index >= 0 && index < this.steps.length) {
            this.steps.splice(index, 1);
        }
    }

    updateStep(index, step) {
        if (index >= 0 && index < this.steps.length) {
            this.steps[index] = { ...this.steps[index], ...step };
        }
    }
}

// Add CSS for tour highlighting
const tourStyles = document.createElement('style');
tourStyles.textContent = `
    .tour-highlight {
        position: relative;
        z-index: 1000;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
        border-radius: 4px;
        transition: box-shadow 0.3s ease;
    }
    
    #tour-overlay {
        transition: opacity 0.3s ease;
        opacity: 0;
    }
    
    #tour-overlay.show {
        opacity: 1;
    }
`;
document.head.appendChild(tourStyles);

// Export for global use
window.TourManager = TourManager;