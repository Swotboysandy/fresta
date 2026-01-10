(function () {

    const BG_URL = 'https://www.maxgood.nl/wp-content/uploads/2025/01/Iphone-Product-BG.jpg.webp';

    function normalizeAndForceBg() {

        // 1. Normalize ALL slides
        document.querySelectorAll('.zoom.nslick-slide').forEach(slide => {

            // Force consistent class
            if (!slide.classList.contains('woocommerce-product-gallery__image')) {
                slide.classList.add('woocommerce-product-gallery__image');
            }

            // Force background
            slide.style.setProperty('background-image', `url(${BG_URL})`, 'important');
            slide.style.setProperty('background-size', 'cover', 'important');
            slide.style.setProperty('background-position', 'center', 'important');
            slide.style.setProperty('background-repeat', 'no-repeat', 'important');
            slide.style.setProperty('position', 'relative', 'important');
        });

        // 2. Ensure images sit ABOVE the background
        document.querySelectorAll('.zoom.nslick-slide img').forEach(img => {
            img.style.setProperty('position', 'relative', 'important');
            img.style.setProperty('z-index', '2', 'important');
            img.style.setProperty('background', 'transparent', 'important');
        });
    }

    // Run immediately
    normalizeAndForceBg();

    // Run on load + Slick lifecycle
    window.addEventListener('load', normalizeAndForceBg);
    document.addEventListener('DOMContentLoaded', normalizeAndForceBg);

    // Watch Slick DOM mutations (this is the lock)
    const slider = document.querySelector('.nickx-slider-for');
    if (slider) {
        new MutationObserver(normalizeAndForceBg).observe(slider, {
            childList: true,
            subtree: true
        });
    }

})();
