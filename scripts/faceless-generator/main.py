import sys
import uuid
import time
import random
import argparse
from pathlib import Path

# Add components path
sys.path.insert(0, str(Path(__file__).parent))

from Components.Configuration import VideoConfig
from Components.TTSManager import TTSManager
from Components.ScriptGenerator import ScriptGenerator
from Components.VideoEditor import VideoEditor
from Components.Subtitles import SubtitleManager
from Components.Metadata import MetadataGenerator

# Re-use existing YoutubeDownloader from shorts-generator if possible, 
# otherwise import locally if we moved it. 
# We'll assume the original import path is still valid or we need to copy it.
# For now, let's use the one from shorts-generator as originally imported.
sys.path.insert(0, str(Path(__file__).parent.parent / "shorts-generator"))
from Components.YoutubeDownloader import download_youtube_video
from Components.Transcription import transcribeAudio

def main():
    parser = argparse.ArgumentParser(description="AI Faceless Video Generator")
    parser.add_argument("url", nargs="?", help="YouTube URL")
    parser.add_argument("--style", default="Ruthless", help="Narrator Persona")
    parser.add_argument("--voice", default="en-US-GuyNeural", help="TTS Voice")
    parser.add_argument("--engine", default="edge", choices=["edge", "google", "huggingface"], help="TTS Engine")
    parser.add_argument("--language", default="english", help="Target Language")
    parser.add_argument("--duration", type=int, default=30, help="Target Duration (sec)")
    parser.add_argument("--variations", type=int, default=3, help="Number of variations")
    args = parser.parse_args()

    # interactive mode
    if not args.url:
        args.url = input("Enter YouTube URL: ")

    config = VideoConfig()
    tts_manager = TTSManager(config)
    script_gen = ScriptGenerator(config)
    editor = VideoEditor(config)
    sub_manager = SubtitleManager(config)
    meta_gen = MetadataGenerator(config)

    print(f"\n{'='*60}")
    print(f"AI FACELESS VIDEO GENERATOR v3 (Refactored)")
    print(f"Style: {args.style} | Voice: {args.voice} | Engine: {args.engine}")
    print(f"{'='*60}\n")

    try:
        # 1. Download
        print("Step 1: Downloading Video...")
        dl_result = download_youtube_video(args.url)
        if isinstance(dl_result, tuple):
            video_path, original_title = dl_result
            video_path = video_path.replace(".webm", ".mp4")
        else:
            print("Download failed.") 
            return

        # 2. Transcribe (Get Context)
        print("Step 2: Transcribing for Context...")
        full_text = sub_manager.download_youtube_subtitles(args.url, "init")
        if not full_text:
            audio_path = str(config.temp_dir / "temp_audio.wav")
            editor.extract_audio(video_path, audio_path)
            transcriptions = transcribeAudio(audio_path)
            full_text = " ".join([t[0] for t in transcriptions])

        print(f"Context length: {len(full_text.split())} words")

        # 3. Process Variations
        for i in range(args.variations):
            session_id = str(uuid.uuid4())[:8]
            tts_manager.set_session_id(session_id)
            print(f"\n--- Generating Variation {i+1}/{args.variations} [ID: {session_id}] ---")

            # A. Generate Script/Commentary
            # Split context roughly
            total_chars = len(full_text)
            segment = total_chars // args.variations
            start, end = i*segment, (i+1)*segment
            context_chunk = full_text[start:end]

            # Generate Script
            script_data = script_gen.generate_script(context_chunk, args.duration, args.style, args.language)
            sentences = script_data['sentences']
            mood = script_data.get('mood', 'Neutral')
            
            print(f"Mood: {mood}")
            print(f"Script: {script_data['narration'][:100]}...")

            # B. TTS
            tts_path = str(config.temp_dir / f"tts_{session_id}.mp3")
            tts_path, timestamps = tts_manager.generate_with_timestamps(
                sentences, tts_path, args.voice, args.engine
            )
            tts_duration = timestamps[-1]['end']

            # C. Video Cuts (Smart Cuts)
            # Offset based on variation index
            offset = i / args.variations
            num_cuts = max(3, int(tts_duration / 2.5))
            cuts = editor.create_video_cuts(video_path, tts_duration, num_cuts, session_id, offset)
            
            concat_video = str(config.temp_dir / f"concat_{session_id}.mp4")
            editor.concatenate_clips(cuts, concat_video, tts_duration)

            # D. Subtitles
            sub_path = str(config.temp_dir / f"subs_{session_id}.srt")
            # If whisper available, use it for word-level sync
            if not sub_manager.generate_whisper_subtitles(tts_path, sub_path):
                # Fallback to timestamp sync
                sub_manager.create_srt(timestamps, sub_path)

            # E. Assembly
            music_file = config.music_dir / "soft-piano.mp3" # TODO: Dynamic Music Selection based on Mood
            final_output = config.output_dir / f"faceless_{session_id}_v{i+1}.mp4"
            
            editor.assemble_final_video(
                concat_video, tts_path, sub_path, 
                str(music_file) if music_file.exists() else None, 
                str(final_output)
            )
            
            # F. Metadata
            meta = meta_gen.generate_metadata(original_title, script_data['narration'], args.language)
            with open(str(final_output).replace('.mp4', '.json'), 'w', encoding='utf-8') as f:
                json.dump(meta, f, indent=2)

            print(f"✅ Variation {i+1} Done: {final_output}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
