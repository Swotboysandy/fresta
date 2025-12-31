import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// API Route for AI Faceless Video Generator with SSE Streaming

export async function POST(request: NextRequest) {
    try {
        const { url, style = "documentary", voice = "hi-IN-SwaraNeural", music = "cinematic" } = await request.json();

        if (!url) {
            return new Response(
                JSON.stringify({ error: "URL is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const scriptPath = path.join(process.cwd(), "scripts", "faceless-generator", "main.py");
        const cwd = path.join(process.cwd(), "scripts", "faceless-generator");
        const outputDir = path.join(process.cwd(), "public", "faceless");

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`Faceless generator: ${url}, style=${style}, voice=${voice}, music=${music}`);

        const encoder = new TextEncoder();
        let dataString = "";

        const stream = new ReadableStream({
            start(controller) {
                const sendEvent = (type: string, data: string) => {
                    const event = `data: ${JSON.stringify({ type, data })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                };

                const pythonProcess = spawn("python", [scriptPath, url, style, voice, music], {
                    cwd,
                    env: {
                        ...process.env,
                        PYTHONIOENCODING: "utf-8",
                        PYTHONUNBUFFERED: "1",
                    }
                });

                pythonProcess.stdout.on("data", (data) => {
                    const output = data.toString();
                    console.log("Python:", output);
                    dataString += output;

                    const lines = output.split("\n").filter((l: string) => l.trim());
                    for (const line of lines) {
                        if (line.includes("Step") ||
                            line.includes("✓") ||
                            line.includes("✗") ||
                            line.includes("Downloading") ||
                            line.includes("Transcrib") ||
                            line.includes("[AI]") ||
                            line.includes("Generating") ||
                            line.includes("Creating") ||
                            line.includes("Assembling") ||
                            line.includes("SUCCESS") ||
                            line.includes("Error") ||
                            line.includes("Session")) {
                            sendEvent("log", line.trim());
                        }
                    }
                });

                pythonProcess.stderr.on("data", (data) => {
                    const output = data.toString();
                    console.error("Python stderr:", output);
                    if (output.includes("Error") || output.includes("Traceback")) {
                        sendEvent("error", output.trim());
                    }
                });

                pythonProcess.on("close", (code) => {
                    console.log(`Python exit code: ${code}`);

                    if (code !== 0) {
                        sendEvent("done", JSON.stringify({
                            success: false,
                            error: "Process failed"
                        }));
                    } else {
                        // Find the output file
                        const match = dataString.match(/SUCCESS: (.+\.mp4)/);
                        let videoUrl = null;

                        if (match && match[1]) {
                            const outputPath = match[1].trim();
                            const fileName = path.basename(outputPath);
                            const destPath = path.join(outputDir, fileName);

                            // Move file to public folder
                            if (fs.existsSync(outputPath)) {
                                fs.copyFileSync(outputPath, destPath);
                                fs.unlinkSync(outputPath);
                                videoUrl = `/faceless/${fileName}`;
                            }
                        }

                        sendEvent("done", JSON.stringify({
                            success: true,
                            videoUrl: videoUrl
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
