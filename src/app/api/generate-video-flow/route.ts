import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Directory for generated videos
const VIDEOS_DIR = path.join(process.cwd(), "public", "generated-videos");
const TEMP_DIR = path.join(process.cwd(), "public", "temp-images");

// Ensure directories exist
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

interface GenerateVideoRequest {
    prompt: string;
    sceneId: number;
    duration?: number;
    aspectRatio?: "9:16" | "16:9" | "1:1";
}

// Generate image using Pollinations (FREE, no API key needed)
async function generateImage(prompt: string, aspectRatio: string): Promise<Buffer> {
    let width = 576;
    let height = 1024;

    if (aspectRatio === "16:9") {
        width = 1024;
        height = 576;
    } else if (aspectRatio === "1:1") {
        width = 768;
        height = 768;
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${Date.now()}&nologo=true&model=flux`;

    console.log("[ImageGen] Fetching from Pollinations...");

    const response = await fetch(pollinationsUrl, {
        method: "GET",
        headers: { "Accept": "image/png,image/jpeg,image/*" },
    });

    if (!response.ok) {
        throw new Error(`Pollinations failed with status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// Create Ken Burns effect video from image using FFmpeg
async function createKenBurnsVideo(
    imagePath: string,
    outputPath: string,
    duration: number,
    aspectRatio: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        // Determine output dimensions
        let width = 1080;
        let height = 1920;

        if (aspectRatio === "16:9") {
            width = 1920;
            height = 1080;
        } else if (aspectRatio === "1:1") {
            width = 1080;
            height = 1080;
        }

        // Random Ken Burns effect: zoom in, zoom out, or pan
        const effects = [
            // Zoom in slowly
            `scale=8000:-1,zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=${width}x${height}:fps=25`,
            // Zoom out slowly  
            `scale=8000:-1,zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=${width}x${height}:fps=25`,
            // Pan left to right
            `scale=8000:-1,zoompan=z='1.3':x='if(lte(on,1),0,x+2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=${width}x${height}:fps=25`,
            // Pan right to left
            `scale=8000:-1,zoompan=z='1.3':x='if(lte(on,1),(iw/zoom)-${width},x-2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=${width}x${height}:fps=25`,
        ];

        const randomEffect = effects[Math.floor(Math.random() * effects.length)];

        const args = [
            '-y',
            '-loop', '1',
            '-i', imagePath,
            '-vf', randomEffect,
            '-c:v', 'libx264',
            '-t', duration.toString(),
            '-pix_fmt', 'yuv420p',
            '-preset', 'fast',
            outputPath
        ];

        console.log("[FFmpeg] Creating Ken Burns video...");

        const ffmpeg = spawn('ffmpeg', args);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log("[FFmpeg] Video created successfully");
                resolve();
            } else {
                console.error("[FFmpeg] Error:", stderr);
                reject(new Error(`FFmpeg exited with code ${code}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(new Error(`FFmpeg spawn error: ${err.message}`));
        });
    });
}

export async function POST(request: NextRequest) {
    console.log("[VideoGen] API called - FREE Image + Ken Burns mode");

    try {
        const body: GenerateVideoRequest = await request.json();
        const { prompt, sceneId, duration = 5, aspectRatio = "9:16" } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        console.log(`[VideoGen] Scene ${sceneId}: "${prompt.substring(0, 60)}..."`);
        console.log(`[VideoGen] Duration: ${duration}s, Aspect: ${aspectRatio}`);

        // Step 1: Generate image with Pollinations (FREE)
        console.log("[VideoGen] Step 1: Generating image with Pollinations...");
        const enhancedPrompt = `Cinematic scene: ${prompt}. High quality, dramatic lighting, movie-like, 4K, detailed.`;
        const imageBuffer = await generateImage(enhancedPrompt, aspectRatio);

        // Save temp image
        const tempImagePath = path.join(TEMP_DIR, `scene-${sceneId}-${Date.now()}.png`);
        fs.writeFileSync(tempImagePath, imageBuffer);
        console.log(`[VideoGen] Image saved: ${tempImagePath}`);

        // Step 2: Create Ken Burns video with FFmpeg
        console.log("[VideoGen] Step 2: Creating Ken Burns animation...");
        const videoFileName = `scene-${sceneId}-${Date.now()}.mp4`;
        const videoPath = path.join(VIDEOS_DIR, videoFileName);

        await createKenBurnsVideo(tempImagePath, videoPath, duration, aspectRatio);

        // Cleanup temp image
        try { fs.unlinkSync(tempImagePath); } catch { }

        // Return public URL
        const videoUrl = `/generated-videos/${videoFileName}`;
        console.log(`[VideoGen] ✅ Video ready: ${videoUrl}`);

        return NextResponse.json({
            success: true,
            videoUrl: videoUrl,
            sceneId,
            message: "Video generated successfully (Image + Ken Burns effect)",
        });

    } catch (error) {
        console.error("[VideoGen] Error:", error);

        return NextResponse.json(
            {
                error: "Failed to generate video",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
