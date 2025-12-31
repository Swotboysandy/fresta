"""
Batch Automation Module
Process multiple YouTube URLs or local videos in batch mode
"""
import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import List, Optional
import subprocess

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from downloader import download_video
from ai_analyzer import analyze_transcript_multi, analyze_video_multimodal
from cropper import crop_to_vertical
from montage import create_montage_short
from scene_splitter import split_at_scenes, find_best_segments


class BatchProcessor:
    """
    Batch processor for YouTube Clipper.
    Processes multiple videos with configurable options.
    """
    
    def __init__(self, output_dir: str = "output", log_file: str = None):
        self.output_dir = output_dir
        self.log_file = log_file or os.path.join(output_dir, "batch_log.json")
        self.results = []
        
        os.makedirs(output_dir, exist_ok=True)
    
    def log(self, message: str):
        """Print and optionally save log message"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
    
    def process_url(
        self, 
        url: str, 
        mode: str = "single",  # single, montage, scenes
        subtitle_style: str = "tiktok",
        ai_provider: str = "auto"
    ) -> dict:
        """
        Process a single URL or file path.
        
        Args:
            url: YouTube URL or local file path
            mode: Processing mode (single, montage, scenes)
            subtitle_style: Subtitle animation style
            ai_provider: AI provider for analysis (auto, gemini, grok)
        
        Returns:
            Result dict with status and output paths
        """
        result = {
            "input": url,
            "mode": mode,
            "status": "pending",
            "output_files": [],
            "error": None,
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            self.log(f"Processing: {url[:80]}...")
            
            # Determine if local file or URL
            is_local = os.path.exists(url)
            
            if is_local:
                video_path = url
                subtitle_path = self._find_subtitle(url)
                video_id = os.path.splitext(os.path.basename(url))[0]
            else:
                # Download from YouTube
                self.log("Downloading video...")
                download_result = download_video(url, self.output_dir)
                video_path = download_result.get('video_path')
                subtitle_path = download_result.get('subtitle_path')
                video_id = download_result.get('video_id', 'unknown')
                
                if not video_path or not os.path.exists(video_path):
                    raise Exception("Download failed")
            
            self.log(f"Video: {os.path.basename(video_path)}")
            
            # Process based on mode
            if mode == "scenes":
                # Split into scene-based segments
                self.log("Splitting at scene boundaries...")
                scene_dir = os.path.join(self.output_dir, f"scenes_{video_id}")
                output_files = split_at_scenes(video_path, scene_dir)
                result["output_files"] = output_files
                
            elif mode == "montage":
                # Create montage compilation
                self.log("Creating montage compilation...")
                output_path = os.path.join(self.output_dir, f"montage_{video_id}.mp4")
                create_montage_short(video_path, output_path, duration=30, clip_length=3, subtitle_path=subtitle_path)
                result["output_files"] = [output_path]
                
            else:
                # Single clip mode - analyze and extract best segment
                self.log("Analyzing for best segment...")
                
                # Get transcript if available
                transcript = self._read_transcript(subtitle_path)
                
                if transcript:
                    clip_meta = analyze_transcript_multi(transcript, provider=ai_provider)
                else:
                    clip_meta = analyze_video_multimodal(video_path, provider="gemini")
                
                self.log(f"Found segment: {clip_meta.get('start', 0)}s - {clip_meta.get('end', 60)}s")
                
                # Crop to vertical
                output_path = os.path.join(self.output_dir, f"short_{video_id}.mp4")
                crop_to_vertical(
                    video_path,
                    output_path,
                    clip_meta.get('start', 0),
                    clip_meta.get('end', 60),
                    subtitle_path=subtitle_path
                )
                result["output_files"] = [output_path]
            
            result["status"] = "success"
            self.log(f"Completed: {len(result['output_files'])} file(s) created")
            
        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            self.log(f"Error: {e}")
        
        result["completed_at"] = datetime.now().isoformat()
        return result
    
    def _find_subtitle(self, video_path: str) -> Optional[str]:
        """Find sidecar subtitle file for a video"""
        base = os.path.splitext(video_path)[0]
        
        for ext in ['.en.vtt', '.vtt', '.en.srt', '.srt']:
            sub_path = base + ext
            if os.path.exists(sub_path):
                return sub_path
        
        return None
    
    def _read_transcript(self, subtitle_path: str) -> str:
        """Read transcript text from subtitle file"""
        if not subtitle_path or not os.path.exists(subtitle_path):
            return ""
        
        try:
            with open(subtitle_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Strip timestamps
            import re
            if subtitle_path.endswith('.srt'):
                # Remove SRT formatting
                content = re.sub(r'\d+\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}\n', '', content)
            else:
                # Remove VTT formatting
                content = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*\n', '', content)
                content = re.sub(r'WEBVTT.*\n', '', content)
            
            return content.strip()
        except:
            return ""
    
    def process_batch(
        self,
        urls: List[str],
        mode: str = "single",
        subtitle_style: str = "tiktok",
        ai_provider: str = "auto",
        delay: float = 2.0
    ) -> List[dict]:
        """
        Process multiple URLs in batch.
        
        Args:
            urls: List of YouTube URLs or file paths
            mode: Processing mode for all videos
            subtitle_style: Subtitle style preset
            ai_provider: AI provider for analysis
            delay: Delay between processing (seconds)
        
        Returns:
            List of result dicts
        """
        self.log(f"Starting batch processing of {len(urls)} items...")
        self.log(f"Mode: {mode}, Style: {subtitle_style}, AI: {ai_provider}")
        
        results = []
        
        for i, url in enumerate(urls):
            self.log(f"\n=== Item {i+1}/{len(urls)} ===")
            
            result = self.process_url(url, mode, subtitle_style, ai_provider)
            results.append(result)
            
            # Save progress
            self._save_results(results)
            
            # Delay between items
            if i < len(urls) - 1:
                self.log(f"Waiting {delay}s before next item...")
                time.sleep(delay)
        
        # Final summary
        success = sum(1 for r in results if r['status'] == 'success')
        errors = sum(1 for r in results if r['status'] == 'error')
        
        self.log(f"\n=== Batch Complete ===")
        self.log(f"Success: {success}, Errors: {errors}")
        
        return results
    
    def _save_results(self, results: List[dict]):
        """Save results to JSON file"""
        try:
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "batch_id": datetime.now().strftime("%Y%m%d_%H%M%S"),
                    "total": len(results),
                    "success": sum(1 for r in results if r['status'] == 'success'),
                    "errors": sum(1 for r in results if r['status'] == 'error'),
                    "results": results
                }, f, indent=2)
        except:
            pass
    
    def process_from_file(
        self,
        input_file: str,
        mode: str = "single",
        subtitle_style: str = "tiktok",
        ai_provider: str = "auto"
    ) -> List[dict]:
        """
        Process URLs from a text file (one URL per line).
        
        Args:
            input_file: Path to text file with URLs
            mode: Processing mode
            subtitle_style: Subtitle style
            ai_provider: AI provider
        
        Returns:
            List of result dicts
        """
        if not os.path.exists(input_file):
            self.log(f"Error: File not found: {input_file}")
            return []
        
        with open(input_file, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        
        self.log(f"Loaded {len(urls)} URLs from {input_file}")
        
        return self.process_batch(urls, mode, subtitle_style, ai_provider)


def main():
    parser = argparse.ArgumentParser(
        description="Batch process YouTube videos into Shorts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process single URL
  python batch_processor.py "https://youtube.com/watch?v=xxx"

  # Process multiple URLs
  python batch_processor.py url1 url2 url3 --mode montage

  # Process from file
  python batch_processor.py --file urls.txt --mode scenes

  # Use specific AI provider
  python batch_processor.py url --ai grok

URLs file format (one per line):
  https://youtube.com/watch?v=xxx
  # Comments start with #
  https://youtube.com/watch?v=yyy
        """
    )
    
    parser.add_argument('urls', nargs='*', help='YouTube URLs or file paths')
    parser.add_argument('--file', '-f', help='Text file with URLs (one per line)')
    parser.add_argument('--output', '-o', default='output', help='Output directory')
    parser.add_argument('--mode', '-m', choices=['single', 'montage', 'scenes'], 
                        default='single', help='Processing mode')
    parser.add_argument('--style', '-s', choices=['tiktok', 'minimal', 'bold', 'neon'],
                        default='tiktok', help='Subtitle style')
    parser.add_argument('--ai', choices=['auto', 'gemini', 'grok'],
                        default='auto', help='AI provider for analysis')
    parser.add_argument('--delay', '-d', type=float, default=2.0,
                        help='Delay between items (seconds)')
    
    args = parser.parse_args()
    
    if not args.urls and not args.file:
        parser.print_help()
        return
    
    processor = BatchProcessor(output_dir=args.output)
    
    if args.file:
        processor.process_from_file(
            args.file,
            mode=args.mode,
            subtitle_style=args.style,
            ai_provider=args.ai
        )
    else:
        processor.process_batch(
            args.urls,
            mode=args.mode,
            subtitle_style=args.style,
            ai_provider=args.ai,
            delay=args.delay
        )


if __name__ == "__main__":
    main()
