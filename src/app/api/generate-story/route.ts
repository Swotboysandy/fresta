import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const genre = body.genre || "drama";
        const theme = body.theme || "An epic adventure";
        const duration = body.duration || 60;

        const apiKey = process.env.GROQ_API_KEY;
        console.log("Groq API Key exists:", !!apiKey);

        if (!apiKey) {
            console.error("GROQ_API_KEY not found in environment");
            return NextResponse.json(
                { error: "API key not configured" },
                { status: 500 }
            );
        }

        // Calculate number of scenes based on duration
        const sceneCount = Math.max(3, Math.floor(duration / 30));
        const sceneDuration = Math.floor(duration / sceneCount);

        const prompt = `You are a creative screenwriter. Generate a compelling ${genre} story based on this theme: "${theme}"

Requirements:
- Create exactly ${sceneCount} scenes
- Each scene should be 2-3 sentences (suitable for ${sceneDuration} seconds of narration)
- The story should have a clear beginning, middle, and end
- Use vivid, cinematic language suitable for video narration
- **Write the story content in Hindi (Devanagari script)**
- Keep the JSON keys in English ("title", "scenes", "content"), but the values for "title" and "content" should be in Hindi.

Return the response as a valid JSON object with this exact structure:
{
  "title": "Story Title Here (in Hindi)",
  "scenes": [
    {
      "id": 1,
      "title": "Scene 1 (in Hindi)",
      "content": "Scene content here (in Hindi)...",
      "duration": ${sceneDuration}
    }
  ]
}

Only return the JSON object, no other text.`;

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
                        content: "You are a creative screenwriter who generates compelling stories in Hindi. Always respond with valid JSON only, no markdown or extra text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.9,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Groq API Error:", errorData);
            return NextResponse.json(
                { error: "Failed to generate story" },
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

        // Parse the JSON from the response
        // Clean up the response (remove markdown code blocks if present)
        let cleanedText = generatedText.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.slice(7);
        }
        if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.slice(0, -3);
        }
        cleanedText = cleanedText.trim();

        const storyData = JSON.parse(cleanedText);

        return NextResponse.json({
            title: storyData.title || "Untitled Story",
            scenes: storyData.scenes.map((scene: { id: number; title: string; content: string; duration: number }, index: number) => ({
                id: scene.id || index + 1,
                title: scene.title || `Scene ${index + 1}`,
                content: scene.content,
                duration: scene.duration || sceneDuration,
                isEditing: false,
                isGenerating: false,
            })),
        });
    } catch (error) {
        console.error("Story generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate story" },
            { status: 500 }
        );
    }
}
