import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const sceneId = formData.get("sceneId") as string;

        if (!file || !sceneId) {
            return NextResponse.json(
                { error: "File and sceneId are required" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `voice-${sceneId}-${Date.now()}.wav`;
        const uploadDir = path.join(process.cwd(), "public", "generated-audio");

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        return NextResponse.json({
            success: true,
            audioUrl: `/generated-audio/${fileName}`
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload audio" },
            { status: 500 }
        );
    }
}
