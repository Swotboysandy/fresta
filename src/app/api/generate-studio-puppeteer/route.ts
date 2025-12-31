import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

// Directory to store generated audio
const AUDIO_DIR = path.join(process.cwd(), "public", "generated-audio");
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
    let browser;
    try {
        const { text, sceneId } = await request.json();

        // Connect to existing Chrome instance
        try {
            browser = await puppeteer.connect({
                browserURL: "http://127.0.0.1:9222",
                defaultViewport: null,
            });
        } catch (e) {
            return NextResponse.json(
                { error: "Could not connect to Chrome. Please run start-chrome.bat first." },
                { status: 500 }
            );
        }

        const pages = await browser.pages();
        let page = pages.find(p => p.url().includes("aistudio.google.com"));

        if (!page) {
            page = await browser.newPage();
            await page.goto("https://aistudio.google.com/app/generate-speech?model=gemini-2.5-pro-preview-tts", { waitUntil: "networkidle2" });
        } else {
            await page.bringToFront();
        }

        // Wait for textarea
        const textareaSelector = "textarea[aria-label='Text to speech input']"; // Selector might need adjustment based on actual UI
        // AI Studio selectors are tricky/dynamic. We might need a more robust strategy or XPath.
        // Assuming the URL opens the right mode.

        // Wait for elements - using generic strategy if specific IDs fail
        await page.waitForSelector("textarea", { timeout: 10000 });

        // Clear and type text
        await page.evaluate(() => {
            const inputs = document.querySelectorAll("textarea");
            // Heuristic: The largest textarea or the one with specific placeholder
            if (inputs.length > 0) {
                inputs[0].value = "";
                inputs[0].focus();
            }
        });

        await page.keyboard.type(text);

        // Find and click Generate
        // This is fragile. We need to find the "Generate" button.
        // Usually contains text "Generate"
        const generateBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            return buttons.find(b => b.innerText.includes("Generate"))
                || buttons.find(b => b.ariaLabel && b.ariaLabel.includes("Generate"));
        });

        if (generateBtn) {
            await page.evaluate((btn: any) => btn.click(), generateBtn);
        } else {
            throw new Error("Generate button not found");
        }

        // Wait for generation to finish. 
        // Look for "Download" button appearing or Audio element.
        // Max wait 60s
        await page.waitForFunction(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            return buttons.some(b => b.innerText.includes("Download") || b.ariaLabel?.includes("Download"));
        }, { timeout: 60000 });

        // Setup download behavior
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: AUDIO_DIR,
        });

        // Click Download
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const downloadBtn = buttons.find(b => b.innerText.includes("Download") || b.ariaLabel?.includes("Download"));
            if (downloadBtn) downloadBtn.click();
        });

        // Wait for file to arrive
        // Watch AUDIO_DIR for new file
        const waitForFile = async () => {
            let retries = 0;
            const startFiles = fs.readdirSync(AUDIO_DIR);
            while (retries < 20) { // 20 seconds
                await new Promise(r => setTimeout(r, 1000));
                const currentFiles = fs.readdirSync(AUDIO_DIR);
                const newFiles = currentFiles.filter(f => !startFiles.includes(f));
                if (newFiles.length > 0) {
                    // Find the one that is NOT .crdownload
                    const completedFile = newFiles.find(f => !f.endsWith('.crdownload'));
                    if (completedFile) {
                        // Rename it to match our convention
                        const newName = `voice-studio-${sceneId}-${Date.now()}.wav`; // Assuming WAV, but check extension
                        const ext = path.extname(completedFile);
                        const finalName = `voice-studio-${sceneId}-${Date.now()}${ext}`;
                        fs.renameSync(path.join(AUDIO_DIR, completedFile), path.join(AUDIO_DIR, finalName));
                        return `/generated-audio/${finalName}`;
                    }
                }
                retries++;
            }
            throw new Error("Download timeout");
        };

        const audioUrl = await waitForFile();

        // Disconnect, do NOT close browser
        browser.disconnect();

        return NextResponse.json({ success: true, audioUrl });

    } catch (error: any) {
        console.error("Puppeteer error:", error);
        if (browser) browser.disconnect();
        return NextResponse.json(
            { error: "Puppeteer Automation Failed", details: error.message },
            { status: 500 }
        );
    }
}
