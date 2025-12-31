"""
Language Tasks Module - Modified to support multiple AI providers
Supports: Groq (fast), Google Gemini, OpenAI
"""
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import re
import json
import requests
import time
from pathlib import Path

# Find and load .env from project root (may be in parent directories)
current_dir = Path(__file__).parent
for parent in [current_dir] + list(current_dir.parents):
    env_file = parent / '.env'
    env_local = parent / '.env.local'
    if env_file.exists():
        load_dotenv(env_file)
    if env_local.exists():
        load_dotenv(env_local)

# Support multiple API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # Groq.com (fast inference)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API")  # Original fallback

# Debug: Print which APIs are available
print(f"[AI Config] Groq: {'YES' if GROQ_API_KEY else 'NO'}, Gemini: {'YES' if GEMINI_API_KEY else 'NO'}")

if not GROQ_API_KEY and not GEMINI_API_KEY and not OPENAI_API_KEY:
    print("WARNING: No API key found. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API in .env")


class JSONResponse(BaseModel):
    """Expected response structure"""
    start: float = Field(description="Start time of the clip")
    content: str = Field(description="Highlight Text")
    end: float = Field(description="End time for the highlighted clip")


SYSTEM_PROMPT = """
The input contains a timestamped transcription of a video.
Select a 2-minute segment from the transcription that contains something interesting, useful, surprising, controversial, or thought-provoking.
The selected text should contain only complete sentences.
Do not cut the sentences in the middle.
The selected text should form a complete thought.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
    "start": <start_time_in_seconds>,
    "content": "<the transcribed text from the selected segment>",
    "end": <end_time_in_seconds>
}
"""


def call_groq_api(transcription: str) -> dict:
    """Call Groq.com API (fast LLM inference)"""
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",  # Fast and capable
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Transcription:\n{transcription[:15000]}"}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=90)
    response.raise_for_status()
    
    result = response.json()
    text = result['choices'][0]['message']['content'].strip()
    
    return parse_json_response(text)


def call_gemini_api(transcription: str, max_retries: int = 3) -> dict:
    """Call Google Gemini API with retry for rate limits"""
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY not set")
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        
        model = genai.GenerativeModel('models/gemini-2.0-flash')
        prompt = f"{SYSTEM_PROMPT}\n\nTranscription:\n{transcription[:15000]}"
        
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                return parse_json_response(response.text)
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower():
                    wait_time = (attempt + 1) * 30  # 30s, 60s, 90s
                    print(f"[Gemini] Rate limited, waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise
        
        raise Exception("Gemini rate limit exceeded after retries")
        
    except ImportError:
        raise Exception("google-generativeai package not installed")


def call_openai_api(transcription: str) -> dict:
    """Call OpenAI API (original fallback)"""
    if not OPENAI_API_KEY:
        raise Exception("OPENAI_API key not set")
    
    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=1.0,
        api_key=OPENAI_API_KEY
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("user", transcription)
    ])
    
    chain = prompt | llm.with_structured_output(JSONResponse, method="function_calling")
    response = chain.invoke({"Transcription": transcription})
    
    return {
        "start": response.start,
        "content": response.content,
        "end": response.end
    }


def parse_json_response(text: str) -> dict:
    """Extract and parse JSON from response text"""
    # Remove markdown code blocks if present
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    
    # Try to find JSON in the response
    json_match = re.search(r'\{[^{}]*"start"[^{}]*"end"[^{}]*\}', text, re.DOTALL)
    if not json_match:
        json_match = re.search(r'\{.*?\}', text, re.DOTALL)
    
    if json_match:
        try:
            data = json.loads(json_match.group())
            return data
        except json.JSONDecodeError:
            pass
    
    # Try parsing entire response as JSON
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        raise Exception(f"Could not parse JSON from response: {text[:500]}")


def GetHighlight(Transcription):
    """
    Get the best highlight segment from transcription.
    Uses Groq (primary) -> Gemini (fallback) -> OpenAI (final fallback)
    """
    providers = []
    
    # Priority: Groq > Gemini > OpenAI
    if GROQ_API_KEY:
        providers.append(("Groq", call_groq_api))
    if GEMINI_API_KEY:
        providers.append(("Gemini", call_gemini_api))
    if OPENAI_API_KEY:
        providers.append(("OpenAI", call_openai_api))
    
    if not providers:
        print("ERROR: No API keys available!")
        return None, None
    
    for name, api_func in providers:
        try:
            print(f"[AI] Calling {name} for highlight selection...")
            result = api_func(Transcription)
            
            # Validate response
            if not result or 'start' not in result or 'end' not in result:
                print(f"[AI] {name} returned invalid response")
                continue
            
            try:
                Start = int(float(result['start']))
                End = int(float(result['end']))
            except (ValueError, TypeError) as e:
                print(f"[AI] Error parsing times from {name}: {e}")
                continue
            
            # Validate times
            if Start < 0 or End < 0:
                print(f"[AI] Negative time values from {name}")
                continue
            
            if End <= Start:
                print(f"[AI] Invalid time range from {name}")
                continue
            
            # Success!
            print(f"\n{'='*60}")
            print(f"SELECTED SEGMENT ({name}):")
            print(f"Time: {Start}s - {End}s ({End-Start}s duration)")
            if 'content' in result:
                content_preview = result['content'][:200] if len(result['content']) > 200 else result['content']
                print(f"Content: {content_preview}...")
            print(f"{'='*60}\n")
            
            return Start, End
            
        except Exception as e:
            print(f"[AI] {name} error: {e}")
            continue
    
    print("ERROR: All AI providers failed")
    return None, None


if __name__ == "__main__":
    # Test
    test_transcription = """
    0.0 - 5.0: Hello everyone, welcome to this video.
    5.0 - 15.0: Today we're going to talk about something incredible.
    15.0 - 30.0: This discovery changed everything we knew about science.
    30.0 - 60.0: The researchers found that this phenomenon happens only once in a million years.
    60.0 - 90.0: What makes it special is the unexpected results.
    90.0 - 120.0: Let me explain why this matters to all of us.
    """
    
    print("Testing GetHighlight...")
    print(f"Groq available: {GROQ_API_KEY is not None}")
    print(f"Gemini available: {GEMINI_API_KEY is not None}")
    print(f"OpenAI available: {OPENAI_API_KEY is not None}")
    
    start, end = GetHighlight(test_transcription)
    print(f"Result: {start}s - {end}s")
