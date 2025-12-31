import os
import google.generativeai as genai
import json
from dotenv import load_dotenv

load_dotenv() # Load from .env

# Setup Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try alternate name
    api_key = os.getenv("GOOGLE_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
else:
    print("Warning: GEMINI_API_KEY not found in environment")

import time

def analyze_transcript(transcript_text, duration):
    """
    Sends transcript to Gemini to find the most viral/interesting segment.
    Returns: JSON object {start, end, reason, content}
    """
    if not api_key:
        print("Error: No Gemini API Key provided. Returning default clip.")
        return {"start": 0, "end": 60, "reason": "No API Key", "content_summary": "Default start"}

    model = genai.GenerativeModel('models/gemini-2.0-flash')

    prompt = f"""
    You are an expert viral video editor. 
    I have a YouTube video transcript (Total Duration: {duration} seconds).
    
    Your goal: Find the single MOST interesting, funny, or thought-provoking segment to turn into a YouTube Short (vertical video).
    The segment must be between 30 and 60 seconds long.
    
    Transcript:
    {transcript_text[:100000]} # Limit context to avoid errors if too huge
    
    Return ONLY a raw JSON object (no markdown formatting) with this structure:
    {{
        "start": <start_time_in_seconds_float>,
        "end": <end_time_in_seconds_float>,
        "reason": "Why this part is viral",
        "content_summary": "What is being said"
    }}
    """

    print("Analyzing transcript with Gemini...")
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"Error analyzing transcript: {e}")
        return {"start": 0, "end": 60, "reason": "Fallback Error", "content_summary": "Start of video"}

def analyze_video_file(video_path):
    """
    Uploads video file to Gemini and finds the most viral segment (multimodal analysis).
    """
    if not api_key:
        print("Error: No Gemini API Key provided.")
        return {"start": 0, "end": 60, "reason": "No API Key", "content_summary": "Default start"}

    print(f"Uploading {video_path} to Gemini for analysis...")
    try:
        video_file = genai.upload_file(path=video_path)
        print(f"Upload complete: {video_file.name}")
        
        # Wait for processing
        while video_file.state.name == "PROCESSING":
            print('.', end='', flush=True)
            time.sleep(2)
            video_file = genai.get_file(video_file.name)
        
        if video_file.state.name == "FAILED":
            raise ValueError("Video processing failed in Gemini.")

        print("Analyzing video content...")
        model = genai.GenerativeModel('models/gemini-2.0-flash')
        
        prompt = """
        Watch this video carefully. 
        Find the single MOST viral, funny, or interesting segment suitable for a YouTube Short (vertical video).
        The segment MUST be between 30 and 60 seconds long.
        
        Return ONLY a raw JSON object (no markdown formatting) with this structure:
        {
            "start": <start_time_in_seconds_float>,
            "end": <end_time_in_seconds_float>,
            "reason": "Detailed reason why this part is viral",
            "content_summary": "Description of the clip content"
        }
        """
        
        response = model.generate_content([video_file, prompt])
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        
        # Cleanup
        try:
            genai.delete_file(video_file.name)
        except:
            pass
            
        return data

    except Exception as e:
        print(f"Error analyzing video file: {e}")
        return {"start": 0, "end": 60, "reason": "Fallback Error", "content_summary": "Start of video"}

if __name__ == "__main__":
    # Test
    sample_text = "This is a sample transcript..."
    res = analyze_transcript(sample_text, 120)
    print(res)
