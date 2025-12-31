import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// API Route for AI YouTube Shorts Generator
// Supports both the original clipper and the new SamurAI-based generator

export async function POST(request: NextRequest) {
    try {
        const { url, mode = "samurai" } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: "URL is required" },
                { status: 400 }
            );
        }

        // Define output directory in public folder
        const outputDir = path.join(process.cwd(), "public", "clips");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let scriptPath: string;
        let args: string[];

        if (mode === "samurai") {
            // Use the new SamurAI-based shorts generator (with Grok/Gemini)
            scriptPath = path.join(process.cwd(), "scripts", "shorts-generator", "main.py");
            args = [scriptPath, url, "--auto-approve"];
        } else {
            // Use the original clipper
            scriptPath = path.join(process.cwd(), "scripts", "clipper", "main.py");
            args = [scriptPath, url, "--output", outputDir];
        }

        console.log(`Using ${mode} mode with script: ${scriptPath}`);

        // Set working directory for the SamurAI generator
        const cwd = mode === "samurai"
            ? path.join(process.cwd(), "scripts", "shorts-generator")
            : process.cwd();

        // Spawn Python process
        const pythonProcess = spawn("python", args, {
            cwd,
            env: {
                ...process.env,
                PYTHONIOENCODING: "utf-8",
            }
        });

        let dataString = "";
        let errorString = "";

        return new Promise((resolve) => {
            pythonProcess.stdout.on("data", (data) => {
                const output = data.toString();
                console.log("Python stdout:", output);
                dataString += output;
            });

            pythonProcess.stderr.on("data", (data) => {
                const output = data.toString();
                console.error("Python stderr:", output);
                errorString += output;
            });

            pythonProcess.on("close", (code) => {
                console.log(`Python process exited with code ${code}`);

                if (code !== 0) {
                    resolve(
                        NextResponse.json(
                            { error: "Clipper process failed", details: errorString || dataString },
                            { status: 500 }
                        )
                    );
                } else {
                    // Parse output to find the generated file
                    // SamurAI format: "SUCCESS: filename.mp4 is ready!"
                    // Original format: "File: path/to/file" or "Output: path/to/file"

                    let relativePath = null;

                    // Try SamurAI format first
                    const samuraiMatch = dataString.match(/SUCCESS: (.+?)_short\.mp4 is ready/);
                    if (samuraiMatch && samuraiMatch[1]) {
                        const baseFileName = samuraiMatch[1].trim() + "_short.mp4";
                        // File is created in shorts-generator folder, move it to public/clips
                        const sourcePath = path.join(cwd, baseFileName);
                        const destPath = path.join(outputDir, baseFileName);

                        if (fs.existsSync(sourcePath)) {
                            fs.copyFileSync(sourcePath, destPath);
                            fs.unlinkSync(sourcePath);
                            relativePath = `/clips/${baseFileName}`;
                        }
                    }

                    // Try original format
                    if (!relativePath) {
                        const fileMatch = dataString.match(/(?:File|Output): (.+)/);
                        if (fileMatch && fileMatch[1]) {
                            const fullPath = fileMatch[1].trim();
                            const fileName = path.basename(fullPath);
                            relativePath = `/clips/${fileName}`;
                        }
                    }

                    resolve(
                        NextResponse.json({
                            success: true,
                            message: "Clip generated successfully",
                            videoUrl: relativePath,
                            mode: mode,
                            logs: dataString
                        })
                    );
                }
            });
        });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
