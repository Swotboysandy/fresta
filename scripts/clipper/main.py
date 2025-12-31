import sys
import os
import argparse
import re
from downloader import download_video
from ai_analyzer import analyze_transcript_multi, analyze_video_multimodal
from heatmap import get_best_clip_segment
from cropper import crop_to_vertical
from montage import create_montage_short
from scene_splitter import split_at_scenes
from subtitle_animator import burn_animated_subtitles

def read_vtt(vtt_path):
    """Simple VTT text extractor"""
    if not vtt_path or not os.path.exists(vtt_path):
        return ""
    
    lines = []
    with open(vtt_path, 'r', encoding='utf-8') as f:
        for line in f:
            if '-->' in line or line.strip() == '' or line.strip().lower() == 'webvtt':
                continue
            lines.append(line.strip())
            
    # Remove duplicates
    seen = set()
    clean_lines = []
    for l in lines:
        if l not in seen:
            clean_lines.append(l)
            seen.add(l)
    return " ".join(clean_lines)

def read_srt(srt_path):
    """Simple SRT text extractor"""
    if not srt_path or not os.path.exists(srt_path):
        return ""
    
    lines = []
    with open(srt_path, 'r', encoding='utf-8') as f:
        for line in f:
            # Skip timestamps and indices
            if '-->' in line or line.strip().isdigit() or line.strip() == '':
                continue
            lines.append(line.strip())
            
    # Remove duplicates
    seen = set()
    clean_lines = []
    for l in lines:
        if l not in seen:
            clean_lines.append(l)
            seen.add(l)
    return " ".join(clean_lines)

def read_subtitles(path):
    if not path: return ""
    if path.endswith('.srt'):
        return read_srt(path)
    return read_vtt(path)

def main():
    parser = argparse.ArgumentParser(description="AI YouTube Clipper")
    parser.add_argument("url", help="YouTube URL or local video path")
    parser.add_argument("--output", default="output", help="Output directory")
    parser.add_argument("--montage", action="store_true", help="Create montage-style compilation (multiple 3s clips)")
    parser.add_argument("--scenes", action="store_true", help="Split video at scene boundaries")
    parser.add_argument("--ai", choices=["auto", "gemini", "grok"], default="auto", help="AI provider for analysis")
    parser.add_argument("--style", choices=["tiktok", "minimal", "bold", "neon"], default="tiktok", help="Subtitle animation style")
    parser.add_argument("--animate-subs", action="store_true", help="Enable word-by-word animated subtitles")
    args = parser.parse_args()

    # 1. Download or Local Check
    print("--- Step 1: Checking Input ---")
    video_path = None
    subtitle_path = None
    duration = 120 # Default fallback
    video_id = "local_clip"

    if os.path.exists(args.url):
        print(f"--- Detected Local File: {args.url} ---")
        video_path = args.url
        video_id = os.path.basename(video_path).split('.')[0]
        # Try to find sidecar subtitle
        potential_sub = os.path.splitext(video_path)[0] + ".en.vtt"
        if not os.path.exists(potential_sub):
             potential_sub = os.path.splitext(video_path)[0] + ".srt"
             
        if os.path.exists(potential_sub):
            subtitle_path = potential_sub
        
        # Approximate duration
        try:
            from moviepy.editor import VideoFileClip
            clip = VideoFileClip(video_path)
            duration = clip.duration
            clip.close()
        except:
            pass

    else:
        print("--- Downloading video + subtitles... ---")
        data = download_video(args.url, output_dir=os.path.join(args.output, "raw"))
        
        if not data:
            print("Error: Download failed (likely DRM or Invalid URL)")
            return

        video_path = data['video_path']
        subtitle_path = data['subtitle_path']
        duration = data['duration']
        video_id = data['id']

    if not video_path or not os.path.exists(video_path):
        print("Error: Valid video file not found.")
        return

    # 2. Analyze - Try Most Replayed heatmap FIRST (best for viral clips!)
    print("--- Step 2: Analyzing ---")
    clip_meta = {"start": 0, "end": 60}
    
    # Extract video ID from URL for heatmap lookup
    video_id_match = re.search(r'(?:v=|/)([a-zA-Z0-9_-]{11})', args.url)
    
    if video_id_match and not os.path.exists(args.url):
        # It's a YouTube URL, try heatmap first
        yt_video_id = video_id_match.group(1)
        print("Checking Most Replayed data (viewer spikes)...")
        clip_meta = get_best_clip_segment(yt_video_id, duration)
        
        # If heatmap worked, use it
        if clip_meta.get('reason') and 'Most Replayed' in clip_meta.get('reason', ''):
            print("[OK] Using Most Replayed spike!")
        else:
            # Fallback to transcript or Gemini
            print("No heatmap spikes. Trying transcript analysis...")
            transcript_text = ""
            if subtitle_path and os.path.exists(subtitle_path):
                transcript_text = read_subtitles(subtitle_path)
                print(f"Subtitles loaded: {len(transcript_text)} chars")
            
            if transcript_text:
                clip_meta = analyze_transcript_multi(transcript_text, duration, provider=args.ai)
            else:
                print("No subtitles. Using AI Video Analysis...")
                clip_meta = analyze_video_multimodal(video_path, provider=args.ai)
    else:
        # Local file - use transcript or Gemini
        transcript_text = ""
        if subtitle_path and os.path.exists(subtitle_path):
            transcript_text = read_subtitles(subtitle_path)
        
        if transcript_text:
            clip_meta = analyze_transcript_multi(transcript_text, duration, provider=args.ai)
        else:
            clip_meta = analyze_video_multimodal(video_path, provider=args.ai)
    
    print(f"Found Clip: {clip_meta.get('start')}s - {clip_meta.get('end')}s")
    print(f"Reason: {clip_meta.get('reason')}")

    # 3. Create Short (Montage, Scenes, or Single Clip)
    print("--- Step 3: Creating Short ---")
    os.makedirs(args.output, exist_ok=True)
    
    if args.scenes:
        # SCENE SPLIT MODE: Split at scene boundaries
        print("[SCENES] Splitting at scene boundaries...")
        scene_dir = os.path.join(args.output, f"scenes_{video_id}")
        output_files = split_at_scenes(video_path, scene_dir)
        print(f"Created {len(output_files)} scene segments")
        final_output = scene_dir
        
    elif args.montage:
        # MONTAGE MODE: Multiple 3-second clips stitched together
        print("[MONTAGE] Creating compilation from multiple clips...")
        final_output = os.path.join(args.output, f"montage_{video_id}.mp4")
        create_montage_short(
            video_path, 
            final_output, 
            duration=30,  # 30 second Short
            clip_length=3,  # 3 second clips
            subtitle_path=subtitle_path
        )
    else:
        # SINGLE CLIP MODE: One 60-second segment
        print("[SINGLE CLIP] Cropping one segment...")
        final_output = os.path.join(args.output, f"short_{video_id}.mp4")
        
        # Process subtitles
        if subtitle_path and os.path.exists(subtitle_path):
            if args.animate_subs:
                print(f"Burning animated subtitles (style: {args.style})...")
            else:
                print("Burning subtitles...")
        
        crop_to_vertical(
            video_path, 
            final_output, 
            clip_meta.get('start'), 
            clip_meta.get('end'),
            subtitle_path=subtitle_path
        )
        
        # Apply animated subtitles if requested
        if args.animate_subs and subtitle_path and os.path.exists(subtitle_path):
            animated_output = final_output.replace('.mp4', '_animated.mp4')
            burn_animated_subtitles(
                final_output, 
                subtitle_path, 
                animated_output,
                style=args.style,
                animate=True
            )
            # Replace original with animated version
            if os.path.exists(animated_output):
                os.replace(animated_output, final_output)
    
    print("--- Done ---")
    print(f"Output: {final_output}")

if __name__ == "__main__":
    main()
