"""
AI YouTube Shorts Generator - Modified for Grok/Gemini support
Original: OpenAI GPT-4
Modified to use: xAI Grok (primary) / Google Gemini (fallback)
"""
from Components.YoutubeDownloader import download_youtube_video
from Components.Edit import extractAudio, crop_video
from Components.Transcription import transcribeAudio
from Components.LanguageTasks import GetHighlight
from Components.FaceCrop import crop_to_vertical, combine_videos
from Components.Subtitles import add_subtitles_to_video
import sys
import os
import uuid
import re

# Generate unique session ID for this run
session_id = str(uuid.uuid4())[:8]
print(f"Session ID: {session_id}")

# Check for auto-approve flag
auto_approve = "--auto-approve" in sys.argv
if auto_approve:
    sys.argv.remove("--auto-approve")

# Check if URL/file was provided as command-line argument
if len(sys.argv) > 1:
    url_or_file = sys.argv[1]
    print(f"Using input from command line: {url_or_file}")
else:
    url_or_file = input("Enter YouTube video URL or local video file path: ")

# Check if input is a local file
video_title = None
if os.path.isfile(url_or_file):
    print(f"Using local video file: {url_or_file}")
    Vid = url_or_file
    video_title = os.path.splitext(os.path.basename(url_or_file))[0]
else:
    print(f"Downloading from YouTube: {url_or_file}")
    Vid = download_youtube_video(url_or_file)
    if Vid:
        Vid = Vid.replace(".webm", ".mp4")
        print(f"Downloaded video successfully at {Vid}")
        video_title = os.path.splitext(os.path.basename(Vid))[0]


def clean_filename(title):
    """Clean and slugify title for filename"""
    cleaned = title.lower()
    cleaned = re.sub(r'[<>:"/\\|?*\[\]]', '', cleaned)
    cleaned = re.sub(r'[\s_]+', '-', cleaned)
    cleaned = re.sub(r'-+', '-', cleaned)
    cleaned = cleaned.strip('-')
    return cleaned[:80]


# Process video
if Vid:
    # Create unique temporary filenames
    audio_file = f"audio_{session_id}.wav"
    temp_clip = f"temp_clip_{session_id}.mp4"
    temp_cropped = f"temp_cropped_{session_id}.mp4"
    temp_subtitled = f"temp_subtitled_{session_id}.mp4"
    
    Audio = extractAudio(Vid, audio_file)
    if Audio:
        transcriptions = transcribeAudio(Audio)
        if len(transcriptions) > 0:
            print(f"\n{'='*60}")
            print(f"TRANSCRIPTION SUMMARY: {len(transcriptions)} segments")
            print(f"{'='*60}\n")
            TransText = ""
            
            for text, start, end in transcriptions:
                TransText += (f"{start} - {end}: {text}\n")
            
            print("Analyzing transcription to find best highlight...")
            start, stop = GetHighlight(TransText)
            
            if start is None or stop is None:
                print(f"\n{'='*60}")
                print("ERROR: Failed to get highlight from AI")
                print(f"{'='*60}")
                print("This could be due to:")
                print("  - API issues or rate limiting")
                print("  - Invalid API key")
                print("  - Network connectivity problems")
                print(f"\nTranscription summary:")
                print(f"  Total segments: {len(transcriptions)}")
                print(f"  Total length: {len(TransText)} characters")
                print(f"{'='*60}\n")
                sys.exit(1)
            
            # Auto-approve on Windows (no select.select support)
            approved = auto_approve or (os.name == 'nt')
            
            if not approved:
                while not approved:
                    print(f"\n{'='*60}")
                    print(f"SELECTED SEGMENT DETAILS:")
                    print(f"Time: {start}s - {stop}s ({stop-start}s duration)")
                    print(f"{'='*60}\n")
                    
                    print("Options:")
                    print("  [Enter/y] Approve and continue")
                    print("  [r] Regenerate selection")
                    print("  [n] Cancel")
                    print("\nAuto-approving in 15 seconds if no input...")
                    
                    try:
                        import select
                        ready, _, _ = select.select([sys.stdin], [], [], 15)
                        if ready:
                            user_input = sys.stdin.readline().strip().lower()
                            if user_input == 'r':
                                print("\nRegenerating selection...")
                                start, stop = GetHighlight(TransText)
                            elif user_input == 'n':
                                print("Cancelled by user")
                                sys.exit(0)
                            else:
                                print("Approved by user")
                                approved = True
                        else:
                            print("\nTimeout - auto-approving selection")
                            approved = True
                    except:
                        print("\nAuto-approving (Windows mode)")
                        approved = True
            else:
                print(f"\n{'='*60}")
                print(f"SELECTED SEGMENT: {start}s - {stop}s ({stop-start}s duration)")
                print(f"{'='*60}")
                print("Auto-approved\n")
            
            print(f"\n[OK] Final highlight: {start}s - {stop}s")
            
            if start >= 0 and stop > 0 and stop > start:
                print(f"\nCreating short video: {start}s - {stop}s ({stop-start}s duration)")
                
                print("Step 1/3: Extracting and cropping to vertical format (9:16)...")
                crop_to_vertical(Vid, temp_cropped, start, stop)
                
                print("Step 2/3: Adding subtitles to video...")
                add_subtitles_to_video(temp_cropped, temp_subtitled, transcriptions, video_start_time=start)
                
                # Generate final output filename
                clean_title = clean_filename(video_title) if video_title else "output"
                final_output = f"{clean_title}_{session_id}_short.mp4"
                
                print("Step 3/3: Finalizing video...")
                # If everything went well, temp_subtitled is our final video
                # But we use combine_videos to ensure audio is correct and handle any final container issues
                combine_videos(temp_cropped, temp_subtitled, final_output)
                
                print(f"\n{'='*60}")
                print(f"[OK] SUCCESS: {final_output} is ready!")
                print(f"{'='*60}\n")
                
                # Clean up temporary files
                try:
                    for temp_file in [audio_file, temp_clip, temp_cropped, temp_subtitled]:
                        if os.path.exists(temp_file):
                            os.remove(temp_file)
                    print(f"Cleaned up temporary files for session {session_id}")
                except Exception as e:
                    print(f"Warning: Could not clean up some temporary files: {e}")
            else:
                print("Error in getting highlight")
        else:
            print("No transcriptions found")
    else:
        print("No audio file found")
else:
    print("Unable to process the video")