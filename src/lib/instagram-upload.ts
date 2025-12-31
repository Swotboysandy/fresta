import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function uploadToInstagram(
    videoPath: string,
    caption: string
): Promise<{ success: boolean; error?: string }> {
    let browser = null;
    try {
        const automationProfileDir = path.join(process.cwd(), ".chrome-automation-profile");

        // Launch browser (must be headful for Instagram interactions usually)
        browser = await puppeteer.launch({
            headless: false,
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            userDataDir: automationProfileDir,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--window-size=1280,800",
            ],
            ignoreDefaultArgs: ["--enable-automation"],
        });

        const page = await browser.newPage();

        // 1. Go to Instagram
        await page.goto("https://www.instagram.com", { waitUntil: "networkidle2" });
        await sleep(3000);

        // Check login
        const loginInput = await page.$('input[name="username"]');
        if (loginInput) {
            return { success: false, error: "Not logged in to Instagram. Please log in to Instagram in the Chrome window." };
        }

        // 2. Click Create (+)
        // Sidebar on desktop
        console.log("Looking for Create button...");
        // The "Create" button usually has an aria-label "New post" or generic "Create" text in a span
        // Let's look for the SVG or aria-label
        // Selector for the sidebar "Create" item
        const createSelector = 'svg[aria-label="New post"], svg[aria-label="Create"]';
        // Usually it's inside a link or button.
        // Try finding by text "Create" in the sidebar

        const createClicked = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            for (const span of spans) {
                if (span.textContent === 'Create') {
                    (span as HTMLElement).click();
                    return true;
                }
            }
            // Fallback to searching SVGs
            const svgs = Array.from(document.querySelectorAll('svg'));
            for (const svg of svgs) {
                if (svg.getAttribute('aria-label') === 'New post' || svg.getAttribute('aria-label') === 'Create') {
                    (svg.closest('div[role="button"]') as HTMLElement)?.click();
                    return true;
                }
            }
            return false;
        });

        if (!createClicked) {
            // Retry with specific selector for sidebar item (often 7th item)
            try {
                const svg = await page.waitForSelector('svg[aria-label="New post"]', { timeout: 5000 });
                if (svg) await svg.click();
            } catch (e) {
                return { success: false, error: "Could not find 'Create' button." };
            }
        }

        await sleep(3000);

        // 3. Upload File from Computer
        console.log("Waiting for file input...");
        // After clicking create, a modal appears with "Select from computer" button which triggers file input
        // But we can just set the file input directly usually, as it's often present in the DOM or created

        // First, ensure the modal is open ("Create new post")
        await page.waitForSelector('h1', { timeout: 10000 }); // "Create new post" header

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const selectBtn = buttons.find(b => b.textContent?.includes('Select from computer'));
                if (selectBtn) (selectBtn as HTMLElement).click();
            })
        ]);

        await fileChooser.accept([videoPath]);

        await sleep(3000);

        // 4. Crop/Ratio (Next)
        // Sometimes it asks to crop. For 9:16 video, we usually want "Original" ratio.
        // Click the "Ratio" button (two corners icon) -> Select "Original" or "9:16"
        // For now, let's just click "Next" (top right)

        console.log("Navigating 'Next'...");
        const clickNext = async () => {
            await page.evaluate(() => {
                const divs = Array.from(document.querySelectorAll('div[role="button"]'));
                const nextBtn = divs.find(d => d.textContent === 'Next');
                if (nextBtn) (nextBtn as HTMLElement).click();
            });
        };

        await clickNext(); // To Filters
        await sleep(2000);
        await clickNext(); // To Caption
        await sleep(2000);

        // 5. Caption
        console.log("Adding Caption...");
        await page.click('div[aria-label="Write a caption..."]');
        await page.keyboard.type(caption);
        await sleep(1000);

        // 6. Share
        console.log("Sharing...");
        await page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('div[role="button"]'));
            const shareBtn = divs.find(d => d.textContent === 'Share');
            if (shareBtn) (shareBtn as HTMLElement).click();
        });

        // Wait for "Post shared"
        await sleep(8000);

        await browser.close();
        return { success: true };

    } catch (error) {
        console.error("Instagram Upload error:", error);
        if (browser) await browser.close();
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}
