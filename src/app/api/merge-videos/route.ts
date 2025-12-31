"use server";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Directory paths
const VIDEOS_DIR = path.join(process.cwd(), "public", "generated-videos");
const AUDIO_DIR = path.join(process.cwd(), "public", "generated-audio");
const OUTPUT_DIR = path.join(process.cwd(), "public", "final-videos");

// Ensure directories exist
[VIDEOS_DIR, AUDIO_DIR, OUTPUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

interface MergeRequest {
    videoUrls: string[];
    audioUrls?: string[];
    addWatermark?: boolean;
    watermarkText?: string;
    orientation?: "portrait" | "landscape";
    projectName?: string;
}

// Check if FFmpeg is available
async function checkFFmpegInstalled(): Promise<boolean> {
    try {
        await execAsync("ffmpeg -version");
        return true;
    } catch {
        return false;
    }
}

// Get video duration using ffprobe
async function getMediaDuration(filePath: string): Promise<number> {
    try {
        const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
        );
        return parseFloat(stdout.trim()) || 0;
    } catch {
        return 0;
    }
}

// Validate media file exists and is readable
function validateMediaFile(filePath: string): { valid: boolean; error?: string } {
    const absolutePath = filePath.startsWith("/")
        ? path.join(process.cwd(), "public", filePath)
        : filePath;

    if (!fs.existsSync(absolutePath)) {
        return { valid: false, error: `File not found: ${absolutePath}` };
    }

    const stats = fs.statSync(absolutePath);
    if (stats.size === 0) {
        return { valid: false, error: `File is empty: ${absolutePath}` };
    }

    return { valid: true };
}

// Create concat file for FFmpeg
function createConcatFile(videoFiles: string[], outputPath: string): void {
    const content = videoFiles
        .map(file => `file '${file.replace(/'/g, "'\\''")}'`)
        .join("\n");
    fs.writeFileSync(outputPath, content);
}

export async function POST(request: NextRequest) {
    try {
        const body: MergeRequest = await request.json();
        const {
            videoUrls = [],
            audioUrls = [],
            addWatermark = false,
            watermarkText = "StoryForge AI",
            orientation = "portrait",
            projectName = "story",
        } = body;

        // Check if FFmpeg is installed
        const ffmpegAvailable = await checkFFmpegInstalled();
        if (!ffmpegAvailable) {
            console.error("FFmpeg not found. Please install FFmpeg.");
            return NextResponse.json(
                {
                    error: "FFmpeg not installed",
                    message: "Please install FFmpeg to enable video merging. Download from: https://ffmpeg.org/download.html",
                    suggestion: "Run: winget install ffmpeg OR download from https://www.gyan.dev/ffmpeg/builds/",
                },
                { status: 503 }
            );
        }

        // Validate inputs
        if (videoUrls.length === 0) {
            return NextResponse.json(
                { error: "No video files provided" },
                { status: 400 }
            );
        }

        console.log(`Starting merge process for ${videoUrls.length} videos...`);

        // Convert URLs to absolute paths and validate
        const videoPaths: string[] = [];
        const validationErrors: string[] = [];

        for (const url of videoUrls) {
            const relativePath = url.startsWith("/") ? url : `/${url}`;
            const absolutePath = path.join(process.cwd(), "public", relativePath);

            const validation = validateMediaFile(absolutePath);
            if (!validation.valid) {
                validationErrors.push(validation.error!);
                continue;
            }

            videoPaths.push(absolutePath);
        }

        if (validationErrors.length > 0) {
            console.warn("Validation warnings:", validationErrors);
        }

        if (videoPaths.length === 0) {
            return NextResponse.json(
                { error: "No valid video files found", details: validationErrors },
                { status: 400 }
            );
        }

        // Create unique output filename
        const timestamp = Date.now();
        const outputFilename = `${projectName}-${timestamp}.mp4`;
        const outputPath = path.join(OUTPUT_DIR, outputFilename);
        const concatFilePath = path.join(OUTPUT_DIR, `concat-${timestamp}.txt`);

        // Step 1: Create concat file for FFmpeg
        createConcatFile(videoPaths, concatFilePath);
        console.log("Created concat file:", concatFilePath);

        // Step 2: Merge videos
        let mergeCommand: string;

        // Handle Audio Concat
        let audioConcatFilePath: string | null = null;
        let audioInputOption = "";
        let audioMapOption = "";

        if (audioUrls.length > 0) {
            // Convert audio URLs to absolute paths
            const audioPaths: string[] = [];
            for (const url of audioUrls) {
                const relativePath = url.startsWith("/") ? url : `/${url}`;
                const absolutePath = path.join(process.cwd(), "public", relativePath);
                if (fs.existsSync(absolutePath)) {
                    audioPaths.push(absolutePath);
                }
            }

            if (audioPaths.length > 0) {
                audioConcatFilePath = path.join(OUTPUT_DIR, `audio-concat-${timestamp}.txt`);
                createConcatFile(audioPaths, audioConcatFilePath);
                console.log("Created audio concat file:", audioConcatFilePath);

                audioInputOption = `-f concat -safe 0 -i "${audioConcatFilePath}"`;
                audioMapOption = `-map 1:a`;
            }
        }

        // Video dimensions based on orientation
        const dimensions = orientation === "portrait"
            ? { width: 1080, height: 1920 }
            : { width: 1920, height: 1080 };

        // Build FFmpeg filter complex
        const filters: string[] = [];

        // Scale all videos to same size and normalize
        filters.push(`scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2`);

        // Add watermark if requested
        if (addWatermark && watermarkText) {
            const fontPath = "C\\\\:/Windows/Fonts/arial.ttf";
            filters.push(`drawtext=fontfile='${fontPath}':text='${watermarkText}':fontcolor=white@0.7:fontsize=28:x=w-tw-20:y=h-th-20:shadowcolor=black@0.5:shadowx=1:shadowy=1`);
        }

        const filterString = filters.join(",");

        if (audioConcatFilePath) {
            // Merge with concatenated audio
            // Note: Added -shortest is removed because audio might be longer or shorter, usually we want video length or max length.
            // If we use -shortest, and video is 5s but audio is 10s, it cuts audio. 
            // If video is 5s and audio is 2s, it cuts video? No, shortest cuts to the shortest stream.
            // Usually we want the video duration to define the clip, but if audio is narration, we might want to hear it all?
            // For now, let's keep it simple: Map video concat and audio concat.
            mergeCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" ${audioInputOption} -filter_complex "[0:v]${filterString}[v]" -map "[v]" ${audioMapOption} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k "${outputPath}"`;
        } else {
            // Videos only
            mergeCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -vf "${filterString}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k "${outputPath}"`;
        }

        console.log("Executing FFmpeg command...");
        console.log(mergeCommand);

        try {
            const { stderr } = await execAsync(mergeCommand, { maxBuffer: 50 * 1024 * 1024 });
            console.log("FFmpeg output:", stderr.substring(0, 500));
        } catch (ffmpegError) {
            console.error("FFmpeg error:", ffmpegError);

            // Try simpler command without filters
            const simpleCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" ${audioConcatFilePath ? `-f concat -safe 0 -i "${audioConcatFilePath}" -map 0:v -map 1:a` : '-c copy'} "${outputPath}"`;
            try {
                await execAsync(simpleCommand);
                console.log("Used simple concat method");
            } catch (simpleError) {
                throw new Error(`FFmpeg merge failed: ${simpleError}`);
            }
        }

        // Cleanup concat files
        try {
            fs.unlinkSync(concatFilePath);
            if (audioConcatFilePath) fs.unlinkSync(audioConcatFilePath);
        } catch { /* ignore */ }

        // Verify output
        if (!fs.existsSync(outputPath)) {
            return NextResponse.json(
                { error: "Merge failed - output file not created" },
                { status: 500 }
            );
        }

        const outputStats = fs.statSync(outputPath);
        const outputDuration = await getMediaDuration(outputPath);

        console.log(`Merge complete: ${outputFilename} (${(outputStats.size / 1024 / 1024).toFixed(2)} MB, ${outputDuration.toFixed(1)}s)`);

        return NextResponse.json({
            success: true,
            mergedVideoUrl: `/final-videos/${outputFilename}`,
            outputPath: outputPath,
            fileSize: outputStats.size,
            duration: outputDuration,
            orientation,
            watermarked: addWatermark,
            message: "Videos merged successfully!",
        });

    } catch (error) {
        console.error("Merge error:", error);
        return NextResponse.json(
            {
                error: "Failed to merge videos",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
