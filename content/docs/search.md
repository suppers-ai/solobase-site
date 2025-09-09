---
title: "Search Documentation"
description: "Search through all Solobase documentation"
layout: "search"
---

# Search Documentation

Use the search box below to find information across all Solobase documentation.

<div class="max-w-2xl mx-auto mt-8">
    <div class="relative">
        <input 
            type="text" 
            id="main-search" 
            placeholder="Search documentation..." 
            class="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
        >
        <div class="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
            <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        </div>
    </div>
    
    <!-- Search results will be populated here -->
    <div id="main-search-results" class="hidden mt-4 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"></div>
</div>

## Popular Topics

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-12">
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="font-semibold text-gray-900 mb-2">Getting Started</h3>
        <ul class="space-y-1 text-sm">
            <li><a href="/docs/installation/" class="text-blue-600 hover:text-blue-800">Installation</a></li>
            <li><a href="/docs/configuration/" class="text-blue-600 hover:text-blue-800">Configuration</a></li>
            <li><a href="/docs/quick-start/" class="text-blue-600 hover:text-blue-800">Quick Start</a></li>
        </ul>
    </div>
    
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="font-semibold text-gray-900 mb-2">API Reference</h3>
        <ul class="space-y-1 text-sm">
            <li><a href="/docs/api/auth/" class="text-blue-600 hover:text-blue-800">Authentication</a></li>
            <li><a href="/docs/api/database/" class="text-blue-600 hover:text-blue-800">Database API</a></li>
            <li><a href="/docs/api/storage/" class="text-blue-600 hover:text-blue-800">Storage API</a></li>
        </ul>
    </div>
    
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="font-semibold text-gray-900 mb-2">Deployment</h3>
        <ul class="space-y-1 text-sm">
            <li><a href="/docs/deployment/docker/" class="text-blue-600 hover:text-blue-800">Docker</a></li>
            <li><a href="/docs/deployment/cloud/" class="text-blue-600 hover:text-blue-800">Cloud Platforms</a></li>
            <li><a href="/docs/deployment/security/" class="text-blue-600 hover:text-blue-800">Security</a></li>
        </ul>
    </div>
</div>

## Search Tips

- Use specific keywords for better results
- Try different variations of terms
- Use quotes for exact phrases: `"exact phrase"`
- Combine terms with AND: `docker AND deployment`
- Use wildcards: `config*` to match configuration, configure, etc.

## Can't Find What You're Looking For?

If you can't find the information you need:

- Check our [GitHub Issues](https://github.com/user/solobase/issues) for known problems
- Try the [Live Demo](/demo/) to see features in action
- Join our [Community Discord](https://discord.gg/solobase) for help
- Email us at [support@solobase.dev](mailto:support@solobase.dev)