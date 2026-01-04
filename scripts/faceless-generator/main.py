"""
AI Faceless Video Generator v2
- Continuous TTS narration (no gaps)
- Quick video cuts (2-3 seconds each)
- Fast-paced, engaging style
"""

import os
import sys
import time
import re
import json
import random
import requests
import subprocess
from pathlib import Path
import shutil
import uuid
import whisper  # For word-level subtitles

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


def download_youtube_subtitles(url: str) -> str:
    """Download YouTube subtitles/captions directly."""
    print("Downloading YouTube subtitles...")
    
    # Clean up any old subtitle files first
    import glob
    for old_file in glob.glob('temp_subs_*.vtt'):
        try:
            os.remove(old_file)
        except:
            pass
    
    try:
        # Try to get auto-generated or manual subtitles
        cmd = [
            'yt-dlp',
            '--skip-download',
            '--write-auto-sub',
            '--write-sub',
            '--sub-lang', 'en',
            '--sub-format', 'vtt',
            '--output', f'temp_subs_{session_id}',
            url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Find the subtitle file
        subtitle_files = glob.glob(f'temp_subs_{session_id}*.vtt')
        
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


def rewrite_as_story(transcription: str, style: str = "documentary", language: str = "english", target_duration: int = 30) -> dict:
    """Use Groq to create complete story with looping savage ending."""
    print(f"[AI] Creating {target_duration}s story (Language: {language})...")
    
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set")
    
    # Language instruction
    if language.lower() in ['hindi', 'hi', 'in']:
        lang_instruction = "Conversational Hindi (Hinglish is okay for impact words)"
    else:
        lang_instruction = "Simple Spoken English"
    
    # Dynamic word count based on target duration
    # At +30% TTS speed: ~3 words/second
    # Target: 28-35 second engaging videos
    if target_duration == 20:
        target_words = 65  # ~20-22 seconds
    elif target_duration == 60:
        target_words = 190  # ~55-65 seconds
    else:  # 30 seconds default
        target_words = 95  # Target 28-35 seconds with good content
    
    prompt = f"""You are a RUTHLESS YouTube Shorts scripter. Your ONLY job: maximum retention in EXACTLY {target_duration} seconds.

TASK: SUMMARIZE the video subtitles below into a {target_duration}-second viral narration.

CRITICAL WORD LIMIT: EXACTLY {target_words} words. NOT MORE. Count them.
If you write more than {target_words + 10} words, the video will be TOO LONG and FAIL.

TARGET: {target_words} words MAX | {target_duration} seconds | {lang_instruction}

INPUT (YouTube Subtitles to summarize):
{transcription[:6000]}

═══════════════════════════════════════════════════════════════
STYLE OVERRIDE (CRITICAL - FOLLOW EXACTLY):
═══════════════════════════════════════════════════════════════
✓ DO NOT write in first person. EVER.
✓ DO NOT narrate as the subject.
✓ Narrate like a viral Shorts storyteller observing events.
✓ Refer to the subject as "this guy", "this streamer", "this kid", or by name.
✓ Compress time aggressively. Skip setup, jump straight to danger.
✓ Every sentence must raise stakes or curiosity.
✓ Treat the subject like a character in a survival story.

BAD EXAMPLES (NEVER DO THIS):
❌ "I'm nervous."
❌ "I'm holding the GoPro."
❌ "I'm about to go underwater."
❌ "I decided to try this."

GOOD EXAMPLES (EMULATE THIS):
✓ "This guy jumped into shark-infested water with thousands watching."
✓ "One wrong move here ends the stream permanently."
✓ "Chat was cheering. The sharks didn't care."
✓ "This could've ended very badly."

═══════════════════════════════════════════════════════════════
BANNED (Delete on sight):
═══════════════════════════════════════════════════════════════
❌ First person: "I", "me", "my", "we", "us", "our"
❌ Passive voice: "it was discovered" → "scientists discovered"
❌ Filler transitions: "so", "now", "then", "also", "additionally"
❌ Soft endings: "pretty interesting", "kind of cool"
❌ Setup phrases: "in this video", "today we'll", "let me show you"
❌ Action descriptions: "he puts on the camera" → "one mistake here, footage becomes evidence"
❌ Chronological narration: skip boring parts, jump to drama

═══════════════════════════════════════════════════════════════
REQUIRED (Non-negotiable):
═══════════════════════════════════════════════════════════════
✓ Third-person ONLY: "this guy", "this streamer", "he", "she", or name
✓ Stakes in EVERY sentence: risk, consequence, or escalation
✓ Outcomes, not actions: why it matters, what could go wrong
✓ Pattern break every 3-5 seconds: change topic, reveal twist, ask question
✓ At least ONE unresolved curiosity gap: tease but don't explain
✓ Ending that creates FOMO or leaves them hanging
✓ Specific numbers, names, facts (not vague descriptions)
✓ Active voice ONLY
✓ Compressed drama: cause → consequence, not step-by-step

═══════════════════════════════════════════════════════════════
HOOK TEMPLATES (First sentence MUST use one):
═══════════════════════════════════════════════════════════════
→ "This could've ended very badly."
→ "People thought this was fake… until this happened."
→ "Everyone in chat was cheering. They shouldn't have been."
→ "This guy had no idea what he just started."
→ "One mistake here, and the footage becomes evidence."

═══════════════════════════════════════════════════════════════
STRUCTURE (Strict):
═══════════════════════════════════════════════════════════════
[0-3s] HOOK (Warning-style, not introduction)
→ Most shocking outcome. No context. No setup.
→ Example: "This guy jumped into shark-infested waters… live… with zero backup."
→ NOT: "I'm diving with sharks in South Africa and I'm nervous."

[3-10s] BUILD TENSION (Compressed drama)
→ Reveal stakes one by one
→ Each sentence = new risk or consequence
→ Example: "Chat was going wild. The sharks were circling. One wrong move."

[10-20s] TWIST/CLIMAX (The thing they didn't expect)
→ Reframe everything said before
→ Example: "Then the camera cut out. For 47 seconds, nothing. Chat thought he was gone."

[20-{target_duration}s] UNRESOLVED ENDING (Create FOMO)
→ Leave them wanting more
→ Example: "He survived. But what he saw down there… he won't talk about it."
→ NOT: "So that's the story. Pretty crazy right?"

═══════════════════════════════════════════════════════════════
STORYTELLING CADENCE (Indian Shorts style):
═══════════════════════════════════════════════════════════════
→ Short sentences. Dramatic rhythm. Slightly informal.
→ Example: "This guy thought it would be content. Sharks don't care about content. One slip, and this story ends differently."

═══════════════════════════════════════════════════════════════
QUALITY CHECK (Before submitting):
═══════════════════════════════════════════════════════════════
1. Any "I", "me", "my"? → FAIL. Rewrite in third person.
2. Read each sentence. Does it add stakes or tension? If no → DELETE
3. Count pattern breaks. Less than 3? → ADD MORE
4. Check ending. Does it resolve everything? → REWRITE to leave gap
5. Count words. Less than {target_words}? → FAIL (add more content)
6. Any passive voice? → REWRITE in active voice
7. Any action descriptions without stakes? → REWRITE to show consequences

═══════════════════════════════════════════════════════════════
OUTPUT (JSON only):
═══════════════════════════════════════════════════════════════
{{
    "hook": "The opening line (must be a warning, not introduction)",
    "sentences": ["Sentence 1", "Sentence 2", ...],
    "narration": "Full script as one paragraph",
    "word_count": actual_count,
    "pattern_breaks": number_of_topic_shifts,
    "curiosity_gaps": number_of_unresolved_questions,
    "first_person_check": "PASS or FAIL (must be PASS)"
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
        data = json.loads(json_match.group())
        sentences = data.get('sentences', [])
        if not sentences:
            narration = data.get('narration', text)
            # Split on sentence endings but keep longer segments
            sentences = [s.strip() for s in re.split(r'(?<=[.!?।])\s+', narration) if s.strip() and len(s.strip()) > 5]
        print(f"✓ Created narrative with {len(sentences)} segments")
        return {"narration": data.get('narration', ''), "sentences": sentences}
    
    return {"narration": text, "sentences": [text]}


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


def generate_tts_with_timestamps(sentences: list, output_path: str, voice: str = "hi-IN-SwaraNeural", use_coqui: bool = False, reference_path: str = None, language: str = "english") -> tuple:
    """Generate TTS sentence-by-sentence and track exact timestamps.
    Returns: (final_audio_path, list of (sentence, start_time, end_time, duration))
    """
    print(f"Generating TTS with real timestamps... (Voice: {voice})")
    
    sentence_audio_files = []
    sentence_timestamps = []
    current_time = 0.0
    
    # Init Coqui XTTS (Lazy Load)
    coqui_model = None
    if use_coqui and reference_path and os.path.exists(reference_path):
        try:
            print("Initializing Coqui XTTS (This may take a while first time)...")
            from TTS.api import TTS
            # Use CPU to avoid complex dependency issues, unless user has CUDA setup
            coqui_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
            print("✓ Coqui XTTS Initialized")
        except Exception as e:
            print(f"⚠️ Coqui Init Failed: {e}. Will fallback to Standard TTS.")
    
    for i, sentence in enumerate(sentences):
        if not sentence.strip():
            continue
            
        print(f"  [{i+1}/{len(sentences)}] Generating: {sentence[:50]}...")
        
        if coqui_model:
            temp_file = f"temp_tts_sentence_{session_id}_{i}.wav"
            try:
                # Map language name to code
                lang_code = "en"
                if language.lower() == "hindi": lang_code = "hi"
                elif language.lower() == "spanish": lang_code = "es"
                elif language.lower() == "french": lang_code = "fr"
                
                # XTTS Generation
                coqui_model.tts_to_file(text=sentence, speaker_wav=reference_path, language=lang_code, file_path=temp_file)
                
                # Check success and skip fallback
                if os.path.exists(temp_file):
                    duration = get_audio_duration(temp_file)
                    sentence_timestamps.append({
                        'sentence': sentence,
                        'start': current_time,
                        'end': current_time + duration,
                        'duration': duration,
                        'index': i
                    })
                    sentence_audio_files.append(temp_file)
                    current_time += duration
                    continue # SUCCESS - Skip standard TTS
            except Exception as e:
                print(f"⚠️ Coqui Gen Failed: {e}")
                # Fallback to standard TTS logic below
                
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
            '-vf', 'scale=1400:-2,crop=1080:ih:(iw-1080)/2:0,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k', # Keep audio
            output_path
        ]
        
        subprocess.run(cmd, capture_output=True, check=True)
        cuts.append(output_path)
    
    print(f"✓ Created {len(cuts)} video cuts")
    return cuts


def create_subtitles_from_timestamps(sentence_timestamps: list, output_path: str):
    """Create SRT subtitles from real audio timestamps.
    Shows 2-3 words per frame with emphasis on key words.
    """
    print("Creating timestamp-synced subtitles...")
    
    counter = 1
    
    # Keywords to emphasize (numbers, names, emotional words)
    emphasis_patterns = [
        r'\b\d+\b',  # numbers
        r'\b[A-Z][a-z]+\b',  # proper nouns
        r'\b(amazing|shocking|incredible|never|always|must|secret|truth|real|fake)\b'  # emotional
    ]
    
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
                chunk_text = ' '.join(chunk_words).upper()
                
                # Check for emphasis
                emphasized = False
                for pattern in emphasis_patterns:
                    if re.search(pattern, chunk_text, re.IGNORECASE):
                        emphasized = True
                        break
                
                # Calculate exact timing
                chunk_start = start_time + current_offset
                chunk_duration = time_per_word * len(chunk_words)
                chunk_end = chunk_start + chunk_duration
                
                f.write(f"{counter}\n")
                f.write(f"{format_time(chunk_start)} --> {format_time(chunk_end)}\n")
                
                # Add emphasis marker if needed (will be styled in video)
                if emphasized:
                    f.write(f"<b>{chunk_text}</b>\n\n")
                else:
                    f.write(f"{chunk_text}\n\n")
                
                counter += 1
                current_offset += chunk_duration
    
    print(f"✓ Subtitles created ({counter-1} segments, timestamp-synced)")
    return output_path


def generate_word_level_subtitles(audio_path: str, output_path: str):
    """Generate accurate 1-2 word subtitles using Whisper."""
    print(f"Generating word-level subtitles using Whisper (Accuracy Mode)...")
    
    try:
        model = whisper.load_model("base")
        result = model.transcribe(audio_path, word_timestamps=True)
        
        emphasis_patterns = [
            r'\b\d+\b',
            r'\b[A-Z][a-z]+\b',
            r'\b(amazing|shocking|incredible|never|always|must|secret|truth|real|fake|death|deadly|scary|money|rich)\b'
        ]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            counter = 1
            for segment in result["segments"]:
                words = segment.get("words", [])
                
                i = 0
                while i < len(words):
                    chunk = [words[i]]
                    
                    # Group next word if appropriate
                    if i + 1 < len(words):
                        next_word = words[i+1]
                        cur_text = chunk[0]['word'].strip()
                        # Keep single if punctuation or long
                        if not (cur_text.endswith(('.', '?', '!')) or len(cur_text) > 7 or len(next_word['word'].strip()) > 7):
                             chunk.append(next_word)
                             i += 1
                    
                    i += 1
                    
                    text = "".join([w['word'] for w in chunk]).strip().upper()
                    start = chunk[0]['start']
                    end = chunk[-1]['end']
                    
                    # Ensure minimum duration for visibility (0.1s)
                    if end - start < 0.1:
                        end = start + 0.1
                    
                    f.write(f"{counter}\n")
                    f.write(f"{format_time(start)} --> {format_time(end)}\n")
                    
                    # Check emphasis
                    emphasized = False
                    for pattern in emphasis_patterns:
                        if re.search(pattern, text, re.IGNORECASE):
                            emphasized = True
                            break
                            
                    if emphasized:
                        f.write(f"<b>{text}</b>\n\n")
                    else:
                        f.write(f"{text}\n\n")
                    counter += 1
                    
        print(f"✓ Whisper Subtitles created ({counter} chunks)")
        return output_path
        
    except Exception as e:
        print(f"⚠️ Whisper failed: {e}. Falling back to standard subtitles.")
        return None



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
            '-c:a', 'aac', # Re-encode audio to ensure consistency
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


def assemble_final_video(
    video_path: str,
    tts_path: str,
    subtitle_path: str,
    music_path: str,
    output_path: str
):
    """Final assembly: video + TTS + original audio (from video) + music + subtitles + watermark."""
    print("Assembling final video with watermark...")
    
    subtitle_style = (
        "FontName=Impact,FontSize=16,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,"
        "Outline=3,Shadow=2,MarginV=70,Alignment=2,Bold=1"
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
    # Input order: [0]=video(with audio), [1]=TTS
    
    input_files = [video_path, tts_path]
    audio_inputs = ["[1:a]"]  # TTS always first
    
    # Use audio from the video clips themselves as background
    filter_parts.append("[0:a]volume=0.15[orig]")
    audio_inputs.append("[orig]")

    if music_path and os.path.exists(music_path):
        input_files.append(music_path)
        filter_parts.append(f"[{len(input_files)-1}:a]volume=0.15,aloop=loop=-1[music]")
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
    if len(sys.argv) < 2:
        url = input("Enter YouTube URL: ")
    else:
        url = sys.argv[1]
    
    style = sys.argv[2] if len(sys.argv) > 2 else "documentary"
    voice = sys.argv[3] if len(sys.argv) > 3 else "hi-IN-SwaraNeural"
    music_mood = sys.argv[4] if len(sys.argv) > 4 else "dramatic"
    target_language = sys.argv[5] if len(sys.argv) > 5 else "english"
    target_duration = int(sys.argv[6]) if len(sys.argv) > 6 else 30
    use_coqui = sys.argv[7].lower() == "true" if len(sys.argv) > 7 else False
    reference_path = sys.argv[8] if len(sys.argv) > 8 else None
    if reference_path == "none": reference_path = None
    
    print(f"\n{'='*60}")
    print(f"AI FACELESS VIDEO GENERATOR v2")
    print(f"Fast-paced, no gaps, quick cuts")
    if use_coqui: print(f"MODE: Voice Cloning (Coqui XTTS)")
    print(f"Language: {target_language} | Duration: {target_duration}s")
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
    
    # Step 3: AI rewrite (30-45%)
    print(f"\nPROGRESS: 30% - AI creating {target_duration}s narration...")
    print(f"Step 3/6: AI creating {target_duration}s narration ({target_language})...")
    result = rewrite_as_story(full_text, style, target_language, target_duration)
    sentences = result['sentences']
    narration = ' '.join(sentences)
    print("PROGRESS: 45% - AI script created")
    
    # Step 4: Generate TTS with timestamps (45-60%)
    print(f"\nPROGRESS: 45% - Generating TTS with real timestamps...")
    print(f"Step 4/6: Generating TTS sentence-by-sentence...")
    print(f"Generated script: {len(narration.split())} words in {len(sentences)} sentences")
    
    tts_path = str(temp_dir / f"tts_{session_id}.mp3")
    tts_path, sentence_timestamps = generate_tts_with_timestamps(sentences, tts_path, voice, use_coqui, reference_path, target_language)
    
    tts_duration = sentence_timestamps[-1]['end'] if sentence_timestamps else 0
    print(f"TTS Audio Duration: {tts_duration:.1f}s (from real timestamps)")
    print("PROGRESS: 60% - TTS audio generated with perfect timing")
    
    if tts_duration < target_duration * 0.7:  # Less than 70% of target
        print(f"⚠️ WARNING: TTS is {tts_duration:.1f}s, much shorter than target {target_duration}s!")
        print(f"   Try increasing word count or check TTS settings.")
    
    # Step 5: Create video cuts (60-80%)
    print("\nPROGRESS: 60% - Creating video clips...")
    print("Step 5/6: Creating quick video cuts...")
    
    # Step 5: Create video cuts (60-80%)
    print("\nPROGRESS: 60% - Creating video clips...")
    print("Step 5/6: Creating quick video cuts...")
    
    # NOTE: Original audio is now preserved in the cuts themselves via 'create_video_cuts'
    
    num_cuts = max(len(sentences), int(tts_duration / 2.5))  # ~2.5 sec per cut
    cuts = create_video_cuts(video_path, tts_duration, num_cuts, str(temp_dir))
    print("PROGRESS: 70% - Video clips created")
    
    # Concatenate cuts and loop to match TTS duration
    concat_video = str(temp_dir / f"concat_{session_id}.mp4")
    concatenate_clips(cuts, concat_video, tts_duration)
    print("PROGRESS: 75% - Video concatenated and looped")
    
    # Create timestamp-synced subtitles (Whisper Word-Level)
    subtitle_path = str(temp_dir / f"subs_{session_id}.srt")
    print("Generating subtitles using Whisper...")
    if not generate_word_level_subtitles(tts_path, subtitle_path):
        print("Falling back to sentence-level subtitles...")
        create_subtitles_from_timestamps(sentence_timestamps, subtitle_path)
        
    print("PROGRESS: 80% - Timestamp-synced subtitles created")
    
    # Step 6: Final assembly (80-100%)
    print("\nPROGRESS: 80% - Final assembly starting...")
    print("Step 6/6: Final assembly...")
    music_dir = Path(__file__).parent.parent.parent / "public" / "music"
    music_file = music_dir / f"{music_mood}.mp3"
    music_path = str(music_file) if music_file.exists() else None
    
    final_output = output_dir / f"faceless_{session_id}.mp4"
    assemble_final_video(concat_video, tts_path, subtitle_path, music_path, str(final_output))
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
    
    # Add original audio if extracted (Removed)
    # if 'original_audio_path' in locals() and original_audio_path and os.path.exists(original_audio_path):
    #     cleanup_files.append(original_audio_path)
    
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
    main()
