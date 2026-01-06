import { NextRequest, NextResponse } from "next/server";

/**
 * Relevance AI Caption API Integration
 * This is an OPTIONAL feature for adding captions to videos
 * Uses the Relevance AI tool API
 */

const RELEVANCE_API_URL = "https://api-f1db6c.stack.tryrelevance.com/latest/studios/d9f66350-f6fa-419b-9653-9d9b087ce31f/trigger_webhook?project=18049842-1c85-4981-b5d0-ed54b7f2435e";

interface CaptionRequest {
    videoUrl: string;          // URL of the video to caption
    captionSize?: string;      // Size of captions
    highlightColor?: string;   // Highlight color for captions
    language?: string;         // Language for transcription
    initialPrompt?: string;    // Context prompt for better transcription
    temperature?: number;      // AI temperature (0-1)
}

export async function POST(request: NextRequest) {
    console.log("[RelevanceAI] Caption API called");

    try {
        const body: CaptionRequest = await request.json();
        const {
            videoUrl,
            captionSize = "medium",
            highlightColor = "#FFFF00",
            language = "en",
            initialPrompt = "",
            temperature = 0
        } = body;

        if (!videoUrl) {
            return NextResponse.json(
                { error: "Video URL is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.RELEVANCE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "RELEVANCE_API_KEY not configured. Add your Relevance AI API key to .env.local" },
                { status: 500 }
            );
        }

        console.log(`[RelevanceAI] Processing video: ${videoUrl.substring(0, 50)}...`);
        console.log(`[RelevanceAI] Caption size: ${captionSize}, Color: ${highlightColor}, Language: ${language}`);

        // Call Relevance AI API
        const response = await fetch(RELEVANCE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": apiKey,
            },
            body: JSON.stringify({
                video: videoUrl,
                caption_size: captionSize,
                highlight_color: highlightColor,
                language: language,
                initial_prompt: initialPrompt,
                temperature: temperature,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[RelevanceAI] API Error:", errorText);
            return NextResponse.json(
                { error: "Relevance AI API failed", details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log("[RelevanceAI] ✅ Caption processing started:", data);

        // The API might return a job ID for async processing
        return NextResponse.json({
            success: true,
            message: "Caption processing started",
            data: data,
        });

    } catch (error) {
        console.error("[RelevanceAI] Error:", error);

        return NextResponse.json(
            {
                error: "Failed to process video captions",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check status (if Relevance AI provides async status)
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
        return NextResponse.json(
            { error: "Job ID required" },
            { status: 400 }
        );
    }

    // This would check async job status if Relevance AI supports it
    // For now, return placeholder
    return NextResponse.json({
        status: "pending",
        message: "Check Relevance AI dashboard for status",
        jobId: jobId,
    });
}
