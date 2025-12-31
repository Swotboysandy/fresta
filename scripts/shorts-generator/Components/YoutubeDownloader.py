"""
YouTube Downloader - Modified for Windows compatibility
Uses pytubefix with silent progress to avoid Unicode errors
"""
import os
import re
from pytubefix import YouTube
import subprocess

def _silent_progress(stream, chunk, bytes_remaining):
    """Silent progress callback to avoid Windows Unicode errors"""
    pass

def get_video_size(stream):
    try:
        return stream.filesize / (1024 * 1024)
    except:
        return 0

def clean_filename(title):
    """Create safe filename from video title"""
    # Remove invalid characters
    cleaned = re.sub(r'[<>:"/\\|?*]', '', title)
    # Replace spaces with underscores
    cleaned = re.sub(r'\s+', '_', cleaned)
    # Limit length
    return cleaned[:60]

def download_youtube_video(url, output_dir='videos'):
    try:
        # Use silent progress callback to avoid Unicode errors on Windows
        yt = YouTube(url, on_progress_callback=_silent_progress)
        
        video_streams = yt.streams.filter(type="video").order_by('resolution').desc()
        audio_stream = yt.streams.filter(only_audio=True).first()
        
        if not video_streams:
            print("No video streams available")
            return None
        
        # Show available streams
        print("\nAvailable video streams:")
        for i, stream in enumerate(video_streams[:5]):
            size = get_video_size(stream)
            stream_type = "Progressive" if stream.is_progressive else "Adaptive"
            print(f"  {i}. Resolution: {stream.resolution}, Size: {size:.2f} MB, Type: {stream_type}")
        
        # Auto-select highest quality (skip interactive on Windows)
        selected_stream = video_streams[0]
        
        size = get_video_size(selected_stream)
        print(f"\nAuto-selected: {selected_stream.resolution}, Size: {size:.2f} MB")
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Use video ID as filename to avoid Unicode issues
        video_id = yt.video_id
        safe_title = clean_filename(yt.title) if yt.title else video_id
        
        print(f"Downloading video: {yt.title[:50]}...")
        
        # Download video
        video_file = selected_stream.download(
            output_path=output_dir, 
            filename=f"video_{video_id}.mp4"
        )
        
        if not selected_stream.is_progressive and audio_stream:
            print("Downloading audio...")
            audio_file = audio_stream.download(
                output_path=output_dir, 
                filename=f"audio_{video_id}.webm"
            )
            
            print("Merging video and audio with FFmpeg...")
            output_file = os.path.join(output_dir, f"{video_id}.mp4")
            
            # Use FFmpeg subprocess (more reliable on Windows)
            cmd = [
                'ffmpeg', '-y',
                '-i', video_file,
                '-i', audio_file,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-strict', 'experimental',
                output_file
            ]
            
            try:
                subprocess.run(cmd, capture_output=True, check=True, timeout=300)
                # Clean up temp files
                if os.path.exists(video_file):
                    os.remove(video_file)
                if os.path.exists(audio_file):
                    os.remove(audio_file)
            except Exception as e:
                print(f"FFmpeg merge failed: {e}")
                # Fall back to video-only
                output_file = video_file
        else:
            output_file = video_file
        
        print(f"Downloaded: {safe_title}")
        print(f"File path: {output_file}")
        
        return output_file
        
    except Exception as e:
        print(f"Download error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("Enter YouTube video URL: ")
    
    result = download_youtube_video(url)
    if result:
        print(f"Success: {result}")
    else:
        print("Download failed")
