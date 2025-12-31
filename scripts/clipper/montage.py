"""
Montage Clipper - Creates compilation-style Shorts
Takes multiple 2-3 second clips from different parts of video and stitches them together
"""
import os
import random
from moviepy.editor import VideoFileClip, concatenate_videoclips, CompositeVideoClip, ColorClip

# Shorts dimensions  
SHORTS_W = 1080
SHORTS_H = 1920
ZOOM_FACTOR = 1.35

def create_montage_short(video_path, output_path, duration=30, clip_length=3, subtitle_path=None):
    """
    Creates a montage-style Short from a video.
    
    Args:
        video_path: Source video file
        output_path: Output file path
        duration: Target Short duration (default 30 seconds)
        clip_length: Length of each mini-clip (default 3 seconds)
        subtitle_path: Optional SRT file for captions
    
    Returns:
        Path to output file
    """
    print(f"Creating montage Short from {video_path}...")
    print(f"Target: {duration}s total, using {clip_length}s clips")
    
    # Load video
    video = VideoFileClip(video_path)
    video_duration = video.duration
    
    # Calculate how many clips we need
    num_clips = int(duration / clip_length)
    print(f"Will extract {num_clips} clips of {clip_length}s each")
    
    # Define "golden zones" to pick clips from (avoiding intro/outro)
    # Zone: 10% to 90% of video
    zone_start = video_duration * 0.10
    zone_end = video_duration * 0.90
    available_range = zone_end - zone_start
    
    if available_range < duration:
        # Video too short, use whole thing
        zone_start = 0
        zone_end = video_duration
        available_range = video_duration
    
    # Generate random timestamps for clips (spread across the video)
    # Divide video into sections and pick one random point from each section
    section_size = available_range / num_clips
    timestamps = []
    
    for i in range(num_clips):
        section_start = zone_start + (i * section_size)
        section_end = section_start + section_size - clip_length
        
        if section_end > section_start:
            ts = random.uniform(section_start, section_end)
        else:
            ts = section_start
        
        timestamps.append(ts)
    
    print(f"Selected timestamps: {[f'{t:.1f}s' for t in timestamps]}")
    
    # Extract clips and apply Shorts formatting
    clips = []
    for i, ts in enumerate(timestamps):
        print(f"Processing clip {i+1}/{num_clips}...")
        
        # Extract clip
        end_time = min(ts + clip_length, video_duration)
        clip = video.subclip(ts, end_time)
        
        # Apply Shorts compositing (zoom + center on black canvas)
        scaled_width = int(SHORTS_W * ZOOM_FACTOR)
        clip_resized = clip.resize(width=scaled_width)
        
        # Create black background
        bg = ColorClip(size=(SHORTS_W, SHORTS_H), color=(0, 0, 0), duration=clip_resized.duration)
        
        # Center the zoomed clip
        composed = CompositeVideoClip([bg, clip_resized.set_position("center")])
        composed = composed.set_audio(clip.audio)
        
        clips.append(composed)
    
    # Concatenate all clips
    print("Stitching clips together...")
    final = concatenate_videoclips(clips, method="compose")
    
    # Ensure exact duration
    if final.duration > duration:
        final = final.subclip(0, duration)
    
    # Export
    print("Exporting montage...")
    final.write_videofile(
        output_path,
        codec='libx264',
        audio_codec='aac',
        preset='ultrafast',
        threads=4,
        fps=30,
        logger=None
    )
    
    # Cleanup
    video.close()
    final.close()
    for clip in clips:
        clip.close()
    
    print(f"Montage saved to {output_path}")
    return output_path

if __name__ == "__main__":
    # Test with a sample video
    import sys
    if len(sys.argv) > 1:
        input_video = sys.argv[1]
        output = "output/montage_test.mp4"
        create_montage_short(input_video, output, duration=30, clip_length=3)
    else:
        print("Usage: python montage.py <video_path>")
