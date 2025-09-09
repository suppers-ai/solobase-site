// Documentation Search Functionality
class DocsSearch {
  constructor() {
    this.searchInput = document.getElementById('docs-search');
    this.searchResults = document.getElementById('search-results');
    this.searchIndex = null;
    this.searchData = [];
    this.isInitialized = false;
    
    if (this.searchInput) {
      this.init();
    }
  }

  async init() {
    try {
      // Load search data
      const response = await fetch('/docs/index.json');
      this.searchData = await response.json();
      
      // Initialize Lunr index
      this.searchIndex = lunr(function() {
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('description', { boost: 5 });
        this.field('content');
        this.field('tags', { boost: 3 });
        
        // Add documents to index
        this.searchData.forEach(doc => {
          this.add(doc);
        });
      }.bind(this));
      
      this.isInitialized = true;
      this.bindEvents();
    } catch (error) {
      console.error('Failed to initialize search:', error);
    }
  }

  bindEvents() {
    let searchTimeout;
    
    // Search input handler
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        this.hideResults();
        return;
      }
      
      // Debounce search
      searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
        this.hideResults();
      }
    });
    
    // Handle keyboard navigation
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideResults();
        this.searchInput.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateResults('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateResults('up');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectResult();
      }
    });
  }

  performSearch(query) {
    if (!this.isInitialized) {
      return [];
    }

    try {
      // Perform search with Lunr
      const results = this.searchIndex.search(query);
      
      // Get full document data for results
      const searchResults = results.slice(0, 8).map(result => {
        const doc = this.searchData.find(d => d.id === result.ref);
        return {
          ...doc,
          score: result.score,
          matchData: result.matchData
        };
      });
      
      this.displayResults(searchResults, query);
    } catch (error) {
      console.error('Search error:', error);
      this.displayError();
    }
  }

  displayResults(results, query) {
    if (results.length === 0) {
      this.displayNoResults(query);
      return;
    }

    const resultsHTML = results.map(result => {
      const highlightedTitle = this.highlightText(result.title, query);
      const highlightedDescription = this.highlightText(result.description || '', query);
      const excerpt = this.createExcerpt(result.content, query);
      
      return `
        <div class="search-result-item p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer" data-url="${result.url}">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="text-sm font-semibold text-gray-900 mb-1">${highlightedTitle}</h4>
              ${highlightedDescription ? `<p class="text-xs text-gray-600 mb-2">${highlightedDescription}</p>` : ''}
              ${excerpt ? `<p class="text-xs text-gray-500">${excerpt}</p>` : ''}
              <div class="flex items-center mt-2 text-xs text-gray-400">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>${this.formatUrl(result.url)}</span>
              </div>
            </div>
            <div class="ml-2 flex-shrink-0">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.searchResults.innerHTML = `
      <div class="search-results-header p-3 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"</span>
          <button class="text-xs text-gray-500 hover:text-gray-700" onclick="document.getElementById('docs-search').value = ''; this.closest('.search-results').classList.add('hidden');">
            Clear
          </button>
        </div>
      </div>
      ${resultsHTML}
      <div class="search-results-footer p-2 bg-gray-50 border-t border-gray-200">
        <div class="text-xs text-gray-500 text-center">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </div>
    `;
    
    this.showResults();
    this.bindResultEvents();
  }

  displayNoResults(query) {
    this.searchResults.innerHTML = `
      <div class="p-4 text-center">
        <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <p class="text-sm text-gray-600 mb-2">No results found for "${query}"</p>
        <p class="text-xs text-gray-500">Try different keywords or check spelling</p>
      </div>
    `;
    this.showResults();
  }

  displayError() {
    this.searchResults.innerHTML = `
      <div class="p-4 text-center">
        <svg class="w-8 h-8 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-sm text-gray-600">Search temporarily unavailable</p>
      </div>
    `;
    this.showResults();
  }

  bindResultEvents() {
    const resultItems = this.searchResults.querySelectorAll('.search-result-item');
    resultItems.forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url) {
          window.location.href = url;
        }
      });
    });
  }

  navigateResults(direction) {
    const items = this.searchResults.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    const currentActive = this.searchResults.querySelector('.search-result-item.active');
    let newIndex = 0;

    if (currentActive) {
      currentActive.classList.remove('active');
      const currentIndex = Array.from(items).indexOf(currentActive);
      
      if (direction === 'down') {
        newIndex = (currentIndex + 1) % items.length;
      } else {
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      }
    }

    items[newIndex].classList.add('active');
    items[newIndex].scrollIntoView({ block: 'nearest' });
  }

  selectResult() {
    const activeItem = this.searchResults.querySelector('.search-result-item.active');
    if (activeItem) {
      activeItem.click();
    } else {
      // If no item is active, select the first one
      const firstItem = this.searchResults.querySelector('.search-result-item');
      if (firstItem) {
        firstItem.click();
      }
    }
  }

  highlightText(text, query) {
    if (!text || !query) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  }

  createExcerpt(content, query, maxLength = 150) {
    if (!content || !query) return '';
    
    const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
    if (queryIndex === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + query.length + 100);
    
    let excerpt = content.substring(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return this.highlightText(excerpt, query);
  }

  formatUrl(url) {
    return url.replace('/docs/', '').replace(/\/$/, '') || 'Documentation';
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  showResults() {
    this.searchResults.classList.remove('hidden');
  }

  hideResults() {
    this.searchResults.classList.add('hidden');
  }
}

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load Lunr.js if not already loaded
  if (typeof lunr === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lunr@2.3.9/lunr.min.js';
    script.onload = () => {
      new DocsSearch();
    };
    document.head.appendChild(script);
  } else {
    new DocsSearch();
  }
});

// Add CSS for search results
const searchStyles = `
  .search-result-item.active {
    background-color: #f3f4f6;
  }
  
  .search-result-item:hover {
    background-color: #f9fafb;
  }
  
  mark {
    background-color: #fef3c7;
    padding: 0 2px;
    border-radius: 2px;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = searchStyles;
document.head.appendChild(styleSheet);