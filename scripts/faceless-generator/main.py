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
import math
import struct
import wave
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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODELS = ["gemini-pro-vision", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest"]

# session_id will be set per-request in main() or generate_faceless_video()
session_id = None


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


def extract_key_frames(video_path: str, output_dir: str, interval: float = 5.0) -> list:
    """Extract key frames from video at regular intervals."""
    print(f"Extracting key frames (every {interval}s)...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Get video duration
    duration = get_video_duration(video_path)
    num_frames = min(int(duration / interval), 10)  # Max 10 frames
    
    frame_paths = []
    for i in range(num_frames):
        timestamp = i * interval + 1  # Start at 1 second
        output_path = os.path.join(output_dir, f"frame_{i:02d}.jpg")
        
        cmd = [
            'ffmpeg', '-y', '-ss', str(timestamp),
            '-i', video_path,
            '-vframes', '1',
            '-q:v', '2',  # High quality JPEG
            output_path
        ]
        subprocess.run(cmd, capture_output=True)
        
        if os.path.exists(output_path):
            frame_paths.append(output_path)
    
    print(f"✓ Extracted {len(frame_paths)} key frames")
    return frame_paths


ai_consecutive_failures = 0
MAX_AI_FAILURES = 3

def _gemini_request(payload: dict) -> str:
    """Send request to Gemini API with model fallback and circuit breaker."""
    global ai_consecutive_failures
    
    if ai_consecutive_failures >= MAX_AI_FAILURES:
        return ""
        
    for model in GEMINI_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            response = requests.post(url, json=payload, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                ai_consecutive_failures = 0  # Reset on success
                return result['candidates'][0]['content']['parts'][0]['text']
            
            print(f"  ⚠️ {model} failed with {response.status_code}: {response.text[:200]}")
            
        except Exception as e:
            print(f"  ⚠️ {model} error: {e}")
            continue
            
    print("❌ All Gemini models failed.")
    ai_consecutive_failures += 1
    if ai_consecutive_failures >= MAX_AI_FAILURES:
        print("⛔ AI Circuit Breaker tripped. Stopping further AI requests for this session.")
        
    return ""


def analyze_frames_with_gemini(frame_paths: list) -> str:
    """Use Gemini Vision to analyze video frames and describe what's happening."""
    print(f"Analyzing {len(frame_paths)} frames with Gemini Vision...")
    
    if not GEMINI_API_KEY:
        print("⚠️ No Gemini API key, skipping vision analysis")
        return ""
    
    import base64
    
    # Prepare images for API
    image_parts = []
    for i, frame_path in enumerate(frame_paths[:6]):  # Max 6 frames to stay under limits
        with open(frame_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        image_parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": image_data
            }
        })
    
    # Build request
    prompt = """Analyze these video frames in sequence and describe:
1. WHO is in the video (person, streamer, athlete, etc.)
2. WHAT they are doing (actions, activities)
3. WHERE this is happening (location, setting)
4. WHAT'S the mood/energy (tense, exciting, funny, emotional)
5. Any KEY MOMENTS or dramatic events

Be specific and visual. Write 3-4 sentences describing the scene progression.
Focus on what would make this video interesting to viewers."""

    parts = image_parts + [{"text": prompt}]
    
    payload = {
        "contents": [{
            "parts": parts
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 500
        }
    }
    
    result_text = _gemini_request(payload)
    if result_text:
        print(f"✓ Vision analysis complete")
        return result_text.strip()
    return ""


def score_frame_interest(frame_path: str, timestamp: float) -> dict:
    """Use Gemini Vision to score a single frame's viral/interest potential."""
    if not GEMINI_API_KEY:
        return {"timestamp": timestamp, "score": 5, "reason": "No API key"}
    
    import base64
    
    with open(frame_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')
    
    prompt = """You are a viral content detector. Rate this video frame's VIRAL POTENTIAL for a YouTube Short.

SCORING CRITERIA (be strict!):

🔥 SCORE 9-10 (Viral Gold):
- Face showing EXTREME emotion (wide eyes, jaw dropped, laughing hard)
- Peak action moment (goal scored, trick landed, epic fail mid-air)
- Dramatic reveal happening
- "OMG" reaction visible

⭐ SCORE 7-8 (Interesting):
- Clear emotional reaction visible
- Active discussion/debate (hands gesturing, leaning forward)
- Something unexpected happening
- Good energy in the frame

😐 SCORE 4-6 (Average):
- Person talking normally
- Standard interview setup
- No strong emotion visible

💤 SCORE 1-3 (Boring):
- Empty scene, B-roll
- Person looking away/distracted
- Nothing happening

PRIORITIZE frames with:
1. Visible FACES showing emotion
2. Physical reactions (fist pump, head in hands)
3. Multiple people reacting together
4. Meme-worthy expressions

Return ONLY valid JSON: {"score": 7, "reason": "Host laughing at joke"}"""

    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": image_data}},
                {"text": prompt}
            ]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 100
        }
    }
    
    text = _gemini_request(payload)
    
    if not text:
        return {"timestamp": timestamp, "score": 5, "reason": "AI Error"}

    try:
        # Parse JSON from response
        import json
        # Clean up response text
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        
        data = json.loads(text)
        return {
            "timestamp": timestamp,
            "score": data.get("score", 5),
            "reason": data.get("reason", "Unknown")
        }
        
    except Exception as e:
        return {"timestamp": timestamp, "score": 5, "reason": f"Error: {str(e)[:50]}"}


def find_clips_by_audio_energy(video_path: str, num_clips: int = 3, clip_duration: int = 30) -> list:
    """Find best clips based on audio energy (loudness/excitement)."""
    print("🔊 Finding clips by Audio Energy (Fallback Mode)...")
    
    # Extract audio to linear PCM WAV
    temp_wav = f"temp_energy_analysis_{session_id}.wav"
    try:
        cmd = [
            'ffmpeg', '-y', '-i', video_path,
            '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
            temp_wav
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        
        with wave.open(temp_wav, 'rb') as wf:
            framerate = wf.getframerate()
            nframes = wf.getnframes()
            duration = nframes / framerate
            
            chunk_size_sec = 0.5
            chunk_stride = framerate // 2
            
            energy_map = []
            
            # Read full audio (memory safe for <1h videos)
            raw_data = wf.readframes(nframes)
            # Use struct to unpack progressively
            total_samples = len(raw_data) // 2
            
            step = int(framerate) # 1 sec steps
            
            for i in range(0, total_samples - step, step):
                # Analyze linear chunks
                chunk_bytes = raw_data[i*2 : (i+step)*2]
                samples = struct.unpack(f"<{len(chunk_bytes)//2}h", chunk_bytes)
                if not samples: continue
                
                rms = math.sqrt(sum(s*s for s in samples) / len(samples))
                timestamp = i / framerate
                energy_map.append({'time': timestamp, 'energy': rms})
                
        # Sliding window average
        window_scores = []
        for i in range(len(energy_map) - clip_duration):
            window = energy_map[i : i+clip_duration]
            avg_energy = sum(e['energy'] for e in window) / len(window)
            window_scores.append({
                'timestamp': window[0]['time'],
                'score': avg_energy,
                'reason': "High Audio Energy"
            })
            
        # Sort and select non-overlapping
        window_scores.sort(key=lambda x: x['score'], reverse=True)
        
        selected = []
        for cand in window_scores:
            # Scaled score 1-10 for compatibility
            cand['score'] = 7  # Fallback score
            
            overlap = False
            for s in selected:
                if abs(cand['timestamp'] - s['timestamp']) < clip_duration:
                    overlap = True
                    break
            if not overlap:
                selected.append(cand)
                if len(selected) >= num_clips:
                    break
        
        print(f"✓ Found {len(selected)} clips using audio energy")
        return selected

    except Exception as e:
        print(f"Audio analysis failed: {e}")
        return []
        
    finally:
        if os.path.exists(temp_wav):
            os.remove(temp_wav)


def find_best_clips(video_path: str, num_clips: int = 3, clip_duration: int = 30) -> list:
    """Analyze a long video and find the best moments for clips.
    
    Returns list of timestamps where the most interesting moments are.
    """
    print(f"\n{'='*60}")
    print("AI CLIP FINDER - Finding best moments...")
    print(f"{'='*60}")
    
    video_duration = get_video_duration(video_path)
    print(f"Video duration: {video_duration:.1f}s")
    
    # Sample frames throughout the video
    # For longer videos, sample every 15-30 seconds
    if video_duration > 600:  # > 10 mins
        sample_interval = 30
    elif video_duration > 300:  # > 5 mins
        sample_interval = 20
    else:
        sample_interval = 15
    
    num_samples = min(int(video_duration / sample_interval), 30)  # Max 30 samples
    print(f"Sampling {num_samples} frames (every {sample_interval}s)...")
    
    # Create temp dir for frames
    frames_dir = f"clip_finder_frames_{session_id}"
    os.makedirs(frames_dir, exist_ok=True)
    
    scores = []
    
    for i in range(num_samples):
        timestamp = (i + 0.5) * sample_interval  # Center of each segment
        if timestamp >= video_duration - clip_duration:
            break
            
        frame_path = os.path.join(frames_dir, f"frame_{i:03d}.jpg")
        
        # Extract frame
        cmd = [
            'ffmpeg', '-y', '-ss', str(timestamp),
            '-i', video_path, '-vframes', '1', '-q:v', '2',
            frame_path
        ]
        subprocess.run(cmd, capture_output=True)
        
        if os.path.exists(frame_path):
            # Score the frame
            print(f"  Analyzing frame at {timestamp:.1f}s...", end=" ")
            score_data = score_frame_interest(frame_path, timestamp)
            scores.append(score_data)
            print(f"Score: {score_data['score']}/10 - {score_data['reason'][:40]}")
            
            # Cleanup frame
            os.remove(frame_path)
    
    # Cleanup
    try:
        os.rmdir(frames_dir)
    except:
        pass
    
    # Filter out AI errors
    valid_scores = [s for s in scores if s['reason'] != "AI Error" and not s['reason'].startswith("Error")]
    
    # Sort by score (highest first)
    valid_scores.sort(key=lambda x: x['score'], reverse=True)
    
    # Select top clips, ensuring they don't overlap
    selected_clips = []
    for score_data in valid_scores:
        timestamp = score_data['timestamp']
        
        # Check if this overlaps with any selected clip
        overlaps = False
        for selected in selected_clips:
            if abs(timestamp - selected['timestamp']) < clip_duration * 1.5:
                overlaps = True
                break
        
        if not overlaps:
            selected_clips.append(score_data)
            if len(selected_clips) >= num_clips:
                break
                
    # FALLBACK: If AI didn't find enough clips, use Audio Energy
    if len(selected_clips) < num_clips:
        print(f"\n⚠️ AI only found {len(selected_clips)} valid clips. Switching to Audio analysis for remainder...")
        needed = num_clips - len(selected_clips)
        audio_clips = find_clips_by_audio_energy(video_path, needed, clip_duration)
        
        # Add non-overlapping audio clips
        for a_clip in audio_clips:
            overlaps = False
            for selected in selected_clips:
                if abs(a_clip['timestamp'] - selected['timestamp']) < clip_duration:
                    overlaps = True
                    break
            if not overlaps:
                selected_clips.append(a_clip)
                if len(selected_clips) >= num_clips:
                    break
    
    print(f"\n✓ Found {len(selected_clips)} best moments:")
    for i, clip in enumerate(selected_clips):
        print(f"  {i+1}. At {clip['timestamp']:.1f}s - Score {clip['score']}/10: {clip['reason']}")
    
    return selected_clips

def download_youtube_subtitles(url: str) -> str:
    """Download YouTube subtitles/captions directly."""
    print(f"Downloading YouTube subtitles for: {url}")
    
    # Clean up any old subtitle files first
    import glob
    for old_file in glob.glob('temp_subs_*.vtt'):
        try:
            os.remove(old_file)
            print(f"  Cleaned up old file: {old_file}")
        except:
            pass
    
    try:
        # Use unique timestamp to avoid any caching
        unique_id = str(uuid.uuid4())[:8]
        
        # Try to get auto-generated or manual subtitles
        cmd = [
            'yt-dlp',
            '--skip-download',
            '--write-auto-sub',
            '--write-sub',
            '--sub-lang', 'en',
            '--sub-format', 'vtt',
            '--output', f'temp_subs_{unique_id}',
            url
        ]
        
        print(f"  Running yt-dlp for subtitles...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Find the subtitle file
        subtitle_files = glob.glob(f'temp_subs_{unique_id}*.vtt')
        
        if subtitle_files:
            subtitle_file = subtitle_files[0]
            
            # Parse VTT file to extract text
            with open(subtitle_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract text from VTT (remove timestamps and formatting)
            lines = content.split('\n')
            text_lines = []
            for line in lines:
                line = line.strip()
                # Skip WEBVTT header, timestamps, and empty lines
                if line and not line.startswith('WEBVTT') and not '-->' in line and not line.isdigit():
                    # Remove VTT tags like <c>
                    line = re.sub(r'<[^>]+>', '', line)
                    text_lines.append(line)
            
            full_text = ' '.join(text_lines)
            
            # Cleanup
            os.remove(subtitle_file)
            
            print(f"✓ Subtitles downloaded: {len(full_text.split())} words")
            return full_text
        else:
            print("⚠️ No subtitles found, falling back to audio transcription")
            return None
            
    except Exception as e:
        print(f"⚠️ Subtitle download failed: {e}")
        return None


def rewrite_as_story(transcription: str, style: str = "documentary", language: str = "english", target_duration: int = 30, vision_context: str = "") -> dict:
    """Use Groq to create complete story combining subtitles + visual context."""
    print(f"[AI] Creating {target_duration}s story (Language: {language})...")
    
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set")
    
    # Language instruction
    if language.lower() in ['hindi', 'hi', 'in']:
        lang_instruction = "Conversational Hindi (Hinglish is okay for impact words)"
    else:
        lang_instruction = "Simple Spoken English"
    
    # ===== TTS AUDIO LENGTH MATH =====
    # Normal speech: ~2.5 words/second
    # Edge TTS at +30% speed: ~3.2 words/second
    # 
    # Target durations:
    #   20s = 64 words  (20 × 3.2)
    #   25s = 80 words  (25 × 3.2)
    #   30s = 96 words  (30 × 3.2)
    #   35s = 112 words (35 × 3.2)
    #   60s = 192 words (60 × 3.2)
    #
    # We subtract ~5% for pauses/transitions
    WORDS_PER_SECOND = 3.2
    PAUSE_BUFFER = 0.95  # 5% buffer for natural pauses
    
    target_words = int(target_duration * WORDS_PER_SECOND * PAUSE_BUFFER)
    
    # Ensure minimum/maximum bounds
    target_words = max(50, min(target_words, 250))
    
    estimated_audio_length = target_words / WORDS_PER_SECOND
    print(f"[AI] Target: {target_words} words → ~{estimated_audio_length:.1f}s audio at +30% speed")
    
    # Build context combining subtitles and vision
    context_parts = []
    
    if vision_context:
        context_parts.append(f"""VISUAL SCENE ANALYSIS (What's happening in the video):
{vision_context}""")
    
    if transcription:
        context_parts.append(f"""DIALOGUE/SUBTITLES (What's being said):
{transcription[:5000]}""")
    
    combined_context = "\n\n".join(context_parts)
    
    prompt = f"""You are a master storyteller for YouTube Shorts. Your goal: AUTHENTIC ENGAGEMENT.
    
TASK: Write a script that explains this video to a friend. Make it sound human, not like an ad or a hype machine.

CRITICAL WORD LIMIT: EXACTLY {target_words} words.
TARGET DURATION: {target_duration} seconds.

═══════════════════════════════════════════════════════════════
VIDEO CONTEXT:
═══════════════════════════════════════════════════════════════
{combined_context}

═══════════════════════════════════════════════════════════════
STYLE GUIDE (NATURAL & ENGAGING):
═══════════════════════════════════════════════════════════════
✓ ONE GOAL: Explain what's actually happening and why it's interesting.
✓ TONE: Casual, observational, slightly witty. Like you're watching it with the viewer.
✓ POV: Third person ("Look at this guy", "She really just did that").
✓ PACING: Fast but rhythmic. Short sentences mixed with medium ones.
✓ CONTENT: Focus on the specific details in the video (visuals/dialogue). Don't make up vague "stakes".

═══════════════════════════════════════════════════════════════
⛔ BANNED (INSTANT FAIL IF USED):
═══════════════════════════════════════════════════════════════
❌ "Wait for the end" / "Watch until the end" (Viewer annoyance #1)
❌ "You won't believe this" / "What happens next is shocking" (Generic clickbait)
❌ "In this video..." / "Today we are looking at..." (Boring intros)
❌ "Make sure to like and subscribe" (Desperate)
❌ "Literally" / "Actually" (Overused fillers)
❌ Robot Transitions: "Moreover", "Furthermore", "However", "In conclusion"
❌ Fake Questions: "Have you ever wondered...?" (Just say the interesting thing)

═══════════════════════════════════════════════════════════════
GOOD VS BAD:
═══════════════════════════════════════════════════════════════
BAD (Hype/Fake): "This is the most dangerous stunt ever! One slip and he's gone forever!"
GOOD (Natural): "He's balancing on a two-inch rail with no safety gear. Look at how shaky his legs are."

BAD (Generic): "The ending will shock you!"
GOOD (Specific): "I didn't expect the security guard to join in."

HTE HOOK (First 3-5 words):
- Jump straight into the action.
- No "This guy is..." setup if possible.
- E.g., "He just bet his entire savings on one round."

═══════════════════════════════════════════════════════════════
STRUCTURE:

═══════════════════════════════════════════════════════════════
[0-3s] THE HOOK (Direct Observation)
→ State the most interesting thing happening right now.
→ Example: "He really just tried to jump that gap with zero momentum."
→ NOT: "This is the most dangerous jump ever attempted."

[3-10s] THE CONTEXT (The "Why")
→ Quickly explain what led to this moment.
→ Example: "He's been practicing this level for six hours straight."

[10-20s] THE REACTION (The "What")
→ Describe the action and the reaction (facial expressions, crowd).
→ Example: "Look at his face when he realizes he's short. Pure panic."

[End] THE PAYOFF (Satisfying Conclusion)
→ Wrap it up with a final thought or witty remark.
→ Example: "That controller is definitely broken now."
→ NOT: "Subscribe for part 2!"

═══════════════════════════════════════════════════════════════
QUALITY CHECK (Before submitting):
═══════════════════════════════════════════════════════════════
1. Does it sound like a human conversation? If robotic → FAIL.
2. Did I use any banned phrases ("Wait for end")? → FAIL.
3. Is the ending satisfying? (Don't just cut off).
4. Is the tone appropriate for the visual action?
5. Count words. Are we close to {target_words}?
6. Am I narrating the visual, or just making things up? (Stick to the visual).
7. Did I explain WHY this moment is significant?

═══════════════════════════════════════════════════════════════
OUTPUT (JSON only):
═══════════════════════════════════════════════════════════════
{{
    "hook": "The opening line (Direct observation)",
    "sentences": ["Sentence 1", "Sentence 2", ...],
    "narration": "Full script as one paragraph",
    "word_count": actual_count,
    "tone_check": "Natural/Conversational"
}}

REMEMBER: 
- Diary entry = boring. Movie trailer = viral.
- "I'm nervous" = skip. "This guy had no idea what he just started" = gold.
- If it doesn't make them say "wait, what?" → it's not good enough.
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
        try:
            data = json.loads(json_match.group())
            sentences = data.get('sentences', [])
            if not sentences:
                narration = data.get('narration', text)
                # Split on sentence endings but keep longer segments
                sentences = [s.strip() for s in re.split(r'(?<=[.!?।])\s+', narration) if s.strip() and len(s.strip()) > 5]
            print(f"✓ Created narrative with {len(sentences)} segments")
            return {"narration": data.get('narration', ''), "sentences": sentences}
        except json.JSONDecodeError:
            print("⚠️ Failed to parse JSON from AI, using fallback text processing")
            pass
    
    # Fallback if no JSON found or parsing failed
    sentences = [s.strip() for s in re.split(r'(?<=[.!?|])\s+', text) if s.strip() and len(s.strip()) > 10]
    return {"narration": text, "sentences": sentences}


def generate_video_metadata(original_title: str, narration: str, language: str = "english") -> dict:
    """Generate viral title, tags, and description for the video."""
    print(f"[AI] Generating metadata for: {original_title[:50]}...")
    
    if not GROQ_API_KEY:
        # Fallback if no API key
        return {
            "title": original_title[:50] + " #shorts",
            "description": narration[:150] + "...",
            "tags": ["shorts", "viral", "trending"]
        }
    
    prompt = f"""Generate YouTube Shorts metadata based on this video.

ORIGINAL VIDEO TITLE: {original_title}
NARRATION SCRIPT: {narration[:500]}
LANGUAGE: {language}

Create:
1. TITLE: Viral, clickbait-style title (max 60 chars, include emoji)
   - Use curiosity gaps
   - Numbers work well
   - Questions hook viewers
   
2. DESCRIPTION: Short engaging description (2-3 lines)
   - First line = hook
   - Include call to action
   - Keep it punchy

3. TAGS: 10 relevant hashtags for Shorts

Return JSON only:
{{
    "title": "Viral title with emoji 🔥",
    "description": "Engaging description\\n\\nFollow for more!",
    "tags": ["shorts", "viral", "trending", ...]
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
        "temperature": 0.9,
        "max_tokens": 500
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        text = result['choices'][0]['message']['content'].strip()
        
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            print(f"✓ Generated title: {data.get('title', '')[:50]}...")
            return data
    except Exception as e:
        print(f"⚠️ Metadata generation failed: {e}")
    
    # Fallback
    return {
        "title": original_title[:50] + " #shorts",
        "description": narration[:150] + "...\n\nFollow for more!",
        "tags": ["shorts", "viral", "trending"]
    }


def generate_tts_with_timestamps(sentences: list, output_path: str, voice: str = "hi-IN-SwaraNeural") -> tuple:
    """Generate TTS sentence-by-sentence and track exact timestamps.
    Returns: (final_audio_path, list of (sentence, start_time, end_time, duration))
    """
    print(f"Generating TTS with real timestamps... (Voice: {voice})")
    
    sentence_audio_files = []
    sentence_timestamps = []
    current_time = 0.0
    
    for i, sentence in enumerate(sentences):
        if not sentence.strip():
            continue
            
        print(f"  [{i+1}/{len(sentences)}] Generating: {sentence[:50]}...")
        
        # Check for Google Voice
        if voice.startswith("google:"):
            print(f"Attempting Google TTS...")
            try:
                google_voice_name = voice.split(":", 1)[1]
                api_key = os.getenv("GOOGLE_TTS_API_KEY") 
                if not api_key:
                    api_key = os.getenv("GEMINI_API_KEY")
                
                if not api_key:
                    raise Exception("Missing GOOGLE_TTS_API_KEY in .env")
                
                temp_file = f"temp_tts_sentence_{session_id}_{i}.mp3"
                url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
                data = {
                    "input": {"text": sentence},
                    "voice": {"languageCode": "en-US", "name": google_voice_name},
                    "audioConfig": {
                        "audioEncoding": "MP3",
                        "speakingRate": 1.2,
                        "pitch": 0.0
                    }
                }
                
                response = requests.post(url, json=data)
                if response.status_code == 200:
                    import base64
                    audio_content = response.json().get("audioContent")
                    if audio_content:
                        with open(temp_file, "wb") as f:
                            f.write(base64.b64decode(audio_content))
                    else:
                        raise Exception("No audio content")
                else:
                    raise Exception(f"Google TTS failed: {response.status_code}")
                    
            except Exception as e:
                print(f"⚠️ Google TTS failed: {e}, falling back to Edge TTS")
                voice = "en-US-GuyNeural" if "Male" in voice else "en-US-JennyNeural"
                temp_file = f"temp_tts_sentence_{session_id}_{i}.mp3"
                
                cmd = [
                    'edge-tts',
                    '--voice', voice,
                    '--rate', '+30%',
                    '--pitch', '+0Hz',
                    '--text', sentence,
                    '--write-media', temp_file
                ]
                subprocess.run(cmd, capture_output=True, check=True)
        else:
            # Edge TTS
            temp_file = f"temp_tts_sentence_{session_id}_{i}.mp3"
            cmd = [
                'edge-tts',
                '--voice', voice,
                '--rate', '+30%',
                '--pitch', '+0Hz',
                '--text', sentence,
                '--write-media', temp_file
            ]
            subprocess.run(cmd, capture_output=True, check=True)
        
        # Get exact duration using ffprobe
        duration = get_audio_duration(temp_file)
        
        # Record timestamp
        start_time = current_time
        end_time = current_time + duration
        sentence_timestamps.append({
            'sentence': sentence,
            'start': start_time,
            'end': end_time,
            'duration': duration,
            'index': i
        })
        
        sentence_audio_files.append(temp_file)
        current_time = end_time
    
    # Concatenate all audio files
    print(f"Concatenating {len(sentence_audio_files)} audio segments...")
    concat_list = f"concat_audio_{session_id}.txt"
    with open(concat_list, 'w') as f:
        for audio_file in sentence_audio_files:
            f.write(f"file '{audio_file}'\n")
    
    cmd = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
        '-i', concat_list,
        '-c', 'copy',
        output_path
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    
    # Cleanup
    os.remove(concat_list)
    for audio_file in sentence_audio_files:
        if os.path.exists(audio_file):
            os.remove(audio_file)
    
    total_duration = current_time
    print(f"✓ TTS generated: {total_duration:.1f}s with {len(sentence_timestamps)} segments")
    
    return output_path, sentence_timestamps


def generate_tts(text: str, output_path: str, voice: str = "hi-IN-SwaraNeural") -> str:
    """Generate TTS with fast rate and remove silence gaps."""
    print(f"Generating TTS audio... (Voice: {voice})")
    
    # Check for Google Voice
    if voice.startswith("google:"):
        print(f"Attempting Google TTS...")
        try:
            google_voice_name = voice.split(":", 1)[1] # e.g. en-US-Journey-F
            api_key = os.getenv("GOOGLE_TTS_API_KEY") 
            if not api_key:
                 api_key = os.getenv("GEMINI_API_KEY") # Fallback
            
            if not api_key:
                raise Exception("Missing GOOGLE_TTS_API_KEY in .env")
            
            # We write to output_path directly for Google
            url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
            data = {
                "input": {"text": text},
                "voice": {"languageCode": "en-US", "name": google_voice_name},
                "audioConfig": {
                    "audioEncoding": "MP3",
                    "speakingRate": 1.25, # Fast pace
                    "pitch": 0.0
                }
            }
            
            response = requests.post(url, json=data)
            if response.status_code == 200:
                import base64
                audio_content = response.json().get("audioContent")
                if audio_content:
                    with open(output_path, "wb") as f:
                        f.write(base64.b64decode(audio_content))
                    print(f"✓ Google TTS generated")
                    return output_path
            
            print(f"⚠️ Google TTS Error ({response.status_code}): {response.text}")
            print("⚠️ Falling back to Edge TTS...")
            
            # Fallback Mapping
            if "Female" in voice or "-F" in voice or "-O" in voice: # Journey-F, Studio-O
                voice = "en-US-JennyNeural"
            else:
                voice = "en-US-GuyNeural"
                
        except Exception as e:
            print(f"⚠️ Google TTS Exception: {e}")
            print("⚠️ Falling back to Edge TTS...")
            # Fallback default
            voice = "en-US-GuyNeural"
            
    # Fallback / Default to Edge TTS
    print(f"Using Edge TTS ({voice})...")
    # Generate TTS first to a temp file
    temp_tts = f"temp_tts_{session_id}.mp3"
    
    cmd = [
        'edge-tts',
        '--voice', voice,
        '--rate', '+20%',  # Engaging pace, still understandable
        '--pitch', '+0Hz',  # Normal pitch
        '--text', text,
        '--write-media', temp_tts
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    
    # Light silence removal - cut dead air but keep natural flow
    print("Trimming dead air...")
    silence_cmd = [
        'ffmpeg', '-y', '-i', temp_tts,
        '-af', 'silenceremove=start_periods=1:start_silence=0.5:start_threshold=-40dB,silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-40dB',
        output_path
    ]
    subprocess.run(silence_cmd, capture_output=True, check=True)
    
    # Cleanup temp
    if os.path.exists(temp_tts):
        os.remove(temp_tts)
    
    print(f"✓ TTS generated (engaging pace)")
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
            # More zoom: scale to 1400 width then crop to 1080 for tighter framing
            '-vf', 'scale=1400:-2,crop=1080:ih:(iw-1080)/2:0,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
            '-an',  # No audio
            output_path
        ]
        
        subprocess.run(cmd, capture_output=True, check=True)
        cuts.append(output_path)
    
    print(f"✓ Created {len(cuts)} video cuts")
    return cuts


def create_subtitles_from_timestamps(sentence_timestamps: list, output_path: str):
    """Create SRT subtitles from real audio timestamps.
    Shows 2-3 words per frame with colored emphasis on key words.
    """
    print("Creating timestamp-synced subtitles with color emphasis...")
    
    counter = 1
    
    # Keywords to highlight in YELLOW (attention-grabbing)
    yellow_words = [
        'money', 'million', 'billion', 'thousand', 'rich', 'cash', 'dollar', 'paid',
        'insane', 'crazy', 'wild', 'shocking', 'unbelievable', 'incredible', 'amazing',
        'secret', 'truth', 'real', 'fake', 'exposed', 'revealed', 'hidden',
        'never', 'always', 'must', 'need', 'only', 'best', 'worst', 'first', 'last',
        'win', 'won', 'lose', 'lost', 'fail', 'failed', 'success', 'dead', 'die', 'kill',
        'free', 'new', 'now', 'today', 'breaking', 'leaked', 'banned', 'illegal',
    ]
    
    # Keywords to highlight in RED (danger/urgency)
    red_words = [
        'warning', 'danger', 'stop', 'don\'t', 'wrong', 'mistake', 'error', 'risk',
        'scam', 'fraud', 'lie', 'lies', 'lied', 'cheat', 'cheated',
    ]
    
    def colorize_word(word):
        """Return word with ASS color tag if it's a keyword."""
        word_lower = word.lower().strip('.,!?:;')
        
        # Check for numbers (always yellow)
        if any(c.isdigit() for c in word):
            return f'{{\\c&H00FFFF&}}{word}{{\\c&HFFFFFF&}}'  # Yellow
        
        # Check yellow keywords
        if word_lower in yellow_words:
            return f'{{\\c&H00FFFF&}}{word}{{\\c&HFFFFFF&}}'  # Yellow
        
        # Check red keywords
        if word_lower in red_words:
            return f'{{\\c&H0000FF&}}{word}{{\\c&HFFFFFF&}}'  # Red
        
        return word
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for ts_data in sentence_timestamps:
            sentence = ts_data['sentence']
            start_time = ts_data['start']
            duration = ts_data['duration']
            
            words = sentence.split()
            if not words:
                continue
            
            # Show 2-3 words at a time
            words_per_chunk = 2 if len(words) > 10 else 3
            time_per_word = duration / len(words)
            
            current_offset = 0
            for i in range(0, len(words), words_per_chunk):
                chunk_words = words[i:i+words_per_chunk]
                
                # Colorize each word individually
                colored_words = [colorize_word(w.upper()) for w in chunk_words]
                chunk_text = ' '.join(colored_words)
                
                # Calculate exact timing
                chunk_start = start_time + current_offset
                chunk_duration = time_per_word * len(chunk_words)
                chunk_end = chunk_start + chunk_duration
                
                f.write(f"{counter}\n")
                f.write(f"{format_time(chunk_start)} --> {format_time(chunk_end)}\n")
                f.write(f"{chunk_text}\n\n")
                
                counter += 1
                current_offset += chunk_duration
    
    print(f"✓ Subtitles created ({counter-1} segments, with color highlights)")
    return output_path


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
            
            # Show 1 word at a time (Shorts style)
            for j in range(0, len(words), 1):
                chunk_words = words[j:j+1]
                chunk = ' '.join(chunk_words).upper() # Force uppercase for that "punchy" look
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


def concatenate_clips(clips: list, output_path: str, target_duration: float = None):
    """Concatenate video clips and loop to match target duration."""
    print("Concatenating video clips...")
    
    # Create concat file
    concat_file = f"concat_{session_id}.txt"
    with open(concat_file, 'w') as f:
        for clip in clips:
            f.write(f"file '{clip}'\n")
    
    # First concatenate all clips
    temp_concat = f"temp_concat_{session_id}.mp4"
    cmd = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
        '-i', concat_file,
        '-c', 'copy',
        temp_concat
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    
    # If target duration specified, loop the concatenated video
    if target_duration:
        cmd = [
            'ffmpeg', '-y',
            '-stream_loop', '-1',  # Loop infinitely
            '-i', temp_concat,
            '-t', str(target_duration),  # Cut to exact duration
            '-c:v', 'libx264', '-preset', 'fast',
            output_path
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        os.remove(temp_concat)
    else:
        # Just rename if no looping needed
        os.rename(temp_concat, output_path)
    
    os.remove(concat_file)
    print(f"✓ Clips concatenated{' and looped to match duration' if target_duration else ''}")
    return output_path


def assemble_subtitles_only_video(
    video_path: str,
    subtitle_path: str,
    music_path: str,
    output_path: str,
    target_duration: int = 30
):
    """Assemble video with original audio + subtitles + optional music (NO TTS)."""
    print("Assembling video with subtitles only (no voice dub)...")
    
    # Updated style to support ASS color override codes
    subtitle_style = (
        "FontName=Impact,FontSize=26,PrimaryColour=&HFFFFFF,SecondaryColour=&H00FFFF,"
        "OutlineColour=&H000000,BackColour=&H40000000,"
        "Outline=3,Shadow=2,MarginV=80,Alignment=2,Bold=1"
    )
    
    # Copy subtitle to temp location
    import shutil
    temp_sub = f"subs_{session_id}_temp.srt"
    shutil.copy(subtitle_path, temp_sub)
    
    filter_parts = []
    
    # Apply subtitles
    filter_parts.append(f"[0:v]subtitles={temp_sub}:force_style='{subtitle_style}'[vout]")
    
    # Audio: Original video audio + optional background music
    if music_path and os.path.exists(music_path):
        # Mix: Original audio (100%) + Music (15%)
        filter_parts.append("[1:a]volume=0.15,aloop=loop=-1:size=2e+09[music]")
        filter_parts.append("[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]")
        audio_map = "[aout]"
        inputs = ['-i', video_path, '-i', music_path]
    else:
        # Just original audio
        audio_map = "0:a"
        inputs = ['-i', video_path]
    
    filter_complex = ";".join(filter_parts)
    
    cmd = ['ffmpeg', '-y'] + inputs
    cmd += ['-filter_complex', filter_complex]
    cmd += ['-map', '[vout]', '-map', audio_map]
    cmd += ['-t', str(target_duration)]  # Limit duration
    cmd += ['-c:v', 'libx264', '-preset', 'fast', '-crf', '22']
    cmd += ['-c:a', 'aac', '-b:a', '192k']
    cmd += [output_path]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"✓ Subtitles-only video assembled")
    finally:
        if os.path.exists(temp_sub):
            os.remove(temp_sub)
    
    return output_path

def assemble_final_video(
    video_path: str,
    tts_path: str,
    subtitle_path: str,
    music_path: str,
    output_path: str,
    original_audio_path: str = None
):
    """Final assembly: video + TTS + original audio + music + subtitles + watermark."""
    print("Assembling final video with watermark...")
    
    # Updated style to support ASS color override codes
    # Using ASS format for better styling control
    subtitle_style = (
        "FontName=Impact,FontSize=26,PrimaryColour=&HFFFFFF,SecondaryColour=&H00FFFF,"
        "OutlineColour=&H000000,BackColour=&H40000000,"
        "Outline=3,Shadow=2,MarginV=80,Alignment=2,Bold=1,"
        "ScaleX=100,ScaleY=100"
    )
    
    # Copy subtitle to temp location with simple name
    import shutil
    temp_sub = f"subs_{session_id}_temp.srt"
    shutil.copy(subtitle_path, temp_sub)
    
    filter_parts = []
    
    # Video with animated watermark
    # Watermark moves diagonally, bouncing around screen
    watermark_filter = (
        "drawtext="
        "text='FRESTA':"
        "fontsize=28:"
        "fontcolor=white@0.25:"  # 25% opacity - visible but subtle
        "shadowcolor=black@0.15:"
        "shadowx=2:shadowy=2:"
        "x='if(lt(mod(t\\,20)\\,10)\\, 50 + (mod(t\\,10)*90)\\, 950 - (mod(t\\,10)*90))':"  # Bounce horizontally
        "y='if(lt(mod(t\\,16)\\,8)\\, 100 + (mod(t\\,8)*180)\\, 1540 - (mod(t\\,8)*180))':"  # Bounce vertically
        "fontfile=/Windows/Fonts/arialbd.ttf"
    )
    
    filter_parts.append(f"[0:v]{watermark_filter}[vwm]")
    
    # Audio mixing: TTS (main) + Original audio (quiet) + Music (optional)
    # Input order: [0]=video, [1]=TTS, [2]=original_audio or music, [3]=music if original exists
    
    input_files = [video_path, tts_path]
    audio_inputs = ["[1:a]"]  # TTS always first
    
    if original_audio_path and os.path.exists(original_audio_path):
        input_files.append(original_audio_path)
        filter_parts.append("[2:a]volume=0.10[orig]")  # Original at 10%
        audio_inputs.append("[orig]")
        
        if music_path and os.path.exists(music_path):
            input_files.append(music_path)
            filter_parts.append("[3:a]volume=0.10,aloop=loop=-1:size=2e+09[music]")
            audio_inputs.append("[music]")
    elif music_path and os.path.exists(music_path):
        input_files.append(music_path)
        filter_parts.append("[2:a]volume=0.10,aloop=loop=-1:size=2e+09[music]")
        audio_inputs.append("[music]")
    
    # Mix all audio streams
    if len(audio_inputs) > 1:
        filter_parts.append(f"{''.join(audio_inputs)}amix=inputs={len(audio_inputs)}:duration=first:dropout_transition=2[a]")
    else:
        filter_parts.append("[1:a]acopy[a]")
    
    # Apply subtitles to watermarked video
    filter_parts.append(f"[vwm]subtitles={temp_sub}:force_style='{subtitle_style}'[vout]")
    
    filter_complex = ";".join(filter_parts)
    
    cmd = ['ffmpeg', '-y']
    for f in input_files:
        cmd += ['-i', f]
    
    cmd += ['-filter_complex', filter_complex]
    cmd += ['-map', '[vout]', '-map', '[a]']
    cmd += ['-c:v', 'libx264', '-preset', 'fast', '-crf', '22']
    cmd += ['-c:a', 'aac', '-b:a', '192k']
    cmd += [output_path]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"✓ Video assembled with watermark")
    finally:
        # Cleanup temp subtitle
        if os.path.exists(temp_sub):
            os.remove(temp_sub)
    
    return output_path


def main():
    global session_id
    # Generate unique session ID for this request
    session_id = str(uuid.uuid4())[:8]
    print(f"🚀 Initializing AI Video Generator...")
    print(f"Session ID: {session_id}")
    
    if len(sys.argv) < 2:
        url = input("Enter YouTube URL: ")
    else:
        url = sys.argv[1]
    
    style = sys.argv[2] if len(sys.argv) > 2 else "documentary"
    voice = sys.argv[3] if len(sys.argv) > 3 else "hi-IN-SwaraNeural"
    music_mood = sys.argv[4] if len(sys.argv) > 4 else "dramatic"
    target_language = sys.argv[5] if len(sys.argv) > 5 else "english"
    target_duration = int(sys.argv[6]) if len(sys.argv) > 6 else 30
    subtitles_only = sys.argv[7].lower() == "true" if len(sys.argv) > 7 else False
    clip_finder = sys.argv[8].lower() == "true" if len(sys.argv) > 8 else False
    num_clips = int(sys.argv[9]) if len(sys.argv) > 9 else 3
    
    # Determine mode
    if clip_finder:
        mode_name = f"CLIP FINDER ({num_clips} clips)"
    elif subtitles_only:
        mode_name = "SUBTITLES ONLY"
    else:
        mode_name = "AI VOICE DUBBING"
    
    print(f"\n{'='*60}")
    print(f"FACELESS VIDEO GENERATOR - {mode_name}")
    print(f"Language: {target_language} | Duration: {target_duration}s")
    print(f"URL: {url}")
    print(f"{'='*60}\n")
    
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    temp_dir = Path(__file__).parent / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    # Step 1: Download (0-15%)
    print("PROGRESS: 0% - Starting video download...")
    print("Step 1/6: Downloading video...")
    download_result = download_youtube_video(url)
    
    # Handle both tuple return (new) and single return (old)
    if isinstance(download_result, tuple):
        video_path, original_title = download_result
    else:
        video_path = download_result
        original_title = "AI Generated Short"
    
    if not video_path:
        print("Error: Failed to download")
        sys.exit(1)
    video_path = video_path.replace(".webm", ".mp4")
    print(f"✓ Downloaded: {original_title}")
    print("PROGRESS: 15% - Video downloaded successfully")
    
    # ========== CLIP FINDER MODE ==========
    if clip_finder:
        print("\n" + "="*60)
        print("CLIP FINDER MODE - AI analyzing video for best moments...")
        print("="*60)
        
        # Find best clips
        best_clips = find_best_clips(video_path, num_clips=num_clips, clip_duration=target_duration)
        
        if not best_clips:
            print("⚠️ No interesting moments found")
            sys.exit(1)
        
        # Extract each clip
        extracted_clips = []
        for i, clip_data in enumerate(best_clips):
            timestamp = clip_data['timestamp']
            score = clip_data['score']
            print(f"\nPROGRESS: {20 + (i * 20)}% - Extracting clip {i+1}/{len(best_clips)}...")
            
            clip_output = str(output_dir / f"clip_{session_id}_{i+1}.mp4")
            
            # Smart start timing: higher scores = start closer to peak for better hook
            # Score 9-10: Start 2s before (peak IS the hook)
            # Score 7-8: Start 4s before (build up to peak)
            # Score 5-6: Start 6s before (need context)
            if score >= 9:
                lead_time = 2
            elif score >= 7:
                lead_time = 4
            else:
                lead_time = 6
            
            start_time = max(0, timestamp - lead_time)
            
            # Convert to 9:16 vertical format for Shorts
            # Scale video width to 1080, then crop height to 1920
            cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_time),
                '-i', video_path,
                '-t', str(target_duration),
                '-vf', 'scale=-2:1920,crop=1080:1920:(iw-1080)/2:0',  # 9:16 ratio (Scale Height to 1920, Crop Center)
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '192k',
                clip_output
            ]
            subprocess.run(cmd, capture_output=True)
            
            if os.path.exists(clip_output):
                extracted_clips.append({
                    "path": clip_output,
                    "timestamp": timestamp,
                    "score": clip_data['score'],
                    "reason": clip_data['reason'],
                    "start_time": start_time
                })
                print(f"✓ Clip {i+1} extracted (9:16 format): {clip_output}")
        
        # Generate metadata for clips
        print("\nPROGRESS: 90% - Generating metadata...")
        clips_metadata = {
            "source_video": original_title,
            "clips": []
        }
        
        for i, clip in enumerate(extracted_clips):
            clip_meta = {
                "file": os.path.basename(clip['path']),
                "timestamp": f"{int(clip['timestamp'] // 60)}:{int(clip['timestamp'] % 60):02d}",
                "score": clip['score'],
                "reason": clip['reason']
            }
            clips_metadata["clips"].append(clip_meta)
        
        # Save metadata
        metadata_path = output_dir / f"clips_{session_id}_metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(clips_metadata, f, indent=2, ensure_ascii=False)
        
        print("PROGRESS: 100% - Complete!")
        print(f"\n{'='*60}")
        print(f"SUCCESS: Found and extracted {len(extracted_clips)} clips!")
        for i, clip in enumerate(extracted_clips):
            print(f"  {i+1}. {clip['path']} (Score: {clip['score']}/10)")
        print(f"\nMetadata: {metadata_path}")
        print(f"{'='*60}\n")
        return
    # ========== END CLIP FINDER MODE ==========
    
    # Step 2: Get Transcription (15-30%)
    print("\nPROGRESS: 15% - Getting video transcription...")
    print("Step 2/6: Transcribing...")
    
    # Try subtitle download first (faster and more accurate)
    full_text = download_youtube_subtitles(url)
    
    # Fall back to audio transcription if no subtitles
    if not full_text:
        print("PROGRESS: 18% - Extracting audio for transcription...")
        audio_path = str(temp_dir / f"audio_{session_id}.wav")
        extract_audio(video_path, audio_path)
        print("PROGRESS: 20% - Audio extracted, transcribing...")
        transcriptions = transcribeAudio(audio_path)
        full_text = " ".join([t[0] for t in transcriptions])
    
    print(f"✓ Transcribed: {len(full_text.split())} words")
    print(f"✓ Full content: {len(full_text)} characters")
    print("PROGRESS: 30% - Transcription complete")
    
    # ========== SUBTITLES ONLY MODE ==========
    if subtitles_only:
        print("\n" + "="*60)
        print("SUBTITLES ONLY MODE - Skipping AI voice generation")
        print("="*60)
        
        # Create simple SRT subtitles from downloaded text
        print("\nPROGRESS: 50% - Creating subtitles from transcript...")
        subtitle_path = str(temp_dir / f"subs_{session_id}.srt")
        
        # Split text into chunks for subtitles
        words = full_text.split()
        lines = []
        chunk_size = 8  # Words per subtitle line
        for i in range(0, len(words), chunk_size):
            lines.append(" ".join(words[i:i+chunk_size]))
        
        # Create SRT file with timing based on video
        duration_per_line = target_duration / max(len(lines), 1)
        with open(subtitle_path, 'w', encoding='utf-8') as f:
            for i, line in enumerate(lines[:int(target_duration / 2)]):  # Limit lines to fit duration
                start = i * duration_per_line
                end = min((i + 1) * duration_per_line, target_duration)
                
                start_h, start_m = divmod(int(start), 3600)
                start_m, start_s = divmod(start_m, 60)
                end_h, end_m = divmod(int(end), 3600)
                end_m, end_s = divmod(end_m, 60)
                
                f.write(f"{i+1}\n")
                f.write(f"{start_h:02d}:{start_m:02d}:{int(start % 60):02d},{int((start % 1) * 1000):03d} --> ")
                f.write(f"{end_h:02d}:{end_m:02d}:{int(end % 60):02d},{int((end % 1) * 1000):03d}\n")
                f.write(f"{line}\n\n")
        
        print(f"✓ Created {len(lines)} subtitle lines")
        
        # Final assembly
        print("\nPROGRESS: 70% - Assembling final video...")
        music_dir = Path(__file__).parent.parent.parent / "public" / "music"
        music_file = music_dir / f"{music_mood}.mp3"
        music_path = str(music_file) if music_file.exists() else None
        
        final_output = output_dir / f"faceless_{session_id}.mp4"
        assemble_subtitles_only_video(video_path, subtitle_path, music_path, str(final_output), target_duration)
        
        # Generate metadata
        print("\nPROGRESS: 90% - Generating metadata...")
        metadata = generate_video_metadata(original_title, full_text[:500], target_language)
        metadata_path = output_dir / f"faceless_{session_id}_metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        # Cleanup
        print("\nCleaning up temp files...")
        for f in [subtitle_path]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass
        
        print("PROGRESS: 100% - Complete!")
        print(f"\n{'='*60}")
        print(f"SUCCESS: {final_output}")
        print(f"\n📺 TITLE: {metadata.get('title', 'N/A')}")
        print(f"{'='*60}\n")
        return
    # ========== END SUBTITLES ONLY MODE ==========
    
    # Step 2.5: Vision Analysis (30-40%)
    print("\nPROGRESS: 30% - Analyzing video frames with AI Vision...")
    print("Step 2.5/6: Analyzing what's happening in the video...")
    
    frames_dir = str(temp_dir / f"frames_{session_id}")
    frame_paths = extract_key_frames(video_path, frames_dir, interval=5.0)
    
    vision_context = ""
    if frame_paths:
        vision_context = analyze_frames_with_gemini(frame_paths)
        if vision_context:
            print(f"✓ Vision context: {len(vision_context)} chars")
        # Cleanup frames
        for fp in frame_paths:
            try:
                os.remove(fp)
            except:
                pass
    
    print("PROGRESS: 40% - Vision analysis complete")
    
    # Step 3: AI rewrite with combined context (40-50%)
    print(f"\nPROGRESS: 40% - AI creating {target_duration}s narration...")
    print(f"Step 3/6: AI creating {target_duration}s narration ({target_language})...")
    print(f"  Using: Subtitles + Vision Analysis")
    
    result = rewrite_as_story(full_text, style, target_language, target_duration, vision_context)
    sentences = result['sentences']
    narration = ' '.join(sentences)
    print("PROGRESS: 50% - AI script created")
    
    # Step 4: Generate TTS with timestamps (45-60%)
    print(f"\nPROGRESS: 45% - Generating TTS with real timestamps...")
    print(f"Step 4/6: Generating TTS sentence-by-sentence...")
    print(f"Generated script: {len(narration.split())} words in {len(sentences)} sentences")
    
    tts_path = str(temp_dir / f"tts_{session_id}.mp3")
    tts_path, sentence_timestamps = generate_tts_with_timestamps(sentences, tts_path, voice)
    
    tts_duration = sentence_timestamps[-1]['end'] if sentence_timestamps else 0
    print(f"TTS Audio Duration: {tts_duration:.1f}s (from real timestamps)")
    print("PROGRESS: 60% - TTS audio generated with perfect timing")
    
    if tts_duration < target_duration * 0.7:  # Less than 70% of target
        print(f"⚠️ WARNING: TTS is {tts_duration:.1f}s, much shorter than target {target_duration}s!")
        print(f"   Try increasing word count or check TTS settings.")
    
    # Step 5: Create video cuts (60-80%)
    print("\nPROGRESS: 60% - Creating video clips...")
    print("Step 5/6: Creating quick video cuts...")
    
    # Extract original audio first (before cutting strips audio)
    original_audio_path = str(temp_dir / f"orig_audio_{session_id}.mp3")
    try:
        extract_cmd = [
            'ffmpeg', '-y', '-i', video_path,
            '-vn', '-acodec', 'libmp3lame', '-q:a', '4',
            original_audio_path
        ]
        subprocess.run(extract_cmd, capture_output=True, check=True)
        print("✓ Original audio extracted")
    except:
        original_audio_path = None
        print("⚠️ No audio in original video")
    
    num_cuts = max(len(sentences), int(tts_duration / 2.5))  # ~2.5 sec per cut
    cuts = create_video_cuts(video_path, tts_duration, num_cuts, str(temp_dir))
    print("PROGRESS: 70% - Video clips created")
    
    # Concatenate cuts and loop to match TTS duration
    concat_video = str(temp_dir / f"concat_{session_id}.mp4")
    concatenate_clips(cuts, concat_video, tts_duration)
    print("PROGRESS: 75% - Video concatenated and looped")
    
    # Create timestamp-synced subtitles
    subtitle_path = str(temp_dir / f"subs_{session_id}.srt")
    create_subtitles_from_timestamps(sentence_timestamps, subtitle_path)
    print("PROGRESS: 80% - Timestamp-synced subtitles created")
    
    # Step 6: Final assembly (80-100%)
    print("\nPROGRESS: 80% - Final assembly starting...")
    print("Step 6/6: Final assembly...")
    music_dir = Path(__file__).parent.parent.parent / "public" / "music"
    music_file = music_dir / f"{music_mood}.mp3"
    music_path = str(music_file) if music_file.exists() else None
    
    final_output = output_dir / f"faceless_{session_id}.mp4"
    assemble_final_video(concat_video, tts_path, subtitle_path, music_path, str(final_output), original_audio_path)
    print("PROGRESS: 95% - Video assembled, cleaning up...")
    
    # Generate metadata (title, tags, description)
    print("\nPROGRESS: 96% - Generating video metadata...")
    metadata = generate_video_metadata(original_title, narration, target_language)
    
    # Save metadata as JSON
    metadata_path = output_dir / f"faceless_{session_id}_metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    # Cleanup
    print("\nCleaning up temp files...")
    cleanup_files = [tts_path, subtitle_path, concat_video] + cuts
    
    # Add audio_path if it was created (only if we did audio transcription)
    if 'audio_path' in locals() and audio_path:
        cleanup_files.append(audio_path)
    
    # Add original audio if extracted
    if original_audio_path and os.path.exists(original_audio_path):
        cleanup_files.append(original_audio_path)
    
    for f in cleanup_files:
        if f and os.path.exists(f):
            try:
                os.remove(f)
            except:
                pass
    
    print("PROGRESS: 100% - Complete!")
    print(f"\n{'='*60}")
    print(f"SUCCESS: {final_output}")
    print(f"\n📺 TITLE: {metadata.get('title', 'N/A')}")
    print(f"📝 DESCRIPTION: {metadata.get('description', 'N/A')[:100]}...")
    print(f"🏷️ TAGS: {', '.join(metadata.get('tags', [])[:5])}")
    print(f"\n📄 Metadata saved: {metadata_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        print(f"\n❌ FATAL ERROR: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
