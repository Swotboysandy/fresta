"""
YouTube Segment Analyzer - Finds interesting segments
Uses chapter markers or random sampling from middle of video (where content is usually best)
"""
import random
from pytubefix import YouTube

def get_best_clip_segment(video_id, video_duration=None):
    """
    Gets the best clip segment from a YouTube video.
    
    Strategy:
    1. Try to get chapter markers (if video has chapters)
    2. Pick a segment from the "golden zone" (10%-80% of video) - avoiding intros/outros
    
    Returns:
        Dict with 'start', 'end', 'reason'
    """
    print(f"Analyzing video structure for {video_id}...")
    
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        yt = YouTube(url)
        
        duration = yt.length or video_duration or 300
        
        # Try to get chapters
        chapters = getattr(yt, 'chapters', None)
        
        if chapters and len(chapters) > 0:
            print(f"Found {len(chapters)} chapters!")
            # Pick a random chapter from the middle (not first or last)
            if len(chapters) > 2:
                middle_chapters = chapters[1:-1]
                chosen = random.choice(middle_chapters)
                start = chosen.start_seconds
                end = min(start + 60, duration)
                return {
                    'start': start,
                    'end': end,
                    'reason': f'Chapter: {chosen.title}',
                    'content_summary': f'From chapter: {chosen.title}'
                }
        
        # No chapters - use "golden zone" strategy
        # Most viral content is in the middle 10-80% of the video
        print("No chapters found. Using golden zone strategy...")
        
        if duration > 120:  # Video longer than 2 min
            # Golden zone: 10% to 80% of video
            zone_start = duration * 0.10
            zone_end = duration * 0.80
            
            # Pick random start point in golden zone
            max_start = zone_end - 60  # Leave room for 60s clip
            if max_start > zone_start:
                clip_start = random.uniform(zone_start, max_start)
                clip_end = clip_start + 60
                
                return {
                    'start': clip_start,
                    'end': clip_end,
                    'reason': f'Random segment from golden zone ({zone_start:.0f}s - {zone_end:.0f}s)',
                    'content_summary': 'Middle portion of video (avoiding intro/outro)'
                }
        
        # Short video - just use first 60 seconds
        return {
            'start': 0,
            'end': min(60, duration),
            'reason': 'Short video - using first 60 seconds',
            'content_summary': 'Start of video'
        }
        
    except Exception as e:
        print(f"Error analyzing video: {e}")
        # Fallback
        return {
            'start': 0,
            'end': 60,
            'reason': 'Fallback - could not analyze video',
            'content_summary': 'Default segment'
        }

if __name__ == "__main__":
    # Test
    test_id = "dQw4w9WgXcQ"
    result = get_best_clip_segment(test_id)
    print(f"\nBest segment: {result['start']:.1f}s - {result['end']:.1f}s")
    print(f"Reason: {result['reason']}")
