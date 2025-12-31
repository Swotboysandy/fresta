from moviepy.video.io.VideoFileClip import VideoFileClip
from moviepy.editor import VideoFileClip
import subprocess

def extractAudio(video_path, audio_path="audio.wav"):
    try:
        video_clip = VideoFileClip(video_path)
        video_clip.audio.write_audiofile(audio_path)
        video_clip.close()
        print(f"Extracted audio to: {audio_path}")
        return audio_path
    except Exception as e:
        print(f"An error occurred while extracting audio: {e}")
        return None


def crop_video(input_file, output_file, start_time, end_time):
    import os
    # Ensure paths are absolute and forward slashes for FFmpeg
    input_file = os.path.abspath(input_file)
    output_file = os.path.abspath(output_file)
    
    with VideoFileClip(input_file) as video:
        # Ensure end_time doesn't exceed video duration
        max_time = video.duration - 0.1
        if end_time > max_time:
            print(f"Warning: Capping end time from {end_time}s to {max_time}s")
            end_time = max_time
        
        if start_time >= end_time:
            print(f"Error: Invalid time range {start_time}s - {end_time}s")
            return
        
        cropped_video = video.subclip(start_time, end_time)
        cropped_video.write_videofile(
            output_file, 
            codec='libx264',
            audio_codec='aac',
            threads=4,
            preset='ultrafast',
            logger=None  # Reduce console spam
        )

# Example usage:
if __name__ == "__main__":
    input_file = r"Example.mp4" ## Test
    print(input_file)
    output_file = "Short.mp4"
    start_time = 31.92 
    end_time = 49.2   

    crop_video(input_file, output_file, start_time, end_time)

