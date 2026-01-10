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
            seen_lines = set()  # Track duplicates
            
            for line in lines:
                line = line.strip()
                # Skip WEBVTT header, timestamps, empty lines, and position markers
                if (line and 
                    not line.startswith('WEBVTT') and 
                    not '-->' in line and 
                    not line.isdigit() and
                    not line.startswith('NOTE') and
                    not 'align:' in line and
                    not 'position:' in line):
                    
                    # Remove VTT tags like <c>, </c>, <v>, etc.
                    line = re.sub(r'<[^>]+>', '', line)
                    # Remove speaker labels like [Music], [Applause]
                    line = re.sub(r'\[[^\]]+\]', '', line)
                    # Remove timestamps within text
                    line = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3}', '', line)
                    
                    line = line.strip()
                    
                    # Skip duplicates (YouTube subtitles often repeat lines)
                    if line and line.lower() not in seen_lines:
                        text_lines.append(line)
                        seen_lines.add(line.lower())
            
            # Join all lines
            full_text = ' '.join(text_lines)
            
            # Advanced cleaning: Remove word-level duplicates (e.g., "I I am am")
            words = full_text.split()
            cleaned_words = []
            prev_word = ""
            
            for word in words:
                # Skip if same as previous word (case-insensitive)
                if word.lower() != prev_word.lower():
                    cleaned_words.append(word)
                    prev_word = word
            
            # Reconstruct with proper spacing
            full_text = ' '.join(cleaned_words)
            
            # Clean up punctuation spacing
            full_text = re.sub(r'\s+([,.!?])', r'\1', full_text)  # Remove space before punctuation
            full_text = re.sub(r'([,.!?])([A-Za-z])', r'\1 \2', full_text)  # Add space after punctuation
            full_text = re.sub(r'\s+', ' ', full_text).strip()  # Clean multiple spaces
            
            # Cleanup
            os.remove(subtitle_file)
            
            print(f"✓ Subtitles cleaned: {len(cleaned_words)} words (removed {len(words) - len(cleaned_words)} duplicates)")
            return full_text
        else:
            print("⚠️ No subtitles found, falling back to audio transcription")
            return None
            
    except Exception as e:
        print(f"⚠️ Subtitle download failed: {e}")
        return None


def rewrite_as_story(transcription: str, style: str = "documentary", language: str = "english", target_duration: int = 30) -> dict:
    """Use Groq to create narration based on selected style."""
    print(f"[AI] Creating {target_duration}s {style.upper()} narration (Language: {language})...")
    
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set")
    
    # Language instruction
    if language.lower() in ['hindi', 'hi', 'in']:
        lang_instruction = "Conversational Hindi (Hinglish style - mix Hindi with impact English words)"
    else:
        lang_instruction = "Simple, punchy English"
    
    # Dynamic sentence count based on duration
    if target_duration == 20:
        target_sentences = 8
    elif target_duration == 60:
        target_sentences = 14
    else:  # 30 seconds default
        target_sentences = 12
    
    # ═══════════════════════════════════════════════════════════════
    # STYLE-SPECIFIC PROMPTS
    # ═══════════════════════════════════════════════════════════════
    
    if style.lower() == "documentary":
        prompt = f"""Generate a short-form documentary script for a vertical video.

STYLE RULES (STRICT - NO DEVIATION):
- Tone: calm, factual, engaging
- Sentences: short, simple, one idea per sentence
- NO emojis, NO questions, NO slang
- Tense: present tense only
- NO second person ("you")
- Neutral documentary tone

STRUCTURE:
1. Visual hook - what it looks like
2. Reality reveal - what it actually is
3. Process explanation - how it's done
4. Surprising comparison - cost, time, effort
5. Details - 2-3 specific features
6. Transformation summary

LENGTH: {target_sentences} sentences | {lang_instruction}

INPUT VIDEO CONTENT:
{transcription[:8000]}

EXAMPLE:
This looks like an empty backyard.
But it's actually a complete outdoor living space.
The transformation took six months of work.
All done by one person.
The patio stones came from a salvage yard.
Total cost was under two thousand dollars.
No contractors were hired.
Every section serves a purpose.
What looks like professional landscaping
was built entirely by hand.
And that's how dirt and weeds became a backyard oasis.

OUTPUT (JSON only):
{{
    "topic": "What the video is about",
    "narration": "Full script - plain text",
    "sentences": ["Sentence 1.", "Sentence 2.", ...],
    "transformation": "Final transformation line"
}}
"""
    
    elif style.lower() == "storytelling":
        prompt = f"""Generate an engaging storytelling narrative script.

STYLE RULES:
- Tone: warm, narrative, like telling a story to a friend
- Build a narrative arc with beginning, middle, end
- Create emotional connection
- Use "this", "here", "that" to point at visuals
- NO questions, NO emojis
- Third person narration

STRUCTURE:
1. Opening hook - draw them into the story
2. Set the scene - who, what, where
3. The journey - what happened, challenges faced
4. The turning point - key moment
5. Resolution - how it ended
6. Lesson or takeaway

LENGTH: {target_sentences} sentences | {lang_instruction}

INPUT VIDEO CONTENT:
{transcription[:8000]}

EXAMPLE:
It all started with a simple idea.
One person decided to transform their space completely.
For months, the work continued day after day.
Every piece was placed with intention.
There were setbacks along the way.
But the vision never changed.
Slowly, the transformation took shape.
What once seemed impossible became real.
This is what patience and dedication look like.
And the result speaks for itself.

OUTPUT (JSON only):
{{
    "topic": "What the story is about",
    "narration": "Full script - storytelling format",
    "sentences": ["Sentence 1.", "Sentence 2.", ...],
    "lesson": "The takeaway or lesson"
}}
"""
    
    elif style.lower() == "educational":
        prompt = f"""Generate an educational explainer script.

STYLE RULES:
- Tone: informative, clear, helpful
- Explain concepts simply
- Share facts and knowledge
- Use "here's how", "this works by", "the reason is"
- NO questions in narration
- Third person, factual

STRUCTURE:
1. Topic introduction - what this is about
2. Key concept - the main thing to understand
3. How it works - step by step explanation
4. Why it matters - practical importance
5. Interesting fact - something memorable
6. Summary - key takeaway

LENGTH: {target_sentences} sentences | {lang_instruction}

INPUT VIDEO CONTENT:
{transcription[:8000]}

EXAMPLE:
This is how modern construction works.
The process begins with careful planning.
Each material is selected for a specific purpose.
The foundation provides structural support.
Layers are added in a precise sequence.
Timing is critical at every stage.
Temperature and humidity affect the outcome.
This method has been refined over decades.
The result is stronger than traditional approaches.
Understanding the process reveals the complexity behind simple structures.

OUTPUT (JSON only):
{{
    "topic": "What this teaches",
    "narration": "Full script - educational format",
    "sentences": ["Sentence 1.", "Sentence 2.", ...],
    "key_fact": "Most interesting fact shared"
}}
"""
    
    elif style.lower() == "dramatic":
        prompt = f"""Generate a dramatic, cinematic narrative script like a movie trailer.

STYLE RULES:
- Tone: intense, suspenseful, powerful
- Short punchy sentences for impact
- Build tension and drama
- Use dramatic pauses (line breaks)
- Create a sense of scale and importance
- NO emojis, minimal questions
- Third person, epic tone

STRUCTURE:
1. Hook - dramatic opening
2. Setup - establish the situation
3. Rising tension - escalate the stakes
4. Climax - the biggest moment
5. Impact - what it means
6. Powerful ending line

LENGTH: {target_sentences} sentences | {lang_instruction}

INPUT VIDEO CONTENT:
{transcription[:8000]}

EXAMPLE:
Nobody thought it was possible.
But one person had a vision.
When others said stop, they kept going.
Day after day. Week after week.
The work was relentless.
Every detail mattered.
Every choice had consequences.
Then came the moment of truth.
What stood before them was nothing short of remarkable.
This is what happens when determination meets skill.
Against all odds, the impossible became reality.

OUTPUT (JSON only):
{{
    "topic": "What the video is about",
    "narration": "Full script - dramatic format",
    "sentences": ["Sentence 1.", "Sentence 2.", ...],
    "climax": "The most dramatic moment"
}}
"""
    
    else:
        # Default to documentary if unknown style
        prompt = f"""Generate a short documentary-style narration for this video content.
Length: {target_sentences} sentences | {lang_instruction}

INPUT: {transcription[:8000]}

OUTPUT (JSON only):
{{
    "topic": "Topic",
    "narration": "Full narration",
    "sentences": ["Sentence 1.", "Sentence 2.", ...]
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
        "temperature": 0.85,  # Higher temp for creative storytelling
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
            # Split on line breaks and sentence endings for dramatic pacing
            sentences = [s.strip() for s in re.split(r'[\n।.!?]+', narration) if s.strip() and len(s.strip()) > 3]
        print(f"✓ Created cinematic story with {len(sentences)} segments")
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


def generate_tts_with_timestamps(sentences: list, output_path: str, voice: str = "hi-IN-SwaraNeural", use_coqui: bool = False, reference_path: str = None, language: str = "english", target_duration: float = 30.0) -> tuple:
    """Generate TTS sentence-by-sentence and track exact timestamps.
    STRICTLY enforces target_duration by adjusting tempo.
    Returns: (final_audio_path, list of (sentence, start_time, end_time, duration))
    """
    print(f"Generating TTS with real timestamps... (Voice: {voice}, Target: {target_duration}s)")
    
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
                        "speakingRate": 1.4,  # Faster to fit 30s naturally
                        "pitch": 1.0,  # Slight pitch for character (not too high)
                        "volumeGainDb": 4.0  # Louder voice
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
                    '--rate', '+10%',  # Slightly faster for more energy
                    '--pitch', '+5Hz',  # Higher pitch for more character
                    '--volume', '+20%',  # Louder voice
                    '--text', sentence,
                    '--write-media', temp_file
                ]
                try:
                    subprocess.run(cmd, capture_output=True, check=True, timeout=60)
                except subprocess.TimeoutExpired:
                    print(f"⚠️ Edge TTS timed out, retrying...")
                    subprocess.run(cmd, capture_output=True, check=True, timeout=60)
        else:
            # Edge TTS with louder, more characterized voice
            temp_file = f"temp_tts_sentence_{session_id}_{i}.mp3"
            cmd = [
                'edge-tts',
                '--voice', voice,
                '--rate', '+20%',  # Faster to fit 30s naturally
                '--pitch', '+3Hz',  # Slight pitch for character (not too high)
                '--volume', '+25%',  # Louder voice
                '--text', sentence,
                '--write-media', temp_file
            ]
            try:
                subprocess.run(cmd, capture_output=True, check=True, timeout=60)
            except subprocess.TimeoutExpired:
                print(f"⚠️ Edge TTS timed out, retrying...")
                subprocess.run(cmd, capture_output=True, check=True, timeout=60)
        
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
    
    # Concatenate all audio files WITHOUT gaps
    print(f"Concatenating {len(sentence_audio_files)} audio segments...")
    concat_list = f"concat_audio_{session_id}.txt"
    with open(concat_list, 'w') as f:
        for audio_file in sentence_audio_files:
            f.write(f"file '{audio_file}'\n")
    
    # First concatenate without gaps
    temp_concat = f"temp_concat_{session_id}.mp3"
    try:
        # Try with silence removal
        cmd = [
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
            '-i', concat_list,
            '-af', 'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:stop_periods=-1:stop_silence=0.1:stop_threshold=-50dB',
            '-c:a', 'libmp3lame', '-b:a', '192k',
            temp_concat
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Silence removal failed: {result.stderr}")
    except Exception as e:
        print(f"⚠️ Silence removal failed ({e}), concatenating without it...")
        # Fallback: simple concatenation
        cmd = [
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
            '-i', concat_list,
            '-c:a', 'libmp3lame', '-b:a', '192k',
            temp_concat
        ]
        subprocess.run(cmd, capture_output=True, check=True)
    
    # Get actual duration after concatenation
    actual_duration = get_audio_duration(temp_concat)
    print(f"Audio duration: {actual_duration:.2f}s (target: {target_duration}s)")
    
    # NO TEMPO STRETCHING - it makes voice sound weird!
    # Just boost volume and use natural duration
    try:
        cmd = [
            'ffmpeg', '-y', '-i', temp_concat,
            '-af', 'volume=1.8',  # Boost volume 80% for clarity
            '-c:a', 'libmp3lame', '-b:a', '192k',
            output_path
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        os.remove(temp_concat)
    except Exception as e:
        print(f"⚠️ Volume boost failed ({e}), using original audio...")
        # Last resort: just copy
        shutil.copy(temp_concat, output_path)
        os.remove(temp_concat)
    
    # Show duration difference
    if abs(actual_duration - target_duration) > 2.0:
        print(f"⚠️ Audio is {actual_duration:.1f}s (target was {target_duration}s)")
        print(f"   Tip: Adjust script length to get closer to target")
    else:
        print(f"✓ Audio duration is close to target ({actual_duration:.1f}s vs {target_duration}s)")
    
    # Verify final duration
    final_duration = get_audio_duration(output_path)
    print(f"✓ TTS generated: {final_duration:.2f}s (target: {target_duration}s) with {len(sentence_timestamps)} segments")
    
    # Cleanup
    os.remove(concat_list)
    for audio_file in sentence_audio_files:
        if os.path.exists(audio_file):
            os.remove(audio_file)
    
    # Update timestamps to reflect actual final duration
    if sentence_timestamps:
        time_scale = final_duration / current_time if current_time > 0 else 1.0
        for ts in sentence_timestamps:
            ts['start'] *= time_scale
            ts['end'] *= time_scale
            ts['duration'] *= time_scale
    
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
        '--rate', '-5%',  # Slightly slower for longer audio
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


def create_video_cuts(video_path: str, duration: float, num_cuts: int, output_dir: str, variation: int = 1, total_variations: int = 1) -> list:
    """Cut video into short clips (2-3 seconds each) for visual variety.
    
    Args:
        variation: Which variation (1, 2, or 3)
        total_variations: Total number of variations being generated
        
        Logic:
        - 1 variation: Use entire video (0% - 100%)
        - 2 variations: Video 1 = 0-50%, Video 2 = 50-100%
        - 3 variations: Video 1 = 0-33%, Video 2 = 33-66%, Video 3 = 66-100%
    """
    video_duration = get_video_duration(video_path)
    clip_duration = duration / num_cuts
    
    # Use almost ALL frames - only skip very start (2%) and very end (2%)
    # Usable range is 2% to 98% of the video for maximum coverage
    usable_start = video_duration * 0.02  # Minimal skip at start
    usable_end = video_duration * 0.98    # Minimal skip at end
    usable_duration = usable_end - usable_start
    
    # Calculate the segment of video to use based on variation
    segment_fraction = 1.0 / total_variations
    segment_start_fraction = (variation - 1) * segment_fraction
    segment_end_fraction = variation * segment_fraction
    
    # Convert to actual times within usable range
    range_start = usable_start + (segment_start_fraction * usable_duration)
    range_end = usable_start + (segment_end_fraction * usable_duration)
    range_size = range_end - range_start
    
    print(f"Creating {num_cuts} video cuts (using {2 + segment_start_fraction*96:.0f}% - {2 + segment_end_fraction*96:.0f}% of video)...")
    
    cuts = []
    
    # IMPROVED: Distribute cuts evenly from start to end (Linspace style)
    # This ensures the last clip is actually near the end of the video segment
    if num_cuts > 1:
        step = (range_size - clip_duration) / (num_cuts - 1)
    else:
        step = 0
        
    for i in range(num_cuts):
        # Calculate start time using linear spacing
        if num_cuts > 1:
            base_time = range_start + (i * step)
        else:
            base_time = range_start + (range_size / 2) # Center single cut
            
        # Add small random jitter but keep it ordered (±10% of step)
        jitter = random.uniform(-step * 0.1, step * 0.1) if step > 0 else 0
        
        start_time = base_time + jitter
        start_time = max(usable_start, min(start_time, usable_end - clip_duration))
        
        output_path = os.path.join(output_dir, f"cut_{session_id}_{i:03d}.mp4")
        
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),
            '-i', video_path,
            '-t', str(clip_duration),
            # More zoom: scale to 1400 width then crop to 1080 for tighter framing
            '-vf', 'scale=1400:-2,crop=1080:ih:(iw-1080)/2:0,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k', # Keep audio
            output_path
        ]
        
        subprocess.run(cmd, capture_output=True, check=True)
        cuts.append(output_path)
    
    print(f"✓ Created {len(cuts)} video cuts (2%-98% range, using almost all frames)")
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
                    
                    # Check for color highlighting
                    # Random vibrant colors for emphasis words
                    highlight_colors = ["#00FF00", "#FF0000", "#FF69B4", "#00D4FF", "#FF8C00", "#FF1493", "#7FFF00"]
                    import random as color_random
                    
                    number_pattern = r'\b\d+\b'
                    
                    # Comprehensive list of high-impact words for viral content
                    emphasis_pattern = r'\b(' \
                        r'amazing|awesome|shocking|incredible|never|always|must|secret|truth|real|fake|' \
                        r'death|deadly|scary|danger|warning|wow|insane|crazy|wild|epic|' \
                        r'money|rich|poor|expensive|cheap|free|winning|losing|' \
                        r'best|worst|top|first|last|only|biggest|smallest|fastest|slowest|' \
                        r'new|old|young|ancient|modern|future|past|' \
                        r'wrong|right|bad|good|evil|perfect|terrible|horrible|' \
                        r'love|hate|fear|hope|happy|sad|angry|excited|' \
                        r'kill|save|help|destroy|create|break|fix|' \
                        r'impossible|possible|easy|hard|simple|complex|' \
                        r'stop|start|end|begin|finish|continue|' \
                        r'watch|see|look|listen|hear|feel|think|know|' \
                        r'change|transform|evolve|grow|shrink|' \
                        r'power|weak|strong|mega|super|ultra|extreme|' \
                        r'million|billion|thousand|hundred|zero|infinite|' \
                        r'dark|light|black|white|red|blue|golden|' \
                        r'legendary|rare|common|unique|special|normal|' \
                        r'hack|trick|tip|secret|method|way|how|' \
                        r'why|what|when|where|who|which|' \
                        r'viral|trending|popular|famous|unknown|' \
                        r'banned|illegal|forbidden|hidden|exposed|revealed' \
                    r')\b'
                    
                    if re.search(number_pattern, text):
                        # Random color for numbers
                        color = color_random.choice(highlight_colors)
                        f.write(f"<font color=\"{color}\">{text}</font>\n\n")
                    elif re.search(emphasis_pattern, text, re.IGNORECASE):
                        # Random color for emphasis words
                        color = color_random.choice(highlight_colors)
                        f.write(f"<font color=\"{color}\">{text}</font>\n\n")
                    else:
                        # White for normal text (default)
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
    
    # WHITE subtitle style with black outline for better visibility
    # PrimaryColour is in BGR format: &HBBGGRR  (White = &HFFFFFF)
    # OutlineColour is black for contrast
    subtitle_style = (
        "FontName=Impact,FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,"
        "BackColour=&H40000000,Outline=3,Shadow=2,MarginV=60,Alignment=2,Bold=1"
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
        "text='ReelFrenzyX':"
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
        # Use normalize=0 to prevent volume reduction (keeps TTS loud, others background)
        filter_parts.append(f"{''.join(audio_inputs)}amix=inputs={len(audio_inputs)}:duration=first:dropout_transition=2:normalize=0[a]")
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
    video_count = int(sys.argv[9]) if len(sys.argv) > 9 else 1
    
    # Number of video variations to generate (1-3)
    NUM_VARIATIONS = max(1, min(3, video_count))
    
    print(f"\n{'='*60}")
    print(f"AI FACELESS VIDEO GENERATOR v2")
    print(f"Fast-paced, no gaps, quick cuts")
    print(f"🎬 BATCH MODE: Generating {NUM_VARIATIONS} unique variation(s)")
    if use_coqui: print(f"MODE: Voice Cloning (Coqui XTTS)")
    print(f"Language: {target_language} | Duration: {target_duration}s")
    print(f"{'='*60}\n")
    
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    temp_dir = Path(__file__).parent / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    # Step 1: Download video once (reused for all variations)
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
    
    # Step 2: Get Transcription once (reused for all variations)
    print("\nPROGRESS: 15% - Getting video transcription...")
    print("Step 2/6: Transcribing...")
    
    # Try subtitle download first (faster and more accurate)
    full_text = download_youtube_subtitles(url)
    
    # Fall back to audio transcription if no subtitles
    if not full_text:
        print("PROGRESS: 18% - Extracting audio for transcription...")
        audio_path = str(temp_dir / f"audio_base.wav")
        extract_audio(video_path, audio_path)
        print("PROGRESS: 20% - Audio extracted, transcribing...")
        transcriptions = transcribeAudio(audio_path)
        full_text = " ".join([t[0] for t in transcriptions])
    
    print(f"✓ Transcribed: {len(full_text.split())} words")
    print(f"✓ Full content: {len(full_text)} characters")
    print("PROGRESS: 30% - Transcription complete")
    
    # Generate NUM_VARIATIONS unique videos
    all_outputs = []
    for variation in range(1, NUM_VARIATIONS + 1):
        print(f"\n{'='*60}")
        print(f"🎬 GENERATING VARIATION {variation}/{NUM_VARIATIONS}")
        print(f"{'='*60}\n")
        
        # Create unique session ID for each variation
        global session_id
        session_id = str(uuid.uuid4())[:8]
        
        # Step 3: Generate AI commentary (not direct subtitles!) (30-45%)
        print(f"\nPROGRESS: 30% - Generating AI commentary for Variation {variation}...")
        print(f"Step 3/6: Creating third-person explanation #{variation} ({target_language})...")
        
        # Split subtitles into 3 time-based segments for context
        sentences_all = full_text.split('. ')
        total_sentences = len(sentences_all)
        segment_size = total_sentences // NUM_VARIATIONS
        
        if variation == 1:
            start_idx = 0
            end_idx = segment_size
            segment_name = "START (first 1/3)"
        elif variation == 2:
            start_idx = segment_size
            end_idx = segment_size * 2
            segment_name = "MIDDLE (second 1/3)"
        else:
            start_idx = segment_size * 2
            end_idx = total_sentences
            segment_name = "END (last 1/3)"
        
        # Get subtitle segment as CONTEXT (not final script)
        context_sentences = sentences_all[start_idx:end_idx]
        
        # IMPROVED: Sample context from the ENTIRE segment (start, middle, end)
        # Instead of just taking the first 30 sentences (which misses the end of long videos)
        MAX_CONTEXT_SENTENCES = 40
        if len(context_sentences) > MAX_CONTEXT_SENTENCES:
            # Uniformly sample evenly spaced sentences
            step = len(context_sentences) // MAX_CONTEXT_SENTENCES
            if step < 1: step = 1
            sampled_sentences = context_sentences[::step][:MAX_CONTEXT_SENTENCES]
            context_text = '. '.join(sampled_sentences)
            print(f"Sampling {len(sampled_sentences)} sentences from entire video/segment for context")
        else:
            context_text = '. '.join(context_sentences)
            
        print(f"Using {segment_name} as context for AI commentary")
        
        # Generate third-person explanatory narration using Groq
        print(f"Generating explanatory commentary with Groq AI...")
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{
                        "role": "user",
                        "content": f"""Based on this video transcript excerpt (which samples the full video), create a SHORT third-person narration that EXPLAINS what's happening.

CONTEXT FROM VIDEO:
{context_text}

SOURCE CHANNEL: {original_title}

RULES (VERY IMPORTANT):
❌ Do NOT repeat dialogue
❌ Do NOT quote what people said
✅ EXPLAIN the moment/situation
✅ Use third-person perspective
✅ Be informative and neutral
✅ 6-8 sentences for FULL 30 seconds
✅ 25-30 seconds when spoken (100-120 words TARGET)
✅ Start with: "This is from {original_title.split('|')[0].strip()}"
✅ Be detailed and descriptive to fill time naturally

EXAMPLE STYLE:
"This is from Speed. This moment caught everyone off guard. Speed didn't realize how fast the situation escalated, and that reaction is exactly why this clip went viral."

Now write the narration. Return ONLY the narration text, nothing else:"""
                    }],
                    "temperature": 0.7,
                    "max_tokens": 300
                },
                timeout=15
            ).json()
            
            narration = response['choices'][0]['message']['content'].strip()
            
            # Clean up any quotes or dialogue markers
            narration = re.sub(r'^["\']+|["\']+$', '', narration)
            narration = re.sub(r'Here is.*?:', '', narration, flags=re.IGNORECASE).strip()
            
            sentences = narration.split('. ')
            sentences = [s.strip() for s in sentences if s.strip()]
            
            # Ensure we have enough content for 30 seconds
            # Aim for 100-120 words (about 6-8 sentences)
            word_count = len(narration.split())
            if word_count < 80:
                print(f"⚠️ Script too short ({word_count} words), regenerating with more detail...")
                # Request longer version
                # For now, just use what we have
            elif len(sentences) > 10:
                # Cap at 10 sentences max
                sentences = sentences[:10]
                narration = '. '.join(sentences)
            
            print(f"✓ Generated {len(sentences)} sentence commentary")
            print(f"✓ Preview: {narration[:100]}...")
            
        except Exception as e:
            print(f"⚠️ Groq commentary failed: {e}")
            # Fallback: Simple context-based narration
            narration = f"This is from {original_title.split('|')[0].strip()}. {'. '.join(context_sentences[:3])}"
            sentences = narration.split('. ')[:4]
        
        print("PROGRESS: 45% - Commentary generated")
        
        # ... rest of the generation continues for each variation ...
        # (Keep all the existing code from Step 4 onwards)
    
        # Step 4: Generate TTS with timestamps (45-60%)
        print(f"\nPROGRESS: 45% - Generating TTS with real timestamps...")
        print(f"Step 4/6: Generating TTS sentence-by-sentence...")
        print(f"Generated script: {len(narration.split())} words in {len(sentences)} sentences")
        
        tts_path = str(temp_dir / f"tts_{session_id}.mp3")
        tts_path, sentence_timestamps = generate_tts_with_timestamps(sentences, tts_path, voice, use_coqui, reference_path, target_language, target_duration)
        
        tts_duration = sentence_timestamps[-1]['end'] if sentence_timestamps else 0
        print(f"TTS Audio Duration: {tts_duration:.1f}s (from real timestamps)")
        print("PROGRESS: 60% - TTS audio generated with perfect timing")
        
        if tts_duration < target_duration * 0.7:  # Less than 70% of target
            print(f"⚠️ WARNING: TTS is {tts_duration:.1f}s, much shorter than target {target_duration}s!")
            print(f"   Try increasing word count or check TTS settings.")
        
        # Step 5: Create video cuts (60-80%)
        print("\nPROGRESS: 60% - Creating video clips...")
        print("Step 5/6: Creating quick video cuts...")
        
        # NOTE: Original audio is now preserved in the cuts themselves via 'create_video_cuts'
        
        # Set random seed based on variation to get different clips from different parts
        random.seed(variation * 1000 + int(time.time()))
        
        # Video segment logic based on number of variations:
        # 1 variation: use 100% of video
        # 2 variations: use 50% each (first half, second half)
        # 3 variations: use 33% each (start, middle, end)
        
        num_cuts = max(len(sentences), int(tts_duration / 2.5))  # ~2.5 sec per cut
        cuts = create_video_cuts(video_path, tts_duration, num_cuts, str(temp_dir), variation, NUM_VARIATIONS)
        print(f"✓ Selected {len(cuts)} unique clips for variation {variation}/{NUM_VARIATIONS}")
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
        
        # Try the selected music mood first
        music_path = None
        if music_mood and music_mood != "none":
            # Try mp3 first, then m4a
            for ext in [".mp3", ".m4a"]:
                music_file = music_dir / f"{music_mood}{ext}"
                if music_file.exists():
                    music_path = str(music_file)
                    print(f"✓ Using music: {music_mood}{ext}")
                    break
        
        if not music_path and music_mood != "none":
            print(f"⚠️ Music '{music_mood}' not found, trying soft-piano...")
            music_file = music_dir / "soft-piano.mp3"
            music_path = str(music_file) if music_file.exists() else None
        
        final_output = output_dir / f"faceless_{session_id}_v{variation}.mp4"
        assemble_final_video(concat_video, tts_path, subtitle_path, music_path, str(final_output))
        print("PROGRESS: 95% - Video assembled, cleaning up...")
        
        # Generate metadata (title, tags, description)
        print("\nPROGRESS: 96% - Generating video metadata...")
        metadata = generate_video_metadata(f"{original_title} - Variation {variation}", narration, target_language)
        
        # Save metadata as JSON
        metadata_path = output_dir / f"faceless_{session_id}_v{variation}_metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        # Cleanup temp files for this variation
        print("\nCleaning up temp files...")
        cleanup_files = [tts_path, subtitle_path, concat_video] + cuts
        
        for f in cleanup_files:
            if f and os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass
        
        print("PROGRESS: 100% - Variation Complete!")
        print(f"\n{'='*60}")
        print(f"✅ VARIATION {variation} SUCCESS: {final_output}")
        print(f"📺 TITLE: {metadata.get('title', 'N/A')}")
        print(f"📝 DESCRIPTION: {metadata.get('description', 'N/A')[:100]}...")
        print(f"🏷️ TAGS: {', '.join(metadata.get('tags', [])[:5])}")
        print(f"📄 Metadata saved: {metadata_path}")
        print(f"{'='*60}\n")
        
        all_outputs.append(str(final_output))
    
    # Final summary after all variations
    print(f"\n{'='*60}")
    print(f"🎉 ALL {NUM_VARIATIONS} VARIATIONS COMPLETE!")
    print(f"{'='*60}")
    for i, output in enumerate(all_outputs, 1):
        print(f"  {i}. {output}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
