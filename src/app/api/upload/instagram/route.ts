import { NextRequest, NextResponse } from "next/server";
import { uploadToInstagram } from "@/lib/instagram-upload";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
    try {
        const { videoPath, caption } = await request.json();

        if (!videoPath) {
            return NextResponse.json({ error: "No video path provided" }, { status: 400 });
        }

        const fullPath = path.join(process.cwd(), "public", videoPath.startsWith('/') ? videoPath.slice(1) : videoPath);

        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: "Video file not found on server" }, { status: 404 });
        }

        const result = await uploadToInstagram(fullPath, caption || "Created with StoryForge AI #shorts #ai");

        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json(
            { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
