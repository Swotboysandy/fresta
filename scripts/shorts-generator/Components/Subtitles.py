"""
Subtitles Module - FFmpeg-based (no ImageMagick required)
Creates SRT file and burns subtitles directly with FFmpeg
"""
import os
import re
import subprocess
from moviepy.editor import VideoFileClip


def create_srt_file(transcriptions, output_path, video_start_time=0, video_duration=None):
    """
    Create an SRT subtitle file from transcriptions.
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        idx = 1
        for text, start, end in transcriptions:
            # Adjust times relative to video start
            adjusted_start = start - video_start_time
            adjusted_end = end - video_start_time
            
            # Only include if within video duration
            if video_duration:
                if adjusted_end <= 0 or adjusted_start >= video_duration:
                    continue
                adjusted_start = max(0, adjusted_start)
                adjusted_end = min(video_duration, adjusted_end)
            
            # Format times as SRT timestamps
            start_ts = format_srt_time(adjusted_start)
            end_ts = format_srt_time(adjusted_end)
            
            f.write(f"{idx}\n")
            f.write(f"{start_ts} --> {end_ts}\n")
            f.write(f"{text.strip()}\n\n")
            idx += 1
    
    return output_path


def format_srt_time(seconds):
    """Convert seconds to SRT timestamp format (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    millis = int((secs - int(secs)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{int(secs):02d},{millis:03d}"


def add_subtitles_to_video(input_video, output_video, transcriptions, video_start_time=0):
    """
    Add subtitles to video using FFmpeg (no ImageMagick required).
    
    Args:
        input_video: Path to input video file
        output_video: Path to output video file
        transcriptions: List of [text, start, end] from transcribeAudio
        video_start_time: Start time offset if video was cropped
    """
    # Get video duration
    video = VideoFileClip(input_video)
    video_duration = video.duration
    video.close()
    
    # Create SRT file
    srt_path = input_video.replace('.mp4', '_subs.srt')
    create_srt_file(transcriptions, srt_path, video_start_time, video_duration)
    
    # Check if SRT file has content
    with open(srt_path, 'r', encoding='utf-8') as f:
        srt_content = f.read().strip()
    
    if not srt_content:
        print("No subtitles to add, copying video...")
        # Just copy the video
        import shutil
        shutil.copy(input_video, output_video)
        return
    
    print(f"Burning subtitles with FFmpeg...")
    
    # Escape path for FFmpeg filter (Windows compatibility)
    srt_escaped = srt_path.replace('\\', '/').replace(':', r'\:')
    
    # FFmpeg command to burn subtitles
    cmd = [
        'ffmpeg',
        '-y',  # Overwrite output
        '-i', input_video,
        '-vf', f"subtitles='{srt_escaped}':force_style='FontName=Arial,FontSize=16,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,Outline=2,MarginV=30'",
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        output_video
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            print(f"FFmpeg subtitle error: {result.stderr[:500]}")
            # Fallback: just copy the video without subtitles
            import shutil
            shutil.copy(input_video, output_video)
        else:
            print(f"[OK] Subtitles added -> {output_video}")
            
    except Exception as e:
        print(f"Error burning subtitles: {e}")
        import shutil
        shutil.copy(input_video, output_video)
    
    # Clean up SRT file
    try:
        os.remove(srt_path)
    except:
        pass


if __name__ == "__main__":
    # Test
    test_transcriptions = [
        ["Hello world", 0, 2],
        ["This is a test", 2, 5],
        ["Subtitle burning works!", 5, 8]
    ]
    print("Test SRT creation:")
    create_srt_file(test_transcriptions, "test.srt")
    with open("test.srt", 'r') as f:
        print(f.read())
