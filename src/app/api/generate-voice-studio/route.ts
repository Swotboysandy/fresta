"use server";

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

// Directory to store downloaded audio
const AUDIO_DIR = path.join(process.cwd(), "public", "generated-audio");

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GenerateVoiceRequest {
    text: string;
    sceneId: number;
    voiceName?: string;
    genre?: string;
}

// Map genres to appropriate voice tones/styles
const GENRE_TONE_MAP: Record<string, string> = {
    "horror": "Read aloud in a dark, eerie, and suspenseful tone with dramatic pauses:",
    "romance": "Read aloud in a warm, gentle, and emotionally expressive tone:",
    "sci-fi": "Read aloud in a clear, futuristic, and wonder-filled tone:",
    "fantasy": "Read aloud in an epic, mystical, and adventurous tone:",
    "action": "Read aloud in an energetic, intense, and exciting tone:",
    "comedy": "Read aloud in a light, playful, and humorous tone:",
    "mystery": "Read aloud in a mysterious, intriguing, and suspenseful tone:",
    "drama": "Read aloud in an emotionally rich, heartfelt, and dramatic tone:",
    "default": "Read aloud in a warm, engaging, and expressive storytelling tone:"
};

export async function POST(request: NextRequest) {
    let browser = null;

    try {
        const body: GenerateVoiceRequest = await request.json();
        const { text, sceneId, genre = "default" } = body;

        // Get the appropriate tone for the genre
        const styleTone = GENRE_TONE_MAP[genre.toLowerCase()] || GENRE_TONE_MAP["default"];

        if (!text) {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        console.log(`[Scene ${sceneId}] Starting voice generation via AI Studio...`);
        console.log(`[Scene ${sceneId}] Genre: ${genre}, Text length: ${text.length} chars`);
        console.log(`[Scene ${sceneId}] Style: ${styleTone}`);

        // Use a persistent shared Chrome profile for automation
        const automationProfileDir = path.join(
            process.cwd(),
            ".chrome-automation-profile"
        );

        // Ensure profile directory exists
        if (!fs.existsSync(automationProfileDir)) {
            fs.mkdirSync(automationProfileDir, { recursive: true });
        }

        // Lock file to prevent concurrent browser instances
        const lockFilePath = path.join(automationProfileDir, "automation.lock");
        let lockAttempts = 0;
        const maxLockAttempts = 180;

        while (fs.existsSync(lockFilePath) && lockAttempts < maxLockAttempts) {
            // Check if lock file is stale (> 2 minutes old)
            try {
                const stats = fs.statSync(lockFilePath);
                const now = Date.now();
                const lockAge = now - stats.mtimeMs;

                if (lockAge > 120000) { // 2 minutes
                    console.log(`[Scene ${sceneId}] Found stale lock file (${Math.round(lockAge / 1000)}s old). Removing it...`);
                    try { fs.unlinkSync(lockFilePath); } catch { /* ignore */ }
                    break;
                }
            } catch (err) {
                // If we can't read stats, assume it's valid or gone
            }

            console.log(`[Scene ${sceneId}] Waiting for previous automation... (${lockAttempts}s)`);
            await sleep(1000);
            lockAttempts++;
        }

        // Create lock file
        fs.writeFileSync(lockFilePath, `${Date.now()}`);

        // Cleanup function to remove lock
        const releaseLock = () => {
            try { fs.unlinkSync(lockFilePath); } catch { /* ignore */ }
        };

        // Launch browser with anti-detection settings
        console.log(`[Scene ${sceneId}] Launching Chrome...`);

        // Path to the user's real Chrome profile (Default)
        const systemProfileDir = path.join(
            process.env.LOCALAPPDATA || "C:\\Users\\sunny\\AppData\\Local",
            "Google\\Chrome\\User Data"
        );

        // Try to connect to existing browser first (Port 9222)
        try {
            browser = await puppeteer.connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: null
            });
            console.log(`[Scene ${sceneId}] ✅ Connected to existing Chrome instance!`);
        } catch (connectErr) {
            // connection failed, try launching
            console.log(`[Scene ${sceneId}] Could not connect to port 9222. Launching new instance...`);

            // ATTEMPT 1: Launch with SYSTEM Profile (User's real data)
            // This allows using existing logins, but fails if Chrome is already open without the debug flag.
            try {
                console.log(`[Scene ${sceneId}] Attempting to open User's Main Profile...`);
                browser = await puppeteer.launch({
                    headless: false,
                    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                    userDataDir: systemProfileDir, // <--- REAL PROFILE
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
                console.log(`[Scene ${sceneId}] ✅ Opened User's Main Chrome Profile!`);
            } catch (profileLockedErr) {
                console.log(`[Scene ${sceneId}] ⚠️ Main profile is locked (Chrome is open). Falling back to dedicated automation profile.`);

                // ATTEMPT 2: Fallback to dedicated automation profile
                browser = await puppeteer.launch({
                    headless: false,
                    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                    userDataDir: automationProfileDir, // <--- ISOLATED PROFILE
                    args: [
                        "--remote-debugging-port=9222",
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
            }
        }

        const page = await browser.newPage();

        // Anti-detection: Override navigator properties
        await page.evaluateOnNewDocument(() => {
            // Hide webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // Fake plugins array
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' },
                ],
            });

            // Fake languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Override chrome object
            (window as unknown as Record<string, unknown>).chrome = {
                runtime: {},
            };
        });

        // Set realistic user agent
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        // Set realistic viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Set up download handling
        const client = await page.createCDPSession();
        await client.send("Page.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: AUDIO_DIR,
        });

        // Navigate to AI Studio Generate Speech
        console.log(`[Scene ${sceneId}] Navigating to AI Studio Generate Speech...`);
        // Using the user-preferred model: gemini-2.5-pro-preview-tts
        await page.goto("https://aistudio.google.com/app/generate-speech?model=gemini-2.5-pro-preview-tts", {
            waitUntil: "networkidle2",
            timeout: 60000,
        });

        await sleep(4000);

        // Check if sign in is required
        const pageUrl = page.url();
        console.log(`[Scene ${sceneId}] Current URL: ${pageUrl}`);

        if (pageUrl.includes("accounts.google.com") || pageUrl.includes("signin")) {
            console.log(`[Scene ${sceneId}] ⚠️ SIGN IN REQUIRED! Please log in...`);
            let signInWait = 0;
            while (signInWait < 180) {
                const currentUrl = page.url();
                if (currentUrl.includes("aistudio.google.com") && !currentUrl.includes("accounts.google")) {
                    console.log(`[Scene ${sceneId}] ✅ Sign in successful!`);
                    break;
                }
                await sleep(1000);
                signInWait++;
            }
            await sleep(3000);
        }

        await sleep(3000);

        // Select Single-speaker audio mode
        console.log(`[Scene ${sceneId}] Selecting Single-speaker audio mode...`);

        const singleSpeakerClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"]'));
            for (const btn of buttons) {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('single-speaker') || text.includes('single speaker')) {
                    (btn as HTMLElement).click();
                    return true;
                }
            }
            return false;
        });

        if (singleSpeakerClicked) {
            console.log(`[Scene ${sceneId}] ✅ Single-speaker mode selected`);
        } else {
            console.log(`[Scene ${sceneId}] ⚠️ Could not find Single-speaker button`);
        }

        await sleep(2000);

        // Fill Style instructions
        console.log(`[Scene ${sceneId}] Setting style instructions...`);

        await page.evaluate((tone: string) => {
            const inputs = Array.from(document.querySelectorAll('input, textarea'));
            for (const input of inputs) {
                const placeholder = (input as HTMLInputElement).placeholder?.toLowerCase() || '';
                if (placeholder.includes('read aloud') || placeholder.includes('style')) {
                    (input as HTMLInputElement).value = tone;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    return;
                }
            }
        }, styleTone);

        await sleep(1000);

        // Enter the script text
        console.log(`[Scene ${sceneId}] Entering script text...`);

        const textAreas = await page.$$('textarea, [contenteditable="true"]');
        for (const area of textAreas) {
            const box = await area.boundingBox();
            if (box && box.width > 200 && box.height > 50) {
                await area.click();
                await sleep(300);
                await page.keyboard.down('Control');
                await page.keyboard.press('KeyA');
                await page.keyboard.up('Control');
                await page.keyboard.type(text, { delay: 5 });
                console.log(`[Scene ${sceneId}] ✅ Text entered`);
                break;
            }
        }

        await sleep(1000);

        // Click Run button
        console.log(`[Scene ${sceneId}] Looking for Run button...`);

        const runClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const btn of buttons) {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('run')) {
                    (btn as HTMLElement).click();
                    return true;
                }
            }
            return false;
        });

        if (runClicked) {
            console.log(`[Scene ${sceneId}] ✅ Run button clicked!`);
        } else {
            console.log(`[Scene ${sceneId}] Trying Ctrl+Enter...`);
            await page.keyboard.down('Control');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Control');
        }

        // Wait for audio generation
        console.log(`[Scene ${sceneId}] Waiting for audio generation...`);
        await sleep(15000);

        // Poll for download button
        const maxWaitTime = 120 * 1000;
        const startTime = Date.now();
        let audioUrl: string | null = null;

        while (Date.now() - startTime < maxWaitTime) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);

            // Check for download button
            const downloadFound = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                for (const btn of buttons) {
                    const text = btn.textContent?.toLowerCase() || '';
                    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                    if (text.includes('download') || ariaLabel.includes('download')) {
                        (btn as HTMLElement).click();
                        return true;
                    }
                }
                return false;
            });

            if (downloadFound) {
                console.log(`[Scene ${sceneId}] Download button clicked!`);
                await sleep(5000);

                // Check for downloaded file
                const files = fs.readdirSync(AUDIO_DIR);
                const recentFile = files
                    .filter(f => /\.(wav|mp3|webm|ogg|m4a)$/i.test(f))
                    .map((f) => ({
                        name: f,
                        time: fs.statSync(path.join(AUDIO_DIR, f)).mtime.getTime(),
                    }))
                    .sort((a, b) => b.time - a.time)[0];

                if (recentFile && recentFile.time > startTime) {
                    const newFileName = `scene-${sceneId}-${Date.now()}.wav`;
                    fs.renameSync(
                        path.join(AUDIO_DIR, recentFile.name),
                        path.join(AUDIO_DIR, newFileName)
                    );
                    audioUrl = `/generated-audio/${newFileName}`;
                    console.log(`[Scene ${sceneId}] ✅ Audio saved: ${audioUrl}`);
                    break;
                }
            }

            if (elapsed % 10 === 0) {
                console.log(`[Scene ${sceneId}] Waiting... (${elapsed}s)`);
            }

            await sleep(3000);
        }

        await browser.close();
        browser = null;
        releaseLock();

        if (audioUrl) {
            return NextResponse.json({
                success: true,
                audioUrl,
                sceneId,
                message: "Audio generated successfully via AI Studio",
            });
        } else {
            console.log(`[Scene ${sceneId}] ⚠️ Audio generation timed out`);
            return NextResponse.json(
                { error: "Audio generation timed out" },
                { status: 408 }
            );
        }
    } catch (error) {
        console.error(`AI Studio automation error:`, error);

        if (browser) {
            try { await browser.close(); } catch { /* ignore */ }
        }

        try {
            const lockPath = path.join(process.cwd(), ".chrome-automation-profile", "automation.lock");
            if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
        } catch { /* ignore */ }

        return NextResponse.json(
            {
                error: "Failed to generate audio",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
