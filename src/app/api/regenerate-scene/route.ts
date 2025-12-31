import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { genre, theme, sceneNumber, previousContent, duration } = await request.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "API key not configured" },
                { status: 500 }
            );
        }

        const prompt = `Regenerate Scene ${sceneNumber} for a ${genre} story based on this theme: "${theme}"

The previous content was: "${previousContent}"

Requirements:
- Create a new, different version of this scene
- Keep it 2-3 sentences (suitable for ${duration} seconds of narration)
- Use vivid, cinematic language suitable for video narration
- Make it emotionally engaging and dramatic
- It should fit naturally as Scene ${sceneNumber} in the story

Return ONLY the new scene content as plain text, no JSON or formatting.`;

        // Call Groq API (OpenAI-compatible)
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are a creative screenwriter. Respond with only the scene content, no extra formatting."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 1.0,
                max_tokens: 256,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Groq API Error:", errorData);
            return NextResponse.json(
                { error: "Failed to regenerate scene" },
                { status: 500 }
            );
        }

        const data = await response.json();

        // Extract the generated text (OpenAI format)
        const generatedText = data.choices?.[0]?.message?.content;

        if (!generatedText) {
            return NextResponse.json(
                { error: "No content generated" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            content: generatedText.trim(),
        });
    } catch (error) {
        console.error("Scene regeneration error:", error);
        return NextResponse.json(
            { error: "Failed to regenerate scene" },
            { status: 500 }
        );
    }
}
