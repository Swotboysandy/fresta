import os
from pytubefix import YouTube

def _silent_progress(stream, chunk, bytes_remaining):
    """Silent progress callback to avoid Windows encoding issues."""
    pass

def download_video(url, output_dir="output"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"Downloading {url} using Pytubefix...")
    
    try:
        yt = YouTube(url, on_progress_callback=_silent_progress)
        
        video_id = yt.video_id
        video_path = os.path.join(output_dir, f"{video_id}.mp4")
        
        # Download Video (Highest Res) – use video_id to avoid Unicode filename issues on Windows
        ys = yt.streams.get_highest_resolution()
        ys.download(output_path=output_dir, filename=f"{video_id}.mp4")
        
        print("Video downloaded.")
        
        # Download Subtitles (English)
        subtitle_path = None
        try:
            captions = yt.captions
            en_caption = captions.get_by_language_code('en')
            
            # Try auto-generated if no manual English
            if not en_caption:
                 en_caption = captions.get_by_language_code('a.en')

            if en_caption:
                srt_content = en_caption.generate_srt_captions()
                subtitle_path = os.path.join(output_dir, f"{video_id}.srt")
                with open(subtitle_path, "w", encoding="utf-8") as f:
                    f.write(srt_content)
                print("Subtitles downloaded.")
            else:
                print("No English subtitles found.")
        except Exception as sub_err:
            print(f"Subtitle retrieval failed: {sub_err}")

        return {
            "video_path": video_path,
            "title": video_id,  # Use ID instead of title to avoid encoding issues
            "id": video_id,
            "subtitle_path": subtitle_path,
            "duration": yt.length
        }

    except Exception as e:
        print(f"Error downloading video: {e}")
        return None

if __name__ == "__main__":
    # Test
    res = download_video("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    print(res)
