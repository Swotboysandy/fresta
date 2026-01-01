"""
AI Faceless Video Generator v2
- Continuous TTS narration (no gaps)
- Quick video cuts (2-3 seconds each)
- Fast-paced, engaging style
"""

import os
import sys
import json
import subprocess
import uuid
import re
import requests
import random
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

session_id = str(uuid.uuid4())[:8]
print(f"Session ID: {session_id}")


def extract_audio(video_path: str, output_path: str) -> str:
    """Extract audio from video using FFmpeg."""
    print("Extracting audio...")
    cmd = [
        'ffmpeg', '-y', '-i', video_path,
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
        output_path
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"✓ Audio extracted")
    return output_path


def get_video_duration(video_path: str) -> float:
    """Get video duration using FFprobe."""
    cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def rewrite_as_story(transcription: str, style: str = "documentary") -> dict:
    """Use Groq to create complete story with looping savage ending."""
    print(f"[AI] Creating complete story with looping ending...")
    
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set")
    
    # For 45 seconds at fast pace: ~110-130 words
    target_words = 120
    
    prompt = f"""You are creating a 45-SECOND viral video narration. CRITICAL: Explain the video SO CLEARLY that anyone listening understands EXACTLY what happened.

RULES:
1. 110-130 words total
2. Same language as input (Hindi/English)
3. Start with SAVAGE HOOK  
4. Middle: COMPLETE EXPLANATION - what happens, who's involved, the outcome
5. End with LOOPING HOOK - question, cliffhanger, or call-to-action that keeps them engaged (NO clear ending!)

SAVAGE OPENING HOOKS:
- "Kya dekh rahe ho? Kaam nahi hai? Sun..."
- "Arrey ruko! Ye video skip mat karna..."
- "Wait - you NEED to hear this..."

LOOPING ENDINGS (never say "the end" or "that's it"):
- "Aur tumhe kya lagta hai? Comment mein batao..."
- "Wait, part 2 chahiye? Like karo..."
- "Iska twist toh aage hai... swipe up..."
- "You won't believe what happened next..."

PERFECT EXAMPLE:
"Kya dekh rahe ho? Phone rakh. Ye ek gameshow hai - 100 pilots compete kar rahe hain ek private jet ke liye worth 50 crore. Pehle round mein blindfolded cockpit simulation karna hai. Ek galti, eliminated. Phir endurance test - khade raho haath upar karke. Neeche kiya toh out. Log pagal hone lage, kuch rote huye chhod gaye. Last mein bas 3 log bache. Final challenge? Vo sabse insane tha. Comment mein guess karo kya tha challenge?"

VIDEO TO EXPLAIN:
{transcription[:5000]}

Return JSON:
{{
    "hook": "Opening savage hook",
    "narration": "Complete 110-130 word story with CLEAR explanation + looping ending",
    "sentences": ["Hook.", "Setup explained.", "What happens.", "The action.", "Twist/Result.", "Looping ending.", ...]
}}

Sentences: 8-15 words each.
"""
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.85,
        "max_tokens": 2500
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    
    result = response.json()
    text = result['choices'][0]['message']['content'].strip()
    
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        data = json.loads(json_match.group())
        sentences = data.get('sentences', [])
        if not sentences:
            narration = data.get('narration', text)
            # Split on sentence endings but keep longer segments
            sentences = [s.strip() for s in re.split(r'(?<=[.!?।])\s+', narration) if s.strip() and len(s.strip()) > 5]
        print(f"✓ Created narrative with {len(sentences)} segments")
        return {"narration": data.get('narration', ''), "sentences": sentences}
    
    return {"narration": text, "sentences": [text]}


def generate_tts(text: str, output_path: str, voice: str = "hi-IN-SwaraNeural") -> str:
    """Generate TTS with fast rate and remove silence gaps."""
    print(f"Generating TTS (fast, zero gaps)...")
    
    # Generate TTS first to a temp file
    temp_tts = f"temp_tts_{session_id}.mp3"
    
    cmd = [
        'edge-tts',
        '--voice', voice,
        '--rate', '+25%',  # Even faster
        '--pitch', '+5Hz',
        '--text', text,
        '--write-media', temp_tts
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    
    # Remove silence gaps using FFmpeg
    print("Removing audio gaps...")
    silence_cmd = [
        'ffmpeg', '-y', '-i', temp_tts,
        '-af', 'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB,silenceremove=stop_periods=-1:stop_duration=0.1:stop_threshold=-50dB',
        output_path
    ]
    subprocess.run(silence_cmd, capture_output=True, check=True)
    
    # Cleanup temp
    if os.path.exists(temp_tts):
        os.remove(temp_tts)
    
    print(f"✓ TTS generated (zero gaps)")
    return output_path


def get_audio_duration(audio_path: str) -> float:
    """Get audio duration."""
    cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', audio_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def create_video_cuts(video_path: str, duration: float, num_cuts: int, output_dir: str) -> list:
    """Cut video into short clips (2-3 seconds each) for visual variety."""
    print(f"Creating {num_cuts} video cuts...")
    
    video_duration = get_video_duration(video_path)
    clip_duration = duration / num_cuts
    
    # Generate random start times spread across video
    available_duration = video_duration - clip_duration - 1
    if available_duration < 0:
        available_duration = video_duration / 2
    
    cuts = []
    for i in range(num_cuts):
        # Spread cuts across video duration
        segment_size = available_duration / num_cuts
        start_time = (i * segment_size) + random.uniform(0, segment_size * 0.5)
        start_time = max(0, min(start_time, video_duration - clip_duration))
        
        output_path = os.path.join(output_dir, f"cut_{session_id}_{i:03d}.mp4")
        
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),
            '-i', video_path,
            '-t', str(clip_duration),
            # Slight zoom: scale to 1280 width then crop to 1080, leaves smaller black bars
            '-vf', 'scale=1280:-2,crop=1080:ih:(iw-1080)/2:0,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
            '-an',  # No audio
            output_path
        ]
        
        subprocess.run(cmd, capture_output=True, check=True)
        cuts.append(output_path)
    
    print(f"✓ Created {len(cuts)} video cuts")
    return cuts


def create_subtitles(sentences: list, duration: float, output_path: str):
    """Create SRT subtitles synced by word count."""
    print("Creating word-synced subtitles...")
    
    # Calculate total words for better sync
    all_words = []
    for sentence in sentences:
        all_words.extend(sentence.split())
    
    total_words = len(all_words)
    if total_words == 0:
        total_words = 1
    
    # Words per second (fast speech ~3-4 words/sec)
    words_per_sec = total_words / duration
    
    counter = 1
    current_time = 0
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for sentence in sentences:
            words = sentence.split()
            if not words:
                continue
            
            # Time for this sentence based on word count
            sentence_duration = len(words) / words_per_sec
            
            # Show 3-4 words at a time
            for j in range(0, len(words), 3):
                chunk_words = words[j:j+3]
                chunk = ' '.join(chunk_words)
                chunk_duration = len(chunk_words) / words_per_sec
                
                start = current_time
                end = current_time + chunk_duration
                
                f.write(f"{counter}\n")
                f.write(f"{format_time(start)} --> {format_time(end)}\n")
                f.write(f"{chunk}\n\n")
                
                counter += 1
                current_time = end
    
    print(f"✓ Subtitles synced ({counter-1} segments)")
    return output_path


def format_time(seconds: float) -> str:
    """Format seconds to SRT time format."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def concatenate_clips(clips: list, output_path: str):
    """Concatenate video clips."""
    print("Concatenating video clips...")
    
    # Create concat file
    concat_file = f"concat_{session_id}.txt"
    with open(concat_file, 'w') as f:
        for clip in clips:
            f.write(f"file '{clip}'\n")
    
    cmd = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
        '-i', concat_file,
        '-c:v', 'libx264', '-preset', 'fast',
        output_path
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    os.remove(concat_file)
    print(f"✓ Clips concatenated")
    return output_path


def assemble_final_video(
    video_path: str,
    tts_path: str,
    subtitle_path: str,
    music_path: str,
    output_path: str
):
    """Final assembly: video + TTS + music + subtitles."""
    print("Assembling final video...")
    
    subtitle_style = (
        "FontName=Arial,FontSize=16,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,"
        "Outline=2,Shadow=0,MarginV=40,Alignment=2,Bold=1"
    )
    
    # Copy subtitle to simple filename in temp dir to avoid path escaping issues
    import shutil
    temp_sub = f"subs_{session_id}_temp.srt"
    shutil.copy(subtitle_path, temp_sub)
    
    filter_parts = []
    
    # Video pass-through
    filter_parts.append("[0:v]copy[v]")
    
    if music_path and os.path.exists(music_path):
        # Mix TTS with background music (low volume)
        filter_parts.append("[2:a]volume=0.12,aloop=loop=-1:size=2e+09[music]")
        filter_parts.append("[1:a][music]amix=inputs=2:duration=first:dropout_transition=2[a]")
    else:
        filter_parts.append("[1:a]acopy[a]")
    
    # Use simple relative filename for subtitles (avoids path issues)
    filter_parts.append(f"[v]subtitles={temp_sub}:force_style='{subtitle_style}'[vout]")
    
    filter_complex = ";".join(filter_parts)
    
    cmd = ['ffmpeg', '-y']
    cmd += ['-i', video_path]
    cmd += ['-i', tts_path]
    
    if music_path and os.path.exists(music_path):
        cmd += ['-i', music_path]
    
    cmd += ['-filter_complex', filter_complex]
    cmd += ['-map', '[vout]', '-map', '[a]']
    cmd += ['-c:v', 'libx264', '-preset', 'fast', '-crf', '22']
    cmd += ['-c:a', 'aac', '-b:a', '192k']
    cmd += ['-shortest']
    cmd += [output_path]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"✓ Video assembled")
    finally:
        # Cleanup temp subtitle
        if os.path.exists(temp_sub):
            os.remove(temp_sub)
    
    return output_path


def main():
    if len(sys.argv) < 2:
        url = input("Enter YouTube URL: ")
    else:
        url = sys.argv[1]
    
    style = sys.argv[2] if len(sys.argv) > 2 else "documentary"
    voice = sys.argv[3] if len(sys.argv) > 3 else "hi-IN-SwaraNeural"
    music_mood = sys.argv[4] if len(sys.argv) > 4 else "cinematic"
    
    print(f"\n{'='*60}")
    print(f"AI FACELESS VIDEO GENERATOR v2")
    print(f"Fast-paced, no gaps, quick cuts")
    print(f"{'='*60}\n")
    
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    temp_dir = Path(__file__).parent / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    # Step 1: Download
    print("Step 1/6: Downloading video...")
    video_path = download_youtube_video(url)
    if not video_path:
        print("Error: Failed to download")
        sys.exit(1)
    video_path = video_path.replace(".webm", ".mp4")
    print(f"✓ Downloaded")
    
    # Step 2: Transcribe
    print("\nStep 2/6: Transcribing...")
    audio_path = str(temp_dir / f"audio_{session_id}.wav")
    extract_audio(video_path, audio_path)
    transcriptions = transcribeAudio(audio_path)
    full_text = " ".join([t[0] for t in transcriptions])
    print(f"✓ Transcribed: {len(full_text.split())} words")
    
    # Step 3: AI rewrite
    print("\nStep 3/6: AI creating fast-paced narration...")
    result = rewrite_as_story(full_text, style)
    sentences = result['sentences']
    narration = ' '.join(sentences)
    
    # Step 4: Generate TTS
    print("\nStep 4/6: Generating TTS...")
    tts_path = str(temp_dir / f"tts_{session_id}.mp3")
    generate_tts(narration, tts_path, voice)
    tts_duration = get_audio_duration(tts_path)
    
    # Step 5: Create video cuts
    print("\nStep 5/6: Creating quick video cuts...")
    num_cuts = max(len(sentences), int(tts_duration / 2.5))  # ~2.5 sec per cut
    cuts = create_video_cuts(video_path, tts_duration, num_cuts, str(temp_dir))
    
    # Concatenate cuts
    concat_video = str(temp_dir / f"concat_{session_id}.mp4")
    concatenate_clips(cuts, concat_video)
    
    # Create subtitles
    subtitle_path = str(temp_dir / f"subs_{session_id}.srt")
    create_subtitles(sentences, tts_duration, subtitle_path)
    
    # Step 6: Final assembly
    print("\nStep 6/6: Final assembly...")
    music_dir = Path(__file__).parent.parent.parent / "public" / "music"
    music_file = music_dir / f"{music_mood}.mp3"
    music_path = str(music_file) if music_file.exists() else None
    
    final_output = output_dir / f"faceless_{session_id}.mp4"
    assemble_final_video(concat_video, tts_path, subtitle_path, music_path, str(final_output))
    
    # Cleanup
    print("\nCleaning up temp files...")
    for f in [audio_path, tts_path, subtitle_path, concat_video] + cuts:
        if os.path.exists(f):
            try:
                os.remove(f)
            except:
                pass
    
    print(f"\n{'='*60}")
    print(f"SUCCESS: {final_output}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
