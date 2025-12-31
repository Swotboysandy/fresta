import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// API Route for AI YouTube Shorts Generator with SSE Streaming
// Streams real-time progress updates to the client

export async function POST(request: NextRequest) {
    try {
        const { url, mode = "samurai" } = await request.json();

        if (!url) {
            return new Response(
                JSON.stringify({ error: "URL is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
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
            scriptPath = path.join(process.cwd(), "scripts", "shorts-generator", "main.py");
            args = [scriptPath, url, "--auto-approve"];
        } else {
            scriptPath = path.join(process.cwd(), "scripts", "clipper", "main.py");
            args = [scriptPath, url, "--output", outputDir];
        }

        console.log(`Using ${mode} mode with script: ${scriptPath}`);

        const cwd = mode === "samurai"
            ? path.join(process.cwd(), "scripts", "shorts-generator")
            : process.cwd();

        // Create a readable stream for SSE
        const encoder = new TextEncoder();
        let dataString = "";
        let errorString = "";

        const stream = new ReadableStream({
            start(controller) {
                const sendEvent = (type: string, data: string) => {
                    const event = `data: ${JSON.stringify({ type, data })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                };

                // Spawn Python process
                const pythonProcess = spawn("python", args, {
                    cwd,
                    env: {
                        ...process.env,
                        PYTHONIOENCODING: "utf-8",
                        PYTHONUNBUFFERED: "1", // Force unbuffered output
                    }
                });

                pythonProcess.stdout.on("data", (data) => {
                    const output = data.toString();
                    console.log("Python stdout:", output);
                    dataString += output;

                    // Parse and send meaningful status updates
                    const lines = output.split("\n").filter((l: string) => l.trim());
                    for (const line of lines) {
                        // Filter important status lines
                        if (line.includes("Downloading") ||
                            line.includes("Downloaded") ||
                            line.includes("Extracting") ||
                            line.includes("Transcribing") ||
                            line.includes("Analyzing") ||
                            line.includes("SELECTED") ||
                            line.includes("Step") ||
                            line.includes("Processing") ||
                            line.includes("SUCCESS") ||
                            line.includes("✓") ||
                            line.includes("✗") ||
                            line.includes("Error") ||
                            line.includes("[AI]") ||
                            line.includes("Session ID")) {
                            sendEvent("log", line.trim());
                        }
                    }
                });

                pythonProcess.stderr.on("data", (data) => {
                    const output = data.toString();
                    console.error("Python stderr:", output);
                    errorString += output;

                    // Only send critical errors, not progress bars
                    if (output.includes("Error") || output.includes("Traceback") || output.includes("Exception")) {
                        sendEvent("error", output.trim());
                    }
                });

                pythonProcess.on("close", (code) => {
                    console.log(`Python process exited with code ${code}`);

                    if (code !== 0) {
                        sendEvent("done", JSON.stringify({
                            success: false,
                            error: "Clipper process failed",
                            details: errorString || dataString
                        }));
                    } else {
                        // Parse output to find the generated file
                        let relativePath = null;

                        const samuraiMatch = dataString.match(/SUCCESS: (.+?)_short\.mp4 is ready/);
                        if (samuraiMatch && samuraiMatch[1]) {
                            const baseFileName = samuraiMatch[1].trim() + "_short.mp4";
                            const sourcePath = path.join(cwd, baseFileName);
                            const destPath = path.join(outputDir, baseFileName);

                            if (fs.existsSync(sourcePath)) {
                                fs.copyFileSync(sourcePath, destPath);
                                fs.unlinkSync(sourcePath);
                                relativePath = `/clips/${baseFileName}`;
                            }
                        }

                        if (!relativePath) {
                            const fileMatch = dataString.match(/(?:File|Output): (.+)/);
                            if (fileMatch && fileMatch[1]) {
                                const fullPath = fileMatch[1].trim();
                                const fileName = path.basename(fullPath);
                                relativePath = `/clips/${fileName}`;
                            }
                        }

                        sendEvent("done", JSON.stringify({
                            success: true,
                            message: "Clip generated successfully",
                            videoUrl: relativePath,
                            mode: mode
                        }));
                    }

                    controller.close();
                });

                pythonProcess.on("error", (err) => {
                    sendEvent("error", `Process error: ${err.message}`);
                    controller.close();
                });
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error) {
        console.error("API Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
