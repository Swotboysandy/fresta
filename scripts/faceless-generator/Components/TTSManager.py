import os
import requests
import subprocess
import base64
import json
from .Configuration import VideoConfig

class TTSManager:
    def __init__(self, config: VideoConfig):
        self.config = config
        self.session_id = "default"

    def set_session_id(self, session_id: str):
        self.session_id = session_id

    def get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration using ffprobe."""
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', audio_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return float(result.stdout.strip())

    def trim_silence(self, input_path: str) -> str:
        """Trim silence using ffmpeg."""
        trimmed_path = f"{input_path.rsplit('.', 1)[0]}_trim.{input_path.rsplit('.', 1)[1]}"
        silence_cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-af', 'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB,silenceremove=stop_periods=-1:stop_duration=0.1:stop_threshold=-50dB',
            trimmed_path
        ]
        subprocess.run(silence_cmd, capture_output=True, check=True)
        
        if os.path.exists(trimmed_path):
            os.remove(input_path)
            os.rename(trimmed_path, input_path)
            return input_path
        return input_path

    def generate_with_timestamps(self, sentences: list, output_path: str, voice: str = "en-US-GuyNeural", engine: str = "edge") -> tuple:
        """Generate TTS sentence-by-sentence and track exact timestamps.
        Returns: (final_audio_path, list of (sentence, start_time, end_time, duration))
        """
        print(f"Generating TTS with timestamps ({engine}: {voice})...")
        
        sentence_audio_files = []
        sentence_timestamps = []
        current_time = 0.0
        
        for i, sentence in enumerate(sentences):
            if not sentence.strip():
                continue

            temp_file = self.config.temp_dir / f"tts_{self.session_id}_{i}.mp3"
            temp_file_str = str(temp_file)
            
            # Route to appropriate engine
            try:
                if engine == "google":
                    self._generate_google(sentence, temp_file_str, voice)
                elif engine == "huggingface":
                    self._generate_huggingface(sentence, temp_file_str, voice)
                else: # Default edge
                    self._generate_edge(sentence, temp_file_str, voice)
            except Exception as e:
                print(f"⚠️ {engine} TTS failed for '{sentence[:20]}...': {e}")
                print("Falling back to Edge TTS...")
                self._generate_edge(sentence, temp_file_str, "en-US-GuyNeural")

            # Trim silence for tighter pacing
            self.trim_silence(temp_file_str)
            
            duration = self.get_audio_duration(temp_file_str)
            
            sentence_timestamps.append({
                'sentence': sentence,
                'start': current_time,
                'end': current_time + duration,
                'duration': duration,
                'index': i
            })
            
            sentence_audio_files.append(temp_file_str)
            current_time += duration

        # Concatenate
        self._concatenate_audio(sentence_audio_files, output_path)
        return output_path, sentence_timestamps

    def _generate_edge(self, text: str, output_path: str, voice: str):
        cmd = [
            'edge-tts',
            '--voice', voice,
            '--rate', '+20%',
            '--pitch', '+0Hz',
            '--text', text,
            '--write-media', output_path
        ]
        subprocess.run(cmd, capture_output=True, check=True)

    def _generate_google(self, text: str, output_path: str, voice_name: str):
        if not self.config.google_tts_api_key:
            raise Exception("Missing Google/Gemini API Key")
            
        url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={self.config.google_tts_api_key}"
        data = {
            "input": {"text": text},
            "voice": {"languageCode": "en-US", "name": voice_name},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.25}
        }
        
        response = requests.post(url, json=data)
        if response.status_code != 200:
            raise Exception(f"Google TTS Error: {response.text}")
            
        audio_content = response.json().get("audioContent")
        with open(output_path, "wb") as f:
            f.write(base64.b64decode(audio_content))

    def _generate_huggingface(self, text: str, output_path: str, model_id: str = "microsoft/speecht5_tts"):
        if not self.config.huggingface_token:
            # Try without auth (will likely hit limits/fail), but worth a shot for public models
            headers = {} 
        else:
            headers = {"Authorization": f"Bearer {self.config.huggingface_token}"}
            
        api_url = f"https://api-inference.huggingface.co/models/{model_id}"
        
        response = requests.post(api_url, headers=headers, json={"inputs": text})
        if response.status_code != 200:
             raise Exception(f"HF API Error {response.status_code}: {response.text}")
             
        with open(output_path, "wb") as f:
            f.write(response.content)

    def _concatenate_audio(self, files: list, output_path: str):
        concat_list = self.config.temp_dir / f"concat_{self.session_id}.txt"
        with open(concat_list, 'w') as f:
            for audio_file in files:
                f.write(f"file '{audio_file}'\n")
        
        cmd = [
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
            '-i', str(concat_list),
            '-c', 'copy',
            output_path
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        
        # Cleanup
        if os.path.exists(concat_list):
            os.remove(concat_list)
        for f in files:
            if os.path.exists(f):
                os.remove(f)
