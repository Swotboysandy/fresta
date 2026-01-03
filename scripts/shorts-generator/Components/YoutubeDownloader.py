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
    """Download using pytubefix with PO token"""
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        print(f"Downloading: {url}")
        
        # Use cached OAuth credentials (already logged in via terminal)
        yt = YouTube(url, use_oauth=True, allow_oauth_cache=True)
        
        # Get progressive stream (video+audio combined)
        stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
        if not stream:
            stream = yt.streams.filter(file_extension='mp4').order_by('resolution').desc().first()
        if not stream:
            stream = yt.streams.get_highest_resolution()
        
        if not stream:
            print("No stream found")
            return None
        
        print(f"Downloading {stream.resolution}...")
        filename = stream.download(output_path=output_dir)
        
        print(f"✓ Downloaded: {filename}")
        return filename
        
    except Exception as e:
        print(f"Download error: {e}")
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
