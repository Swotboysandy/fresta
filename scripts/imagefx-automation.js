/**
 * ImageFX Browser Automation Script
 * 
 * This script uses Puppeteer to automate Google ImageFX for image generation
 * It uses your existing Chrome profile to leverage your logged-in session
 * 
 * Usage: node scripts/imagefx-automation.js "Your image prompt here"
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const IMAGE_FX_URL = 'https://aitestkitchen.withgoogle.com/tools/image-fx';
const DOWNLOAD_DIR = path.join(__dirname, '..', 'public', 'generated-images');

// Get Chrome user data directory (Windows default)
function getChromeUserDataDir() {
  const homeDir = process.env.USERPROFILE || process.env.HOME;
  return path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(prompt, outputFileName) {
  console.log('🚀 Starting ImageFX automation...');
  console.log(`📝 Prompt: ${prompt}`);
  
  // Ensure download directory exists
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  
  let browser;
  
  try {
    // Launch browser with your existing Chrome profile
    console.log('🌐 Launching Chrome with your profile...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for background operation
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Adjust if needed
      userDataDir: getChromeUserDataDir(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--profile-directory=Default', // Use your default Chrome profile
      ],
      defaultViewport: { width: 1280, height: 900 },
    });

    const page = await browser.newPage();

    // Navigate to ImageFX
    console.log('📍 Navigating to ImageFX...');
    await page.goto(IMAGE_FX_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    // Check if logged in - look for prompt input
    console.log('🔍 Looking for prompt input...');
    
    // Wait for the prompt textarea/input
    const promptSelectors = [
      'textarea[placeholder*="prompt"]',
      'textarea[placeholder*="describe"]',
      'input[placeholder*="prompt"]',
      'div[contenteditable="true"]',
      '[data-testid="prompt-input"]',
      '.prompt-input',
      'textarea',
    ];

    let promptElement = null;
    for (const selector of promptSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        promptElement = await page.$(selector);
        if (promptElement) {
          console.log(`✅ Found prompt input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!promptElement) {
      // Take a screenshot to see what's on the page
      const debugScreenshot = path.join(DOWNLOAD_DIR, 'debug-screenshot.png');
      await page.screenshot({ path: debugScreenshot, fullPage: true });
      console.log(`❌ Could not find prompt input. See screenshot: ${debugScreenshot}`);
      throw new Error('Prompt input not found. You may need to log in manually first.');
    }

    // Clear and type the prompt
    console.log('✏️ Entering prompt...');
    await promptElement.click({ clickCount: 3 }); // Select all
    await promptElement.type(prompt);
    await delay(1000);

    // Look for and click the Generate button
    console.log('🎨 Looking for Generate button...');
    const generateSelectors = [
      'button[aria-label*="Generate"]',
      'button[aria-label*="generate"]',
      'button:has-text("Generate")',
      '[data-testid="generate-button"]',
      'button.generate-button',
      'button[type="submit"]',
    ];

    let generateButton = null;
    for (const selector of generateSelectors) {
      try {
        generateButton = await page.$(selector);
        if (generateButton) {
          console.log(`✅ Found generate button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // If no specific button found, try finding by text content
    if (!generateButton) {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent || el.getAttribute('aria-label'), button);
        if (text && text.toLowerCase().includes('generate')) {
          generateButton = button;
          console.log(`✅ Found generate button by text: ${text}`);
          break;
        }
      }
    }

    if (generateButton) {
      await generateButton.click();
      console.log('⏳ Generating image... (this may take 30-60 seconds)');
    } else {
      // Try pressing Enter as fallback
      console.log('⌨️ No generate button found, pressing Enter...');
      await page.keyboard.press('Enter');
    }

    // Wait for image generation (up to 2 minutes)
    console.log('⏳ Waiting for image to generate...');
    await delay(30000); // Initial wait

    // Look for generated images
    const imageSelectors = [
      'img[src*="blob:"]',
      'img[src*="data:image"]',
      'img[src*="generated"]',
      '.generated-image img',
      '[data-testid="generated-image"]',
      'img.result-image',
    ];

    let generatedImage = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      for (const selector of imageSelectors) {
        try {
          generatedImage = await page.$(selector);
          if (generatedImage) {
            console.log(`✅ Found generated image with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      if (generatedImage) break;
      console.log(`⏳ Still waiting... (attempt ${attempt + 1}/6)`);
      await delay(10000);
    }

    // Download the image
    if (generatedImage) {
      console.log('💾 Downloading image...');
      
      // Get image source
      const imageSrc = await page.evaluate(img => img.src, generatedImage);
      
      if (imageSrc.startsWith('blob:') || imageSrc.startsWith('data:')) {
        // For blob/data URLs, we need to download via the browser
        const imageBuffer = await page.evaluate(async (imgSrc) => {
          const response = await fetch(imgSrc);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }, imageSrc);

        // Save the image
        const base64Data = imageBuffer.replace(/^data:image\/\w+;base64,/, '');
        const outputPath = path.join(DOWNLOAD_DIR, outputFileName || `imagefx-${Date.now()}.png`);
        fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
        console.log(`✅ Image saved to: ${outputPath}`);
        return outputPath;
      } else {
        // For regular URLs, download directly
        const viewSource = await page.goto(imageSrc);
        const imageBuffer = await viewSource.buffer();
        const outputPath = path.join(DOWNLOAD_DIR, outputFileName || `imagefx-${Date.now()}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`✅ Image saved to: ${outputPath}`);
        return outputPath;
      }
    } else {
      // Take a final screenshot for debugging
      const debugScreenshot = path.join(DOWNLOAD_DIR, 'debug-final.png');
      await page.screenshot({ path: debugScreenshot, fullPage: true });
      console.log(`❌ Could not find generated image. See screenshot: ${debugScreenshot}`);
      throw new Error('Generated image not found after timeout.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (browser) {
      // Keep browser open for debugging (set to true to close)
      const CLOSE_BROWSER = false;
      if (CLOSE_BROWSER) {
        await browser.close();
      } else {
        console.log('💡 Browser left open for debugging. Close it manually when done.');
      }
    }
  }
}

// Main execution
const prompt = process.argv[2];
if (!prompt) {
  console.log('Usage: node scripts/imagefx-automation.js "Your image prompt"');
  console.log('Example: node scripts/imagefx-automation.js "A futuristic cityscape at sunset"');
  process.exit(1);
}

generateImage(prompt)
  .then(imagePath => {
    console.log('🎉 Success! Image saved to:', imagePath);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Failed:', error.message);
    process.exit(1);
  });
