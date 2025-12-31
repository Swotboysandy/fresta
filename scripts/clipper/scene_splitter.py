"""
Scene Detection & Splitting Module
Uses FFmpeg to detect scene changes and split video at natural break points
"""
import os
import subprocess
import json
import re
from typing import List, Tuple

def detect_scenes(video_path: str, threshold: float = 0.3) -> List[float]:
    """
    Detect scene changes in a video using FFmpeg.
    
    Args:
        video_path: Path to video file
        threshold: Scene detection sensitivity (0.0-1.0, lower = more sensitive)
    
    Returns:
        List of timestamps (in seconds) where scene changes occur
    """
    print(f"[SCENE] Detecting scenes in {os.path.basename(video_path)}...")
    
    # Escape path for lavfi filter
    escaped_path = video_path.replace(chr(92), '/').replace(':', r'\:')
    
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-show_entries', 'frame=pts_time',
        '-select_streams', 'v',
        '-of', 'json',
        '-f', 'lavfi',
        f"movie='{escaped_path}',select='gt(scene,{threshold})'"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            # Try alternative method
            return detect_scenes_alternative(video_path, threshold)
        
        data = json.loads(result.stdout)
        timestamps = []
        
        if 'frames' in data:
            for frame in data['frames']:
                if 'pts_time' in frame:
                    timestamps.append(float(frame['pts_time']))
        
        print(f"[SCENE] Found {len(timestamps)} scene changes")
        return timestamps
        
    except Exception as e:
        print(f"[SCENE] Detection error: {e}")
        return detect_scenes_alternative(video_path, threshold)


def detect_scenes_alternative(video_path: str, threshold: float = 0.3) -> List[float]:
    """
    Alternative scene detection using ffmpeg filter output.
    More compatible across different systems.
    """
    print("[SCENE] Using alternative detection method...")
    
    cmd = [
        'ffmpeg',
        '-i', video_path,
        '-vf', f"select='gt(scene,{threshold})',showinfo",
        '-f', 'null',
        '-'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        output = result.stderr  # FFmpeg outputs to stderr
        
        timestamps = []
        # Parse showinfo output for pts_time
        pattern = r'pts_time:(\d+\.?\d*)'
        matches = re.findall(pattern, output)
        
        for match in matches:
            timestamps.append(float(match))
        
        print(f"[SCENE] Found {len(timestamps)} scene changes")
        return timestamps
        
    except Exception as e:
        print(f"[SCENE] Alternative detection error: {e}")
        return []


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds"""
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'json',
        video_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        return float(data['format']['duration'])
    except:
        return 0


def split_at_scenes(video_path: str, output_dir: str, min_duration: float = 5.0, max_duration: float = 60.0) -> List[str]:
    """
    Split video into segments at natural scene boundaries.
    
    Args:
        video_path: Source video path
        output_dir: Directory to save segments
        min_duration: Minimum segment length (seconds)
        max_duration: Maximum segment length (seconds)
    
    Returns:
        List of output file paths
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Get video duration
    total_duration = get_video_duration(video_path)
    if total_duration == 0:
        print("[SCENE] Could not get video duration")
        return []
    
    # Detect scenes
    scene_times = detect_scenes(video_path)
    
    # Add start and end points
    scene_times = [0] + scene_times + [total_duration]
    scene_times = sorted(list(set(scene_times)))  # Remove duplicates
    
    # Merge short segments and split long ones
    segments = []
    current_start = 0
    
    for i, time in enumerate(scene_times[1:], 1):
        duration = time - current_start
        
        if duration >= min_duration:
            # Segment is long enough
            if duration <= max_duration:
                segments.append((current_start, time))
                current_start = time
            else:
                # Split long segment into chunks
                while current_start < time:
                    end = min(current_start + max_duration, time)
                    if end - current_start >= min_duration:
                        segments.append((current_start, end))
                    current_start = end
    
    print(f"[SCENE] Splitting into {len(segments)} segments...")
    
    # Extract segments
    output_files = []
    base_name = os.path.splitext(os.path.basename(video_path))[0]
    
    for i, (start, end) in enumerate(segments):
        output_path = os.path.join(output_dir, f"{base_name}_scene{i+1:02d}.mp4")
        
        cmd = [
            'ffmpeg',
            '-y',
            '-i', video_path,
            '-ss', str(start),
            '-t', str(end - start),
            '-c', 'copy',
            '-avoid_negative_ts', 'make_zero',
            output_path
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, timeout=120)
            if os.path.exists(output_path):
                print(f"[SCENE] Created: {os.path.basename(output_path)} ({end-start:.1f}s)")
                output_files.append(output_path)
        except Exception as e:
            print(f"[SCENE] Error creating segment {i+1}: {e}")
    
    return output_files


def find_best_segments(video_path: str, count: int = 5, segment_length: float = 15.0) -> List[Tuple[float, float]]:
    """
    Find the best segments for a montage based on scene density.
    Areas with more scene changes are often more visually interesting.
    
    Args:
        video_path: Source video path
        count: Number of segments to find
        segment_length: Length of each segment
    
    Returns:
        List of (start, end) tuples
    """
    total_duration = get_video_duration(video_path)
    if total_duration == 0:
        return []
    
    scene_times = detect_scenes(video_path)
    
    if len(scene_times) < 2:
        # No scenes detected, use golden zone random sampling
        print("[SCENE] No scenes detected, using random sampling")
        import random
        
        zone_start = total_duration * 0.1
        zone_end = total_duration * 0.9
        
        segments = []
        for _ in range(count):
            start = random.uniform(zone_start, zone_end - segment_length)
            segments.append((start, start + segment_length))
        
        return sorted(segments)
    
    # Score each time window by scene density
    window_size = segment_length
    step = segment_length / 2
    
    scores = []
    current = total_duration * 0.1  # Skip intro
    
    while current + window_size < total_duration * 0.9:
        # Count scenes in this window
        scene_count = sum(1 for t in scene_times if current <= t <= current + window_size)
        scores.append((current, scene_count))
        current += step
    
    # Sort by score (most scenes = most interesting)
    scores.sort(key=lambda x: x[1], reverse=True)
    
    # Take top segments, ensuring no overlap
    segments = []
    for start, score in scores:
        end = start + segment_length
        
        # Check for overlap with existing segments
        overlaps = False
        for s, e in segments:
            if not (end < s or start > e):
                overlaps = True
                break
        
        if not overlaps:
            segments.append((start, end))
            if len(segments) >= count:
                break
    
    return sorted(segments)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        video = sys.argv[1]
        print(f"Testing scene detection on: {video}")
        
        scenes = detect_scenes(video)
        print(f"\nScene timestamps: {scenes[:20]}...")
        
        best = find_best_segments(video, count=5)
        print(f"\nBest segments for montage:")
        for i, (start, end) in enumerate(best):
            print(f"  {i+1}. {start:.1f}s - {end:.1f}s")
    else:
        print("Usage: python scene_splitter.py <video_path>")
