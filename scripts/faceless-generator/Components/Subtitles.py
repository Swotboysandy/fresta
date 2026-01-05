import os
import re
import subprocess
import glob
try:
    import whisper
except ImportError:
    pass # Optional dependency

class SubtitleManager:
    def __init__(self, config):
        self.config = config

    def format_time(self, seconds: float) -> str:
        """Format seconds to SRT time format."""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    def download_youtube_subtitles(self, url: str, session_id: str) -> str:
        """Download and clean YouTube subtitles."""
        print("Downloading YouTube subtitles...")
        
        # Cleanup
        for f in glob.glob('temp_subs_*.vtt'):
            try: os.remove(f) 
            except: pass

        cmd = [
            'yt-dlp', '--skip-download', '--write-auto-sub', '--write-sub',
            '--sub-lang', 'en', '--sub-format', 'vtt',
            '--output', f'temp_subs_{session_id}',
            url
        ]
        subprocess.run(cmd, capture_output=True)
        
        files = glob.glob(f'temp_subs_{session_id}*.vtt')
        if not files: return None
        
        # Parse and clean VTT
        try:
            with open(files[0], 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple cleaning regex
            lines = []
            for line in content.split('\n'):
                line = line.strip()
                if not line or '-->' in line or line.startswith('WEBVTT') or line.isdigit(): continue
                line = re.sub(r'<[^>]+>', '', line) # Remove tags
                line = re.sub(r'\[[^\]]+\]', '', line) # Remove [Music]
                line = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3}', '', line)
                if line and line not in lines: lines.append(line)
            
            clean_text = ' '.join(lines)
            clean_text = re.sub(r'\s+', ' ', clean_text)
            
            os.remove(files[0])
            return clean_text
        except:
            return None

    def create_srt(self, sentence_timestamps: list, output_path: str):
        """Create SRT file from timestamps."""
        with open(output_path, 'w', encoding='utf-8') as f:
            counter = 1
            for ts in sentence_timestamps:
                words = ts['sentence'].split()
                if not words: continue
                
                # Dynamic chunking
                words_per_chunk = 2 if len(words) > 10 else 3
                time_per_word = ts['duration'] / len(words)
                
                # Random coloring for "Shorts" style retention
                import random
                colors = ["#FFFF00", "#00FF00", "#00FFFF", "#FF0000", "#FFA500"] # Yellow, Green, Cyan, Red, Orange
                
                cur_time = ts['start']
                for i in range(0, len(words), words_per_chunk):
                    chunk = words[i:i+words_per_chunk]
                    end_time = cur_time + (time_per_word * len(chunk))
                    
                    text = ' '.join(chunk).upper()
                    
                    # 30% chance to color the chunk, else White
                    if random.random() < 0.3:
                        color = random.choice(colors)
                        text = f"<font color=\"{color}\">{text}</font>"
                    else:
                        text = f"<font color=\"#FFFFFF\">{text}</font>"
                        
                    f.write(f"{counter}\n")
                    f.write(f"{self.format_time(cur_time)} --> {self.format_time(end_time)}\n")
                    f.write(f"{text}\n\n")
                    
                    cur_time = end_time
                    counter += 1
        return output_path

    def generate_whisper_subtitles(self, audio_path: str, output_path: str):
        """Generate word-level subtitles using Whisper (Accuracy Mode)."""
        print("Generating Whisper subtitles...")
        try:
            import whisper
            import random
            model = whisper.load_model("base")
            result = model.transcribe(audio_path, word_timestamps=True)
            
            colors = ["#FFFF00", "#00FF00", "#00FFFF", "#FF0000", "#FFA500"]
            
            with open(output_path, 'w', encoding='utf-8') as f:
                counter = 1
                for segment in result["segments"]:
                    for word in segment.get("words", []):
                        start = word['start']
                        end = word['end']
                        text = word['word'].strip().upper()
                        
                        f.write(f"{counter}\n")
                        f.write(f"{self.format_time(start)} --> {self.format_time(end)}\n")
                        
                        # 30% chance to color, else White
                        if random.random() < 0.3:
                            color = random.choice(colors)
                            f.write(f"<font color=\"{color}\">{text}</font>\n\n")
                        else:
                            f.write(f"<font color=\"#FFFFFF\">{text}</font>\n\n")
                            
                        counter += 1
            return output_path
        except Exception as e:
            print(f"⚠️ Whisper failed: {e}. Subtitles will be skipped.")
            return None
