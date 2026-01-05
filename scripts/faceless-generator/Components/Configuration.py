import os
from pathlib import Path
from dotenv import load_dotenv

class VideoConfig:
    def __init__(self):
        # Load env vars
        current_dir = Path(__file__).parent.parent
        self.root_dir = current_dir.parent.parent
        
        self._load_env()
        
        # API Keys
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.google_tts_api_key = os.getenv("GOOGLE_TTS_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.huggingface_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
        
        # Paths
        self.output_dir = current_dir / "output"
        self.temp_dir = current_dir / "temp"
        self.music_dir = self.root_dir / "public" / "music"
        self.fonts_dir = self.root_dir / "assets" / "fonts"
        
        # Create directories
        self.output_dir.mkdir(exist_ok=True)
        self.temp_dir.mkdir(exist_ok=True)
        
        # defaults
        self.default_resolution = (1080, 1920)
        self.fps = 30
        
    def _load_env(self):
        # Search for .env from current dir up to root
        search_path = Path(__file__).parent
        for _ in range(4): # Check up to 4 levels up
            if (search_path / '.env').exists():
                load_dotenv(search_path / '.env')
                return
            if (search_path / '.env.local').exists():
                load_dotenv(search_path / '.env.local')
                return
            search_path = search_path.parent

    def get_font_path(self, font_name: str = "Arial") -> str:
        # Check local assets first
        local_font = self.fonts_dir / f"{font_name}.ttf"
        if local_font.exists():
            return str(local_font)
        
        # Windows fallback
        win_font = Path(f"C:/Windows/Fonts/{font_name}.ttf")
        if win_font.exists():
            return str(win_font)
            
        # Linux/Mac fallback (generic)
        return "Arial" # FFmpeg often handles this if installed
