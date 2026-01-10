add_action('woocommerce_before_single_product_summary', function() {
    ?>

    <div class="custom-container">
        <!-- Banner Section -->
        <div class="custom-banner">
            <img src="https://maxgood.nl/wp-content/uploads/2024/12/Untitled-design-1.png" alt="Eindejaars Banner">
        </div>

        <!-- USP Section -->
        <div class="custom-usp">
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)">
                    <div class="icon-wrapper"></div>
                    <span>100% professioneel getest & refurbished door ons.</span>
                    <div class="arrow"></div>
                </div>
                <div class="accordion-content">
                    <strong>Kwaliteit gegarandeerd
</strong><br>Elke iPhone wordt zorgvuldig getest en professioneel refurbished door ons team van experts. We zorgen ervoor dat je toestel volledig functioneert zoals nieuw, zodat je altijd de beste kwaliteit ontvangt.
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)">
                    <div class="icon-wrapper"></div>
                    <span>24 maanden garantie.</span>
                    <div class="arrow"></div>
                </div>
                <div class="accordion-content">
                    <strong>Gemoedsrust met onze garantie</strong><br>
Wij staan volledig achter de kwaliteit van onze refurbished iPhones. Daarom bieden wij je maar liefst 24 maanden garantie, zodat je zorgeloos kunt genieten van je toestel. Mochten er onverhoopt problemen optreden, dan zorgen wij voor een oplossing.
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)">
                    <div class="icon-wrapper"></div>
                    <span>Gratis verzending & Retour.</span>
                    <div class="arrow"></div>
                </div>
                <div class="accordion-content">
					<strong>Zorgeloos winkelen</strong><br>
Wij bieden gratis verzending en retour aan, zodat je met een gerust hart je refurbished iPhone kunt bestellen. Mocht je toch niet helemaal tevreden zijn, dan zorgen wij ervoor dat je bestelling kosteloos kunt retourneren.                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)">
                    <div class="icon-wrapper"></div>
                    <span>Gratis 30 dagen uitproberen.</span>
                    <div class="arrow"></div>
                </div>
                <div class="accordion-content">
<strong>30 dagen zorgeloos uitproberen
</strong><br>Wij bieden je 30 dagen de tijd om je refurbished iPhone volledig risicoloos uit te proberen. Ben je niet helemaal tevreden? Geen probleem! Stuur het toestel gratis terug en ontvang je volledige aankoopbedrag terug.                </div>
            </div>
        </div>
    </div>

    <script>
        function toggleAccordion(element) {
            const content = element.nextElementSibling;
            element.classList.toggle('active');
            content.classList.toggle('open');
        }
    </script>
    <?php
}, 15);

add_action('woocommerce_after_add_to_cart_button', 'custom_order_now_pay_later_button');

function custom_order_now_pay_later_button() {
    ?>
    <button type="submit" class="button-order-later" id="order-now-pay-later-button"> Bestel nu & Betaal later </button>
    <script>
        document.getElementById('order-now-pay-later-button').addEventListener('click', function() {
            const addToCartButton = document.querySelector('.single_add_to_cart_button');
            if (addToCartButton) {
                addToCartButton.click(); // Simulates clicking the "Add to Cart" button
            }
        });
    </script>
    <?php
}

add_action('woocommerce_single_product_summary', 'add_custom_info_sections', 25);

function add_custom_info_sections() {
    ?>

    <div class="custom-product-info">
        <!-- Shipping Information -->
			<a href="#" class="info-row full-width">
				<div class="icon-wrapper">
					<img src="http://maxgood.nl/wp-content/uploads/2025/02/icons8-truck-96.png" alt="Shipping Icon" width="26" height="26">
				</div>
				<div class="info-text">
					<span>Gratis verzending &nbsp &nbsp  </span>
				</div>
			</a>
		<a href="#" class="info-row full-width">
    <div class="icon-wrapper">
   <img src="http://maxgood.nl/wp-content/uploads/2025/02/icons8-verified-96.png" alt="Shipping Icon" width="26" height="26">
    </div>
    <div class="info-text">
        <span>24 maanden garantie</span>
    </div>
</a>

	 <!-- Returns and Certified Refurbished on one line -->
        <div class="info-pair">
            <a href="#" class="info-row">
                <div class="icon-wrapper">
   <img src="http://maxgood.nl/wp-content/uploads/2025/02/icons8-calendar-30-96.png" alt="Shipping Icon" width="40" height="40">
                </div>
                <div class="info-text">
            <span id="return-date">Retourneren tot <!-- Dynamic date will appear here --></span>
                </div>
<!--                 <div class="info-arrow">
                    <svg aria-hidden="true" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="m13.043 12-3.47 3.47a.75.75 0 1 0 1.06 1.06l3.647-3.646a1.25 1.25 0 0 0 0-1.768L10.634 7.47a.75.75 0 0 0-1.06 1.06L13.042 12" clip-rule="evenodd"></path></svg>
                </div> -->
            </a>

            <a href="#" class="info-row">
                <div class="icon-wrapper">
                     <img src="http://maxgood.nl/wp-content/uploads/2025/02/icons8-guarantee-96.png" alt="Shipping Icon" width="60" height="60">
                </div>
                <div class="info-text">
                    <span>Werkt als nieuw</span>
                </div>
<!--                 <div class="info-arrow">
                    <svg aria-hidden="true" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="m13.043 12-3.47 3.47a.75.75 0 1 0 1.06 1.06l3.647-3.646a1.25 1.25 0 0 0 0-1.768L10.634 7.47a.75.75 0 0 0-1.06 1.06L13.042 12" clip-rule="evenodd"></path></svg>
                </div> -->
            </a>
        </div>
    </div>
    <?php
}

add_action('woocommerce_after_shop_loop_item_title', 'custom_variation_buttons', 5);

function custom_variation_buttons() {
    global $product;

    if (!$product || !$product->is_type('variable')) return;

    // Add a unique class for the archive product layout
    echo '<div class="product-attributes-wrapper product-archive-layout" data-product_id="' . esc_attr($product->get_id()) . '">';

    // Capacity
    if ($product->get_attribute('pa_capacity')) {
        echo '<div class="variable-items-wrapper button-variable-items-wrapper" data-attribute_name="attribute_pa_capacity">';
        $terms = wc_get_product_terms($product->get_id(), 'pa_capacity', array('fields' => 'names'));
        foreach ($terms as $term) {
            echo '<span class="variable-item button-variable-item" data-value="' . esc_attr($term) . '">' . esc_html($term) . '</span>';
        }
        echo '</div>';
    }

    // Colors
    if ($product->get_attribute('pa_kleur')) {
        echo '<div class="variable-items-wrapper color-variable-items-wrapper" data-attribute_name="attribute_pa_kleur">';
        $terms = wc_get_product_terms($product->get_id(), 'pa_kleur', array('fields' => 'all'));
        foreach ($terms as $term) {
            $color = get_term_meta($term->term_id, 'product_attribute_color', true);
            $style = $color ? 'style="background-color:' . esc_attr($color) . ';"' : '';
            echo '<span class="variable-item color-variable-item" ' . $style . ' data-value="' . esc_attr($term->slug) . '"></span>';
        }
        echo '</div>';
    }

    echo '</div>';
}

add_action('woocommerce_before_add_to_cart_button', 'display_selected_attributes', 5);

function display_selected_attributes() {
    echo '<div id="selected-attributes-container" style="margin-bottom: 10px; font-size: 16px; font-weight: normal;">';
    echo '<div class="attribute-values" style="margin-bottom: 5px;">';
    echo '<span id="selected-color"></span>';
    echo '<span id="selected-capacity"></span>';
    echo '<span id="selected-condition"></span>';
    echo '</div>';
    echo '</div>';
}

add_action('woocommerce_before_add_to_cart_button', 'display_initial_price_below_cart_button', 10);

function display_initial_price_below_cart_button() {
    global $product;

    echo '<div id="dynamic-price-container" style="margin-top: 10px; font-size: 18px; font-weight: bold;">';
    echo $product->get_price_html(); // Display the default price/range.
    echo '</div>';
}




add_action('wp_footer', 'add_dynamic_attribute_descriptions');

function add_dynamic_attribute_descriptions() {
    if (is_product()) {
        ?>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                // Updated Descriptions for Battery
                var batteryDescriptions = {
                    'nieuw': 'De batterij is nieuw en biedt optimale prestaties voor langdurig gebruik. <h5 class="red-toy-2">Lees meer</h5>',
                    'standaard': 'De batterij heeft 85% capaciteit, voldoende voor normaal dagelijks gebruik. <h5 class="red-toy-2">Lees meer</h5>'
                };

                // Updated Descriptions for Condition
                var conditionDescriptions = {
                    'goed': 'De telefoon vertoont zichtbare gebruikssporen, zoals diepe krassen, deuken of andere markeringen. De iPhone werkt als nieuw. <h5 class="red-toy-2">Lees meer</h5>',
                    'heel-goed': 'De telefoon heeft zichtbare gebruikssporen, zoals krassen, deukjes of andere tekenen van gebruik. De iPhone werkt als nieuw. <h5 class="red-toy-2">Lees meer</h5>',
                    'uitstekend': 'De telefoon kan lichte gebruikssporen vertonen, zoals kleine krasjes. De iPhone werkt als nieuw. <h5 class="red-toy-2">Lees meer</h5>'
                };

                function setDescription(attributeName, descriptions, descriptionDivId, popupId) {
                    var selectElement = document.querySelector('select[name="attribute_' + attributeName + '"]');
                    var selectedValue = selectElement ? selectElement.value : '';
                    var description = descriptions[selectedValue] || 'Select an option to see details.';

                    var clickableArea = `
                        <a href="#" class="popup-trigger" style="display: flex; align-items: center; text-decoration: none; color: inherit; gap: 10px;">
                            <span style="font-size: 14px; margin: 0;">${description}</span>
                        </a>`;

                    document.getElementById(descriptionDivId).innerHTML = clickableArea;

                    // Add event listener to the trigger
                    document.querySelector(`#${descriptionDivId} .popup-trigger`).addEventListener('click', function (e) {
                        e.preventDefault(); // Prevent default link behavior
                        const popup = document.querySelector(popupId);
                        if (popup) {
                            popup.style.display = 'flex'; // Show the custom popup
                        }
                    });
                }

                // Battery and Condition placeholders
                var batteryWrapper = document.querySelector('ul[data-attribute_name="attribute_pa_battery"]');
                if (batteryWrapper) {
                    var batteryDescriptionDiv = document.createElement('div');
                    batteryDescriptionDiv.id = 'battery-description';
                    batteryDescriptionDiv.style.marginTop = '10px';
                    batteryWrapper.parentNode.appendChild(batteryDescriptionDiv);
                }

                var conditionWrapper = document.querySelector('ul[data-attribute_name="attribute_pa_condition"]');
                if (conditionWrapper) {
                    var conditionDescriptionDiv = document.createElement('div');
                    conditionDescriptionDiv.id = 'condition-description';
                    conditionDescriptionDiv.style.marginTop = '10px';
                    conditionWrapper.parentNode.appendChild(conditionDescriptionDiv);
                }

                // Set initial descriptions
                setDescription('pa_battery', batteryDescriptions, 'battery-description', '#battery-popup');
                setDescription('pa_condition', conditionDescriptions, 'condition-description', '#condition-popup');

                // Dynamic updates
                document.querySelectorAll('ul[data-attribute_name="attribute_pa_battery"] li').forEach(function (item) {
                    item.addEventListener('click', function () {
                        setTimeout(function () {
                            setDescription('pa_battery', batteryDescriptions, 'battery-description', '#battery-popup');
                        }, 100);
                    });
                });

                document.querySelectorAll('ul[data-attribute_name="attribute_pa_condition"] li').forEach(function (item) {
                    item.addEventListener('click', function () {
                        setTimeout(function () {
                            setDescription('pa_condition', conditionDescriptions, 'condition-description', '#condition-popup');
                        }, 100);
                    });
                });

                // Close popup functionality
                document.querySelectorAll('.custom-popup-close-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        const popup = btn.closest('.custom-popup-modal');
                        if (popup) {
                            popup.style.display = 'none'; // Hide the popup
                        }
                    });
                });

                // Close popup on clicking outside the content
                document.querySelectorAll('.custom-popup-modal').forEach(function (popup) {
                    popup.addEventListener('click', function (e) {
                        if (e.target === popup) {
                            popup.style.display = 'none'; // Hide the popup
                        }
                    });
                });
            });
        </script>
        <?php
    }
}




// Add "From" before the price on product listing pages and ensure it's visible everywhere except single product page
add_filter('woocommerce_get_price_html', 'add_from_text_to_price');
function add_from_text_to_price($price) {
    // Check if it's NOT a single product page
    if (!is_product()) {
        return '<span class="from-text">From&nbsp;</span>' . $price;
    }
    return $price; // Return the price as is on single product pages
}

add_action('woocommerce_before_add_to_cart_button', function () {
    ?>
    <div class="DeliveryAndAvailability__IconAndDeliveryPromiseContainer-lne70l-1">
        <div class="DeliveryAndAvailability__ShippingIconContainer">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                <image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEg0lEQVR4nO2aeYhVVRzHP1NuQ2aa2mQRpYJWSNBG0b5g/RFIpPZPkQSVgW1E0QKtFloQlUJlBRFRUFSSQttQ/ySmpVFpabTZYhRlu1kzozd+8L3w43Lfu+/e9+6deW/OBw4z8+aec37nd37bOfdBIBAIBAKtZhRwH/ADEA1y2w4slUyVsXQILDzZllSpgO2a9KSc/WJhi/4/jVOcJVRGVEDQRvqVNW7LCQogWADNBKyqx205ZQnadgpopl8PsFGtp4XjVkLUpKCTgU3u7y3AgcNJAZvcT//7sFFA5HbdrOHjJn257RSwRYuPSSqhKnkKU3TCXmC9C3oe+2wD8HaF8hSm8gkzCAogWADBBehkn8sguADBBQguQIVEIQYQgmDE0CEEQUIQJARBOtnnhqoLjABOAG4AXgDW6YXpr2rfAWuAZ4FbgTnAVKCrJHkqI1L7peD19Z/AWmAFcBVwBrB/ATmmAJe6ccdQMscBryYW8xnwOLAAOBk4GJigdoheXl6i1+mvAd/XUcy3wHJgUh0Z9gEuAl4HBhL9vwKOKGPh+wGPALs10R/AY1JIEWy3TwcWyQrWasy8lvQvsBK4B/hIn22Va+bG/HIhsAO4yX1ugm7T4P3AMmB8wYVnzX+U7gzrLXqP4sqVsrIYM/8v9My5eSfvAVa7Scy0zpTZxru+XgKWzTE1Fv45cAcwvU7fZ/Ts5XkmnAP8pI47ZFKRW7jt+p0Fzeps4C3gIeAy4Hj5cD1mukWbPI/qixhZmWOciy9nNSLcWAWveLJeBbCRup6Ofd3SXFFuTtnJ3drNl4C7gHnADGBvmXRsiZZWRzcwh71TuFoB0Pq9q7HqcqKEsA67gOsSGj4c2Kn/X9CEAky4c4AbgaeBDxS40kx8l7M6s8hpdcY1f58PrAL63BibgUPrCTRCWu9Xhw+BWTWeXaRnfla+bRUmw5HAhYrer2j39kgJq+QGSWyDTgOeAH5zi+6T1czPctMZLsKapu/PMLEu5e1IP1tdvSUZXcN0TRmLga8TFvOeTN+sLJPJLs9+o8qrEabIAiJZRFVMUoW4LrHobbIac9FcjHVfarwtZ9+56rezyMQ5GKOAmPTr34EnVY80ZYWz5Wd9Skd5eErCbCzhG5nHAg87S4vrkF6V0FlpMxfLNcEnQHeOfuNcmjETTGOkIvDMRIWWhgXBu92YcXsfuAY4gJLoBj7VZKb1PJyqnRnQocc4SMfcDSkHk78UqJ4DHlTN/7IrqyMXk+4t6xBTq9T8T+5gOToPSyT0l9rBv91C+nWa25pIU2ntR+fXezEI3CJBrHScmKPfKMUBfzB5ETgvJaVO1FH4YuB64Arl6lmDtWiP5dt3XMmZB/Pff9T3dtqYqa42sGjbKF2q4+MLjLZmgcu1hzXwvAW9N50LPEAH8LwWsybjFDXX3QFazj6fDmGCTDlK3AT5GmCF2/U3ZAkdxewaVaI/Nlvgu7aCQ9GgsUwLtUJpX90CDbgKLe2I2lF0q0SO9FIjrskXq8wdFhytKjHS+dsuIIYd81TmmhsEaHP+B3WsfJpi0X3GAAAAAElFTkSuQmCC" width="64" height="64" />
            </svg>
        </div>
        <div class="DeliveryAndAvailability__TextContainer-lne70l-3">
            <p class="DeliveryAndAvailability__TextElement-lne70l-4 fBTKYO">
                 Op voorraad 
            </p>
            <p class="DeliveryAndAvailability__TextElement-lne70l-4 eqUMVN">
              en klaar om verzonden te worden
            </p>
        </div>
    </div>
    <?php
}, 20);



add_filter('woocommerce_get_price_html', 'custom_discount_price_html', 10, 2);

function custom_discount_price_html($price, $product) {
    // Get regular price and sale price
    $regular_price = $product->get_regular_price();
    $sale_price = $product->get_sale_price();

    // Ensure prices are numeric and valid
    if (!is_numeric($regular_price) || !is_numeric($sale_price)) {
        return $price; // Return default price if values are invalid
    }

    // Check if the product is on sale and the sale price is lower
    if ($sale_price && $regular_price > $sale_price) {
        // Calculate the discount amount
        $discount_amount = $regular_price - $sale_price;

        // Generate the price HTML
        $discounted_price_html = '<span class="price dynamic-price">';
        $discounted_price_html .= '<del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">' . esc_html(get_woocommerce_currency_symbol()) . '</span>' . number_format((float)$regular_price, 2) . '</bdi></span></del> ';
        $discounted_price_html .= '<ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">' . esc_html(get_woocommerce_currency_symbol()) . '</span>' . number_format((float)$sale_price, 2) . '</bdi></span></ins>';
        $discounted_price_html .= '<span class="discount-amount-wrapper"><span class="discount-amount" style="color: green; font-weight: bold; font-size: 10px;">Bespaar nu ' . esc_html(get_woocommerce_currency_symbol()) . '&nbsp;' . number_format((float)$discount_amount, 2) . '</span></span>';
        $discounted_price_html .= '</span>';

        return $discounted_price_html; // Return the custom discounted price HTML
    }

    // Return the original price if the product is not on sale
    return $price;
}


add_action('woocommerce_after_add_to_cart_form', function () {
    ?>
    <div class="payment-icons">
        <div class="flex flex-wrap items-center gap-4">
            <img alt="Visa" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/networks-v4/visa.svg" width="36" height="20">
            <img alt="Mastercard" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/networks-v4/mastercard.svg" width="36" height="20">
            <img alt="American Express" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/networks-v4/amex.svg" width="36" height="20">
            <img alt="iDEAL" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/methods-v4/ideal.svg" width="36" height="20">
            <img alt="PayPal" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/methods-v4/paypal.svg" width="36" height="20">
            <img alt="Apple Pay" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/methods-v4/apple_pay.svg" width="36" height="20">
            <img alt="Google Pay" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/methods-v4/google_pay.svg" width="36" height="20">
            <img alt="Klarna" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/networks-v4/klarna.svg" width="36" height="20">
        </div>
    </div>
    <?php
});


add_action('woocommerce_after_add_to_cart_form', function () {
    ?>
    <div class="custom-included-container">
        <p class="custom-title">Geleverd met</p>
        <div class="custom-item-container">
            <div class="custom-item">
                <div class="custom-icon-container">
                    <svg aria-hidden="true" fill="#333" height="30" viewBox="0 0 24 24" width="30" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M9 2.75A.75.75 0 0 1 9.75 3.5v1.75h4.5V3.5a.75.75 0 0 1 1.5 0v1.764a2.25 2.25 0 0 1 2 2.236v3a2.25 2.25 0 0 1-2.25 2.25h-2.75v7.75a.75.75 0 0 1-1.5 0v-7.75H8.5a2.25 2.25 0 0 1-2.25-2.25v-3a2.25 2.25 0 0 1 2-2.236V3.5A.75.75 0 0 1 9 2.75m6.5 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.75.75h-7a.75.75 0 0 1-.75-.75v-3A.75.75 0 0 1 8.5 6.75h7" clip-rule="evenodd"></path>
                        <path d="m18.008 14.06-2.019 3.172A.5.5 0 0 0 16.411 18H18l-.583 2.622c-.074.334.38.512.552.216l2.092-3.586A.5.5 0 0 0 19.63 16.5H18l.552-2.206c.082-.33-.362-.521-.544-.234"></path>
                    </svg>
                </div>
                <p class="custom-item-text">Oplaadkabel</p>
            </div>
			<div class="custom-item">
  <div class="custom-icon-container">
    <img src="https://maxgood.nl/wp-content/uploads/2024/12/pin-ejecotr.svg" alt="Custom SIM Pin Image" width="20" height="40" />
  </div>
  <p class="custom-item-text">simpin</p>
</div>

    </div>
    <?php
});

//----------------------------------------------------------------------- 
// Shortcode for Price Filter
add_shortcode('custom_price_filter', 'render_price_filter');
function render_price_filter() {
    ob_start();
    ?>
    <div class="custom-price-filter">
        <button id="price-dropdown-button" class="dropdown-button">Price</button>
        <div id="price-dropdown-list" class="dropdown-list" style="display: none;">
            <div id="price-slider-range"></div>
            <div class="price-values">
                <label>
                    Min: 
                    <input type="number" id="price-min" min="0" step="1" value="0">
                </label>
                <label>
                    Max: 
                    <input type="number" id="price-max" min="0" step="1" value="5000">
                </label>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

// AJAX Handler for Filtering Products
add_action('wp_ajax_filter_by_price', 'filter_products_by_price');
add_action('wp_ajax_nopriv_filter_by_price', 'filter_products_by_price');
function filter_products_by_price() {
    $min_price = isset($_POST['min_price']) ? intval($_POST['min_price']) : 0;
    $max_price = isset($_POST['max_price']) ? intval($_POST['max_price']) : PHP_INT_MAX;

    // Query WooCommerce products
    $args = [
        'post_type'      => 'product',
        'posts_per_page' => 12,
        'meta_query'     => [
            [
                'key'     => '_price',
                'value'   => [$min_price, $max_price],
                'compare' => 'BETWEEN',
                'type'    => 'NUMERIC',
            ],
        ],
    ];

    $query = new WP_Query($args);

    if ($query->have_posts()) {
        ob_start();
        while ($query->have_posts()) {
            $query->the_post();
            wc_get_template_part('content', 'product'); // Load WooCommerce product template
        }
        echo ob_get_clean();
    } else {
        echo '<p>Geen producten in winkelwagen.</p>';
    }

    wp_die(); // Stop execution
}
function enqueue_price_filter_assets() {
    // Enqueue jQuery UI slider styles and scripts
    wp_enqueue_script('jquery-ui-slider');
    wp_enqueue_style('jquery-ui-css', 'https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css');

    // Enqueue custom script
    wp_enqueue_script('price-filter-script', get_stylesheet_directory_uri() . '/price-filter.js', ['jquery', 'jquery-ui-slider'], null, true);

    // Pass AJAX URL to script
    wp_localize_script('price-filter-script', 'woocommerce_params', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
}
add_action('wp_enqueue_scripts', 'enqueue_price_filter_assets');

// Shortcode for Verschijningsjaar Filter
add_shortcode('custom_verschijningsjaar_filter', 'render_verschijningsjaar_filter');
function render_verschijningsjaar_filter() {
    $terms = get_terms([
        'taxonomy' => 'pa_verschijningsjaar', // Replace with your actual taxonomy slug
        'hide_empty' => false,
    ]);

    if (!empty($terms)) {
        ob_start();
        ?>
        <div class="custom-verschijningsjaar-filter">
            <button id="verschijningsjaar-dropdown-button" class="dropdown-button">Verschijningsjaar</button>
            <ul id="verschijningsjaar-dropdown-list" class="dropdown-list" style="display: none;">
                <?php foreach ($terms as $term) : ?>
                    <li class="dropdown-item" data-verschijningsjaar="<?php echo esc_attr($term->slug); ?>">
                        <label>
                            <input type="checkbox" class="verschijningsjaar-checkbox" value="<?php echo esc_attr($term->slug); ?>">
                            <?php echo esc_html($term->name); ?>
                        </label>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php
        return ob_get_clean();
    }
}

// AJAX Handler for Verschijningsjaar Filter
add_action('wp_ajax_filter_by_verschijningsjaar', 'filter_products_by_verschijningsjaar');
add_action('wp_ajax_nopriv_filter_by_verschijningsjaar', 'filter_products_by_verschijningsjaar');
function filter_products_by_verschijningsjaar() {
    $selected_years = isset($_POST['verschijningsjaar']) ? (array) $_POST['verschijningsjaar'] : [];

    $args = [
        'post_type' => 'product',
        'posts_per_page' => 12,
        'tax_query' => [],
    ];

    if (!empty($selected_years)) {
        $args['tax_query'][] = [
            'taxonomy' => 'pa_verschijningsjaar', // Replace with your actual taxonomy slug
            'field'    => 'slug',
            'terms'    => $selected_years,
            'operator' => 'IN',
        ];
    }

    $query = new WP_Query($args);

    if ($query->have_posts()) {
        ob_start();
        while ($query->have_posts()) {
            $query->the_post();
            wc_get_template_part('content', 'product');
        }
        echo ob_get_clean();
    } else {
        echo '<p>No products found.</p>';
    }

    wp_die();
}

// Shortcode for Model Filter
add_shortcode('custom_model_filter', 'render_model_filter');
function render_model_filter() {
    $terms = get_terms([
        'taxonomy' => 'pa_model', // Replace with your actual taxonomy for models
        'hide_empty' => false,
    ]);

    if (!empty($terms)) {
        ob_start();
        ?>
        <div class="custom-model-filter">
            <button id="model-dropdown-button" class="dropdown-button">Model</button>
            <ul id="model-dropdown-list" class="dropdown-list" style="display: none;">
                <?php foreach ($terms as $term) : ?>
                    <li class="dropdown-item" data-model="<?php echo esc_attr($term->slug); ?>">
                        <label>
                            <input type="checkbox" class="model-checkbox" value="<?php echo esc_attr($term->slug); ?>">
                            <?php echo esc_html($term->name); ?>
                        </label>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php
        return ob_get_clean();
    }
}

// AJAX Handler for Model Filter
add_action('wp_ajax_filter_by_model', 'filter_products_by_model');
add_action('wp_ajax_nopriv_filter_by_model', 'filter_products_by_model');
function filter_products_by_model() {
    $selected_models = isset($_POST['models']) ? (array) $_POST['models'] : [];

    $args = [
        'post_type' => 'product',
        'posts_per_page' => 12,
        'tax_query' => [],
    ];

    if (!empty($selected_models)) {
        $args['tax_query'][] = [
            'taxonomy' => 'pa_model', // Replace with your actual taxonomy for models
            'field'    => 'slug',
            'terms'    => $selected_models,
            'operator' => 'IN',
        ];
    }

    $query = new WP_Query($args);

    if ($query->have_posts()) {
        ob_start();
        while ($query->have_posts()) {
            $query->the_post();
            wc_get_template_part('content', 'product');
        }
        echo ob_get_clean();
    } else {
        echo '<p>No products found.</p>';
    }

    wp_die();
}
add_shortcode('reset_filters_button', function () {
    ob_start();
    ?>
    <div class="reset-filters-container">
        <button class="reset-filters-button" onclick="resetFilters()">Reset Filters</button>
    </div>

    <script>
        function resetFilters() {
            const url = window.location.href.split('?')[0]; // Remove query parameters
            window.location.href = url; // Redirect to the same page without filters
        }
    </script>
    <?php
    return ob_get_clean();
});

add_shortcode('custom_color_filter', 'render_custom_color_filter');

function render_custom_color_filter() {
    $terms = get_terms([
        'taxonomy' => 'pa_kleur',
        'hide_empty' => false,
    ]);

    if (!empty($terms)) {
        ob_start();
        echo '<div class="custom-color-filter">';
        echo '<div class="custom-dropdown">';
        echo '<button id="dropdown-button" class="dropdown-button">Select Colors</button>';
        echo '<ul id="dropdown-list" class="dropdown-list" style="display: none;">';

        foreach ($terms as $term) {
            $color = get_term_meta($term->term_id, 'product_attribute_color', true);
            $style = $color ? 'style="background-color:' . esc_attr($color) . ';"' : '';
            echo '<li class="dropdown-item" data-color="' . esc_attr($term->slug) . '">';
            echo '<label>';
            echo '<input type="checkbox" class="color-checkbox" value="' . esc_attr($term->slug) . '">';
            echo '<span class="color-swatch" ' . $style . '></span>' . esc_html($term->name);
            echo '</label>';
            echo '</li>';
        }

        echo '</ul>';
        echo '</div>';
        echo '</div>'; // Close custom-color-filter
        return ob_get_clean();
    }

    return '';
}

add_action('wp_ajax_filter_by_color', 'filter_products_by_color');
add_action('wp_ajax_nopriv_filter_by_color', 'filter_products_by_color');

function filter_products_by_color() {
    // Get selected colors from the AJAX request
    $selected_colors = isset($_POST['colors']) ? array_map('sanitize_text_field', (array) $_POST['colors']) : [];

    // Build the query arguments
    $args = [
        'post_type' => 'product',
        'posts_per_page' => 12,
        'tax_query' => [],
    ];

    // Add color filter to tax_query if colors are selected
    if (!empty($selected_colors)) {
        $args['tax_query'][] = [
            'taxonomy' => 'pa_kleur',
            'field'    => 'slug',
            'terms'    => $selected_colors,
            'operator' => 'IN',
        ];
    }

    $query = new WP_Query($args);

    // Output the products
    if ($query->have_posts()) {
        ob_start();
        while ($query->have_posts()) {
            $query->the_post();
            wc_get_template_part('content', 'product');
        }
        echo ob_get_clean();
    } else {
        echo '<p>No products found</p>';
    }

    wp_die(); // End AJAX
}

add_action('wp_ajax_filter_by_capacity', 'filter_products_by_capacity');
add_action('wp_ajax_nopriv_filter_by_capacity', 'filter_products_by_capacity');

function filter_products_by_capacity() {
    // Retrieve selected capacities from AJAX
    $selected_capacities = isset($_POST['capacity']) ? (array) $_POST['capacity'] : [];

    // Query arguments for products
    $args = [
        'post_type' => 'product',
        'posts_per_page' => 12,
        'tax_query' => [],
    ];

    if (!empty($selected_capacities)) {
        $args['tax_query'][] = [
            'taxonomy' => 'pa_capacity',
            'field'    => 'slug',
            'terms'    => $selected_capacities,
            'operator' => 'IN',
        ];
    }

    // Query the products
    $query = new WP_Query($args);

    if ($query->have_posts()) {
        ob_start();
        while ($query->have_posts()) {
            $query->the_post();
            wc_get_template_part('content', 'product');
        }
        wp_reset_postdata();
        echo ob_get_clean();
    } else {
        echo '<p>No products found matching the selected capacities.</p>';
    }

    wp_die(); // End the request
}
add_shortcode('custom_capacity_filter', 'render_custom_capacity_filter');

function render_custom_capacity_filter() {
    $terms = get_terms([
        'taxonomy' => 'pa_capacity',
        'hide_empty' => false,
    ]);

    if (!empty($terms)) {
        ob_start();
        echo '<div class="custom-capacity-filter">';
        echo '<button id="capacity-dropdown-button" class="dropdown-button">Opslagcapaciteit (GB)</button>';
        echo '<ul id="capacity-dropdown-list" class="dropdown-list" style="display: none;">';

        foreach ($terms as $term) {
            echo '<li class="dropdown-item">';
            echo '<label>';
            echo '<input type="checkbox" class="capacity-checkbox" value="' . esc_attr($term->slug) . '">';
            echo esc_html($term->name);
            echo '</label>';
            echo '</li>';
        }

        echo '</ul>';
        echo '</div>';
        return ob_get_clean();
    }

    return '';
}


add_action('wp_footer', 'add_sticky_cart_and_header');

function add_sticky_cart_and_header() {
    if (is_product()) {
        global $product;

        // Ensure $product is a valid WC_Product object
        if (!is_a($product, 'WC_Product')) {
            $product = wc_get_product(get_the_ID());
        }

        if ($product) {
            $regular_price = $product->get_regular_price();
            $sale_price = $product->get_sale_price();

            // Ensure prices are valid numbers
            $regular_price = is_numeric($regular_price) ? (float) $regular_price : 0;
            $sale_price = is_numeric($sale_price) ? (float) $sale_price : 0;

            // Calculate discount
            $discount = ($regular_price > 0 && $sale_price > 0) ? $regular_price - $sale_price : 0;

            // Sticky Add-to-Cart Section
            echo '<div id="sticky-add-to-cart" style="display: none; position: fixed; top: 50px; left: 0; right: 0; background: white; padding: 15px; box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 5px; z-index: 999;">';
            echo '<div style="display: flex; align-items: center; justify-content: space-between;">';

            // Product Info Section
            echo '<div class="product-info" style="display: flex; align-items: center;">';
            echo '<div id="sticky-product-image" style="width: 50px; height: 50px; margin-right: 10px;">';
            echo '<img src="' . wp_get_attachment_image_url($product->get_image_id(), 'thumbnail') . '" alt="' . esc_attr($product->get_name()) . '" style="max-width: 100%; max-height: 100%; object-fit: cover;">';
            echo '</div>';
            echo '<div>';
            echo '<div id="sticky-product-title" style="font-size: 24px; font-weight: bold;">' . esc_html($product->get_name()) . '</div>';
            echo '<div id="sticky-product-attributes" style="font-size: 14px; color: #555;">';
            echo '<span id="sticky-selected-attributes"></span>';
            echo '</div>';
            echo '</div>';
            echo '</div>';

            // Price, Discount, and Add-to-Cart Button in a Single Row
            echo '<div class="product-actions" style="display: flex; align-items: center; gap: 20px;">';

            // Discount Section (Before Price)
            if ($discount > 0) {
                echo '<div id="sticky-product-discount" style="font-size: 14px; color: green; font-weight: bold;">Bespaar nu $' . number_format($discount, 2) . '</div>';
            }

            // Price Section
            echo '<div id="sticky-product-price" style="font-size: 18px; font-weight: bold; color: #333;">' . $product->get_price_html() . '</div>';

            // Add-to-Cart Button
            echo '<button id="sticky-add-to-cart-button" class="button add_to_cart_button ajax_add_to_cart" data-product_id="' . $product->get_id() . '" data-product_sku="' . $product->get_sku() . '" data-quantity="1" style="background: #0044cc; color: white; border: none; padding: 10px 20px; cursor: pointer; font-size: 18px; text-transform: none; border-radius: 5px;">Toevoegen aan winkelwagen</button>';
            echo '</div>';

            echo '</div>';
            echo '</div>';
		}

        // Include JavaScript for Sticky Add-to-Cart Visibility
        ?>
        <script type="text/javascript">
            jQuery(document).ready(function ($) {
                const stickyAddToCart = $('#sticky-add-to-cart');

//                 // Show sticky add-to-cart when scrolling
//                 $(window).on('scroll', function () {
//                     if ($(window).scrollTop() > 300) {
//                         stickyAddToCart.fadeIn();
//                     } else {
//                         stickyAddToCart.fadeOut();
//                     }
//                 });

                // WooCommerce handles AJAX add-to-cart automatically for elements with the class "ajax_add_to_cart"
            });
        </script>
        <?php
    }
}



add_action('woocommerce_after_shop_loop_item', function () {
    global $product;

    // Output a custom "Add to Cart" button container
    echo '<div class="custom-add-to-cart-wrapper">';
    echo '<button type="button" class="custom_add_to_cart_button button" data-product-id="' . esc_attr($product->get_id()) . '">';
    echo '<span class="button-text">Toevoegen</span>';
    echo '<span class="loading-spinner" style="display: none; margin-left: 5px;">🔄</span>';
    echo '</button>';
    echo '</div>';
}, 15);

add_action('wp_footer', function () {
    ?>
    <script type="text/javascript">
        jQuery(document).ready(function ($) {
            $(document).on('click', '.custom_add_to_cart_button', function (e) {
                e.preventDefault();

                const $button = $(this);
                const productId = $button.data('product-id');
                const $spinner = $button.find('.loading-spinner');
                const $buttonText = $button.find('.button-text');

                // Disable button and show spinner
                $button.prop('disabled', true);
                $spinner.show();
                $buttonText.text('Toevoegen');

                // Perform AJAX request to add to cart
                $.ajax({
                    url: wc_add_to_cart_params.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'woocommerce_add_to_cart',
                        product_id: productId,
                        quantity: 1
                    },
                    success: function (response) {
                        if (response && !response.error) {
                            // Update cart fragments (mimics default behavior)
                            $(document.body).trigger('added_to_cart', [response.fragments, response.cart_hash]);

                            // Reset button state
                            $button.prop('disabled', false);
                            $spinner.hide();
                            $buttonText.text('Toevoegen');
                        } else {
                            alert('Failed to add to cart.');
                            $button.prop('disabled', false);
                            $spinner.hide();
                            $buttonText.text('Toevoegen');
                        }
                    },
                    error: function () {
                        alert('An error occurred. Please try again.');
                        $button.prop('disabled', false);
                        $spinner.hide();
                        $buttonText.text('Toevoegen');
                    }
                });
            });
        });
    </script>
    <?php
});
add_filter('body_class', function ($classes) {
    if (is_page('accessories-page')) { // Replace 'accessories-page' with your page slug
        $classes[] = 'accessories-page';
    }
    return $classes;
});

add_action('wp_ajax_get_accessories_meta', 'get_accessories_meta_callback');
add_action('wp_ajax_nopriv_get_accessories_meta', 'get_accessories_meta_callback');

function get_accessories_meta_callback() {
    error_log('AJAX Request: ' . print_r($_POST, true)); // Log incoming request

    if (isset($_POST['product_id']) && !empty($_POST['product_id'])) {
        $product_id = intval($_POST['product_id']);
        $accessories = get_post_meta($product_id, '_related_accessories', true);

        error_log('Accessories Meta Retrieved: ' . print_r($accessories, true)); // Log retrieved meta

        if (!empty($accessories)) {
            wp_send_json_success(['accessories' => $accessories]);
        } else {
            wp_send_json_error(['message' => 'No accessories found.']);
        }
    } else {
        wp_send_json_error(['message' => 'Invalid product ID.']);
    }
}
add_shortcode('display_accessories_page', function () {
    if (isset($_GET['accessories'])) {
        $ids = array_map('intval', explode(',', sanitize_text_field($_GET['accessories'])));

        if (empty($ids)) {
            return '<p>' . __('No accessories found.', 'woocommerce') . '</p>';
        }

        $args = [
            'post_type'      => 'product',
            'post__in'       => $ids,
            'posts_per_page' => -1,
            'post_status'    => 'publish',
        ];

        $query = new WP_Query($args);

        ob_start();

        if ($query->have_posts()) {
            echo '<div class="accessories-products-container">';
            echo '<ul class="products accessories-grid">';

            while ($query->have_posts()) {
                $query->the_post();
                wc_get_template_part('content', 'product');
            }

            echo '</ul>';
            echo '</div>';
        } else {
            echo '<p>' . __('No accessories found.', 'woocommerce') . '</p>';
        }

        wp_reset_postdata();
        return ob_get_clean();
    }

    return '<p>' . __('No accessories found.', 'woocommerce') . '</p>';
});
add_filter('woocommerce_add_to_cart_redirect', function ($url) {
    if (is_product() && isset($_POST['add-to-cart'])) {
        $product_id = intval($_POST['add-to-cart']);
        $accessories = get_post_meta($product_id, '_related_accessories', true);

        if (!empty($accessories)) {
            $custom_url = add_query_arg(['accessories' => $accessories], site_url('/accessories-page/'));
            return $custom_url;
        }
    }

    return $url;
});

add_action('wp_footer', function () {
    if (is_product()) {
        global $product;

        ?>
        <script type="text/javascript">
            jQuery(document).ready(function ($) {
                // Attach functionality to sticky add-to-cart button
                $(document).on('click', '#sticky-add-to-cart-button', function (e) {
                    e.preventDefault();

                    const productId = '<?php echo $product->get_id(); ?>';
                    const accessories = '<?php echo get_post_meta($product->get_id(), '_related_accessories', true); ?>';

                    if (accessories) {
                        const accessoriesPageUrl = `/accessories-page/?accessories=${accessories}`;
                        window.location.href = accessoriesPageUrl;
                    } else {
                        alert('No accessories found for this product.');
                    }
                });
            });
        </script>
        <?php
    }
});

add_action('woocommerce_product_options_related', function () {
    woocommerce_wp_text_input([
        'id'          => '_related_accessories',
        'label'       => __('Accessories (Product IDs)', 'woocommerce'),
        'placeholder' => __('Comma-separated product IDs', 'woocommerce'),
        'desc_tip'    => true,
        'description' => __('Enter the product IDs of accessories, separated by commas.', 'woocommerce'),
    ]);
});

add_action('woocommerce_process_product_meta', function ($post_id) {
    $accessories = isset($_POST['_related_accessories']) ? sanitize_text_field($_POST['_related_accessories']) : '';
    update_post_meta($post_id, '_related_accessories', $accessories);
});
function custom_cart_page() {
    ob_start();

    // Check if the cart is empty
    if (WC()->cart->is_empty()) {
        ?>
       <div id="custom-cart-empty">
    <div class="empty-cart-container">
        <h1>Je winkelwagen is leeg</h1>
        <p>Het lijkt erop dat je nog niets aan je winkelwagen hebt toegevoegd.</p>
        <a href="<?php echo esc_url(home_url('/shop')); ?>" class="shop-now-button">Nu winkelen</a>
    </div>
</div>

            <style>
                #custom-cart-empty {
                    text-align: center;
                    padding: 50px;
                    margin-bottom: 10%;
                }
                #custom-cart-empty h1 {
                    font-size: 2rem;
                    margin-bottom: 20px;
                }
                #custom-cart-empty p {
                    font-size: 1.2rem;
                    margin-bottom: 30px;
                }
                .shop-now-button {
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-size: 1rem;
                }
                .shop-now-button:hover {
                    background-color: #0056b3;
                }
            </style>
        </div>
        <?php
        return ob_get_clean();
    }

    // If the cart is not empty, show the regular cart page
    $cart_items = WC()->cart->get_cart();
    ?>
    <div id="custom-cart">
        <div class="cart-header">
            <h1>Winkelwagen</h1>
            <p><?php echo count($cart_items); ?> producten in winkelwagen.</p>
        </div>
        <div class="cart-container">
            <div class="cart-table-wrapper">
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Omschrijving</th>
                            <th>Prijs</th>
                            <th>Aantal</th>
                            <th>Totaal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($cart_items as $cart_item_key => $cart_item): 
                            $product = $cart_item['data'];

                            // Validate product object
                            if (!is_a($product, 'WC_Product')) {
                                continue; // Skip if not a valid WC_Product
                            }

                            // Get product image or fallback to a placeholder
                            $product_image_id = get_post_thumbnail_id($product->get_id());
                            $product_image = $product_image_id 
                                ? wp_get_attachment_image_src($product_image_id, 'medium')[0] 
                                : wc_placeholder_img_src();

                            // Get product attributes
                            $attributes = $product->get_attributes();

                            // Calculate product total
                            $product_total = $cart_item['quantity'] * $product->get_price();
                        ?>
                        <tr>
                            <td class="product-info">
                                <button class="remove-item" data-cart-key="<?php echo esc_attr($cart_item_key); ?>">×</button>
                                <div class="product-image">
                                    <img src="<?php echo esc_url($product_image); ?>" alt="<?php echo esc_attr($product->get_name()); ?>">
                                </div>
                                <div class="product-details">
                                    <h2 class="product-name"><?php echo esc_html($product->get_name()); ?></h2>
                                    <div class="attributes">
                                        <?php 
                                        if (!empty($attributes)) :
                                            foreach ($attributes as $attribute_name => $attribute) :
                                                $label = wc_attribute_label($attribute_name);
                                                $value = $product->get_attribute($attribute_name);
                                        ?>
                                                <p><strong><?php echo esc_html($label); ?>:</strong> <?php echo esc_html($value); ?></p>
                                        <?php endforeach; endif; ?>
                                    </div>
                                </div>
                            </td>
                            <td><?php echo wc_price($product->get_price()); ?></td>
                            <td>
                                <div class="quantity-controls">
                                    <button class="quantity-decrease" data-cart-key="<?php echo esc_attr($cart_item_key); ?>">-</button>
                                    <span class="quantity"><?php echo esc_html($cart_item['quantity']); ?></span>
                                    <button class="quantity-increase" data-cart-key="<?php echo esc_attr($cart_item_key); ?>">+</button>
                                </div>
                            </td>
                            <td><?php echo wc_price($product_total); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <div class="order-summary-wrapper">
                <div class="order-summary">
                    <h2>Besteloverzicht</h2>
                    <p><strong>Totaal:</strong> <span id="order-total"><?php echo WC()->cart->get_cart_total(); ?></span></p>
                    <a href="<?php echo esc_url(wc_get_checkout_url()); ?>" class="checkout-button">Verder naar verzending</a>
                    
                    <!-- Payment Icons -->
                    <div class="payment-icons-C" style="margin-top: 15px; text-align: center;">
                        <div class="flex flex-wrap items-center gap-4">
                            <img loading="lazy" alt="Visa" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/networks-v4/visa.svg" width="36" height="20">
                            <img loading="lazy" alt="Mastercard" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/networks-v4/mastercard.svg" width="36" height="20">
                            <img loading="lazy" alt="iDEAL" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/methods-v4/ideal.svg" width="36" height="20">
                            <img loading="lazy" alt="PayPal" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/methods-v4/paypal.svg" width="36" height="20">
                            <img loading="lazy" alt="Apple Pay" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/methods-v4/apple_pay.svg" width="36" height="20">
                            <img loading="lazy" alt="Klarna" src="https://front-office.statics.backmarket.com/5cc5200abf0047b18c9410beef1287d7372f32c6/img/payment/networks-v4/klarna.svg" width="36" height="20">
                        </div>
                    </div>
                </div>

                <!-- Checkout Benefits Section -->
                <div class="checkout-benefits">
					<div class="benefit">
                        <img src="https://maxgood.nl/wp-content/uploads/2025/01/30-days.png" alt="14 Days Icon" class="benefit-icon">
                        <p>30 dagen bedenktijd</p>
                    </div>
                    <div class="benefit">
                        <img src="https://maxgood.nl/wp-content/uploads/2025/01/free-delivery.png" alt="Free Shipping Icon" class="benefit-icon">
                        <p>Gratis verzending & Retour</p>
                    </div>
                    <div class="benefit">
                        <img src="http://maxgood.nl/wp-content/uploads/2025/02/icons8-24-100-1.png" alt="Guarantee Icon" class="benefit-icon">
                        <p>24 maanden MAXGood garantie</p>
                    </div>
                    <div class="benefit">
                        <img src="https://maxgood.nl/wp-content/uploads/2025/01/refurbished-product.png" alt="Refurbished Icon" class="benefit-icon">
                        <p>Refurbished door onze experts</p>
                    </div>
                    <div class="benefit">
                        <img src="https://maxgood.nl/wp-content/uploads/2025/01/mobile.png" alt="Works Like New Icon" class="benefit-icon">
                        <p>Werkt als nieuw</p>
                    </div>
                    <div class="benefit">
                        <img src="https://maxgood.nl/wp-content/uploads/2025/01/cashback.png" alt="Money Back Icon" class="benefit-icon">
                        <p>Geld terug garantie</p>
                    </div>
                    
                </div>
            </div>
        </div>
    </div>
    <?php

    return ob_get_clean();
}
add_shortcode('custom_cart', 'custom_cart_page');






// Update cart quantity via AJAX
add_action('wp_ajax_update_cart_item', 'update_cart_item');
add_action('wp_ajax_nopriv_update_cart_item', 'update_cart_item');

function update_cart_item() {
    $cart_key = sanitize_text_field($_POST['cart_key']);
    $quantity = intval($_POST['quantity']);

    if ($quantity > 0 && $cart_key) {
        WC()->cart->set_quantity($cart_key, $quantity, true);

        // Recalculate totals
        WC()->cart->calculate_totals();

        // Retrieve the updated totals
        $subtotal = WC()->cart->get_subtotal(); // Numeric subtotal
        $total = WC()->cart->get_total(); // Formatted total

        wp_send_json_success([
            'subtotal' => html_entity_decode(strip_tags(wc_price($subtotal))),
            'total' => html_entity_decode(strip_tags(wc_price($total))),
        ]);
    } else {
        wp_send_json_error(['message' => 'Invalid quantity or cart key.']);
    }
}

// Remove cart item via AJAX
add_action('wp_ajax_remove_cart_item', 'remove_cart_item');
add_action('wp_ajax_nopriv_remove_cart_item', 'remove_cart_item');

function remove_cart_item() {
    $cart_key = sanitize_text_field($_POST['cart_key']);

    if ($cart_key) {
        WC()->cart->remove_cart_item($cart_key);
        WC()->cart->calculate_totals();

        wp_send_json_success([
            'subtotal' => html_entity_decode(strip_tags(wc_price(WC()->cart->get_subtotal()))),
            'total' => html_entity_decode(strip_tags(wc_price(WC()->cart->get_total()))),
        ]);
    } else {
        wp_send_json_error(['message' => 'Invalid cart key.']);
    }
}

// Enqueue the JavaScript file
function enqueue_custom_cart_scripts() {
    wp_enqueue_script('custom-cart', get_template_directory_uri() . '/js/custom-cart.js', ['jquery'], '1.0', true);
    wp_localize_script('custom-cart', 'wc_cart_params', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
}
add_action('wp_enqueue_scripts', 'enqueue_custom_cart_scripts');





add_action('wp_ajax_check_cart_updates', 'check_cart_updates');
add_action('wp_ajax_nopriv_check_cart_updates', 'check_cart_updates');

function check_cart_updates() {
    // Get the cart items
    $cart_items = WC()->cart->get_cart();
    $cart_count = WC()->cart->get_cart_contents_count(); // Get the total number of items in the cart
    ob_start();

    foreach ($cart_items as $cart_item_key => $cart_item) {
        $product = $cart_item['data'];

        // Ensure $product is a valid WC_Product object
        if (!is_a($product, 'WC_Product')) {
            continue; // Skip if $product is not valid
        }

        // Get product image or fallback to a placeholder
        $product_image_id = get_post_thumbnail_id($product->get_id());
        if ($product_image_id) {
            $product_image = wp_get_attachment_image_src($product_image_id, 'medium')[0];
        } else {
            $product_image = wc_placeholder_img_src(); // Fallback to a placeholder
        }

        $product_name = $product->get_name();
        $product_price = wc_price($product->get_price());
        $product_quantity = $cart_item['quantity'];
        $product_total = wc_price($cart_item['quantity'] * $product->get_price());

        // Fetch attributes
        $attributes = $product->get_attributes();
?>
        <tr>
            <td class="product-info">
                <button class="remove-item" data-cart-key="<?php echo esc_attr($cart_item_key); ?>">×</button>
                <div class="product-image">
                    <img src="<?php echo esc_url($product_image); ?>" alt="<?php echo esc_attr($product_name); ?>">
                </div>
                <div class="product-details">
                    <h2 class="product-name"><?php echo esc_html($product_name); ?></h2>
                    <div class="attributes">
                        <?php 
                        if (!empty($attributes)) :
                            foreach ($attributes as $attribute_name => $attribute) :
                                $label = wc_attribute_label($attribute_name);
                                $value = $product->get_attribute($attribute_name);
                                ?>
                                <p><strong><?php echo esc_html($label); ?>:</strong> <?php echo esc_html($value); ?></p>
                        <?php endforeach; endif; ?>
                    </div>
                </div>
            </td>
            <td><?php echo $product_price; ?></td>
            <td>
                <div class="quantity-controls">
                    <button class="quantity-decrease" data-cart-key="<?php echo esc_attr($cart_item_key); ?>">-</button>
                    <span class="quantity"><?php echo esc_html($product_quantity); ?></span>
                    <button class="quantity-increase" data-cart-key="<?php echo esc_attr($cart_item_key); ?>">+</button>
                </div>
            </td>
            <td><?php echo $product_total; ?></td>
        </tr>
        <?php
    }

    $cart_content = ob_get_clean();
    $cart_total = wc_price(WC()->cart->get_total('edit'));

    wp_send_json_success([
        'cart_content' => $cart_content,
        'cart_total' => $cart_total,
        'cart_count' => $cart_count, // Include the cart count
    ]);
}
function custom_account_page_shortcode() {
    if (!is_user_logged_in()) {
        return '<p>You need to log in to access your account page.</p>';
    }

    // Get current user data
    $current_user = wp_get_current_user();
    $user_id = $current_user->ID;
    $user_meta = get_user_meta($user_id);

    // HTML structure for the account page
    ob_start(); // Buffer the output
    ?>
    <div class="account-page">
        <div class="account-sidebar">
            <div class="profile-pic">
                <img src="<?php echo esc_url(get_avatar_url($user_id)); ?>" alt="Profile Picture">
            </div>
            <ul class="account-menu">
                <li><a href="#" class="active">Personal Information</a></li>
                <li><a href="order-tracking">Order Tracking</a></li>
                <li><a href="/orders/">Order History</a></li>
            </ul>
            <button class="signout-button" onclick="location.href='<?php echo wp_logout_url(); ?>'">Sign Out</button>
        </div>
        <div class="account-content">
            <h2>Personal Information</h2>
            <p>Manage your personal information, including phone numbers and email addresses where you can be contacted.</p>
            <div class="info-cards">
                <div class="info-card">
                    <h4>Name</h4>
                    <p><?php echo esc_html($current_user->display_name); ?></p>
                </div>
                <div class="info-card">
                    <h4>Date of Birth</h4>
                    <p><?php echo esc_html($user_meta['date_of_birth'][0] ?? 'Not Provided'); ?></p>
                </div>
                <div class="info-card">
                    <h4>Country/Region</h4>
                    <p><?php echo esc_html($user_meta['country'][0] ?? 'Not Provided'); ?></p>
                </div>
                <div class="info-card">
                    <h4>Language</h4>
                    <p><?php echo esc_html($user_meta['language'][0] ?? 'English (Default)'); ?></p>
                </div>
                <div class="info-card">
                    <h4>Contactable at</h4>
                    <p><?php echo esc_html($current_user->user_email); ?></p>
                </div>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean(); // Return the buffered content
}
add_shortcode('account_page', 'custom_account_page_shortcode');

function custom_order_history_shortcode() {
    if (!is_user_logged_in()) {
        return '<p>You need to log in to view your order history.</p>';
    }

    // Ensure WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return '<p>WooCommerce is not active. Please install and activate it to use the Order History feature.</p>';
    }

    // Get the current user
    $current_user = wp_get_current_user();
    $user_id = $current_user->ID;

    // Fetch all orders (linked to the logged-in user)
    $orders = wc_get_orders(array(
        'customer_id' => $user_id,
        'status'      => array('wc-completed', 'wc-processing', 'wc-on-hold', 'wc-cancelled', 'wc-refunded'),
        'limit'       => -1,
    ));

    if (empty($orders)) {
        return '<p>No orders found.</p>';
    }

    // Build the order history table
    ob_start();
    ?>
    <div class="order-history-page">
        <h2>Order History</h2>
        <table class="order-history-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($orders as $order): ?>
                    <tr>
                        <td>#<?php echo esc_html($order->get_id()); ?></td>
                        <td><?php echo esc_html($order->get_date_created()->date('F j, Y')); ?></td>
                        <td><?php echo esc_html(wc_get_order_status_name($order->get_status())); ?></td>
                        <td><?php echo wp_kses_post($order->get_formatted_order_total()); ?></td>
                        <td>
                            <a href="<?php echo esc_url(add_query_arg('order_id', $order->get_id(), site_url('/order-details'))); ?>" class="view-order-button">View</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <style>
        .order-history-page { margin: 20px 0; }
        .order-history-table { width: 100%; border-collapse: collapse; }
        .order-history-table th, .order-history-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        .order-history-table th { background-color: #f9f9f9; }
        .view-order-button { background: #007bff; color: white; padding: 5px 10px; border-radius: 3px; text-decoration: none; }
        .view-order-button:hover { background: #0056b3; }
    </style>
    <?php
    return ob_get_clean();
}
add_shortcode('order_history', 'custom_order_history_shortcode');

function custom_order_details_shortcode() {
    if (!is_user_logged_in()) {
        return '<p>You need to log in to view your order details.</p>';
    }

    // Ensure WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return '<p>WooCommerce is not active. Please install and activate it to use the Order Details feature.</p>';
    }

    // Get the order ID from the URL
    if (!isset($_GET['order_id'])) {
        return '<p>No order ID provided.</p>';
    }

    $order_id = intval($_GET['order_id']);
    $order = wc_get_order($order_id);

    // Check if the order exists and belongs to the logged-in user
    if (!$order || $order->get_user_id() !== get_current_user_id()) {
        return '<p>Order not found or you do not have permission to view this order.</p>';
    }

    ob_start();
    ?>
    <div class="order-details-page">
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> #<?php echo esc_html($order->get_id()); ?></p>
        <p><strong>Order Date:</strong> <?php echo esc_html($order->get_date_created()->date('F j, Y')); ?></p>
        <p><strong>Status:</strong> <?php echo esc_html(wc_get_order_status_name($order->get_status())); ?></p>

        <h3>Items</h3>
        <table class="order-items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($order->get_items() as $item): ?>
                    <tr>
                        <td><?php echo esc_html($item->get_name()); ?></td>
                        <td><?php echo esc_html($item->get_quantity()); ?></td>
                        <td><?php echo wc_price($item->get_total()); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <h3>Billing Details</h3>
        <p><strong>Name:</strong> <?php echo esc_html($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()); ?></p>
        <p><strong>Email:</strong> <?php echo esc_html($order->get_billing_email()); ?></p>
        <p><strong>Address:</strong> <?php echo esc_html($order->get_billing_address_1()); ?></p>

<!--         <h3>Shipping Details</h3>
        <p><strong>Address:</strong> <?php echo esc_html($order->get_shipping_address_1()); ?></p> -->
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('order_details', 'custom_order_details_shortcode');

function fetch_related_products_with_attributes() {
    if (!function_exists('WC')) {
        wp_send_json_error('WooCommerce is not active.');
        return;
    }

    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;

    if (!$product_id) {
        wp_send_json_error('Invalid product ID.');
        return;
    }

    $related_ids = wc_get_related_products($product_id, 8);
    $related_products = [];

    foreach ($related_ids as $related_id) {
        $product = wc_get_product($related_id);

        if ($product) {
            $attributes = $product->get_attributes();
            $formatted_attributes = [];

            foreach ($attributes as $attribute_name => $attribute) {
                $label = wc_attribute_label($attribute_name);
                $options = $attribute->get_terms();

                if ($label === 'Capacity') {
                    $formatted_attributes['Capacity'] = array_map(function ($term) {
                        return $term->name;
                    }, $options);
                } elseif ($label === 'Colors') {
                    $formatted_attributes['Colors'] = array_map(function ($term) {
                        $color = get_term_meta($term->term_id, 'product_attribute_color', true);
                        return [
                            'label' => $term->name,
                            'color' => $color ?: '#ccc',
                        ];
                    }, $options);
                }
            }

            $related_products[] = [
                'id'         => $product->get_id(),
                'title'      => $product->get_name(),
                'link'       => get_permalink($product->get_id()),
                'image'      => wp_get_attachment_url($product->get_image_id()),
                'price'      => $product->get_price_html(),
                'attributes' => $formatted_attributes,
            ];
        }
    }

    wp_send_json_success($related_products);
}
add_action('wp_ajax_fetch_related_products', 'fetch_related_products_with_attributes');
add_action('wp_ajax_nopriv_fetch_related_products', 'fetch_related_products_with_attributes');

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('slick-slider-css', 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css');
    wp_enqueue_script('slick-slider-js', 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js', ['jquery'], null, true);

    wp_localize_script('slick-slider-js', 'relatedProductsData', [
        'ajaxUrl'   => admin_url('admin-ajax.php'),
        'productId' => get_the_ID(),
    ]);
});

// Add custom fields directly in a separate meta box
add_action('add_meta_boxes', 'add_custom_fields_meta_box');

function add_custom_fields_meta_box() {
    add_meta_box(
        'custom_fields_meta_box',
        'Custom Product Fields',
        'render_custom_fields_meta_box',
        'product',
        'normal',
        'default'
    );
}

function render_custom_fields_meta_box($post) {
    // Security nonce field
    wp_nonce_field('save_custom_fields', 'custom_fields_nonce');

    // Define custom fields with labels
    $fields = [
        'screen_size' => 'Screen Size',
        'display' => 'Display',
        'chip' => 'Chip',
        'camera' => 'Camera',
        'capacity' => 'Capacity',
        'battery_duration' => 'Battery Duration',
        'network' => '4G / 5G',
        'usb_type' => 'USB Type',
        'authentication' => 'Face ID or Fingerprint',
        'wireless_charging' => 'Wireless Charging',
        'colors' => 'Colors',
        'year' => 'Year'
    ];

    echo '<div class="custom-fields">';

    foreach ($fields as $key => $label) {
        $field_id = '_custom_field_' . $key;
        $field_value = get_post_meta($post->ID, $field_id, true);

        echo '<p><label for="' . esc_attr($field_id) . '">' . esc_html($label) . ':</label></p>';

        // Use WYSIWYG editor for all fields
        wp_editor($field_value, $field_id, [
            'textarea_name' => $field_id,
            'textarea_rows' => 5,
            'media_buttons' => true
        ]);
    }

    echo '</div>';
}

// Save custom field values
add_action('save_post', 'save_custom_fields');

function save_custom_fields($post_id) {
    // Verify nonce
    if (!isset($_POST['custom_fields_nonce']) || !wp_verify_nonce($_POST['custom_fields_nonce'], 'save_custom_fields')) {
        return;
    }

    // Check post type
    if (get_post_type($post_id) !== 'product') {
        return;
    }

    $fields = [
        'screen_size',
        'display',
        'chip',
        'camera',
        'capacity',
        'battery_duration',
        'network',
        'usb_type',
        'authentication',
        'wireless_charging',
        'colors',
        'year'
    ];

    foreach ($fields as $key) {
        $field_id = '_custom_field_' . $key;

        if (isset($_POST[$field_id])) {
            update_post_meta($post_id, $field_id, wp_kses_post($_POST[$field_id])); // Allow HTML content
        }
    }
}

// Display custom fields and color attributes on the product page
add_action('woocommerce_single_product_summary', 'display_custom_fields_on_product_page', 25);

function display_custom_fields_on_product_page() {
    global $post;

    $fields = [
        'screen_size' => ['label' => 'Screen Size', 'image' => '/wp-content/uploads/2025/01/icons8-trust-64-2.png'],
        'display' => ['label' => 'Display', 'image' => 'https://example.com/icons/display.png'],
        'chip' => ['label' => 'Chip', 'image' => 'https://example.com/icons/chip.png'],
        'camera' => ['label' => 'Camera', 'image' => 'https://example.com/icons/camera.png'],
        'capacity' => ['label' => 'Capacity', 'image' => 'https://example.com/icons/capacity.png'],
        'battery_duration' => ['label' => 'Battery Duration', 'image' => 'https://example.com/icons/battery.png'],
        'network' => ['label' => '4G / 5G', 'image' => 'https://example.com/icons/network.png'],
        'usb_type' => ['label' => 'USB Type', 'image' => 'https://example.com/icons/usb.png'],
        'authentication' => ['label' => 'Face ID or Fingerprint', 'image' => 'https://example.com/icons/authentication.png'],
        'wireless_charging' => ['label' => 'Wireless Charging', 'image' => 'https://example.com/icons/wireless-charging.png'],
        'colors' => ['label' => 'Colors', 'image' => 'https://example.com/icons/colors.png'],
        'year' => ['label' => 'Year', 'image' => 'https://example.com/icons/year.png']
    ];

    echo '<div class="product-custom-fields">';

    foreach ($fields as $key => $data) {
        $field_value = get_post_meta($post->ID, '_custom_field_' . $key, true);

        if (!empty($field_value)) {
            echo '<p><img src="' . esc_url($data['image']) . '" alt="' . esc_attr($data['label']) . '" style="width:24px; height:24px; margin-right:8px;">';
            echo '<strong>' . esc_html($data['label']) . ':</strong> ' . wp_kses_post($field_value) . '</p>';
        }
    }

    // Dynamically fetch colors from the product attribute
    $product = wc_get_product($post->ID);
    $colors = $product->get_attribute('pa_kleur');

    if (!empty($colors)) {
        $color_values = explode(',', $colors);
        echo '<ul role="radiogroup" aria-label="Colors" class="variable-items-wrapper color-variable-items-wrapper wvs-style-squared" data-attribute_name="attribute_pa_kleur">';

        foreach ($color_values as $color) {
            $color_slug = sanitize_title($color);
            $color_name = ucfirst(trim($color));

            // Dynamic color HEX fetching from WooCommerce terms meta or fallback
            $term = get_term_by('slug', $color_slug, 'pa_kleur');
            $color_hex = $term ? get_term_meta($term->term_id, 'color', true) : '#cccccc';

            echo '<li class="variable-item color-variable-item color-variable-item-' . esc_attr($color_slug) . '" title="' . esc_attr($color_name) . '" data-value="' . esc_attr($color_slug) . '">';
            echo '<div class="variable-item-contents">';
            echo '<span class="variable-item-span variable-item-span-color" style="background-color:' . esc_attr($color_hex) . ';"></span>';
            echo '</div></li>';
        }

        echo '</ul>';
    }

    // Add a button to view the product
// Add a button to view the product
echo '<a href="' . esc_url(get_permalink($post->ID)) . '" class="button product-view-button" style="margin-top:15px;">View Product</a>';

    echo '</div>';
}

add_shortcode('mobile_filter_popup', function () {
    ob_start();
    ?>
    <!-- Floating Button -->
    <button class="filter-toggle-button">Open Filters</button>

    <!-- Filter Popup -->
    <div id="filter-popup" class="filter-popup">
        <div class="filter-popup-header">
            <h3>Filters</h3>
            <button id="close-filters" class="close-button">×</button>
        </div>
        <div class="filter-popup-content">
            <div class="filter-section" data-toggle="filter-1">
                <?php echo do_shortcode('[custom_price_filter]'); ?>
            </div>
            <div class="filter-section" data-toggle="filter-2">
                <?php echo do_shortcode('[custom_color_filter]'); ?>
            </div>
            <div class="filter-section" data-toggle="filter-3">
                <?php echo do_shortcode('[custom_capacity_filter]'); ?>
            </div>
            <div class="filter-section" data-toggle="filter-4">
                <?php echo do_shortcode('[custom_verschijningsjaar_filter]'); ?>
            </div>
            <div class="filter-section" data-toggle="filter-5">
                <?php echo do_shortcode('[custom_model_filter]'); ?>
            </div>
            <div class="reset-filters-container">
                <button class="reset-filters-button" onclick="resetFilters()">Reset Filters</button>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
});

// // Add cart count as a WordPress shortcode
// function inject_cart_count() {
//     // Replace with your actual logic for cart items. For WooCommerce, use WC()->cart->get_cart_contents_count()
// $cart_count = class_exists('WooCommerce') ? WC()->cart->get_cart_contents_count() : 0;

//     // Output a JavaScript-readable data attribute for cart count
//     echo '<script>
//         document.addEventListener("DOMContentLoaded", function() {
//             let cartIcon = document.querySelector(".cart-icon");
//             if (cartIcon) {
//                 cartIcon.setAttribute("data-cart-count", "' . $cart_count . '");
//             }
//         });
//     </script>';
// }
// add_action('wp_footer', 'inject_cart_count');

// Enqueue custom JavaScript for cart updates
function enqueue_dynamic_cart_count_script() {
    wp_enqueue_script('dynamic-cart-count', get_template_directory_uri() . '/dynamic-cart-count.js', array('jquery'), null, true);
    wp_localize_script('dynamic-cart-count', 'ajaxData', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
    ));
}
add_action('wp_enqueue_scripts', 'enqueue_dynamic_cart_count_script');

// Handle AJAX request to get cart count
function get_cart_count() {
    $cart_count = function_exists('WC') ? WC()->cart->get_cart_contents_count() : 0;
    wp_send_json_success(array('count' => $cart_count));
}
add_action('wp_ajax_get_cart_count', 'get_cart_count');
add_action('wp_ajax_nopriv_get_cart_count', 'get_cart_count');

function ajax_product_comparison_shortcode() {
    // Replace 'accessories' with the *exact* slug you found in your WP dashboard
    $excluded_category_slug = 'accessories';

    // Set up the args to exclude that category
    $args = array(
        'limit'    => -1,
        'post_type'=> 'product',
        'status'   => 'publish',
        'tax_query' => array(
            array(
                'taxonomy' => 'product_cat',
                'field'    => 'slug',
                'terms'    => array( $excluded_category_slug ),
                'operator' => 'NOT IN',
                // 'include_children' => true (this is default true; set to false if needed)
            ),
        ),
    );

    // Fetch products
    $products = wc_get_products($args);

    ob_start();
    ?>
    <div class="product-dropdown-container">
        <select id="product-1" class="product-dropdown">
            <option value="">Select a product</option>
            <?php
            foreach ($products as $product) {
                echo '<option value="' . esc_attr($product->get_id()) . '">' . esc_html($product->get_name()) . '</option>';
            }
            ?>
        </select>

        <select id="product-2" class="product-dropdown">
            <option value="">Select a product</option>
            <?php
            foreach ($products as $product) {
                echo '<option value="' . esc_attr($product->get_id()) . '">' . esc_html($product->get_name()) . '</option>';
            }
            ?>
        </select>
    </div>

    <div class="product-compare-container">
        <div id="comparison-results"></div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('ajax_product_comparison', 'ajax_product_comparison_shortcode');


function fetch_product_comparison_data() {
    if (isset($_POST['product1_id'], $_POST['product2_id'])) {
        $product1_id = (int) $_POST['product1_id'];
        $product2_id = (int) $_POST['product2_id'];

        $product1 = wc_get_product($product1_id);
        $product2 = wc_get_product($product2_id);

        if (!$product1 || !$product2) {
            wp_send_json_error(['message' => 'Invalid products selected.']);
        }

        $fields = [
            'screen_size' => 'Screen Size',
            'display' => 'Display',
            'chip' => 'Chip',
            'camera' => 'Camera',
            'capacity' => 'Capacity',
            'battery_duration' => 'Battery Duration',
            'network' => '4G / 5G',
            'usb_type' => 'USB Type',
            'authentication' => 'Face ID or Fingerprint',
            'wireless_charging' => 'Wireless Charging',
            'year' => 'Year'
        ];

        $comparison_data = [
            'products' => [
                [
                    'name' => $product1->get_name(),
                    'price' => wc_price($product1->get_price()),
                    'image' => wp_get_attachment_url($product1->get_image_id()),
                    'link' => $product1->get_permalink(),
                    'fields' => []
                ],
                [
                    'name' => $product2->get_name(),
                    'price' => wc_price($product2->get_price()),
                    'image' => wp_get_attachment_url($product2->get_image_id()),
                    'link' => $product2->get_permalink(),
                    'fields' => []
                ]
            ],
        ];

        foreach ($fields as $key => $label) {
            $comparison_data['products'][0]['fields'][$key] = get_post_meta($product1_id, '_custom_field_' . $key, true);
            $comparison_data['products'][1]['fields'][$key] = get_post_meta($product2_id, '_custom_field_' . $key, true);
        }

        wp_send_json_success($comparison_data);
    } else {
        wp_send_json_error(['message' => 'Missing product IDs.']);
    }
}
add_action('wp_ajax_fetch_comparison_data', 'fetch_product_comparison_data');
add_action('wp_ajax_nopriv_fetch_comparison_data', 'fetch_product_comparison_data');

function enqueue_comparison_scripts() {
    wp_enqueue_script(
        'product-comparison-script',
        get_template_directory_uri() . '/js/product-comparison.js',
        ['jquery'],
        null,
        true
    );

    wp_localize_script('product-comparison-script', 'comparisonAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
}
add_action('wp_enqueue_scripts', 'enqueue_comparison_scripts');

function add_battery_popup_js() {
    ?>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // Open Popup
            document.querySelectorAll('.battery-popup-trigger').forEach(function (trigger) {
                trigger.addEventListener('click', function (e) {
                    e.preventDefault();
                    const popup = document.getElementById('battery-popup');
                    if (popup) {
                        popup.style.display = 'flex'; // Show the popup
                    }
                });
            });

            // Close Popup
            document.querySelectorAll('.custom-popup-close-btn').forEach(function (closeBtn) {
                closeBtn.addEventListener('click', function () {
                    const popup = document.getElementById('battery-popup');
                    if (popup) {
                        popup.style.display = 'none'; // Hide the popup
                    }
                });
            });

            // Close Popup by Clicking Outside the Content
            const popupModal = document.getElementById('battery-popup');
            if (popupModal) {
                popupModal.addEventListener('click', function (e) {
                    if (e.target === popupModal) {
                        popupModal.style.display = 'none'; // Hide the popup
                    }
                });
            }
        });
    </script>
    <?php
}
add_action('wp_footer', 'add_battery_popup_js');

function add_condition_popup() {
    ?>
    <!-- Condition Popup -->
    <div id="condition-popup" class="custom-popup-modal" style="display: none;">
        <div class="custom-popup-content">
            <div class="custom-popup-header">
                <h2>Cosmetische staat</h2>
								 <button class="custom-popup-close-btn">✖</button>
            </div>
            <div class="custom-popup-body">
                <!-- Tabs -->
                <div class="tabs">
                    <button class="tab-button active" data-tab="Fair">Goed</button>
                    <button class="tab-button" data-tab="Very Good">Heel Goed</button>
                    <button class="tab-button" data-tab="Excellent">Uitstekend</button>
                </div>

                <!-- Carousel -->
                <div id="popup-carousel-container" class="carousel">
                    <div class="carousel-images">
                        <img src="https://maxgood.nl/wp-content/uploads/2024/12/conditions-modal-grade-D-front.avif" alt="Fair Condition Front" />
                        <img src="https://maxgood.nl/wp-content/uploads/2024/12/conditions-modal-grade-D-back.avif" alt="Fair Condition Back" />
                    </div>
                    <button id="carousel-prev" class="carousel-control prev">&lt;</button>
                    <button id="carousel-next" class="carousel-control next">&gt;</button>
                </div>

                <!-- Description -->
                <div id="popup-condition-description">
                    <p>
                        De "Goed" cosmetische staat vertoont zichtbare krassen op zowel het scherm als de behuizing en kan kleine deukjes bevatten.
                    </p>
                    <strong>Technische staat:</strong>
                    <p>
                        Ondanks deze uiterlijke tekenen van gebruik, functioneert het toestel technisch in nieuwstaat, dankzij de zorgvuldige refurbishment
                        door onze experts. Het toestel is grondig getest en gereinigd, en biedt betrouwbare prestaties.
                    </p>
                    <strong>Voor wie?</strong>
                    <p>
                        Deze optie is ideaal voor gebruikers die minder bezorgd zijn over het uiterlijk van het toestel, maar wel een goed werkend apparaat willen tegen
                        een aantrekkelijke prijs.
                    </p>
                </div>
            </div>
        </div>
    </div>
    <?php
}
add_action('wp_footer', 'add_condition_popup');

add_action('woocommerce_after_main_content', 'display_all_reviews_same_layout', 5);
function display_all_reviews_same_layout() {
    global $product;
    if ( ! $product ) {
        return;
    }

    $product_id = $product->get_id();

    /*
     * 1) FETCH ACF REVIEWS
     */
    $acf_reviews = [];
    // Change this loop range if you store more than 10 ACF reviews
    for ($i = 1; $i <= 10; $i++) {
        $reviewer_name   = get_field("reviewer_name_$i", $product_id);
        $purchase_date_raw   = get_field("purchase_date_$i", $product_id);
        $rating          = get_field("rating_$i", $product_id);
        $review_text     = get_field("review_text_$i", $product_id);
        $review_location = get_field("review_location_$i", $product_id);
        $review_date_raw = get_field("review_date_$i", $product_id);

        // If there's at least a name, assume it's a valid review
        if ( ! empty($reviewer_name) ) {
            // Format the raw dates
            $formatted_purchase_date = $purchase_date_raw
                ? date('j F Y', strtotime($purchase_date_raw))
                : '';
            $formatted_review_date   = $review_date_raw
                ? date('j F Y', strtotime($review_date_raw))
                : '';

            $acf_reviews[] = [
                'reviewer_name'   => $reviewer_name,
                'purchase_date'   => $formatted_purchase_date,
                'rating'          => $rating,
                'review_text'     => $review_text,
                'review_location' => $review_location,
                'review_date'     => $formatted_review_date,
                'source'          => 'acf',
            ];
        }
    }

    /*
     * 2) FETCH WOOCOMMERCE COMMENT REVIEWS
     */
    $wc_reviews = [];
    $comments = get_comments([
        'post_id' => $product_id,
        'status'  => 'approve',
        'type'    => 'review', // WooCommerce reviews
    ]);

    foreach ( $comments as $comment ) {
        $rating             = get_comment_meta($comment->comment_ID, 'rating', true);
        $purchase_date_raw  = get_comment_meta($comment->comment_ID, 'purchase_date', true);
        $review_location    = get_comment_meta($comment->comment_ID, 'review_location', true);

        // Convert the raw purchase date
        $formatted_purchase_date = $purchase_date_raw
            ? date('j F Y', strtotime($purchase_date_raw))
            : '';

        // Convert comment_date for the review date
        $formatted_review_date = date('j F Y', strtotime($comment->comment_date));

        $wc_reviews[] = [
            'reviewer_name'   => $comment->comment_author,
            'purchase_date'   => $formatted_purchase_date,
            'rating'          => $rating,
            'review_text'     => $comment->comment_content,
            'review_location' => $review_location,
            'review_date'     => $formatted_review_date,
            'source'          => 'wc',
        ];
    }

    /*
     * 3) MERGE AND SORT (newest reviews first)
     */
    $all_reviews = array_merge($acf_reviews, $wc_reviews);

    usort($all_reviews, function($a, $b) {
        // Convert review_date to timestamp
        $timeA = strtotime($a['review_date']) ?: 0;
        $timeB = strtotime($b['review_date']) ?: 0;
        return $timeB - $timeA; // Descending
    });

    /*
     * 4) DISPLAY REVIEWS
     */
    echo '<div class="custom-review-section">';
    echo '<h2>Customer Reviews for ' . esc_html($product->get_name()) . '</h2>';

    if ( empty($all_reviews) ) {
        echo '<p>No reviews yet. Be the first to leave a review!</p>';
    } else {
        foreach ( $all_reviews as $review ) {
            echo '<div class="review-item">';

                // HEADER
                echo '<div class="review-header">';
                    echo '<strong>' . esc_html($review['reviewer_name']) . '</strong>';

                    // Purchase Date + Verified Badge
                    if ( ! empty($review['purchase_date']) ) {
                        echo '<span class="review-date">Purchased on ' . esc_html($review['purchase_date']) . '</span>';
                        echo '<span class="verified-badge">
                                <svg aria-hidden="true" fill="currentColor" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" d="M20.53 6.073a.75.75 0 0 1 0 1.06L9.884 17.78a1.25 1.25 0 0 1-1.768 0L3.47 13.134a.75.75 0 0 1 1.06-1.06L9 16.542l10.47-10.47a.75.75 0 0 1 1.06 0" clip-rule="evenodd"></path>
                                </svg> Verified Purchase
                              </span>';
                    }
                echo '</div>'; // .review-header

                // STAR RATING
                if ( ! empty($review['rating']) ) {
                    $ratingNum = intval($review['rating']);
                    $stars = str_repeat('★', $ratingNum) . str_repeat('☆', 5 - $ratingNum);
                    echo '<div class="review-rating">' . $stars . ' ' . $ratingNum . '/5</div>';
                }

                // REVIEW TEXT
                if ( ! empty($review['review_text']) ) {
                    echo '<p class="review-text">' . esc_html($review['review_text']) . '</p>';
                }

                // FOOTER
                echo '<p class="review-footer">';
                    if ( ! empty($review['review_location']) ) {
                        echo 'Reviewed in ' . esc_html($review['review_location']);
                    }
                    if ( ! empty($review['review_date']) ) {
                        echo ' on ' . esc_html($review['review_date']);
                    }
                echo '</p>';

            echo '</div>'; // .review-item
            echo '<hr>';
        }
    }

    echo '</div>'; // .custom-review-section
}

add_shortcode('verified_review_form', 'display_verified_review_form');
function display_verified_review_form() {
    if (!is_user_logged_in()) {
        return '<p>You need to <a href="' . esc_url(wp_login_url()) . '">log in</a> to leave a review.</p>';
    }

    // Get the current user
    $current_user_id = get_current_user_id();

    // Query for completed orders
    $orders = wc_get_orders([
        'customer_id' => $current_user_id,
        'status'      => 'completed',
        'limit'       => -1, // Get all completed orders
    ]);

    // Fetch purchased products with additional data (numerical array!)
    $purchased_products = [];
    foreach ($orders as $order) {
        foreach ($order->get_items() as $item) {
            $product_id   = $item->get_product_id();
            $product_name = $item->get_name();

            // We'll store raw date in 'Y-m-d' so we can parse it later
            $purchase_date_raw = $order->get_date_completed()
                ? $order->get_date_completed()->date('d-m-Y')
                : '';

            // You can also use shipping country if you want the actual shipping address:
            $country = $order->get_billing_country();

            $purchased_products[] = [
                'product_id'    => $product_id,
                'name'          => $product_name,
                'purchase_date' => $purchase_date_raw,
                'country'       => $country,
                'order_id'      => $order->get_id(),
            ];
        }
    }

    if (empty($purchased_products)) {
        return '<p>You don’t have any completed orders to leave a review for.</p>';
    }

    // Confirmation flag
    $review_submitted = false;

    // Handle form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_review'])) {
        // The index of the product in the $purchased_products array
        $product_instance_index = isset($_POST['product_instance'])
            ? intval($_POST['product_instance'])
            : -1;

        $reviewer_name = sanitize_text_field($_POST['reviewer_name']);
        $rating        = intval($_POST['rating']);
        $review_text   = sanitize_textarea_field($_POST['review_text']);
        $review_date   = current_time('mysql'); // Current timestamp

        // Check if the index is valid
        if (
            $product_instance_index >= 0 &&
            isset($purchased_products[$product_instance_index]) &&
            $reviewer_name &&
            $rating &&
            $review_text
        ) {
            // Grab the chosen product details
            $selected_product       = $purchased_products[$product_instance_index];
            $selected_product_id    = $selected_product['product_id'];
            $selected_purchase_date = $selected_product['purchase_date'];
            $selected_location      = $selected_product['country'];

            // Insert review as a WooCommerce product review (comment)
            $review_data = [
                'comment_post_ID'      => $selected_product_id,
                'comment_author'       => $reviewer_name,
                'comment_author_email' => wp_get_current_user()->user_email,
                'comment_content'      => $review_text,
                'comment_type'         => 'review', // WooCommerce review type
                'comment_parent'       => 0,
                'user_id'              => get_current_user_id(),
                'comment_author_IP'    => $_SERVER['REMOTE_ADDR'],
                'comment_agent'        => $_SERVER['HTTP_USER_AGENT'],
                'comment_date'         => $review_date,
                'comment_approved'     => 1, // Auto-approve
            ];

            $comment_id = wp_insert_comment($review_data);

            if ($comment_id) {
                // Save rating, purchase date, and location as comment meta
                update_comment_meta($comment_id, 'rating', $rating);
                update_comment_meta($comment_id, 'purchase_date', $selected_purchase_date);
                update_comment_meta($comment_id, 'review_location', $selected_location);

                $review_submitted = true;
            }
        }
    }

    ob_start();

    // If a review was submitted, show a confirmation
    if ($review_submitted) {
        echo '<div class="confirmation-message">
                <h2>Thank you for your review!</h2>
                <p>Your feedback has been submitted successfully. We appreciate your time!</p>
              </div>';
    } else {
        ?>
        <div id="review-form-section">
            <div class="intro-text">
                <h2>Review Us to get a good discount next time</h2>
                <p>No, that’s not a bribe, that’s a thanks.</p>
            </div>
            <form method="post" action="">
                <p>
                    <label for="product_instance">Select Product:</label>
                    <select name="product_instance" required onchange="updatePurchaseInfo(this)">
                        <option value="">-- Select a Product --</option>
                        <?php foreach ($purchased_products as $index => $data): ?>
                            <option value="<?php echo esc_attr($index); ?>"
                                data-purchase-date="<?php echo esc_attr($data['purchase_date']); ?>"
                                data-country="<?php echo esc_attr($data['country']); ?>">
                                <?php 
                                    // e.g. "iPhone 16 Pro Max (Order #1234)"
                                    echo esc_html($data['name'] . ' (Order #' . $data['order_id'] . ')'); 
                                ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </p>
                <p>
                    <label for="reviewer_name">Your Name:</label>
                    <input type="text" name="reviewer_name"
                           value="<?php echo esc_attr(wp_get_current_user()->display_name); ?>" readonly>
                </p>
                <p>
                    <label for="purchase_date">Purchase Date:</label>
                    <input type="text" name="purchase_date" id="purchase_date" readonly>
                </p>
                <p>
                    <label for="rating">Rating (1–5):</label>
                    <select name="rating" required>
                        <option value="5" selected>5 ★★★★★</option>
                        <option value="4">4 ★★★★</option>
                        <option value="3">3 ★★★</option>
                        <option value="2">2 ★★</option>
                        <option value="1">1 ★</option>
                    </select>
                </p>
                <p>
                    <label for="review_text">Your Review:</label>
                    <textarea name="review_text" rows="5" required></textarea>
                </p>
                <p>
                    <label for="review_location">Your Location:</label>
                    <input type="text" name="review_location" id="review_location" readonly>
                </p>
                <p>
                    <button type="submit" name="submit_review">Submit Review</button>
                </p>
            </form>
        </div>

        <script>
            function updatePurchaseInfo(selectElement) {
                const selectedOption = selectElement.options[selectElement.selectedIndex];
                const purchaseDate   = selectedOption.getAttribute('data-purchase-date');
                const country        = selectedOption.getAttribute('data-country');

                document.getElementById('purchase_date').value = purchaseDate || '';
                document.getElementById('review_location').value = country || '';
            }
        </script>
        <?php
    }

    return ob_get_clean();
}






function add_battery_popup() {
    ?>
    <!-- Battery Popup -->
    <div id="battery-popup" class="custom-popup-modal" style="display: none;">
        <div class="custom-popup-content">
            <div class="custom-popup-header">
                <h2>Batterij Conditie</h2>
                <button class="custom-popup-close-btn">✖</button>
            </div>
            <div class="custom-popup-body">
                <h3>Standaard Batterij</h3>
                <p>
                    85% Capaciteit: De batterij heeft een capaciteit van 85%, wat perfect geschikt is voor dagelijks gebruik.
                    Voor de meeste gebruikers biedt deze capaciteit voldoende kracht voor taken zoals bellen, browsen,
                    e-mailen en sociale media, zonder dat je je zorgen hoeft te maken over een snelle afname van de batterijduur.
                </p>
                <h3>Nieuwe Batterij</h3>
                <p>
                    Deze batterij is volledig nieuw en biedt de hoogste prestaties en een lange levensduur. Het is perfect
                    geschikt voor intensieve gebruikers die veel van hun apparaat vragen, en zorgt voor optimale prestaties,
                    zelfs bij zwaar gebruik.
                </p>
                <h3>Zorgeloos gebruik</h3>
                <p>
                    Beide batterijopties zijn uitstekende keuzes, afhankelijk van je gebruik. De batterij met 85% capaciteit is
                    ideaal voor dagelijks gebruik en biedt voldoende energie voor de meeste taken. De nieuwe batterij biedt maximale
                    prestaties en is perfect voor intensievere gebruikers.
                </p>
            </div>
        </div>
    </div>
    <?php
}
add_action('wp_footer', 'add_battery_popup');

add_filter('woocommerce_get_price_html', 'custom_price_format', 100, 2);
function custom_price_format($price, $product) {
    if ($product->is_type('variable')) {
        $prices = $product->get_variation_prices()['price'];
        if (!empty($prices)) {
            $min_price = current($prices); // Get the lowest price
            return '<span class="price">From ' . wc_price($min_price) . '</span>';
        }
    }
    return $price;
}
