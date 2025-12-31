"""
Enhanced Video Cropper with Shorts Compositing
Uses FFmpeg for subtitle burning (no ImageMagick needed)
"""
from moviepy.editor import VideoFileClip, CompositeVideoClip, ColorClip
import os
import subprocess

# Shorts dimensions
SHORTS_W = 1080
SHORTS_H = 1920
ZOOM_FACTOR = 1.35  # 35% zoom for "focused" look

def crop_to_vertical(input_path, output_path, start_time, end_time, subtitle_path=None):
    """
    Crops a video to 9:16 vertical format with advanced Shorts compositing.
    """
    print(f"Processing video: {input_path} ({start_time}s - {end_time}s)")
    
    # 1. Load and trim
    clip = VideoFileClip(input_path).subclip(start_time, end_time)
    
    # 2. Shorts Compositing (Zoom + Center on Black Canvas)
    scaled_width = int(SHORTS_W * ZOOM_FACTOR)
    clip_resized = clip.resize(width=scaled_width)
    
    # Create black background
    bg = ColorClip(size=(SHORTS_W, SHORTS_H), color=(0, 0, 0), duration=clip_resized.duration)
    
    # Center the zoomed video on the canvas
    composed = CompositeVideoClip([bg, clip_resized.set_position("center")])
    
    # Keep original audio
    final_clip = composed.set_audio(clip.audio)
    
    # 3. Export (without subtitles first)
    temp_output = output_path if not subtitle_path else output_path.replace(".mp4", "_temp.mp4")
    
    final_clip.write_videofile(
        temp_output, 
        codec='libx264', 
        audio_codec='aac', 
        preset='ultrafast',
        threads=4,
        fps=30,
        logger=None
    )
    
    # Cleanup MoviePy clips
    clip.close()
    final_clip.close()
    
    # 4. Burn subtitles using FFmpeg (if provided)
    if subtitle_path and os.path.exists(subtitle_path):
        print("Burning subtitles with FFmpeg...")
        burn_subtitles_ffmpeg(temp_output, output_path, subtitle_path, start_time)
        # Remove temp file
        try:
            os.remove(temp_output)
        except:
            pass
    else:
        # No subtitles, temp is final
        if temp_output != output_path:
            os.rename(temp_output, output_path)
    
    print(f"Saved to {output_path}")

def burn_subtitles_ffmpeg(input_video, output_video, srt_path, offset=0):
    """
    Burns SRT subtitles onto video using FFmpeg.
    
    Args:
        input_video: Input video path
        output_video: Output video path  
        srt_path: Path to SRT file
        offset: Time offset in seconds (subtitles will be shifted)
    """
    # Escape path for FFmpeg (Windows needs special handling)
    srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
    
    # FFmpeg command with subtitles filter
    # Style: large white text with black outline, positioned at bottom
    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-vf", f"subtitles='{srt_escaped}':force_style='FontSize=12,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=1,MarginV=30'",
        "-c:a", "copy",
        "-preset", "ultrafast",
        output_video
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"FFmpeg subtitle burn failed: {result.stderr[:500]}")
            # Fallback: just copy without subtitles
            os.rename(input_video, output_video)
    except FileNotFoundError:
        print("Warning: FFmpeg not found. Skipping subtitle burning.")
        os.rename(input_video, output_video)

if __name__ == "__main__":
    pass
