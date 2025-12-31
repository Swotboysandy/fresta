"""
AI Faceless Video Generator
Takes a YouTube video, transcribes it, rewrites as story, generates TTS,
adds background music, image overlays, and clean subtitles.
"""

import os
import sys
import json
import subprocess
import uuid
import re
import requests
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "shorts-generator"))

from Components.YoutubeDownloader import download_youtube_video
from Components.Transcription import transcribeAudio

# Find and load .env
from dotenv import load_dotenv
current_dir = Path(__file__).parent
for parent in [current_dir] + list(current_dir.parents):
    env_file = parent / '.env.local'
    if env_file.exists():
        load_dotenv(env_file)
    env_file = parent / '.env'
    if env_file.exists():
        load_dotenv(env_file)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Session ID for unique filenames
session_id = str(uuid.uuid4())[:8]
print(f"Session ID: {session_id}")


def extract_audio(video_path: str, output_path: str) -> str:
    """Extract audio from video using FFmpeg."""
    print(f"Extracting audio from {video_path}...")
    cmd = [
        'ffmpeg', '-y', '-i', video_path,
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
        output_path
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"✓ Audio extracted to {output_path}")
    return output_path


def rewrite_as_story(transcription: str, style: str = "documentary") -> dict:
    """Use Groq to rewrite transcription as engaging story and extract keywords."""
    print(f"[AI] Rewriting transcription as {style} story...")
    
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set")
    
    # Calculate target duration based on transcription length
    word_count = len(transcription.split())
    target_words = min(word_count, 150)  # Keep it concise for shorts
    
    prompt = f"""You are a professional {style} narrator. Rewrite this content as an engaging narration script.

RULES:
1. Keep it between {target_words - 20} to {target_words} words
2. Make it dramatic and engaging
3. Use short, punchy sentences
4. Perfect for text-to-speech narration
5. Write in the same language as the input (Hindi/English)

Also extract 5-8 visual keywords that would make good images.

ORIGINAL CONTENT:
{transcription[:4000]}

Return JSON:
{{
    "narration": "Your rewritten narration here...",
    "keywords": ["keyword1", "keyword2", "keyword3", ...]
}}
"""
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.8,
        "max_tokens": 1500
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    
    result = response.json()
    text = result['choices'][0]['message']['content'].strip()
    
    # Parse JSON from response
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        data = json.loads(json_match.group())
        print(f"✓ Story rewritten ({len(data['narration'].split())} words)")
        print(f"✓ Keywords extracted: {data.get('keywords', [])[:5]}")
        return data
    
    # Fallback
    return {"narration": text, "keywords": []}


def generate_tts(text: str, output_path: str, voice: str = "hi-IN-SwaraNeural") -> str:
    """Generate TTS audio using Edge-TTS."""
    print(f"Generating TTS with voice: {voice}...")
    
    cmd = [
        'edge-tts',
        '--voice', voice,
        '--text', text,
        '--write-media', output_path
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"✓ TTS generated: {output_path}")
    return output_path


def get_audio_duration(audio_path: str) -> float:
    """Get audio duration using FFprobe."""
    cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', audio_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def create_subtitles(narration: str, duration: float, output_path: str):
    """Create SRT subtitles with 3-4 words per line for clean display."""
    print("Creating subtitles...")
    
    words = narration.split()
    words_per_segment = 4  # Less words per screen
    segments = []
    
    for i in range(0, len(words), words_per_segment):
        segment_words = words[i:i + words_per_segment]
        segments.append(' '.join(segment_words))
    
    time_per_segment = duration / len(segments)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(segments):
            start = i * time_per_segment
            end = (i + 1) * time_per_segment
            
            start_h = int(start // 3600)
            start_m = int((start % 3600) // 60)
            start_s = int(start % 60)
            start_ms = int((start % 1) * 1000)
            
            end_h = int(end // 3600)
            end_m = int((end % 3600) // 60)
            end_s = int(end % 60)
            end_ms = int((end % 1) * 1000)
            
            f.write(f"{i + 1}\n")
            f.write(f"{start_h:02d}:{start_m:02d}:{start_s:02d},{start_ms:03d} --> {end_h:02d}:{end_m:02d}:{end_s:02d},{end_ms:03d}\n")
            f.write(f"{segment}\n\n")
    
    print(f"✓ Subtitles created: {output_path}")
    return output_path


def assemble_video(
    video_path: str,
    tts_path: str,
    subtitle_path: str,
    music_path: str,
    output_path: str
):
    """Assemble final video with muted original + TTS + music + subtitles."""
    print("Assembling final video...")
    
    tts_duration = get_audio_duration(tts_path)
    
    # Subtitle style: Clean, small, modern font
    subtitle_style = (
        "FontName=Arial,FontSize=14,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,"
        "Outline=1,Shadow=0,MarginV=30,Alignment=2"
    )
    
    # Build filter complex
    filter_parts = []
    
    # Mute original video and trim to TTS duration
    filter_parts.append(f"[0:v]trim=0:{tts_duration},setpts=PTS-STARTPTS[v]")
    
    if music_path and os.path.exists(music_path):
        # Mix TTS (full volume) with music (low volume)
        filter_parts.append(f"[2:a]volume=0.15,aloop=loop=-1:size=2e+09[music]")
        filter_parts.append(f"[1:a][music]amix=inputs=2:duration=first:dropout_transition=2[a]")
    else:
        filter_parts.append(f"[1:a]acopy[a]")
    
    # Add subtitles
    filter_parts.append(f"[v]subtitles={subtitle_path}:force_style='{subtitle_style}'[vout]")
    
    filter_complex = ";".join(filter_parts)
    
    cmd = ['ffmpeg', '-y']
    cmd += ['-i', video_path]  # Input 0: Video
    cmd += ['-i', tts_path]    # Input 1: TTS audio
    
    if music_path and os.path.exists(music_path):
        cmd += ['-i', music_path]  # Input 2: Music
    
    cmd += ['-filter_complex', filter_complex]
    cmd += ['-map', '[vout]', '-map', '[a]']
    cmd += ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23']
    cmd += ['-c:a', 'aac', '-b:a', '192k']
    cmd += ['-t', str(tts_duration)]
    cmd += [output_path]
    
    subprocess.run(cmd, check=True)
    print(f"✓ Video assembled: {output_path}")
    return output_path


def main():
    # Parse arguments
    if len(sys.argv) < 2:
        url = input("Enter YouTube URL: ")
    else:
        url = sys.argv[1]
    
    style = sys.argv[2] if len(sys.argv) > 2 else "documentary"
    voice = sys.argv[3] if len(sys.argv) > 3 else "hi-IN-SwaraNeural"
    music_mood = sys.argv[4] if len(sys.argv) > 4 else "cinematic"
    
    print(f"\n{'='*60}")
    print(f"AI FACELESS VIDEO GENERATOR")
    print(f"URL: {url}")
    print(f"Style: {style}, Voice: {voice}, Music: {music_mood}")
    print(f"{'='*60}\n")
    
    # Create output directory
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    
    # Step 1: Download video
    print("Step 1/6: Downloading video...")
    video_path = download_youtube_video(url)
    if not video_path:
        print("Error: Failed to download video")
        sys.exit(1)
    video_path = video_path.replace(".webm", ".mp4")
    print(f"✓ Downloaded: {video_path}")
    
    # Step 2: Extract and transcribe
    print("\nStep 2/6: Transcribing audio...")
    audio_path = f"temp_audio_{session_id}.wav"
    extract_audio(video_path, audio_path)
    transcriptions = transcribeAudio(audio_path)
    full_text = " ".join([t[0] for t in transcriptions])
    print(f"✓ Transcribed: {len(full_text.split())} words")
    
    # Step 3: AI rewrite
    print("\nStep 3/6: AI rewriting as story...")
    result = rewrite_as_story(full_text, style)
    narration = result['narration']
    keywords = result.get('keywords', [])
    
    # Step 4: Generate TTS
    print("\nStep 4/6: Generating TTS narration...")
    tts_path = f"tts_{session_id}.mp3"
    generate_tts(narration, tts_path, voice)
    tts_duration = get_audio_duration(tts_path)
    
    # Step 5: Create subtitles
    print("\nStep 5/6: Creating subtitles...")
    subtitle_path = f"subs_{session_id}.srt"
    create_subtitles(narration, tts_duration, subtitle_path)
    
    # Step 6: Assemble video
    print("\nStep 6/6: Assembling final video...")
    # Check for music file
    music_dir = Path(__file__).parent.parent.parent / "public" / "music"
    music_file = music_dir / f"{music_mood}.mp3"
    music_path = str(music_file) if music_file.exists() else None
    
    if not music_path:
        print(f"Note: No music file found for mood '{music_mood}'")
    
    final_output = output_dir / f"faceless_{session_id}.mp4"
    assemble_video(video_path, tts_path, subtitle_path, music_path, str(final_output))
    
    # Cleanup temp files
    for f in [audio_path, tts_path, subtitle_path]:
        if os.path.exists(f):
            os.remove(f)
    
    print(f"\n{'='*60}")
    print(f"SUCCESS: {final_output}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
