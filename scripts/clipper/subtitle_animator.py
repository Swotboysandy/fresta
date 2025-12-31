"""
Animated Subtitles Module
Creates TikTok-style word-by-word animated captions with highlighting effects
"""
import os
import re
import subprocess
from typing import List, Tuple

# Subtitle styling presets
STYLES = {
    "tiktok": {
        "font": "Impact",
        "font_size": 24,
        "primary_color": "&HFFFFFF",  # White
        "highlight_color": "&H00FFFF",  # Yellow (BGR format)
        "outline_color": "&H000000",  # Black
        "outline_width": 3,
        "bold": True,
        "position": "center",  # center, bottom, top
        "margin_v": 100
    },
    "minimal": {
        "font": "Arial",
        "font_size": 18,
        "primary_color": "&HFFFFFF",
        "highlight_color": "&H00FFFF",
        "outline_color": "&H000000",
        "outline_width": 2,
        "bold": False,
        "position": "bottom",
        "margin_v": 50
    },
    "bold": {
        "font": "Impact",
        "font_size": 32,
        "primary_color": "&HFFFFFF",
        "highlight_color": "&H0000FF",  # Red
        "outline_color": "&H000000",
        "outline_width": 4,
        "bold": True,
        "position": "center",
        "margin_v": 80
    },
    "neon": {
        "font": "Arial Black",
        "font_size": 22,
        "primary_color": "&HFF00FF",  # Magenta
        "highlight_color": "&H00FF00",  # Green
        "outline_color": "&H000000",
        "outline_width": 2,
        "bold": True,
        "position": "center",
        "margin_v": 100
    }
}


def parse_srt(srt_path: str) -> List[dict]:
    """
    Parse SRT file into list of subtitle entries.
    
    Returns:
        List of dicts with start, end (seconds), and text
    """
    if not os.path.exists(srt_path):
        return []
    
    with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    entries = []
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\n(.+?)(?=\n\n|\Z)'
    
    for match in re.finditer(pattern, content, re.DOTALL):
        idx, start_str, end_str, text = match.groups()
        
        entries.append({
            "index": int(idx),
            "start": srt_time_to_seconds(start_str),
            "end": srt_time_to_seconds(end_str),
            "text": text.strip().replace('\n', ' ')
        })
    
    return entries


def parse_vtt(vtt_path: str) -> List[dict]:
    """Parse VTT file into list of subtitle entries."""
    if not os.path.exists(vtt_path):
        return []
    
    with open(vtt_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    entries = []
    pattern = r'(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\n(.+?)(?=\n\n|\Z)'
    
    for i, match in enumerate(re.finditer(pattern, content, re.DOTALL)):
        start_str, end_str, text = match.groups()
        
        entries.append({
            "index": i + 1,
            "start": vtt_time_to_seconds(start_str),
            "end": vtt_time_to_seconds(end_str),
            "text": text.strip().replace('\n', ' ')
        })
    
    return entries


def srt_time_to_seconds(time_str: str) -> float:
    """Convert SRT timestamp to seconds"""
    parts = time_str.replace(',', '.').split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    seconds = float(parts[2])
    return hours * 3600 + minutes * 60 + seconds


def vtt_time_to_seconds(time_str: str) -> float:
    """Convert VTT timestamp to seconds"""
    parts = time_str.split(':')
    if len(parts) == 3:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    elif len(parts) == 2:
        minutes = int(parts[0])
        seconds = float(parts[1])
        return minutes * 60 + seconds
    return 0


def create_word_by_word_subs(entries: List[dict]) -> List[dict]:
    """
    Split subtitle entries into word-by-word timing.
    Each word gets its own timestamp based on average speaking rate.
    """
    word_entries = []
    
    for entry in entries:
        words = entry['text'].split()
        if not words:
            continue
        
        duration = entry['end'] - entry['start']
        word_duration = duration / len(words)
        
        current_time = entry['start']
        for word in words:
            word_entries.append({
                "start": current_time,
                "end": current_time + word_duration,
                "text": word,
                "full_text": entry['text'],
                "word_index": words.index(word)
            })
            current_time += word_duration
    
    return word_entries


def create_ass_subtitle(
    subtitle_path: str, 
    output_path: str, 
    style: str = "tiktok",
    animate: bool = True
) -> str:
    """
    Create an ASS subtitle file with optional word-by-word animation.
    
    Args:
        subtitle_path: Input SRT or VTT file
        output_path: Output ASS file path
        style: Style preset name
        animate: If True, create word-by-word animation
    
    Returns:
        Path to created ASS file
    """
    # Parse input subtitles
    if subtitle_path.endswith('.srt'):
        entries = parse_srt(subtitle_path)
    else:
        entries = parse_vtt(subtitle_path)
    
    if not entries:
        print("[SUBS] No subtitles found")
        return subtitle_path
    
    # Get style settings
    s = STYLES.get(style, STYLES["tiktok"])
    
    # Calculate alignment based on position
    alignment_map = {"bottom": 2, "center": 5, "top": 8}
    alignment = alignment_map.get(s["position"], 5)
    
    # Create ASS header
    ass_content = f"""[Script Info]
Title: Animated Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{s["font"]},{s["font_size"]},{s["primary_color"]},{s["highlight_color"]},{s["outline_color"]},&H80000000,{-1 if s["bold"] else 0},0,0,0,100,100,0,0,1,{s["outline_width"]},2,{alignment},10,10,{s["margin_v"]},1
Style: Highlight,{s["font"]},{s["font_size"]},{s["highlight_color"]},{s["primary_color"]},{s["outline_color"]},&H80000000,{-1 if s["bold"] else 0},0,0,0,100,100,0,0,1,{s["outline_width"]},2,{alignment},10,10,{s["margin_v"]},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    if animate:
        # Word-by-word animation
        word_entries = create_word_by_word_subs(entries)
        
        # Group by original subtitle timing
        current_group = []
        current_end = 0
        
        for word_entry in word_entries:
            if word_entry['start'] >= current_end and current_group:
                # New group - render previous group
                ass_content += render_animated_line(current_group, s)
                current_group = []
            
            current_group.append(word_entry)
            current_end = word_entry['end']
        
        # Render last group
        if current_group:
            ass_content += render_animated_line(current_group, s)
    else:
        # Simple subtitles without animation
        for entry in entries:
            start = seconds_to_ass_time(entry['start'])
            end = seconds_to_ass_time(entry['end'])
            text = entry['text'].replace('\n', '\\N')
            ass_content += f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n"
    
    # Write ASS file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_content)
    
    print(f"[SUBS] Created animated subtitles: {output_path}")
    return output_path


def render_animated_line(word_entries: List[dict], style: dict) -> str:
    """
    Render a line with word-by-word animation using ASS override codes.
    Uses karaoke-style highlighting effect.
    """
    if not word_entries:
        return ""
    
    lines = []
    
    # Get full text and timing
    full_text = word_entries[0].get('full_text', ' '.join(w['text'] for w in word_entries))
    words = full_text.split()
    
    start_time = word_entries[0]['start']
    end_time = word_entries[-1]['end']
    
    start_ass = seconds_to_ass_time(start_time)
    end_ass = seconds_to_ass_time(end_time)
    
    # Build karaoke text
    # Each word gets highlighted when spoken
    karaoke_text = ""
    for i, word_entry in enumerate(word_entries):
        word = word_entry['text']
        word_duration_cs = int((word_entry['end'] - word_entry['start']) * 100)  # centiseconds
        
        # Use {\kf} for smooth fill effect
        karaoke_text += f"{{\\kf{word_duration_cs}}}{word} "
    
    # Remove trailing space
    karaoke_text = karaoke_text.strip()
    
    lines.append(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{karaoke_text}\n")
    
    return ''.join(lines)


def seconds_to_ass_time(seconds: float) -> str:
    """Convert seconds to ASS timestamp format (H:MM:SS.CC)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours}:{minutes:02d}:{secs:05.2f}"


def burn_animated_subtitles(
    video_path: str, 
    subtitle_path: str, 
    output_path: str,
    style: str = "tiktok",
    animate: bool = True
) -> str:
    """
    Burn animated subtitles onto video using FFmpeg.
    
    Args:
        video_path: Source video
        subtitle_path: SRT or VTT subtitle file
        output_path: Output video path
        style: Style preset
        animate: Enable word-by-word animation
    
    Returns:
        Path to output video
    """
    # Create ASS file
    ass_path = subtitle_path.rsplit('.', 1)[0] + '.ass'
    create_ass_subtitle(subtitle_path, ass_path, style, animate)
    
    # Escape path for FFmpeg filter
    ass_path_escaped = ass_path.replace('\\', '/').replace(':', r'\:')
    
    # Build FFmpeg command
    cmd = [
        'ffmpeg',
        '-y',
        '-i', video_path,
        '-vf', f"ass='{ass_path_escaped}'",
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        output_path
    ]
    
    print(f"[SUBS] Burning subtitles onto video...")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode != 0:
            print(f"[SUBS] FFmpeg error: {result.stderr[:500]}")
            return video_path
        
        print(f"[SUBS] Created: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"[SUBS] Error burning subtitles: {e}")
        return video_path


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 2:
        video = sys.argv[1]
        subs = sys.argv[2]
        output = sys.argv[3] if len(sys.argv) > 3 else "output_animated.mp4"
        
        print(f"Creating animated subtitles...")
        burn_animated_subtitles(video, subs, output, style="tiktok", animate=True)
    else:
        print("Usage: python subtitle_animator.py <video> <subtitles> [output]")
        print("\nAvailable styles: tiktok, minimal, bold, neon")
