import requests
import json
import re
from .Configuration import VideoConfig

class ScriptGenerator:
    def __init__(self, config: VideoConfig):
        self.config = config
        self.personas = {
            "Ruthless": "You are a RUTHLESS YouTube Shorts scripter. Focus on high stakes, danger, and shocking twists.",
            "Educational": "You are a fascinating Science Communicator. Focus on mind-blowing facts, 'did you know', and curiosity.",
            "Comedic": "You are a sarcastic and witty commentator. Roast the situation slightly while keeping it engaging.",
            "Mystery": "You are a Mystery Narrator. Focus on the unknown, the creepy, and the unexplained."
        }

    def _call_groq(self, prompt: str, max_tokens: int = 2000, temperature: float = 0.8) -> str:
        if not self.config.groq_api_key:
            raise Exception("GROQ_API_KEY not set")

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.config.groq_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content'].strip()

    def generate_script(self, transcription: str, duration: int = 30, style: str = "Ruthless", language: str = "english") -> dict:
        print(f"[AI] Generating {style} script ({duration}s, {language})...")
        
        target_words = int(duration * 3.5) # ~3.5 words/sec for fast pace
        persona_prompt = self.personas.get(style, self.personas["Ruthless"])
        
        prompt = f"""{persona_prompt}
TARGET: {target_words} words MAX | {duration} seconds

INPUT TRANSCRIPT:
{transcription[:6000]}

TASK: Summarize this into a viral Shorts script.
- Third person ONLY.
- Connect sentences with tension.
- End with a curiosity gap or loop.

Provide output in JSON:
{{
    "mood": "One word mood (e.g. Dark, Upbeat, Intense, Silly)",
    "narration": "The full script text",
    "sentences": ["Sentence 1", "Sentence 2", ...]
}}
"""
        try:
            response_text = self._call_groq(prompt)
            # Parse JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                # Fallback if sentences key missing
                if 'sentences' not in data or not data['sentences']:
                    data['sentences'] = [s.strip() for s in data.get('narration','').split('.') if s.strip()]
                return data
            else:
                 # Raw text fallback
                 return {
                     "mood": "Neutral",
                     "narration": response_text,
                     "sentences": [s.strip() for s in response_text.split('.') if s.strip()]
                 }
        except Exception as e:
            print(f"⚠️ Script generation failed: {e}")
            return {
                "mood": "Neutral",
                "narration": transcription[:500],
                "sentences": [transcription[:500]]
            }

    def generate_commentary(self, context_text: str, title: str, variation_idx: int) -> dict:
        """Generate short commentary for variations."""
        prompt = f"""Based on this context from "{title}", write a SHORT 3-sentence commentary explaining the situation in 3rd person.
CONTEXT: {context_text}
Keep it punchy. 60 words max.
Return JSON: {{"narration": "text", "mood": "mood"}}"""

        try:
            response_text = self._call_groq(prompt, max_tokens=300)
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                data['sentences'] = [s.strip() for s in data['narration'].split('.') if s.strip()]
                return data
        except:
            pass
            
        return {"narration": context_text[:200], "mood": "Neutral", "sentences": [context_text[:200]]}
