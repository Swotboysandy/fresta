import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
res = os.getenv("GEMINI_API_KEY")
if not res:
    res = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=res)

print("Listing models...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)
