import cv2
import numpy as np
from moviepy.editor import *
from Components.Speaker import detect_faces_and_speakers, Frames
global Fps

def analyze_video_for_crop(input_video_path, start_time=0):
    """Analyze video to determine the best x-coordinate for a 9:16 crop."""
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    cap = cv2.VideoCapture(input_video_path, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print("Error: Could not open video for analysis.")
        return None, None

    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    vertical_height = original_height
    vertical_width = int(vertical_height * 9 / 16)

    # Calculate start frame
    start_frame = int(start_time * fps)

    # Detect face position in a few frames from the start_time
    print(f"Analyzing video for best crop position starting at {start_time}s...")
    face_positions = []
    
    # Sample frames: 15 frames from the start of the segment
    sample_indices = [start_frame + i for i in range(0, min(30, total_frames - start_frame))]
    
    # Also sample a few from the middle of the segment (approx 15s later)
    if total_frames > start_frame + 500:
        sample_indices += [start_frame + 300 + i for i in range(10)]

    for i in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=8, minSize=(30, 30))
        if len(faces) > 0:
            best_face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = best_face
            face_positions.append(x + w // 2)

    cap.release()

    if face_positions:
        avg_face_x = int(sorted(face_positions)[len(face_positions) // 2])
        # Offset slightly for better framing
        avg_face_x += 60
        x_start = max(0, min(avg_face_x - vertical_width // 2, original_width - vertical_width))
        print(f"✓ Face detected. Optimal crop x={x_start}")
        return x_start, vertical_width
    else:
        # Default to center crop if no face detected
        x_start = max(0, (original_width - vertical_width) // 2)
        print(f"✗ No face detected. Using center crop at x={x_start}")
        return x_start, vertical_width


def crop_to_vertical(input_video_path, output_video_path, start_time=None, end_time=None):
    """Crop video to 9:16 and extract subclip using FFmpeg for speed."""
    # Analyze best crop position for this specific segment
    x_start, vertical_width = analyze_video_for_crop(input_video_path, start_time or 0)
    if x_start is None:
        return

    print(f"Processing segment {start_time}s to {end_time}s with FFmpeg...")
    
    # FFmpeg command: Seek first (fast seek) then crop
    cmd = ['ffmpeg', '-y']
    
    if start_time is not None:
        cmd += ['-ss', str(start_time)]
    if end_time is not None:
        duration = end_time - (start_time or 0)
        cmd += ['-t', str(duration)]
        
    cmd += [
        '-i', input_video_path,
        '-vf', f"crop={vertical_width}:ih:{x_start}:0",
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '18',
        '-c:a', 'aac',
        output_video_path
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"✓ Segment processed -> {output_video_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error processing with FFmpeg: {e.stderr.decode()}")


def combine_videos(video_with_audio, video_without_audio, output_filename):
    """Combine audio and video using FFmpeg (avoiding MoviePy re-encoding)."""
    print(f"Merging audio and video into {output_filename}...")
    
    # We take video from video_without_audio and audio from video_with_audio
    # Use -c:v copy if they share parameters, but here subtitles were burned, so we just merge
    cmd = [
        'ffmpeg', '-y',
        '-i', video_without_audio,
        '-i', video_with_audio,
        '-map', '0:v:0',    # Video from first input
        '-map', '1:a:0',    # Audio from second input
        '-c:v', 'copy',     # Don't re-encode video again!
        '-c:a', 'aac',
        '-shortest',
        output_filename
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"✓ Final video saved as {output_filename}")
    except subprocess.CalledProcessError as e:
        print(f"Error merging with FFmpeg: {e.stderr.decode()}")
        # Fallback to MoviePy if FFmpeg fails (less likely)
        from moviepy.editor import VideoFileClip
        clip_v = VideoFileClip(video_without_audio)
        clip_a = VideoFileClip(video_with_audio)
        final = clip_v.set_audio(clip_a.audio)
        final.write_videofile(output_filename, codec='libx264', preset='fast')




if __name__ == "__main__":
    input_video_path = r'Out.mp4'
    output_video_path = 'Croped_output_video.mp4'
    final_video_path = 'final_video_with_audio.mp4'
    detect_faces_and_speakers(input_video_path, "DecOut.mp4")
    crop_to_vertical(input_video_path, output_video_path)
    combine_videos(input_video_path, output_video_path, final_video_path)



