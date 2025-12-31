import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Directory to store generated audio
const AUDIO_DIR = path.join(process.cwd(), "public", "generated-audio");

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Genre-specific voice styling prompts for natural, expressive audio
const GENRE_VOICE_STYLES: Record<string, string> = {
    "horror": "Read this Hindi text in a dark, eerie whisper with suspenseful pauses. Voice should be slightly breathy and tense, building dread:",
    "romance": "Read this Hindi text in a warm, gentle, emotionally expressive tone. Voice should be soft and intimate, conveying deep feelings:",
    "sci-fi": "Read this Hindi text in a clear, slightly futuristic tone with a sense of wonder. Voice should be articulate and engaging:",
    "fantasy": "Read this Hindi text in an epic, dramatic storytelling voice with mystical undertones. Voice should be rich and adventurous:",
    "action": "Read this Hindi text in an energetic, intense, fast-paced tone. Voice should be dynamic and exciting with urgency:",
    "comedy": "Read this Hindi text in a light, playful, cheerful tone with natural humor. Voice should be warm and entertaining:",
    "mystery": "Read this Hindi text in a mysterious, intriguing whisper with suspenseful undertones. Voice should create curiosity:",
    "drama": "Read this Hindi text in an emotionally rich, heartfelt dramatic tone. Voice should convey deep emotion and sincerity:",
    "default": "Read this Hindi text in a warm, engaging, natural storytelling voice. Voice should be clear, expressive, and like a native Hindi speaker:"
};

// Helper: Convert PCM to WAV
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    const headerSize = 44;

    const header = Buffer.alloc(headerSize);

    // RIFF chunk
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);

    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size
    header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
}

export async function POST(request: NextRequest) {
    try {
        const { text, voiceName = "Kore", sceneId = 0, genre = "default" } = await request.json();

        // Use the provided API key
        const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCHu1WdmtSSH0vSSEiYBltolaBYoDzwocY";

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: "No text provided" },
                { status: 400 }
            );
        }

        // Get genre-specific voice style
        const voiceStyle = GENRE_VOICE_STYLES[genre.toLowerCase()] || GENRE_VOICE_STYLES["default"];

        // Create the styled prompt
        const styledText = `${voiceStyle}\n\n${text}`;

        console.log(`[Scene ${sceneId}] Generating TTS for genre: ${genre}`);

        const model = "gemini-2.0-flash-exp";

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: styledText }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: voiceName },
                            },
                        },
                    },
                }),
            }
        );

        if (response.status === 429 || response.status === 503) {
            console.log(`[Scene ${sceneId}] ⚠️ Rate limited`);
            return NextResponse.json(
                { error: "Rate limited", fallback: true },
                { status: 503 }
            );
        }

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`[Scene ${sceneId}] API error:`, response.status);
            return NextResponse.json(
                { error: "API error", fallback: true, details: errorData.substring(0, 200) },
                { status: 503 }
            );
        }

        const data = await response.json();
        const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioData) {
            console.log(`[Scene ${sceneId}] No audio in response`);
            return NextResponse.json(
                { error: "No audio generated", fallback: true },
                { status: 503 }
            );
        }

        // Convert and Save
        const pcmBuffer = Buffer.from(audioData, 'base64');
        const wavBuffer = pcmToWav(pcmBuffer);
        const fileName = `voice-${sceneId}-${Date.now()}.wav`;
        const filePath = path.join(AUDIO_DIR, fileName);

        fs.writeFileSync(filePath, wavBuffer);
        const audioUrl = `/generated-audio/${fileName}`;

        console.log(`[Scene ${sceneId}] ✅ Audio saved: ${audioUrl}`);

        return NextResponse.json({
            success: true,
            audioData: audioData, // Keep for backward compatibility if needed, but client should prefer audioUrl
            audioUrl: audioUrl,
            format: "wav"
        });

    } catch (error) {
        console.error("TTS generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate audio", fallback: true },
            { status: 500 }
        );
    }
}
