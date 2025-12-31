import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { prompt, aspectRatio = "9:16" } = await request.json();

        const apiKey = process.env.GEMINI_API_KEY;

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "No prompt provided" },
                { status: 400 }
            );
        }

        // Enhance the prompt for cinematic visuals
        const enhancedPrompt = `Cinematic scene: ${prompt}. Style: Dramatic lighting, professional cinematography, movie-like quality, visually stunning, suitable for a story video.`;

        // Try Imagen 4 first (requires billing)
        if (apiKey) {
            console.log("Trying Imagen 4:", prompt.substring(0, 50) + "...");

            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-goog-api-key": apiKey,
                        },
                        body: JSON.stringify({
                            instances: [{ prompt: enhancedPrompt }],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: aspectRatio,
                            },
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const predictions = data.predictions || [];
                    if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
                        console.log("✅ Imagen 4 success!");
                        return NextResponse.json({
                            imageData: predictions[0].bytesBase64Encoded,
                            mimeType: "image/png",
                            description: "Generated with Imagen 4",
                        });
                    }
                }
                console.log("Imagen 4 failed, trying Gemini...");
            } catch (e) {
                console.log("Imagen 4 error, trying Gemini...");
            }

            // Try Gemini 2.0 Flash as second option
            try {
                console.log("Trying Gemini 2.0 Flash for image generation...");
                const geminiResult = await generateWithGemini(apiKey, enhancedPrompt);
                if (geminiResult.ok) {
                    return geminiResult;
                }
            } catch (e) {
                console.log("Gemini failed, falling back to Pollinations...");
            }
        }

        // Final fallback: Pollinations.ai (FREE, no API key needed!)
        console.log("Using Pollinations.ai (free fallback)...");
        return await generateWithPollinations(enhancedPrompt, aspectRatio);

    } catch (error) {
        console.error("Image generation error:", error);
        // Even on error, try Pollinations as last resort
        try {
            const { prompt } = await request.clone().json();
            return await generateWithPollinations(prompt, "9:16");
        } catch {
            return NextResponse.json(
                { error: "Failed to generate image" },
                { status: 500 }
            );
        }
    }
}

// Fallback function using Gemini 2.0 Flash
async function generateWithGemini(apiKey: string, prompt: string) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"],
                },
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Gemini fallback error:", errorData);
        return NextResponse.json(
            { error: "Gemini failed" },
            { status: 500 }
        );
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    let imageData = null;
    let textResponse = null;

    for (const part of parts) {
        if (part.inlineData) {
            imageData = part.inlineData.data;
        }
        if (part.text) {
            textResponse = part.text;
        }
    }

    if (!imageData) {
        console.error("No image data in Gemini response:", textResponse);
        return NextResponse.json(
            { error: "No image generated" },
            { status: 500 }
        );
    }

    console.log("✅ Gemini 2.0 Flash success!");
    return NextResponse.json({
        imageData: imageData,
        mimeType: "image/png",
        description: "Generated with Gemini 2.0 Flash",
    });
}

// FREE fallback using Pollinations.ai - No API key required!
async function generateWithPollinations(prompt: string, aspectRatio: string) {
    try {
        // Calculate dimensions based on aspect ratio
        let width = 576;
        let height = 1024;

        if (aspectRatio === "16:9") {
            width = 1024;
            height = 576;
        } else if (aspectRatio === "1:1") {
            width = 768;
            height = 768;
        }
        // Default 9:16 is already set

        // Pollinations.ai provides free image generation via URL
        const encodedPrompt = encodeURIComponent(prompt);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${Date.now()}&nologo=true&model=flux`;

        console.log("Fetching from Pollinations.ai...");

        const response = await fetch(pollinationsUrl, {
            method: "GET",
            headers: {
                "Accept": "image/png,image/jpeg,image/*",
            },
        });

        if (!response.ok) {
            throw new Error(`Pollinations failed with status: ${response.status}`);
        }

        // Get the image as a buffer
        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");

        console.log("✅ Pollinations.ai success!");
        return NextResponse.json({
            imageData: base64Image,
            mimeType: "image/png",
            description: "Generated with Pollinations.ai (Free)",
        });
    } catch (error) {
        console.error("Pollinations.ai error:", error);
        return NextResponse.json(
            { error: "All image generation methods failed" },
            { status: 500 }
        );
    }
}
