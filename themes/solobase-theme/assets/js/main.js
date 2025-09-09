// Main JavaScript for Solobase demo site

// Performance optimization utilities
const PerformanceUtils = {
    // Lazy loading for images
    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                img.classList.add('loaded');
            });
        }
    },

    // Preload critical resources
    preloadCriticalResources() {
        const criticalResources = [
            { href: '/css/main.css', as: 'style' },
            { href: '/js/main.js', as: 'script' }
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;
            if (resource.as === 'style') {
                link.onload = function() { this.rel = 'stylesheet'; };
            }
            document.head.appendChild(link);
        });
    },

    // Optimize font loading
    optimizeFontLoading() {
        if ('fonts' in document) {
            // Preload critical fonts
            const criticalFonts = [
                'Inter',
                'JetBrains Mono'
            ];

            criticalFonts.forEach(fontFamily => {
                document.fonts.load(`1em ${fontFamily}`).catch(err => {
                    console.warn(`Failed to preload font: ${fontFamily}`, err);
                });
            });
        }
    },

    // Debounce function for performance
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction() {
            const args = arguments;
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Mobile menu toggle with improved performance
function toggleMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const menu = overlay?.querySelector('div:last-child');
    const button = document.getElementById('mobile-menu-button');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    
    if (!overlay || !menu) return;
    
    if (overlay.classList.contains('hidden')) {
        // Open menu
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            menu.classList.remove('translate-x-full');
        });
        button?.setAttribute('aria-expanded', 'true');
        menuIcon?.classList.add('hidden');
        closeIcon?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        closeMobileMenu();
    }
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const menu = overlay?.querySelector('div:last-child');
    const button = document.getElementById('mobile-menu-button');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    
    if (!overlay || !menu) return;
    
    menu.classList.add('translate-x-full');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
    button?.setAttribute('aria-expanded', 'false');
    menuIcon?.classList.remove('hidden');
    closeIcon?.classList.add('hidden');
    document.body.style.overflow = '';
}

// Copy to clipboard functionality
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.textContent || element.innerText;
    
    if (navigator.clipboard && window.isSecureContext) {
        // Use modern clipboard API
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback();
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(text);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback();
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

// Show copy feedback
function showCopyFeedback() {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.textContent = 'Copied to clipboard!';
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
    
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// Smooth scroll to anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initSmoothScroll();
    
    // Initialize search functionality if on docs pages
    if (document.getElementById('docs-search')) {
        initDocsSearch();
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuButton = event.target.closest('button');
        
        if (mobileMenu && !mobileMenu.classList.contains('hidden') && 
            !mobileMenu.contains(event.target) && 
            (!menuButton || menuButton.onclick !== toggleMobileMenu)) {
            mobileMenu.classList.add('hidden');
        }
    });
    
    // Add copy buttons to code blocks
    document.querySelectorAll('pre code').forEach((block, index) => {
        const pre = block.parentElement;
        if (pre.tagName === 'PRE') {
            const button = document.createElement('button');
            button.className = 'code-copy-btn';
            button.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
            `;
            button.onclick = () => copyToClipboard(`code-block-${index}`);
            
            // Add ID to code block for copying
            block.id = `code-block-${index}`;
            
            // Position button
            pre.style.position = 'relative';
            pre.appendChild(button);
        }
    });
});

// Analytics (placeholder for future implementation)
function trackEvent(eventName, properties = {}) {
    // This would integrate with your analytics service
    console.log('Event tracked:', eventName, properties);
}

// Initialize documentation search
function initDocsSearch() {
    // Load Lunr.js if not already loaded
    if (typeof lunr === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lunr@2.3.9/lunr.min.js';
        script.onload = () => {
            loadSearchScript();
        };
        document.head.appendChild(script);
    } else {
        loadSearchScript();
    }
}

function loadSearchScript() {
    const script = document.createElement('script');
    script.src = '/js/search.js';
    document.head.appendChild(script);
}

// Demo-specific functions (if needed)
window.demoFunctions = {
    trackDemoStart: () => trackEvent('demo_started'),
    trackDemoError: (error) => trackEvent('demo_error', { error }),
    trackDemoSuccess: () => trackEvent('demo_success')
};