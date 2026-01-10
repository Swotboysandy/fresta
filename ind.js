document.addEventListener("DOMContentLoaded", function () {
    // Select all color items
    const colorItems = document.querySelectorAll(".color-variable-item");

    // Loop through each color item to adjust the price difference
    colorItems.forEach(item => {
        const priceDifference = item.querySelector(".price-difference");

        if (priceDifference) {
            // Add a margin to the price difference dynamically
            priceDifference.style.marginTop = "10px"; // Adjust as needed
        }
    });

    // Add spacing to ensure the battery label is not overlapped
    const colorWrapper = document.querySelector(".color-variable-items-wrapper");
    if (colorWrapper) {
        colorWrapper.style.marginBottom = "20px"; // Add space below color section
    }
});
jQuery(document).ready(function($) {
    $('td:contains("Clear")').remove(); // Removes any <td> containing the word "Clear"
});

jQuery(document).ready(function($) {
    function addPriceDifferences() {
        const baseVariationId = $('.variation_id').val();
        const variations = $('.variations_form').data('product_variations');
        const baseVariation = variations.find(v => v.variation_id.toString() === baseVariationId);
        const basePrice = baseVariation ? baseVariation.display_price : 0;

        $('.variable-item').each(function() {
            const $item = $(this);
            const attributeName = $item.closest('ul').data('attribute_name');
            const attributeValue = $item.data('value');

            if ($item.hasClass('selected')) {
                if ($item.find('.price-difference').length) {
                    $item.find('.price-difference').remove();
                }
                if (!$item.find('.tick-icon').length) {
                    const isColorSwatch = $item.hasClass('color-variable-item');
                    const tickStyle = isColorSwatch
                        ? 'position: absolute; top: 134%; left: 50%; transform: translateX(-50%); color: black; font-size: 12px;'
                        : 'color: black; font-size: 12px; margin-left: 5px;';
                    $item.append(`<div class="tick-icon" style="${tickStyle}">&#10004;</div>`); // Changed to simple tick
                }
                return;
            }

            $item.find('.tick-icon').remove();

            const tempSelections = getCurrentSelections();
            tempSelections[attributeName] = attributeValue;
            
            const matchingVariation = variations.find(variation => {
                return Object.entries(variation.attributes).every(([key, value]) => {
                    return !value || tempSelections[key] === value;
                });
            });

            if (matchingVariation) {
                const priceDiff = matchingVariation.display_price - basePrice;
                let priceHtml = '';
                
                if (priceDiff !== 0) {
                    priceHtml = `<div class="price-difference" style="font-size: 12px; margin-top: 4px; color: ${priceDiff > 0 ? '#e44' : '#4a4'}">
                        ${priceDiff > 0 ? '+' : ''}${formatPrice(priceDiff)}
                    </div>`;
                }

                if ($item.find('.price-difference').length) {
                    $item.find('.price-difference').replaceWith(priceHtml);
                } else {
                    $item.find('.variable-item-contents').append(priceHtml);
                }
            }
        });
    }

    function getCurrentSelections() {
        const selections = {};
        $('.woo-variation-raw-select').each(function() {
            const name = $(this).attr('name');
            const value = $(this).val();
            selections[name] = value;
        });
        return selections;
    }

    function formatPrice(price) {
        const formattedPrice = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0, // Removes trailing double zeroes
        }).format(price);
        return formattedPrice;
    }

    function handleOptionClick() {
        $('.variable-item').on('click', function() {
            const $item = $(this);
            const attributeName = $item.closest('ul').data('attribute_name');
            const attributeValue = $item.data('value');

            // Update selection state
            $item.siblings().removeClass('selected').find('.tick-icon').remove();
            $item.addClass('selected');

            // Add tick icon
            if (!$item.find('.tick-icon').length) {
                const isColorSwatch = $item.hasClass('color-variable-item'); // Check if it's a color swatch
                const tickStyle = isColorSwatch
                    ? 'position: absolute; top: 134%; left: 50%; transform: translateX(-50%); color: black; font-size: 12px;'
                    : 'color: black; font-size: 12px; margin-left: 5px;';
                $item.append(`<div class="tick-icon" style="${tickStyle}">&#10004;</div>`); // Changed to simple tick
            }

            // Dynamically update selection values
            $(`.woo-variation-raw-select[name="${attributeName}"]`).val(attributeValue).change();

            // Simulate variation update
            triggerVariationUpdate();
        });
    }

    function triggerVariationUpdate() {
        const $form = $('.variations_form');
        const variations = $form.data('product_variations');

        // Update variation data based on current selections
        const selections = getCurrentSelections();
        const matchingVariation = variations.find(variation => {
            return Object.entries(variation.attributes).every(([key, value]) => {
                return !value || selections[key] === value;
            });
        });

        if (matchingVariation) {
            // Update visible data
            $('.woocommerce-variation-price').html(matchingVariation.price_html || '');
            $('.variation_id').val(matchingVariation.variation_id);
            $('.woocommerce-variation-add-to-cart').removeClass('disabled');
        } else {
            $('.woocommerce-variation-price').html('');
            $('.variation_id').val('');
            $('.woocommerce-variation-add-to-cart').addClass('disabled');
        }

        // Trigger custom events for other updates
        $form.trigger('woocommerce_variation_has_changed');
    }

    function preSelectOptions() {
        const selections = getCurrentSelections();
        Object.entries(selections).forEach(([key, value]) => {
            const $item = $(`.variable-item[data-value="${value}"]`);
            if ($item.length) {
                $item.addClass('selected');
                if (!$item.find('.tick-icon').length) {
                    const isColorSwatch = $item.hasClass('color-variable-item');
                    const tickStyle = isColorSwatch
                        ? 'position: absolute; top: 134% ; left: 50%; transform: translateX(-50%); color: black; font-size: 12px;'
                        : 'color: black; font-size: 12px; margin-left: 5px;';
                    $item.append(`<div class="tick-icon" style="${tickStyle}">&#10004;</div>`); // Changed to simple tick
                }
            }
        });

        triggerVariationUpdate();
    }

    // Initialize
    setTimeout(() => {
        addPriceDifferences();
        preSelectOptions();
        handleOptionClick();
    }, 1000);

    $('.variations_form')
        .on('woocommerce_variation_has_changed', addPriceDifferences)
        .on('found_variation', addPriceDifferences);
});

document.addEventListener("DOMContentLoaded", function () {
    function attachVariationHandler(wrapperSelector, attributeName) {
        const wrapper = document.querySelector(wrapperSelector);
        if (!wrapper) return;

        wrapper.addEventListener("click", function (event) {
            const target = event.target.closest(".variable-item");
            if (!target) return;

            // Highlight the selected button
            wrapper.querySelectorAll(".variable-item").forEach(item => item.classList.remove("selected"));
            target.classList.add("selected");

            // Update the WooCommerce hidden <select> field
            const select = document.querySelector(`select[name="${attributeName}"]`);
            if (select) {
                select.value = target.getAttribute("data-value");
                select.dispatchEvent(new Event("change")); // Trigger WooCommerce logic
            }
        });
    }

    // Attach handlers for capacity and colors
    attachVariationHandler(".button-variable-items-wrapper[data-attribute_name='attribute_pa_capacity']", "attribute_pa_capacity");
    attachVariationHandler(".color-variable-items-wrapper[data-attribute_name='attribute_pa_kleur']", "attribute_pa_kleur");
});

jQuery(document).ready(function ($) {
    function updateSelectedAttributesAndPrice() {
        // Fetch the selected attributes
        const selectedColor = $('select[name="attribute_pa_kleur"] option:selected').val() || 'N/A';
        const selectedCapacity = $('select[name="attribute_pa_capacity"] option:selected').val() || 'N/A';
        const selectedCondition = $('select[name="attribute_pa_condition"] option:selected').val() || 'N/A';


        // Construct the attributes text
        const attributesText = `${selectedColor} | ${selectedCapacity} | ${selectedCondition}`;

        // Check if the attributes container already exists
        if ($('#selected-attributes').length) {
            // Update the attributes text
            $('#selected-attributes').text(attributesText);
        } else {
            // Insert the attributes text above the price
            $('.summary .price').before(`<div id="selected-attributes" style="font-size: 14px; margin-bottom: 5px;">${attributesText}</div>`);
        }
    }

    // Hook into WooCommerce variation change
    $('form.variations_form').on('change', 'select', function () {
        updateSelectedAttributesAndPrice();
    });

    // Initialize attributes on page load
    updateSelectedAttributesAndPrice();
});

jQuery(document).ready(function ($) {
    function updateSelectedAttributes() {
        // Fetch the selected attributes
        const selectedColor = $('select[name="attribute_pa_kleur"] option:selected').val() || 'N/A';
        const selectedCapacity = $('select[name="attribute_pa_capacity"] option:selected').val() || 'N/A';
        const selectedCondition = $('select[name="attribute_pa_condition"] option:selected').val() || 'N/A';

        // Clear the container to prevent duplication
        $('#selected-attributes-container').html('');

        // Update the container with only the values
        $('#selected-attributes-container').html(`
            <span>${selectedColor} | </span>
            <span>${selectedCapacity} | </span>
            <span>${selectedCondition}</span>
        `);
    }

    // Hook into WooCommerce variation change
    $('form.variations_form').on('change', 'select', function () {
        updateSelectedAttributes();
    });

    // Initialize the attributes on page load
    updateSelectedAttributes();
});

jQuery(document).ready(function ($) {
    const priceContainer = $('#dynamic-price-container');

    // Show variation price dynamically
    $('form.variations_form').on('show_variation', function (event, variation) {
        if (variation.price_html) {
            priceContainer.html(variation.price_html); // Update price with selected variation.
        }
    });

    // Reset price to default when variations are cleared
    $('form.variations_form').on('reset_data', function () {
        const defaultPrice = $('.product .price').html(); // Use the original price from WooCommerce.
        priceContainer.html(defaultPrice); // Reset the container to the original price.
    });
});


document.addEventListener('DOMContentLoaded', function () {
    // Disable FancyBox and Lightbox triggers
    const fancyboxTriggers = document.querySelectorAll('[data-fancybox], .woocommerce-product-gallery__image a, .zoom');
    fancyboxTriggers.forEach(trigger => {
        trigger.removeAttribute('data-fancybox'); // Remove FancyBox attribute
        trigger.style.pointerEvents = 'none'; // Disable click events
        trigger.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default behavior
        });
    });

    // Remove FancyBox overlay elements if already initialized
    const fancyboxContainers = document.querySelectorAll('.fancybox-container, .fancybox-bg, .fancybox-slide');
    fancyboxContainers.forEach(container => {
        container.style.display = 'none'; // Hide FancyBox elements
    });
});

 // JavaScript to calculate 30 days from today
    document.addEventListener('DOMContentLoaded', function () {
        const today = new Date();
        const returnDate = new Date();
        returnDate.setDate(today.getDate() + 30); // Add 30 days to today's date

        // Format the date as "31 January"
        const options = { day: 'numeric', month: 'long' };
        const formattedDate = returnDate.toLocaleDateString('nl-NL', options);

        // Update the return date in the HTML
        const returnDateElement = document.getElementById('return-date');
        if (returnDateElement) {
            returnDateElement.textContent = `Retourneren tot ${formattedDate}`;
        }
    });

document.addEventListener("DOMContentLoaded", function () {
    const dropdownButton = document.querySelector("#price-dropdown-button");
    const dropdownList = document.querySelector("#price-dropdown-list");
    const sliderRange = document.querySelector("#price-slider-range");
    const priceMinInput = document.querySelector("#price-min");
    const priceMaxInput = document.querySelector("#price-max");

    let minPrice = 0;
    let maxPrice = 5000; // Adjust max price as needed

    // Toggle dropdown visibility
    dropdownButton.addEventListener("click", function (event) {
        event.stopPropagation();
        dropdownList.style.display =
            dropdownList.style.display === "block" ? "none" : "block";
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function () {
        dropdownList.style.display = "none";
    });

    // Prevent dropdown from closing when interacting with it
    dropdownList.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    // Initialize jQuery UI Slider
    jQuery(sliderRange).slider({
        range: true,
        min: minPrice,
        max: maxPrice,
        values: [minPrice, maxPrice],
        slide: function (event, ui) {
            priceMinInput.value = ui.values[0];
            priceMaxInput.value = ui.values[1];
        },
        change: function (event, ui) {
            filterProducts(ui.values[0], ui.values[1]);
        },
    });

    // Update slider when input values are changed
    priceMinInput.addEventListener("change", function () {
        const min = parseInt(priceMinInput.value) || minPrice;
        const max = parseInt(priceMaxInput.value) || maxPrice;
        if (min <= max) {
            jQuery(sliderRange).slider("values", 0, min);
            filterProducts(min, max);
        }
    });

    priceMaxInput.addEventListener("change", function () {
        const min = parseInt(priceMinInput.value) || minPrice;
        const max = parseInt(priceMaxInput.value) || maxPrice;
        if (min <= max) {
            jQuery(sliderRange).slider("values", 1, max);
            filterProducts(min, max);
        }
    });

    // AJAX function for price filtering
    function filterProducts(min, max) {
        jQuery.ajax({
            url: woocommerce_params.ajax_url,
            type: "POST",
            data: {
                action: "filter_by_price",
                min_price: min,
                max_price: max,
            },
            success: function (response) {
                const productGrid = document.querySelector(".products");
                if (productGrid) {
                    productGrid.innerHTML = response;
                }
            },
            error: function () {
                console.error("Failed to filter products.");
            },
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const verschijningsjaarDropdownButton = document.querySelector("#verschijningsjaar-dropdown-button");
    const verschijningsjaarDropdownList = document.querySelector("#verschijningsjaar-dropdown-list");
    const verschijningsjaarCheckboxes = document.querySelectorAll(".verschijningsjaar-checkbox");

    let selectedYears = []; // Store selected publication years

    // Toggle dropdown visibility
    verschijningsjaarDropdownButton.addEventListener("click", function (event) {
        event.stopPropagation();
        verschijningsjaarDropdownList.style.display =
            verschijningsjaarDropdownList.style.display === "block" ? "none" : "block";
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function () {
        verschijningsjaarDropdownList.style.display = "none";
    });

    // Prevent dropdown from closing when interacting inside
    verschijningsjaarDropdownList.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    // Handle checkbox selection
    verschijningsjaarCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", function () {
            const selectedYear = this.value;

            if (this.checked) {
                selectedYears.push(selectedYear); // Add selected year
            } else {
                selectedYears = selectedYears.filter(year => year !== selectedYear); // Remove unselected year
            }

            filterProducts(); // Perform AJAX filtering
        });
    });

    // AJAX function to filter products by Verschijningsjaar
    function filterProducts() {
        jQuery.ajax({
            url: woocommerce_params.ajax_url,
            type: "POST",
            data: {
                action: "filter_by_verschijningsjaar",
                verschijningsjaar: selectedYears,
            },
            success: function (response) {
                const productGrid = document.querySelector(".products");
                if (productGrid) {
                    productGrid.innerHTML = response;
                }
            },
            error: function () {
                console.error("Failed to filter products.");
            },
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const dropdownButtons = document.querySelectorAll(".dropdown-button"); // All filter buttons
    const dropdownLists = document.querySelectorAll(".dropdown-list"); // All dropdown lists

    const modelDropdownButton = document.querySelector("#model-dropdown-button");
    const modelDropdownList = document.querySelector("#model-dropdown-list");
    const modelCheckboxes = document.querySelectorAll(".model-checkbox");

    const verschijningsjaarDropdownButton = document.querySelector("#verschijningsjaar-dropdown-button");
    const verschijningsjaarDropdownList = document.querySelector("#verschijningsjaar-dropdown-list");
    const verschijningsjaarCheckboxes = document.querySelectorAll(".verschijningsjaar-checkbox");

    let selectedModels = []; // Store selected models
    let selectedYears = []; // Store selected publication years

    // Helper function to close all dropdowns
    function closeAllDropdowns() {
        dropdownLists.forEach(list => (list.style.display = "none"));
    }

    // Generic function to handle dropdown toggle
    function toggleDropdown(button, list) {
        closeAllDropdowns(); // Close other dropdowns
        list.style.display = list.style.display === "block" ? "none" : "block";
    }

    // Event listeners for dropdown buttons
    modelDropdownButton.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleDropdown(modelDropdownButton, modelDropdownList);
    });

    verschijningsjaarDropdownButton.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleDropdown(verschijningsjaarDropdownButton, verschijningsjaarDropdownList);
    });

    // Close dropdowns when clicking outside
    document.addEventListener("click", function () {
        closeAllDropdowns();
    });

    // Prevent dropdown from closing when interacting inside
    modelDropdownList.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    verschijningsjaarDropdownList.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    // Handle checkbox selection for models
    modelCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", function () {
            const selectedModel = this.value;

            if (this.checked) {
                selectedModels.push(selectedModel); // Add selected model
            } else {
                selectedModels = selectedModels.filter(model => model !== selectedModel); // Remove unselected model
            }

            filterProductsByModel(); // Perform AJAX filtering for models
        });
    });

    // Handle checkbox selection for years
    verschijningsjaarCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", function () {
            const selectedYear = this.value;

            if (this.checked) {
                selectedYears.push(selectedYear); // Add selected year
            } else {
                selectedYears = selectedYears.filter(year => year !== selectedYear); // Remove unselected year
            }

            filterProductsByYear(); // Perform AJAX filtering for years
        });
    });

    // AJAX function to filter products by model
    function filterProductsByModel() {
        jQuery.ajax({
            url: woocommerce_params.ajax_url,
            type: "POST",
            data: {
                action: "filter_by_model",
                models: selectedModels,
            },
            success: function (response) {
                const productGrid = document.querySelector(".products");
                if (productGrid) {
                    productGrid.innerHTML = response;
                }
            },
            error: function () {
                console.error("Failed to filter products by model.");
            },
        });
    }

    // AJAX function to filter products by year
    function filterProductsByYear() {
        jQuery.ajax({
            url: woocommerce_params.ajax_url,
            type: "POST",
            data: {
                action: "filter_by_verschijningsjaar",
                verschijningsjaar: selectedYears,
            },
            success: function (response) {
                const productGrid = document.querySelector(".products");
                if (productGrid) {
                    productGrid.innerHTML = response;
                }
            },
            error: function () {
                console.error("Failed to filter products by year.");
            },
        });
    }
});
document.addEventListener("DOMContentLoaded", function () {
    const dropdownButton = document.querySelector("#dropdown-button");
    const dropdownList = document.querySelector("#dropdown-list");
    const checkboxes = document.querySelectorAll(".color-checkbox");

    let selectedColors = []; // Store selected colors

    // Toggle dropdown visibility
    dropdownButton.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent bubbling
        dropdownList.style.display =
            dropdownList.style.display === "block" ? "none" : "block"; // Toggle
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function () {
        dropdownList.style.display = "none";
    });

    // Prevent dropdown from closing when clicking inside it
    dropdownList.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    // Handle checkbox selection
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", function () {
            const selectedColor = this.value;

            if (this.checked) {
                selectedColors.push(selectedColor); // Add selected color
            } else {
                selectedColors = selectedColors.filter(color => color !== selectedColor); // Remove unselected color
            }

            filterProducts(); // Perform AJAX filtering
        });
    });

    // AJAX function to filter products by color
    function filterProducts() {
        jQuery.ajax({
            url: woocommerce_params.ajax_url,
            type: "POST",
            data: {
                action: "filter_by_color",
                colors: selectedColors,
            },
            success: function (response) {
                const productGrid = document.querySelector(".products");
                if (productGrid) {
                    productGrid.innerHTML = response;
                }
            },
            error: function () {
                console.error("Failed to fetch filtered products.");
            },
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const dropdownButton = document.querySelector("#capacity-dropdown-button");
    const dropdownList = document.querySelector("#capacity-dropdown-list");

    // Toggle dropdown visibility
    dropdownButton.addEventListener("click", function (event) {
        event.stopPropagation();
        dropdownList.style.display =
            dropdownList.style.display === "block" ? "none" : "block";
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function () {
        dropdownList.style.display = "none";
    });

    // Prevent dropdown from closing when clicking inside
    dropdownList.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    // Handle checkbox selection
    const checkboxes = document.querySelectorAll(".capacity-checkbox");
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", function () {
            filterProducts(); // Trigger AJAX call on change
        });
    });

    // AJAX function to filter products
    function filterProducts() {
        const selectedCapacities = Array.from(document.querySelectorAll(".capacity-checkbox:checked")).map(
            (checkbox) => checkbox.value
        );

        jQuery.ajax({
            url: woocommerce_params.ajax_url, // WooCommerce AJAX URL
            method: "POST",
            data: {
                action: "filter_by_capacity",
                capacity: selectedCapacities,
            },
            success: function (response) {
                const productContainer = document.querySelector(".products");
                if (productContainer) {
                    productContainer.innerHTML = response;
                }
            },
            error: function (error) {
                console.error("Error fetching filtered products:", error);
            },
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const dropdownButtons = document.querySelectorAll(".dropdown-button"); // All filter buttons
    const dropdownLists = document.querySelectorAll(".dropdown-list"); // All dropdown lists

    // Helper function to close all dropdowns
    function closeAllDropdowns() {
        dropdownLists.forEach(list => {
            list.style.display = "none";
        });
    }

    // Generic function to handle dropdown toggle
    function toggleDropdown(button, list) {
        // Close all other dropdowns before toggling the current one
        closeAllDropdowns();
        list.style.display = list.style.display === "block" ? "none" : "block";
    }

    // Event listeners for dropdown buttons
    dropdownButtons.forEach((button, index) => {
        const correspondingList = dropdownLists[index];

        button.addEventListener("click", function (event) {
            event.stopPropagation();
            toggleDropdown(button, correspondingList);
        });
    });

    // Close all dropdowns when clicking outside any of them
    document.addEventListener("click", function () {
        closeAllDropdowns();
    });

    // Prevent dropdown from closing when interacting inside
    dropdownLists.forEach(list => {
        list.addEventListener("click", function (event) {
            event.stopPropagation();
        });
    });
});

// ADD TO CART STICKY
jQuery(document).ready(function ($) {
    const stickyCart = $('#sticky-add-to-cart');
    const stickyHeader = $('#sticky-header');

    const scrollTriggerOffset = 100; // Adjust this value to trigger earlier or later

    // Show sticky header and cart when scrolling slightly
    $(window).on('scroll', function () {
        const scrollPosition = $(window).scrollTop();

        if (scrollPosition > scrollTriggerOffset) {
            stickyHeader.fadeIn();
            stickyCart.fadeIn();
        } else {
            stickyHeader.fadeOut();
            stickyCart.fadeOut();
        }
    });

    // Function to update sticky cart with selected attributes and price
    const variationsForm = $('.variations_form');

    function updateStickyCart(variation = null) {
        const selectedAttributes = new Set(); // Use a Set to store unique attributes

        // Loop through the dropdowns to get selected values
        variationsForm.find('.variations select').each(function () {
            const attributeName = $(this).data('attribute_name') || ''; // Fetch attribute name
            const attributeValue = $(this).find('option:selected').text().trim();

            // Exclude "battery" attribute
            if (
                attributeName.toLowerCase() !== 'attribute_battery' &&
                attributeValue &&
                attributeValue.toLowerCase() !== 'choose an option'
            ) {
                selectedAttributes.add(attributeValue); // Add to Set to avoid duplicates
            }
        });

        // Update the attributes in the sticky bar
        $('#sticky-selected-attributes').html(Array.from(selectedAttributes).join(', ')); // Convert Set to array and join with commas

        // Update the product price if variation is valid
        if (variation) {
            $('#sticky-product-price').html(variation.price_html);
        }
    }

    // Event: Variation is selected
    variationsForm.on('show_variation', function (event, variation) {
        updateStickyCart(variation);
    });

    // Event: Attributes are changed but no variation is selected yet
    variationsForm.on('change', '.variations select', function () {
        updateStickyCart(null);
    });

    // Reset sticky cart when attributes are reset
    variationsForm.on('reset_data', function () {
        $('#sticky-product-image img').attr('src', '');
        $('#sticky-product-price').html('');
        $('#sticky-selected-attributes').html('');
    });
});


jQuery(document).ready(function ($) {
    // Select the sticky header container
    const stickyHeader = $('.elementor-element-936e2c2'); // Adjust to match your header ID or class

    // Select the sticky add-to-cart section
    const stickyCart = $('#sticky-add-to-cart');

    // Set the desired offset below the header
    const desiredOffset = 74.594;

    // Move sticky cart below the header
    function adjustStickyCartPosition() {
        const headerHeight = stickyHeader.outerHeight(); // Calculate header height
        const calculatedOffset = headerHeight > desiredOffset ? headerHeight : desiredOffset;

        stickyCart.css({
            position: 'fixed',
            top: `${calculatedOffset}px`, // Place below the header with desired offset
            left: 0,
            right: 0,
            zIndex: 9999
        });
    }

    // Adjust position on page load and window resize
    adjustStickyCartPosition();
    $(window).on('resize', adjustStickyCartPosition);

//     // Ensure sticky cart stays visible when scrolling
//     $(window).on('scroll', function () {
//         const scrollPosition = $(window).scrollTop();
//         if (scrollPosition > 100) {
//             stickyCart.fadeIn();
//         } else {
//             stickyCart.fadeOut();
//         }
//     });
});
jQuery(document).ready(function ($) {
    function fetchComparisonData() {
        const product1Id = $('#product-1').val();
        const product2Id = $('#product-2').val();

        if (!product1Id || !product2Id) {
            $('#comparison-results').html('<p>Selecteer twee iPhone modellen om ze te vergelijken.</p>');
            return;
        }

        $.ajax({
            url: comparisonAjax.ajax_url,
            method: 'POST',
            data: {
                action: 'fetch_comparison_data',
                product1_id: product1Id,
                product2_id: product2Id,
            },
            success: function (response) {
                if (response.success) {
                    const products = response.data.products;

                    let comparisonHtml = `
                        <table class="comparison-table">
                            <thead>
                                <tr>
                                    <th>${products[0].name}</th>
                                    <th>${products[1].name}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
									<img src="${products[0].image}" alt="${products[0].name}" class="comparison-product-image">
										<p style="font-size:1rem; margin-top:10px; color: #000;">Vanaf <span style="font-weight:bold; font-size:1.8rem;">${products[0].price}</span></p>
                                    </td>
                                    <td>
									<img src="${products[1].image}" alt="${products[1].name}" class="comparison-product-image">
									<p style="font-size:1rem; margin-top:10px;  color: #000;">Vanaf <span style="font-weight:bold; font-size:1.8rem;">${products[1].price}</span></p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align:center;">
                                        <a href="${products[0].link}" class="button-red" style="margin-top:10px; margin-bottom:10px;">View Product</a>
                                    </td>
                                    <td style="text-align:center;">
                                        <a href="${products[1].link}" class="button-red" style="margin-top:10px; margin-bottom:10px;">View Product</a>
                                    </td>
                                </tr>
                    `;

                    for (const [fieldLabel, fieldValue1] of Object.entries(products[0].fields)) {
                        const fieldValue2 = products[1].fields[fieldLabel] || '';

                        // Skip rows where both fields are empty
                        if (!fieldValue1 && !fieldValue2) continue;

                        comparisonHtml += `
                            <tr>
                                <td>${fieldValue1 || ''}</td>
                                <td>${fieldValue2 || ''}</td>
                            </tr>
                        `;
                    }

                    comparisonHtml += `
                                <tr>
                                    <td><a href="${products[0].link}" class="button-red" style="margin-top:10px;">View Product</a></td>
                                    <td><a href="${products[1].link}" class="button-red" style="margin-top:10px;">View Product</a></td>
                                </tr>
                            </tbody>
                        </table>
                    `;

                    $('#comparison-results').html(comparisonHtml);
                } else {
                    $('#comparison-results').html('<p>Error fetching comparison data.</p>');
                }
            },
            error: function () {
                $('#comparison-results').html('<p>An error occurred while fetching comparison data.</p>');
            },
        });
    }

    $('.product-dropdown').on('change', fetchComparisonData);
});

jQuery(document).ready(function ($) {
    function updateCartCount() {
        $.ajax({
            url: ajaxData.ajaxUrl,
            method: 'POST',
            data: {
                action: 'get_cart_count'
            },
            success: function (response) {
                if (response.success) {
                    // Update all elements with the class .cart-icon
                    $('.cart-icon').attr('data-cart-count', response.data.count);
                }
            },
            error: function () {
                console.error('Failed to fetch cart count.');
            }
        });
    }

    // Initial update on page load
    updateCartCount();

    // Update the cart count every 5 seconds
    setInterval(updateCartCount, 5000);
});

jQuery(document).ready(function ($) {
    function updateCartCount() {
        $.ajax({
            url: ajaxData.ajaxUrl,
            method: 'POST',
            data: {
                action: 'get_cart_count',
            },
            success: function (response) {
                if (response.success) {
                    let cartIcon = document.querySelector('.cart-icon-2');
                    if (cartIcon) {
                        cartIcon.setAttribute('data-cart-count', response.data.count);
                    }
                }
            },
            error: function () {
                console.error('Failed to fetch cart count.');
            }
        });
    }

    // Update the cart count every 5 seconds
    setInterval(updateCartCount, 1000);
});

document.addEventListener("DOMContentLoaded", function () {
    const relatedProductsContainer = document.querySelector(".post-wrap");

    if (relatedProductsContainer) {
        fetch(relatedProductsData.ajaxUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                action: "fetch_related_products",
                product_id: relatedProductsData.productId,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    const relatedProducts = data.data;

                    const relatedSection = document.createElement("div");
                    relatedSection.classList.add("related-products-section");
                    relatedSection.innerHTML = `<h2>Related Products</h2>`;

                    const productsContainer = document.createElement("ul");
                    productsContainer.classList.add("products", "related-products-container");

                    relatedProducts.forEach((product) => {
                        let capacitiesHTML = "";
                        let colorsHTML = "";

                        // Render Capacities
                        if (product.attributes.Capaciteit) {
                            capacitiesHTML = `
                                <div class="variable-items-wrapper button-variable-items-wrapper" data-attribute_name="attribute_pa_capacity">
                                    ${product.attributes.Capaciteit.map(
                                        (capacity) =>
                                            `<span class="variable-item button-variable-item">${capacity}</span>`
                                    ).join("")}
                                </div>`;
                        }

                   // Render Colors
                        if (product.attributes.Colors) {
                            colorsHTML = `
                                <div class="variable-items-wrapper color-variable-items-wrapper" data-attribute_name="attribute_pa_kleur">
                                    ${product.attributes.Colors.map(
                                        (color) =>
                                            `<span class="variable-item color-variable-item" style="background-color: ${color.color};" title="${color.label}"></span>`
                                    ).join("")}
                                </div>`;
                        }



                        // Create Product Card
                        const productCard = `
                            <li class="fadein isanimated product-style1">
                                <div class="inner">
                                    <div class="left-content">
                                        <div class="product-thumbnail">
                                            <a href="${product.link}">
                                                <img src="${product.image}" alt="${product.title}">
                                            </a>
                                        </div>
                                    </div>
                                    <div class="product-content">
                                        <a href="${product.link}">
                                            <h2 class="woocommerce-loop-product__title">${product.title}</h2>
                                        </a>
                                        <div class="product-attributes-wrapper">
                                            ${capacitiesHTML}
                                            ${colorsHTML}
                                        </div>
                                        <span class="price">${product.price}</span>
                                    </div>
                                </div>
                            </li>
                        `;

                        productsContainer.innerHTML += productCard;
                    });

                    relatedSection.appendChild(productsContainer);
                    relatedProductsContainer.appendChild(relatedSection);

                    // Initialize Slick Slider after adding products
                    jQuery(document).ready(function ($) {
                        $(".related-products-container").slick({
                            slidesToShow: 5,
                            slidesToScroll: 1,
                            infinite: true,
                            arrows: true,
                            prevArrow: '<button class="slick-prev"><span>&lt;</span></button>',
                            nextArrow: '<button class="slick-next"><span>&gt;</span></button>',
                            dots: true,
                            responsive: [
                                {
                                    breakpoint: 768,
                                    settings: {
                                        slidesToShow: 2,
                                    },
                                },
                                {
                                    breakpoint: 480,
                                    settings: {
                                        slidesToShow: 2,
                                    },
                                },
                            ],
                        });
                    });
                }
            })
            .catch((error) => {
                console.error("Error fetching related products:", error);
            });
    }
});




jQuery(document).ready(function ($) {
    // Handle quantity increase
    $(document).on('click', '.quantity-increase', function () {
        const cartKey = $(this).data('cart-key');
        const quantitySpan = $(this).siblings('.quantity');
        const decreaseButton = $(this).siblings('.quantity-decrease'); // Select the decrease button
        const priceCell = $(this).closest('tr').find('td:nth-child(4)'); // Get the total price cell
        const pricePerUnit = parseFloat($(this).closest('tr').find('td:nth-child(2)').text().replace(/[^0-9.-]+/g, '')); // Extract price per unit
        const currentQuantity = parseInt(quantitySpan.text());
        const newQuantity = currentQuantity + 1;

        updateCartQuantity(cartKey, newQuantity, quantitySpan, priceCell, pricePerUnit);

        // Show the minus button since quantity will no longer be 1
        decreaseButton.show();
    });

    // Handle quantity decrease
    $(document).on('click', '.quantity-decrease', function () {
        const cartKey = $(this).data('cart-key');
        const quantitySpan = $(this).siblings('.quantity');
        const decreaseButton = $(this); // Target the current minus button
        const priceCell = $(this).closest('tr').find('td:nth-child(4)'); // Get the total price cell
        const pricePerUnit = parseFloat($(this).closest('tr').find('td:nth-child(2)').text().replace(/[^0-9.-]+/g, '')); // Extract price per unit
        const currentQuantity = parseInt(quantitySpan.text());
        const newQuantity = currentQuantity > 1 ? currentQuantity - 1 : 1;

        updateCartQuantity(cartKey, newQuantity, quantitySpan, priceCell, pricePerUnit);

        // Hide the minus button if quantity becomes 1
        if (newQuantity === 1) {
            decreaseButton.hide();
        }
    });

    // Function to update cart quantity
    function updateCartQuantity(cartKey, newQuantity, quantitySpan, priceCell, pricePerUnit) {
        $.ajax({
            url: wc_cart_params.ajax_url,
            type: 'POST',
            data: {
                action: 'update_cart_item',
                cart_key: cartKey,
                quantity: newQuantity,
            },
            beforeSend: function () {
                quantitySpan.text('..'); // Show loading state
            },
            success: function (response) {
                if (response.success) {
                    quantitySpan.text(newQuantity); // Update quantity in UI
                    priceCell.text('$' + (pricePerUnit * newQuantity).toFixed(2)); // Update total price for the product
                    $('.subtotal').text(response.data.subtotal); // Update subtotal
                    $('#order-total').text(response.data.total); // Update ORDER SUMMARY total

                    // Recheck and hide "-" button if quantity is 1
                    if (newQuantity === 1) {
                        quantitySpan.siblings('.quantity-decrease').hide();
                    }
                } else {
                    alert(response.data.message || 'Failed to update cart.');
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', status, error);
                alert('Error updating cart. Please try again.');
            },
        });
    }

    // Handle remove item
    $(document).on('click', '.remove-item', function () {
        const cartKey = $(this).data('cart-key');
        const cartRow = $(this).closest('tr'); // Target the product row

        console.log("Remove button clicked for cart key:", cartKey);

        $.ajax({
            url: wc_cart_params.ajax_url,
            type: 'POST',
            data: {
                action: 'remove_cart_item',
                cart_key: cartKey,
            },
            success: function (response) {
                if (response.success) {
                    cartRow.remove(); // Remove the row from the UI
                    $('.subtotal').text(response.data.subtotal); // Update subtotal
                    $('#order-total').text(response.data.total); // Update ORDER SUMMARY total
                } else {
                    alert(response.data.message || 'Failed to remove item.');
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', status, error);
                alert('Error removing item. Please try again.');
            },
        });
    });

    // On page load, hide all "-" buttons where the quantity is 1
    $('table.cart-table .quantity').each(function () {
        const quantity = parseInt($(this).text());
        const decreaseButton = $(this).siblings('.quantity-decrease');
        if (quantity === 1) {
            decreaseButton.hide();
        }
    });

    // Refresh cart periodically
    function refreshCartContent() {
        $.ajax({
            url: wc_cart_params.ajax_url,
            type: 'POST',
            data: {
                action: 'check_cart_updates',
            },
            success: function (response) {
                if (response.success) {
                    // Update the cart table and total
                    $('table.cart-table tbody').html(response.data.cart_content);
                    $('#order-total').html(response.data.cart_total);

                    // Update the cart count
                    $('.cart-header p').text(response.data.cart_count + " artikelen in je tas.");

                    // Recheck minus buttons
                    $('table.cart-table .quantity').each(function () {
                        const quantity = parseInt($(this).text());
                        const decreaseButton = $(this).siblings('.quantity-decrease');
                        if (quantity === 1) {
                            decreaseButton.hide();
                        }
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('Error refreshing cart:', error);
            },
        });
    }

    // Periodically refresh the cart every 3 seconds
    setInterval(refreshCartContent, 2000);
});

jQuery(document).ready(function ($) {
    const ajaxUrl = '/wp-admin/admin-ajax.php';

    $(document).on('click', '.single_add_to_cart_button', function (e) {
        e.preventDefault();

        const productId = $('input[name="add-to-cart"]').val();

        $.ajax({
            url: ajaxUrl,
            type: 'POST',
            data: {
                action: 'get_accessories_meta',
                product_id: productId
            },
            success: function (response) {
                if (response.success && response.data.accessories) {
                    const accessoriesPageUrl = `/accessories-page/?accessories=${response.data.accessories}`;
                    window.location.href = accessoriesPageUrl;
                } else {
                    alert(response.data.message || 'No accessories found.');
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', xhr.responseText);
                alert('Error retrieving accessories. Please try again.');
            }
        });
    });
});

// --------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const filterToggleButton = document.querySelector(".filter-toggle-button");
    const filterPopup = document.querySelector("#filter-popup");
    const closeButton = document.querySelector(".close-button");
    const filterTitles = document.querySelectorAll(".filter-title");

    // Open Filter Popup
    if (filterToggleButton) {
        filterToggleButton.addEventListener("click", function () {
            filterPopup.classList.add("active");
        });
    }

    // Close Filter Popup
    if (closeButton) {
        closeButton.addEventListener("click", function () {
            filterPopup.classList.remove("active");
        });
    }

    // Toggle individual filters
    filterTitles.forEach((title) => {
        title.addEventListener("click", function () {
            const content = title.nextElementSibling;
            content.classList.toggle("open");
        });
    });
});





// -------------------------------------


document.addEventListener("DOMContentLoaded", function () {
    const closeButton = document.querySelector("#popup-modal .pum-close"); // Close button
    const modal = document.getElementById("popup-modal"); // Modal container

    const closeModal = () => {
        if (modal) {
            modal.style.display = "none"; // Hide the modal
            modal.setAttribute("aria-hidden", "true"); // Update accessibility attribute
        }
    };

    // Close modal on button click
    if (closeButton) {
        closeButton.addEventListener("click", closeModal);
    }

    // Close modal on outside click
    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // Prevent modal content from triggering close on click
    const modalContent = document.querySelector("#popup-modal .lapover");
    if (modalContent) {
        modalContent.addEventListener("click", (event) => {
            event.stopPropagation();
        });
    }
});



document.addEventListener("DOMContentLoaded", function () {
    // Log to verify script is running
    console.log("Script loaded!");

    // Select the related products section
    const relatedProductsSection = document.querySelector(".related-products-section");

    if (relatedProductsSection) {
        console.log("Related products section found.");

        // Create a new div element for the text
        const additionalText = document.createElement("div");
        additionalText.classList.add("additional-text");
        additionalText.textContent = "Explore our Bestsellers for more amazing deals!";

        // Add some basic styles to the text (optional)
        additionalText.style.textAlign = "center";
        additionalText.style.marginBottom = "20px";
        additionalText.style.fontSize = "18px";
        additionalText.style.color = "#333";

        // Insert the text before the related products section
        relatedProductsSection.insertAdjacentElement("beforebegin", additionalText);
    } else {
        console.warn("Related products section not found.");
    }
});

document.addEventListener("DOMContentLoaded", function () {
    // Carousel Functionality
    let currentImageIndex = 0;
    let currentCondition = "Fair"; // Default condition

    const carouselImages = {
        Fair: [
            "/wp-content/uploads/2025/04/Acceptable-1.webp",
            "/wp-content/uploads/2025/04/Acceptable-2.webp",
			"https://maxgood.nl/wp-content/uploads/2025/04/Acceptable-3.webp",
        ],
        "Very Good": [
            "https://maxgood.nl/wp-content/uploads/2025/04/Good-1.webp",
            "https://maxgood.nl/wp-content/uploads/2025/04/Good-2.webp",
           " https://maxgood.nl/wp-content/uploads/2025/04/Good-3.webp",
            "https://maxgood.nl/wp-content/uploads/2025/04/Good-4.webp",
        ],
        Excellent: [
            "https://maxgood.nl/wp-content/uploads/2025/04/Excellent-1.webp",
            "https://maxgood.nl/wp-content/uploads/2025/04/Excellent-2.webp",
			"https://maxgood.nl/wp-content/uploads/2025/04/Excellent-3.webp",
			"https://maxgood.nl/wp-content/uploads/2025/04/Excellent-4.webp",
        ],
    };

    const updateCarousel = () => {
        const allImages = document.querySelectorAll("#popup-carousel-container .carousel-images img");
        allImages.forEach((img, index) => {
            img.style.display = index === currentImageIndex ? "block" : "none";
        });
    };

    const loadConditionContent = (condition) => {
        const description = document.getElementById("popup-condition-description");
        const carouselContainer = document.querySelector("#popup-carousel-container .carousel-images");

       // Update description based on the condition
if (condition === "Fair") {
    description.innerHTML = "De 'Goed' cosmetische staat vertoont zichtbare krassen op zowel het scherm als de behuizing en kan kleine deukjes bevatten. Ondanks deze uiterlijke tekenen van gebruik, functioneert het toestel technisch in nieuwstaat, dankzij de zorgvuldige refurbishment door onze experts. Het toestel is grondig getest en gereinigd, en biedt betrouwbare prestaties. Deze optie is ideaal voor gebruikers die minder bezorgd zijn over het uiterlijk van het toestel, maar wel een goed werkend apparaat willen tegen een aantrekkelijke prijs.";
} else if (condition === "Very Good") {
    description.innerHTML = "De 'Heel Goed' cosmetische staat vertoont lichte, zichtbare krasjes op de behuizing en/of het scherm. Het toestel ziet er over het algemeen goed uit. Dankzij de refurbishment door onze experts, verkeert het technisch in nieuwstaat. Het toestel is getest en biedt top prestaties. Deze keuze is perfect voor gebruikers die een iPhone willen met minimale gebruikssporen, maar wel een betrouwbare werking verwachten. Het is ideaal voor mensen die een balans zoeken tussen uiterlijk en prestaties, zonder veel zichtbare slijtage.";
} else if (condition === "Excellent") {
    description.innerHTML = "De cosmetische staat 'Uitstekend' betekent een toestel in bijna perfecte conditie, met hooguit lichte krasjes op de behuizing en een krasvrij scherm. Dankzij grondige refurbishment verkeert het toestel technisch in nieuwstaat en biedt optimale prestaties. Of je nu kiest voor 'Goed', 'Heel Goed', of 'Uitstekend', elk toestel is grondig getest, gereinigd, en biedt betrouwbare prestaties. Voor zowel prijsbewuste kopers als liefhebbers van een bijna nieuwe uitstraling is er een passende optie. Geniet met vertrouwen van je refurbished iPhone.";
}


        // Update carousel images
        carouselContainer.innerHTML = carouselImages[condition]
            .map((src) => `<img decoding="async" src="${src}" alt="${condition} Condition">`)
            .join("");

        currentImageIndex = 0; // Reset the image index
        updateCarousel(); // Initialize the carousel display
    };

    // Handle tab switching
    document.querySelectorAll("#condition-popup .tab-button").forEach((button) => {
        button.addEventListener("click", function () {
            // Update active tab
            document.querySelectorAll("#condition-popup .tab-button").forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");

            // Load content for the selected condition
            currentCondition = this.getAttribute("data-tab");
            loadConditionContent(currentCondition);
        });
    });

    // Handle carousel controls
    document.getElementById("carousel-prev").addEventListener("click", () => {
        currentImageIndex =
            (currentImageIndex - 1 + carouselImages[currentCondition].length) % carouselImages[currentCondition].length;
        updateCarousel();
    });

    document.getElementById("carousel-next").addEventListener("click", () => {
        currentImageIndex = (currentImageIndex + 1) % carouselImages[currentCondition].length;
        updateCarousel();
    });

    // Initialize content for the default condition
    loadConditionContent(currentCondition);
});