// Privacy-focused analytics
(function() {
  'use strict';
  
  // Simple privacy-focused analytics that doesn't track personal data
  const Analytics = {
    endpoint: '/api/analytics',
    sessionId: null,
    
    init() {
      // Generate anonymous session ID
      this.sessionId = this.getOrCreateSessionId();
      
      // Track page view
      this.trackPageView();
      
      // Track events
      this.setupEventTracking();
      
      // Track performance metrics
      this.trackPerformance();
    },
    
    getOrCreateSessionId() {
      let sessionId = sessionStorage.getItem('analytics_session');
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('analytics_session', sessionId);
      }
      return sessionId;
    },
    
    trackPageView() {
      const data = {
        type: 'pageview',
        sessionId: this.sessionId,
        page: window.location.pathname,
        referrer: document.referrer || 'direct',
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: screen.width,
          height: screen.height
        }
      };
      
      this.send(data);
    },
    
    trackEvent(category, action, label = null, value = null) {
      const data = {
        type: 'event',
        sessionId: this.sessionId,
        category,
        action,
        label,
        value,
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      };
      
      this.send(data);
    },
    
    setupEventTracking() {
      // Track demo starts
      document.addEventListener('click', (e) => {
        if (e.target.matches('[data-demo-start]')) {
          this.trackEvent('Demo', 'Start', 'Button Click');
        }
        
        // Track documentation navigation
        if (e.target.matches('.docs-nav a')) {
          this.trackEvent('Documentation', 'Navigate', e.target.textContent);
        }
        
        // Track external links
        if (e.target.matches('a[href^="http"]') && !e.target.href.includes(window.location.hostname)) {
          this.trackEvent('External Link', 'Click', e.target.href);
        }
        
        // Track downloads
        if (e.target.matches('a[download]')) {
          this.trackEvent('Download', 'Click', e.target.getAttribute('download'));
        }
      });
      
      // Track search
      const searchInput = document.querySelector('#search-input');
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            if (e.target.value.length > 2) {
              this.trackEvent('Search', 'Query', e.target.value);
            }
          }, 1000);
        });
      }
      
      // Track scroll depth
      let maxScroll = 0;
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
          if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
            if (scrollPercent % 25 === 0) {
              this.trackEvent('Engagement', 'Scroll Depth', `${scrollPercent}%`);
            }
          }
        }, 500);
      });
      
      // Track time on page
      const startTime = Date.now();
      window.addEventListener('beforeunload', () => {
        const timeOnPage = Math.round((Date.now() - startTime) / 1000);
        this.trackEvent('Engagement', 'Time on Page', window.location.pathname, timeOnPage);
      });
    },
    
    trackPerformance() {
      if (window.performance && window.performance.timing) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const timing = window.performance.timing;
            const metrics = {
              type: 'performance',
              sessionId: this.sessionId,
              page: window.location.pathname,
              metrics: {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                loadComplete: timing.loadEventEnd - timing.loadEventStart,
                domInteractive: timing.domInteractive - timing.domLoading,
                pageLoadTime: timing.loadEventEnd - timing.navigationStart,
                dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
                tcpTime: timing.connectEnd - timing.connectStart,
                requestTime: timing.responseEnd - timing.requestStart,
                renderTime: timing.domComplete - timing.domLoading
              },
              timestamp: new Date().toISOString()
            };
            
            this.send(metrics);
          }, 0);
        });
      }
      
      // Track Core Web Vitals
      if ('PerformanceObserver' in window) {
        // Largest Contentful Paint
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.trackEvent('Web Vitals', 'LCP', window.location.pathname, Math.round(lastEntry.renderTime || lastEntry.loadTime));
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}
        
        // First Input Delay
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              this.trackEvent('Web Vitals', 'FID', window.location.pathname, Math.round(entry.processingStart - entry.startTime));
            });
          });
          fidObserver.observe({ type: 'first-input', buffered: true });
        } catch (e) {}
        
        // Cumulative Layout Shift
        let clsValue = 0;
        try {
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
          
          // Report CLS when page is hidden
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
              this.trackEvent('Web Vitals', 'CLS', window.location.pathname, Math.round(clsValue * 1000));
            }
          });
        } catch (e) {}
      }
    },
    
    send(data) {
      // Don't track in development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('[Analytics]', data);
        return;
      }
      
      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.endpoint, JSON.stringify(data));
      } else {
        // Fallback to fetch
        fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
          keepalive: true
        }).catch(() => {
          // Silently fail - analytics should not break the site
        });
      }
    }
  };
  
  // Initialize analytics when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Analytics.init());
  } else {
    Analytics.init();
  }
  
  // Expose for manual tracking
  window.Analytics = Analytics;
})();