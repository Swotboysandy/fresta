"use server";

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

// Directory to store downloaded videos
const VIDEOS_DIR = path.join(process.cwd(), "public", "generated-videos");

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GenerateVideoRequest {
    prompt: string;
    sceneId: number;
    orientation?: "portrait" | "landscape";
}

export async function POST(request: NextRequest) {
    let browser = null;

    try {
        const body: GenerateVideoRequest = await request.json();
        const { prompt, sceneId } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        console.log(`Starting video generation for scene ${sceneId}...`);
        console.log(`Prompt: ${prompt.substring(0, 100)}...`);

        // Use User's Default Chrome Profile
        const userDataDir = path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");

        // Launch browser with user profile
        console.log(`Launching Chrome with User Profile: ${userDataDir}`);
        // Launch browser with user profile
        console.log(`Launching Chrome with User Profile: ${userDataDir}`);

        try {
            browser = await puppeteer.launch({
                headless: false,
                executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                userDataDir: userDataDir,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--window-size=1920,1080",
                    "--start-maximized",
                    "--disable-dev-shm-usage",
                    "--no-first-run",
                    "--disable-extensions",
                ],
                ignoreDefaultArgs: ["--enable-automation"],
                defaultViewport: null,
            });
        } catch (launchError: any) {
            console.error("Chrome launch error:", launchError);
            if (launchError.message.includes("EBUSY") || launchError.message.includes("user data directory is already in use")) {
                throw new Error("CHROME_OPEN_ERROR: Please close all Chrome windows and try again.");
            }
            throw launchError;
        }

        // SMART TAB MANAGEMENT
        // 1. Get all open pages (including restored session tabs)
        const pages = await browser.pages();

        // 2. Look for an empty tab to use (about:blank or newtab)
        let page = pages.find(p => p.url() === "about:blank" || p.url() === "chrome://newtab/");

        // 3. If no empty tab found, create a new one
        if (!page) {
            page = await browser.newPage();
        }

        // 4. Cleanup: Close ONLY other EMPTY tabs to reduce clutter
        // We preserve tabs with content (like restored sessions) to avoid data loss
        for (const p of pages) {
            if (p !== page && (p.url() === "about:blank" || p.url() === "chrome://newtab/")) {
                try { await p.close(); } catch (e) { /* ignore */ }
            }
        }

        // Anti-detection measures
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin' },
                    { name: 'Chrome PDF Viewer' },
                    { name: 'Native Client' },
                ],
            });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
        });

        // Set realistic user agent
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        // Set up download handling
        const client = await page.createCDPSession();
        await client.send("Page.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: VIDEOS_DIR,
        });

        // Navigate to Google Flow
        console.log("Navigating to Google Flow...");
        await page.goto("https://labs.google/fx/tools/flow", {
            waitUntil: "networkidle2",
            timeout: 60000,
        });

        await sleep(5000);

        // Check if sign in is required
        const pageUrl = page.url();
        console.log("Current URL:", pageUrl);

        if (pageUrl.includes("accounts.google.com") || pageUrl.includes("signin")) {
            console.log("Sign in required. Please log in to your Google account...");
            // Wait for user to sign in (up to 3 minutes)
            let signInWait = 0;
            while (signInWait < 180) {
                const currentUrl = page.url();
                if (currentUrl.includes("labs.google") || currentUrl.includes("flow")) {
                    console.log("Sign-in successful!");
                    break;
                }
                await sleep(1000);
                signInWait++;
            }
            await sleep(3000);
        }

        // Wait for the page to fully load
        await sleep(3000);

        // Look for and click on the text input area
        console.log("Looking for prompt input...");

        const inputSelectors = [
            'textarea',
            '[contenteditable="true"]',
            'input[type="text"]',
            '[role="textbox"]',
        ];

        let inputFound = false;
        for (const selector of inputSelectors) {
            const elements = await page.$$(selector);
            for (const element of elements) {
                const isVisible = await element.isIntersectingViewport();
                if (isVisible) {
                    await element.click();
                    await sleep(500);

                    // Clear any existing text and type the prompt
                    await page.keyboard.down('Control');
                    await page.keyboard.press('KeyA');
                    await page.keyboard.up('Control');
                    await page.keyboard.type(prompt, { delay: 20 });

                    console.log("Prompt entered successfully");
                    inputFound = true;
                    break;
                }
            }
            if (inputFound) break;
        }

        if (!inputFound) {
            console.log("Could not find input field, trying to type directly...");
            await page.keyboard.type(prompt, { delay: 20 });
        }

        await sleep(1000);

        // Look for and click the generate button
        console.log("Looking for generate button...");

        const buttonClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const btn of buttons) {
                const text = btn.textContent?.toLowerCase() || '';
                const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
                if (text.includes('generate') || text.includes('create') ||
                    text.includes('submit') || label.includes('generate') ||
                    text.includes('go') || text.includes('run')) {
                    (btn as HTMLElement).click();
                    return true;
                }
            }

            // Try Enter key if no button found
            return false;
        });

        if (buttonClicked) {
            console.log("Generate button clicked");
        } else {
            console.log("Trying Enter key...");
            await page.keyboard.press('Enter');
        }

        // Wait for video generation (can take 2-10 minutes)
        console.log("Waiting for video generation...");
        const maxWaitTime = 10 * 60 * 1000; // 10 minutes
        const pollInterval = 5000;
        const startTime = Date.now();
        let videoUrl: string | null = null;

        while (Date.now() - startTime < maxWaitTime) {
            // Check for download button or video element
            const hasDownload = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                for (const btn of buttons) {
                    const text = btn.textContent?.toLowerCase() || '';
                    const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
                    if (text.includes('download') || label.includes('download')) {
                        (btn as HTMLElement).click();
                        return true;
                    }
                }
                return false;
            });

            if (hasDownload) {
                console.log("Download button found and clicked");
                await sleep(5000);

                // Check for downloaded file
                const files = fs.readdirSync(VIDEOS_DIR);
                const recentFile = files
                    .filter(f => f.endsWith('.mp4') || f.endsWith('.webm'))
                    .map((f) => ({
                        name: f,
                        time: fs.statSync(path.join(VIDEOS_DIR, f)).mtime.getTime(),
                    }))
                    .sort((a, b) => b.time - a.time)[0];

                if (recentFile && recentFile.time > startTime) {
                    const newFileName = `scene-${sceneId}-${Date.now()}.mp4`;
                    fs.renameSync(
                        path.join(VIDEOS_DIR, recentFile.name),
                        path.join(VIDEOS_DIR, newFileName)
                    );
                    videoUrl = `/generated-videos/${newFileName}`;
                    console.log("Video downloaded:", videoUrl);
                    break;
                }
            }

            await sleep(pollInterval);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`Still generating... (${elapsed}s elapsed)`);
        }

        // Close browser
        await browser.close();
        browser = null;

        // Release lock (Not used in user profile mode)
        // releaseLock();

        if (videoUrl) {
            return NextResponse.json({
                success: true,
                videoUrl,
                sceneId,
                message: "Video generated successfully",
            });
        } else {
            return NextResponse.json(
                {
                    error: "Video generation timed out",
                    message: "Please try again",
                },
                { status: 408 }
            );
        }
    } catch (error) {
        console.error("Google Flow automation error:", error);

        if (browser) {
            try { await browser.close(); } catch { /* ignore */ }
        }

        // Attempt to release lock on error
        try {
            const lockPath = path.join(process.cwd(), ".chrome-automation-profile", "automation.lock");
            if (fs.existsSync(lockPath)) {
                fs.unlinkSync(lockPath);
            }
        } catch { /* ignore */ }

        return NextResponse.json(
            {
                error: "Failed to generate video",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
