"""
AI Analyzer Module - Supports multiple AI providers for transcript analysis
Supports: Groq.com, Google Gemini, xAI Grok
"""
import os
import json
import re
import requests
import time

# Try to import google.generativeai for Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# API Keys (set via environment variables)
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')  # Groq.com (fast)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
GROK_API_KEY = os.environ.get('GROK_API_KEY') or os.environ.get('XAI_API_KEY')  # xAI

def analyze_with_groq(transcript: str, video_duration: float = None) -> dict:
    """Analyze transcript using Groq.com API (fast LLM inference)"""
    if not GROQ_API_KEY:
        raise Exception("Groq not available - missing GROQ_API_KEY")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""Analyze this video transcript and find the MOST VIRAL/ENGAGING 60-second segment.

Look for:
- Emotional moments (surprise, humor, drama)
- Key insights or revelations
- Quotable/memorable statements
- Hook-worthy content

Transcript:
{transcript[:15000]}

Return JSON only:
{{"start": seconds, "end": seconds, "reason": "why this is viral", "hook": "attention-grabbing 5-word summary"}}"""
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a viral content expert. Respond with JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        text = result['choices'][0]['message']['content'].strip()
        
        # Remove markdown code blocks
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        # Parse JSON from response
        json_match = re.search(r'\{[^{}]+\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Groq error: {e}")
    
    # Default fallback
    return {"start": 30, "end": 90, "reason": "Default segment", "hook": "Check this out"}


def analyze_with_gemini(transcript: str, video_duration: float = None) -> dict:
    """Analyze transcript using Google Gemini"""
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        raise Exception("Gemini not available - missing API key or package")
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('models/gemini-2.0-flash')
    
    prompt = f"""Analyze this video transcript and find the MOST VIRAL/ENGAGING 60-second segment.
    
Look for:
- Emotional moments (surprise, humor, drama)
- Key insights or revelations
- Quotable/memorable statements
- Hook-worthy content

Transcript:
{transcript[:15000]}

Return JSON only:
{{"start": seconds, "end": seconds, "reason": "why this is viral", "hook": "attention-grabbing 5-word summary"}}"""
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Parse JSON from response
        json_match = re.search(r'\{[^{}]+\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Gemini error: {e}")
    
    # Default fallback
    return {"start": 30, "end": 90, "reason": "Default segment", "hook": "Check this out"}


def analyze_with_grok(transcript: str, video_duration: float = None) -> dict:
    """Analyze transcript using xAI Grok API"""
    if not GROK_API_KEY:
        raise Exception("Grok not available - missing XAI_API_KEY")
    
    url = "https://api.x.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""Analyze this video transcript and find the MOST VIRAL/ENGAGING 60-second segment.

Look for:
- Emotional moments (surprise, humor, drama)
- Key insights or revelations  
- Quotable/memorable statements
- Hook-worthy content

Transcript:
{transcript[:15000]}

Return JSON only:
{{"start": seconds, "end": seconds, "reason": "why this is viral", "hook": "attention-grabbing 5-word summary"}}"""
    
    payload = {
        "model": "grok-2-latest",
        "messages": [
            {"role": "system", "content": "You are a viral content expert. Respond with JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        text = result['choices'][0]['message']['content'].strip()
        
        # Parse JSON from response
        json_match = re.search(r'\{[^{}]+\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Grok error: {e}")
    
    # Default fallback
    return {"start": 30, "end": 90, "reason": "Default segment", "hook": "Check this out"}


def analyze_transcript_multi(transcript: str, video_duration: float = None, provider: str = "auto") -> dict:
    """
    Analyze transcript using the best available AI provider.
    
    Args:
        transcript: The video transcript text
        video_duration: Optional video duration for validation
        provider: "auto", "groq", "gemini", or "grok"
    
    Returns:
        dict with start, end, reason, and hook
    """
    print(f"[AI] Analyzing transcript ({len(transcript)} chars)...")
    
    providers = []
    
    if provider == "auto":
        # Priority: Groq (fastest) > Gemini > Grok (xAI)
        if GROQ_API_KEY:
            providers.append(("groq", analyze_with_groq))
        if GEMINI_API_KEY and GEMINI_AVAILABLE:
            providers.append(("gemini", analyze_with_gemini))
        if GROK_API_KEY:
            providers.append(("grok", analyze_with_grok))
    elif provider == "groq":
        providers.append(("groq", analyze_with_groq))
    elif provider == "gemini":
        providers.append(("gemini", analyze_with_gemini))
    elif provider == "grok":
        providers.append(("grok", analyze_with_grok))
    
    if not providers:
        print("[AI] No AI providers available! Set GROQ_API_KEY, GEMINI_API_KEY, or GROK_API_KEY")
        return {"start": 30, "end": 90, "reason": "No AI available", "hook": "Watch this"}
    
    for name, analyzer in providers:
        try:
            print(f"[AI] Trying {name.upper()}...")
            result = analyzer(transcript, video_duration)
            
            # Validate result
            if result and 'start' in result and 'end' in result:
                # Clamp to valid range
                if video_duration:
                    result['start'] = max(0, min(result['start'], video_duration - 60))
                    result['end'] = min(result['end'], video_duration)
                
                print(f"[AI] {name.upper()} found segment: {result['start']}s - {result['end']}s")
                return result
        except Exception as e:
            print(f"[AI] {name.upper()} failed: {e}")
            continue
    
    print("[AI] All providers failed, using default")
    return {"start": 30, "end": 90, "reason": "Fallback segment", "hook": "Check this out"}


def analyze_video_multimodal(video_path: str, provider: str = "gemini") -> dict:
    """
    Analyze video file directly using multimodal AI.
    Currently only Gemini supports video upload.
    
    Args:
        video_path: Path to the video file
        provider: "gemini" (only option for now)
    
    Returns:
        dict with start, end, reason, and hook
    """
    if provider != "gemini" or not GEMINI_API_KEY or not GEMINI_AVAILABLE:
        print("[AI] Multimodal analysis only available with Gemini")
        return {"start": 30, "end": 90, "reason": "Multimodal not available", "hook": "Watch this"}
    
    print(f"[AI] Uploading video for multimodal analysis...")
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    try:
        # Upload video file
        video_file = genai.upload_file(video_path)
        print(f"[AI] Video uploaded: {video_file.name}")
        
        # Wait for processing
        max_wait = 300  # 5 minutes max
        waited = 0
        while video_file.state.name == "PROCESSING" and waited < max_wait:
            print(f"[AI] Processing... ({waited}s)")
            time.sleep(10)
            waited += 10
            video_file = genai.get_file(video_file.name)
        
        if video_file.state.name != "ACTIVE":
            raise Exception(f"Video processing failed: {video_file.state.name}")
        
        # Analyze with Gemini
        model = genai.GenerativeModel('models/gemini-2.0-flash')
        
        prompt = """Watch this video and find the MOST VIRAL/ENGAGING 60-second segment.

Look for:
- Emotional moments (surprise, humor, drama)
- Key insights or revelations
- Quotable/memorable statements
- Visual highlights or action

Return JSON only:
{"start": seconds, "end": seconds, "reason": "why this is viral", "hook": "attention-grabbing 5-word summary"}"""
        
        response = model.generate_content([video_file, prompt])
        text = response.text.strip()
        
        # Parse JSON
        json_match = re.search(r'\{[^{}]+\}', text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            print(f"[AI] Found segment: {result['start']}s - {result['end']}s")
            return result
            
    except Exception as e:
        print(f"[AI] Multimodal analysis error: {e}")
    
    return {"start": 30, "end": 90, "reason": "Multimodal failed", "hook": "Watch this"}


# Test function
if __name__ == "__main__":
    print("Testing AI Analyzer...")
    print(f"Gemini available: {GEMINI_AVAILABLE and GEMINI_API_KEY is not None}")
    print(f"Grok available: {GROK_API_KEY is not None}")
    
    test_transcript = """
    This is a test transcript. At around 45 seconds, something amazing happens!
    The speaker reveals a shocking secret that changes everything.
    This is the most important part of the video that everyone needs to see.
    """
    
    result = analyze_transcript_multi(test_transcript)
    print(f"Result: {result}")
