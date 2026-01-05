import os
import subprocess
import random
import math
from .Configuration import VideoConfig

class VideoEditor:
    def __init__(self, config: VideoConfig):
        self.config = config

    def get_video_duration(self, video_path: str) -> float:
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return float(result.stdout.strip())

    def extract_audio(self, video_path: str, output_path: str) -> str:
        cmd = [
            'ffmpeg', '-y', '-i', video_path,
            '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
            output_path
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        return output_path

    def _get_scene_changes(self, video_path: str, threshold: float = 0.4) -> list:
        """Detect scene changes using ffmpeg."""
        print("Detecting smart cut points...")
        cmd = [
            'ffmpeg', '-i', video_path,
            '-filter_complex', f"select='gt(scene,{threshold})',metadata=print:file=-",
            '-f', 'null', '-'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        timestamps = []
        for line in result.stderr.split('\n'):
            if 'pts_time:' in line:
                try:
                    time = float(line.split('pts_time:')[1].split()[0])
                    timestamps.append(time)
                except:
                    pass
        return timestamps

    def create_video_cuts(self, video_path: str, duration: float, num_cuts: int, session_id: str, time_offset: float = 0.0) -> list:
        print(f"Creating {num_cuts} smart cuts...")
        
        video_duration = self.get_video_duration(video_path)
        clip_duration = duration / num_cuts
        
        # Smart cut detection (simple fallback if fails)
        try:
             scene_changes = self._get_scene_changes(video_path)
             # Add start/end points
             scene_changes = [0.0] + scene_changes + [video_duration]
        except:
             scene_changes = [0.0, video_duration]

        cuts = []
        for i in range(num_cuts):
             # Find a good start time
             target_start = (video_duration * time_offset) + (i * (video_duration/num_cuts))
             
             # Find closest scene change
             start_time = min(scene_changes, key=lambda x: abs(x - target_start))
             
             # Avoid end of video
             if start_time + clip_duration > video_duration:
                 start_time = max(0, video_duration - clip_duration)
             
             output_path = self.config.temp_dir / f"cut_{session_id}_{i:03d}.mp4"
             output_path_str = str(output_path)
             
             # Ken Burns Effect (Zoom/Pan)
             # Randomly zoom in or pan
             zoom_effect = random.choice([
                 "zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920", # Zoom In Center
                 "zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='0':s=1080x1920", # Zoom Top
             ])
             
             cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_time),
                '-i', video_path,
                '-t', str(clip_duration),
                '-vf', f"scale=1920:1080,crop=1080:1920:(iw-1080)/2:0,{zoom_effect}",
                '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
                '-c:a', 'aac', '-b:a', '128k',
                output_path_str
             ]
             
             # Fallback to simple crop if Ken Burns fails (e.g. resolution issues)
             try:
                 subprocess.run(cmd, capture_output=True, check=True)
             except:
                 cmd = [
                    'ffmpeg', '-y',
                    '-ss', str(start_time),
                    '-i', video_path,
                    '-t', str(clip_duration),
                    '-vf', 'scale=1400:-2,crop=1080:ih:(iw-1080)/2:0,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
                    '-c:v', 'libx264', '-preset', 'ultrafast',
                    '-c:a', 'aac',
                    output_path_str
                 ]
                 subprocess.run(cmd, capture_output=True, check=True)
                 
             cuts.append(output_path_str)
             
        return cuts

    def concatenate_clips(self, clips: list, output_path: str, target_duration: float = None):
        concat_file = self.config.temp_dir / f"concat_clips_{random.randint(0,9999)}.txt"
        with open(concat_file, 'w') as f:
            for clip in clips:
                f.write(f"file '{clip}'\n")
        
        temp_concat = str(output_path).replace(".mp4", "_temp.mp4")
        
        # Concatenate
        cmd = [
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
            '-i', str(concat_file),
            '-c', 'copy',
            temp_concat
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        
        if target_duration:
            # Loop and re-encode
             cmd = [
                'ffmpeg', '-y',
                '-stream_loop', '-1',
                '-i', temp_concat,
                '-t', str(target_duration),
                '-c:v', 'libx264', '-preset', 'fast',
                '-c:a', 'aac',
                output_path
            ]
             subprocess.run(cmd, capture_output=True, check=True)
             if os.path.exists(temp_concat):
                os.remove(temp_concat)
        else:
             if os.path.exists(output_path): os.remove(output_path)
             os.rename(temp_concat, output_path)

        if os.path.exists(concat_file):
            os.remove(concat_file)
            
    def assemble_final_video(self, video_path: str, tts_path: str, subtitle_path: str, music_path: str, output_path: str):
        print("Assembling final video...")
        
        # Convert Windows paths to forward slashes (FFmpeg accepts this)
        font_path = self.config.get_font_path().replace('\\', '/')
        sub_path = subtitle_path.replace('\\', '/')
        
        # Watermark filter - static position (simpler, more reliable)
        watermark_filter = (
            "drawtext="
            "text=ReelFrenzyX:"
            "fontsize=28:"
            "fontcolor=white@0.25:"
            "shadowcolor=black@0.15:"
            "shadowx=2:"
            "shadowy=2:"
            "x=50:"
            "y=100:"
            f"fontfile={font_path}"
        )
        
        # Setup inputs
        input_files = [video_path, tts_path]
        filter_complex_parts = [f"[0:v]{watermark_filter}[vwm]"]
        audio_inputs = ["[1:a]"]
        
        # Original Audio (Background)
        filter_complex_parts.append("[0:a]volume=0.15[orig]")
        audio_inputs.append("[orig]")
        
        # Music
        if music_path and os.path.exists(music_path):
            input_files.append(music_path)
            filter_complex_parts.append(f"[{len(input_files)-1}:a]volume=0.12,aloop=loop=-1[music]")
            audio_inputs.append("[music]")
            
        # Mix Audio
        filter_complex_parts.append(f"{''.join(audio_inputs)}amix=inputs={len(audio_inputs)}:duration=first:dropout_transition=2:normalize=0[a]")
        
        # Add Subtitles - use simple path with forward slashes
        filter_complex_parts.append(f"[vwm]subtitles={sub_path}[vout]")
        
        cmd = ['ffmpeg', '-y']
        for f in input_files:
            cmd += ['-i', f]
            
        cmd += ['-filter_complex', ";".join(filter_complex_parts)]
        cmd += ['-map', '[vout]', '-map', '[a]']
        cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', '21']
        cmd += ['-c:a', 'aac', '-b:a', '192k']
        cmd += [output_path]
        
        subprocess.run(cmd, check=True)


