"use server";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Scene {
    id: number;
    title: string;
    content: string;
    duration: number;
}

interface ValidationRequest {
    scenes: Scene[];
    videoUrls: { [sceneId: number]: string };
    audioUrls: { [sceneId: number]: string };
    projectName: string;
    orientation: "portrait" | "landscape";
}

interface ValidationResult {
    passed: boolean;
    score: number; // 0-100
    checks: {
        name: string;
        passed: boolean;
        message: string;
        severity: "error" | "warning" | "info";
    }[];
    recommendations: string[];
}

// Get media duration using ffprobe
async function getMediaDuration(filePath: string): Promise<number> {
    try {
        const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
        );
        return parseFloat(stdout.trim()) || 0;
    } catch {
        console.error(`Could not get duration for: ${filePath}`);
        return 0;
    }
}

// Get video resolution using ffprobe
async function getVideoResolution(filePath: string): Promise<{ width: number; height: number } | null> {
    try {
        const { stdout } = await execAsync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`
        );
        const [width, height] = stdout.trim().split("x").map(Number);
        return { width, height };
    } catch {
        return null;
    }
}

// Check file integrity
function checkFileIntegrity(filePath: string): { valid: boolean; size: number } {
    const absolutePath = filePath.startsWith("/")
        ? path.join(process.cwd(), "public", filePath)
        : filePath;

    try {
        if (!fs.existsSync(absolutePath)) {
            return { valid: false, size: 0 };
        }
        const stats = fs.statSync(absolutePath);
        return { valid: stats.size > 0, size: stats.size };
    } catch {
        return { valid: false, size: 0 };
    }
}

// Validate script content quality
function validateScriptQuality(scenes: Scene[]): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    if (scenes.length === 0) {
        return { score: 0, issues: ["No scenes in story"] };
    }

    // Check for empty scenes
    const emptyScenes = scenes.filter(s => !s.content || s.content.trim().length < 20);
    if (emptyScenes.length > 0) {
        issues.push(`${emptyScenes.length} scene(s) have insufficient content`);
        score -= emptyScenes.length * 15;
    }

    // Check for very short scenes
    const shortScenes = scenes.filter(s => s.content && s.content.length < 50);
    if (shortScenes.length > 0) {
        issues.push(`${shortScenes.length} scene(s) are very short`);
        score -= shortScenes.length * 5;
    }

    // Check for duplicate content
    const contents = scenes.map(s => s.content.toLowerCase().trim());
    const uniqueContents = new Set(contents);
    if (uniqueContents.size < contents.length) {
        issues.push("Duplicate scene content detected");
        score -= 20;
    }

    // Check for scene titles
    const untitledScenes = scenes.filter(s => !s.title || s.title === `Scene ${s.id}`);
    if (untitledScenes.length === scenes.length) {
        issues.push("All scenes have generic titles");
        score -= 5;
    }

    return { score: Math.max(0, score), issues };
}

export async function POST(request: NextRequest) {
    try {
        const body: ValidationRequest = await request.json();
        const { scenes, videoUrls, audioUrls, projectName, orientation } = body;

        const checks: ValidationResult["checks"] = [];
        const recommendations: string[] = [];
        let totalScore = 0;
        let checkCount = 0;

        console.log(`Starting validation for project: ${projectName}`);
        console.log(`Scenes: ${scenes.length}, Videos: ${Object.keys(videoUrls).length}, Audio: ${Object.keys(audioUrls).length}`);

        // ========== 1. Script Accuracy Check ==========
        const scriptValidation = validateScriptQuality(scenes);
        checks.push({
            name: "Script Accuracy",
            passed: scriptValidation.score >= 70,
            message: scriptValidation.issues.length > 0
                ? scriptValidation.issues.join("; ")
                : "Script content is complete and accurate",
            severity: scriptValidation.score < 50 ? "error" : scriptValidation.score < 70 ? "warning" : "info",
        });
        totalScore += scriptValidation.score;
        checkCount++;

        if (scriptValidation.score < 70) {
            recommendations.push("Consider regenerating scenes with more detailed prompts");
        }

        // ========== 2. Audio Quality Check ==========
        let audioScore = 0;
        let audioChecked = 0;
        const audioIssues: string[] = [];

        for (const scene of scenes) {
            const audioUrl = audioUrls[scene.id];
            if (!audioUrl) {
                audioIssues.push(`Scene ${scene.id}: No audio generated`);
                continue;
            }

            const audioPath = path.join(process.cwd(), "public", audioUrl);
            const integrity = checkFileIntegrity(audioPath);

            if (!integrity.valid) {
                audioIssues.push(`Scene ${scene.id}: Audio file corrupted or missing`);
                continue;
            }

            const duration = await getMediaDuration(audioPath);
            if (duration < 1) {
                audioIssues.push(`Scene ${scene.id}: Audio too short (${duration.toFixed(1)}s)`);
                audioScore += 50;
            } else if (duration > 120) {
                audioIssues.push(`Scene ${scene.id}: Audio unusually long (${duration.toFixed(1)}s)`);
                audioScore += 70;
            } else {
                audioScore += 100;
            }
            audioChecked++;
        }

        const avgAudioScore = audioChecked > 0 ? audioScore / audioChecked : 0;
        checks.push({
            name: "Audio Quality",
            passed: avgAudioScore >= 70 && audioIssues.length === 0,
            message: audioIssues.length > 0 ? audioIssues.slice(0, 3).join("; ") : "All audio files are valid",
            severity: avgAudioScore < 50 ? "error" : avgAudioScore < 70 ? "warning" : "info",
        });
        totalScore += avgAudioScore;
        checkCount++;

        if (audioIssues.length > 0) {
            recommendations.push("Regenerate audio for scenes with issues");
        }

        // ========== 3. Video Quality Check ==========
        let videoScore = 0;
        let videoChecked = 0;
        const videoIssues: string[] = [];
        const expectedRatio = orientation === "portrait" ? 9 / 16 : 16 / 9;

        for (const scene of scenes) {
            const videoUrl = videoUrls[scene.id];
            if (!videoUrl) {
                videoIssues.push(`Scene ${scene.id}: No video generated`);
                continue;
            }

            const videoPath = path.join(process.cwd(), "public", videoUrl);
            const integrity = checkFileIntegrity(videoPath);

            if (!integrity.valid) {
                videoIssues.push(`Scene ${scene.id}: Video file corrupted or missing`);
                continue;
            }

            // Check resolution
            const resolution = await getVideoResolution(videoPath);
            if (resolution) {
                const actualRatio = resolution.width / resolution.height;
                if (Math.abs(actualRatio - expectedRatio) > 0.1) {
                    videoIssues.push(`Scene ${scene.id}: Wrong aspect ratio (${resolution.width}x${resolution.height})`);
                    videoScore += 70;
                } else {
                    videoScore += 100;
                }
            } else {
                videoScore += 80; // Assume OK if we can't check
            }

            // Check duration
            const duration = await getMediaDuration(videoPath);
            if (duration < 2) {
                videoIssues.push(`Scene ${scene.id}: Video too short (${duration.toFixed(1)}s)`);
            }

            videoChecked++;
        }

        const avgVideoScore = videoChecked > 0 ? videoScore / videoChecked : 0;
        checks.push({
            name: "Video Quality",
            passed: avgVideoScore >= 70 && videoIssues.length === 0,
            message: videoIssues.length > 0 ? videoIssues.slice(0, 3).join("; ") : "All video files are valid",
            severity: avgVideoScore < 50 ? "error" : avgVideoScore < 70 ? "warning" : "info",
        });
        totalScore += avgVideoScore;
        checkCount++;

        if (videoIssues.length > 0) {
            recommendations.push("Regenerate videos for scenes with quality issues");
        }

        // ========== 4. Scene Consistency Check ==========
        const sceneCount = scenes.length;
        const videoCount = Object.keys(videoUrls).length;
        const audioCount = Object.keys(audioUrls).length;

        const consistencyScore = Math.min(
            (videoCount / sceneCount) * 100,
            (audioCount / sceneCount) * 100
        );

        checks.push({
            name: "Scene Consistency",
            passed: consistencyScore >= 90,
            message: consistencyScore === 100
                ? "All scenes have corresponding audio and video"
                : `Missing content: ${sceneCount - videoCount} videos, ${sceneCount - audioCount} audio files`,
            severity: consistencyScore < 50 ? "error" : consistencyScore < 90 ? "warning" : "info",
        });
        totalScore += consistencyScore;
        checkCount++;

        // ========== 5. File Naming Check ==========
        let namingScore = 100;
        const namingIssues: string[] = [];

        // Check if project name is valid
        if (!projectName || projectName.trim().length === 0) {
            namingIssues.push("Project name is empty");
            namingScore -= 30;
        } else if (!/^[a-zA-Z0-9\-_\s]+$/.test(projectName)) {
            namingIssues.push("Project name contains special characters");
            namingScore -= 10;
        }

        checks.push({
            name: "File Naming",
            passed: namingScore >= 80,
            message: namingIssues.length > 0 ? namingIssues.join("; ") : "File naming is correct",
            severity: namingScore < 50 ? "error" : namingScore < 80 ? "warning" : "info",
        });
        totalScore += namingScore;
        checkCount++;

        // ========== 6. Missing Steps Check ==========
        const missingSteps: string[] = [];

        if (scenes.length === 0) {
            missingSteps.push("Story generation");
        }
        if (Object.keys(audioUrls).length === 0) {
            missingSteps.push("Voice/Audio generation");
        }
        if (Object.keys(videoUrls).length === 0) {
            missingSteps.push("Video generation");
        }

        const completenessScore = missingSteps.length === 0 ? 100 : Math.max(0, 100 - missingSteps.length * 33);

        checks.push({
            name: "Pipeline Completeness",
            passed: missingSteps.length === 0,
            message: missingSteps.length > 0
                ? `Missing: ${missingSteps.join(", ")}`
                : "All pipeline steps completed",
            severity: missingSteps.length > 0 ? "error" : "info",
        });
        totalScore += completenessScore;
        checkCount++;

        // ========== Calculate Final Score ==========
        const finalScore = Math.round(totalScore / checkCount);
        const allPassed = checks.every(c => c.passed || c.severity === "warning");

        // Generate final recommendations
        if (finalScore < 70) {
            recommendations.push("Consider re-running the entire pipeline before exporting");
        }
        if (finalScore >= 90) {
            recommendations.push("Project is ready for export!");
        }

        console.log(`Validation complete. Score: ${finalScore}/100, Passed: ${allPassed}`);

        return NextResponse.json({
            passed: allPassed && finalScore >= 70,
            score: finalScore,
            checks,
            recommendations,
            summary: {
                total: checkCount,
                passed: checks.filter(c => c.passed).length,
                warnings: checks.filter(c => c.severity === "warning").length,
                errors: checks.filter(c => c.severity === "error").length,
            },
        } as ValidationResult & { summary: object });

    } catch (error) {
        console.error("Validation error:", error);
        return NextResponse.json(
            {
                passed: false,
                score: 0,
                checks: [{
                    name: "Validation",
                    passed: false,
                    message: error instanceof Error ? error.message : "Validation failed",
                    severity: "error",
                }],
                recommendations: ["Fix the error and try again"],
            },
            { status: 500 }
        );
    }
}
