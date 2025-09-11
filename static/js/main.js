// Main JavaScript for Solobase site
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons if available
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add any other site-wide JavaScript functionality here
});