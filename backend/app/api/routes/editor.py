import os
import re
import json
import logging
import asyncio
import subprocess
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["editor"])

# Global task state storage
rendering_tasks: Dict[str, Dict[str, Any]] = {}

# Ensure static directories exist
os.makedirs("static/uploads", exist_ok=True)
os.makedirs("static/exports", exist_ok=True)


class ClipInfo(BaseModel):
    id: str
    name: str
    url: str
    start: float  # time on timeline (seconds)
    end: float  # time on timeline (seconds)
    sourceStart: float  # trim start in source (seconds)
    sourceEnd: float  # trim start in source (seconds)
    brightness: Optional[float] = 0.0
    contrast: Optional[float] = 1.0
    blur: Optional[float] = 0.0
    volume: Optional[float] = 1.0
    fadeIn: Optional[float] = 0.0
    fadeOut: Optional[float] = 0.0


class TextInfo(BaseModel):
    id: str
    text: str
    start: float
    end: float
    x: str  # percentage fraction or pixel or preset 'center'
    y: str  # percentage fraction or pixel or preset 'bottom'/'top'
    fontSize: Optional[int] = 28
    fontColor: Optional[str] = "white"


class LogoInfo(BaseModel):
    url: str
    position: str  # 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    size: int  # width in pixels
    opacity: float  # 0.0 to 1.0


class ExportPayload(BaseModel):
    resolution: str  # '360p', '480p', '720p', or '1080p'
    videoTrack: List[ClipInfo]
    audioTrack: List[ClipInfo]
    textTrack: List[TextInfo]
    logo: Optional[LogoInfo] = None


def get_media_info(filepath: str) -> Dict[str, Any]:
    """Inspect media file using ffprobe and return info."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        filepath
    ]
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return json.loads(result.stdout)
    except Exception as e:
        logger.error(f"ffprobe failed for {filepath}: {e}")
        return {}


def resolve_filepath(url_or_path: str) -> str:
    """Map standard URLs or relative asset paths to valid local file paths."""
    clean_url = url_or_path.split('?')[0]
    
    # Check absolute HTTP paths served locally
    if clean_url.startswith("http://") or clean_url.startswith("https://"):
        # Local uploads
        if "/static/" in clean_url:
            parts = clean_url.split("/static/")
            path = os.path.join("static", parts[1])
            if os.path.exists(path):
                return path
        # Frontend preset videos/images
        for keyword in ["videos", "images"]:
            if f"/{keyword}/" in clean_url:
                parts = clean_url.split(f"/{keyword}/")
                path = os.path.abspath(os.path.join("..", "frontend", "public", keyword, parts[1]))
                if os.path.exists(path):
                    return path
                    
    # Check relative static routing paths
    if clean_url.startswith("/static/"):
        path = clean_url.lstrip("/")
        if os.path.exists(path):
            return path
            
    # Check frontend public presets
    for keyword in ["videos", "images"]:
        if clean_url.startswith(f"/{keyword}/"):
            path = os.path.abspath(os.path.join("..", "frontend", "public", keyword, clean_url.replace(f"/{keyword}/", "")))
            if os.path.exists(path):
                return path

    # Check directly inside static uploads
    filename = os.path.basename(clean_url)
    uploads_path = os.path.join("static", "uploads", filename)
    if os.path.exists(uploads_path):
        return uploads_path

    # Fallback to current path if exists
    if os.path.exists(clean_url):
        return clean_url
        
    return clean_url


@router.post("/editor/upload")
async def upload_file(request: Request, filename: str = Query(...)):
    """Receives raw binary file payload and saves it to static/uploads."""
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty file payload")

    # Clean filename
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    filepath = os.path.join("static", "uploads", safe_filename)

    try:
        with open(filepath, "wb") as f:
            f.write(body)
    except Exception as e:
        logger.error(f"Failed to write uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to write file to disk")

    # Run ffprobe
    info = get_media_info(filepath)
    format_info = info.get("format", {})
    streams = info.get("streams", [])

    duration = float(format_info.get("duration", 0.0))
    width = None
    height = None
    media_type = "unknown"

    # Detect file type
    for stream in streams:
        codec_type = stream.get("codec_type")
        if codec_type == "video":
            media_type = "video"
            width = int(stream.get("width", 0))
            height = int(stream.get("height", 0))
            break
        elif codec_type == "audio":
            media_type = "audio"

    # If format says image or width/height are set but duration is tiny, check if it's an image
    if media_type == "video" and duration <= 0.1:
        media_type = "image"
        duration = 5.0  # default duration for images

    return {
        "id": safe_filename,
        "name": filename,
        "url": f"/static/uploads/{safe_filename}",
        "type": media_type,
        "duration": duration,
        "width": width,
        "height": height,
    }


def run_ffmpeg_render(task_id: str, payload: ExportPayload):
    """Compiles the dynamic FFmpeg command and processes the video in a background thread."""
    try:
        rendering_tasks[task_id] = {
            "status": "rendering",
            "progress": 0,
            "error": None,
            "url": None
        }

        # Resolve output specifications
        if payload.resolution == "1080p":
            res_w, res_h = (1920, 1080)
        elif payload.resolution == "720p":
            res_w, res_h = (1280, 720)
        elif payload.resolution == "480p":
            res_w, res_h = (854, 480)
        elif payload.resolution == "360p":
            res_w, res_h = (640, 360)
        else:
            res_w, res_h = (1280, 720)
        output_filepath = f"static/exports/{task_id}.mp4"

        # Resolve inputs and total duration
        total_duration = 0.0
        for clip in payload.videoTrack:
            total_duration = max(total_duration, clip.end)
        for clip in payload.audioTrack:
            total_duration = max(total_duration, clip.end)
        for text in payload.textTrack:
            total_duration = max(total_duration, text.end)

        if total_duration <= 0.0:
            total_duration = 5.0  # fallback

        # Collect unique input files and map them to indices
        unique_files = []
        file_to_idx = {}

        def add_file(url):
            resolved = resolve_filepath(url)
            if resolved not in file_to_idx:
                file_to_idx[resolved] = len(unique_files)
                unique_files.append(resolved)
            return file_to_idx[resolved]

        for clip in payload.videoTrack:
            add_file(clip.url)
        for clip in payload.audioTrack:
            add_file(clip.url)
        
        logo_idx = None
        if payload.logo:
            logo_idx = add_file(payload.logo.url)

        # Build FFmpeg command inputs list
        ffmpeg_cmd = ["ffmpeg", "-y"]
        for filepath in unique_files:
            ffmpeg_cmd.extend(["-i", filepath])

        # Filter complex builder
        filter_parts = []
        
        # Base backgrounds
        filter_parts.append(f"color=c=black:s={res_w}x{res_h}:d={total_duration} [canvas_v]")
        filter_parts.append(f"anullsrc=r=44100:cl=stereo:d={total_duration} [canvas_a]")

        # 1. Video overlays processing
        current_video_label = "canvas_v"
        for idx, clip in enumerate(payload.videoTrack):
            in_idx = file_to_idx[resolve_filepath(clip.url)]
            clip_dur = clip.end - clip.start
            
            # Trim
            trim_filter = f"[{in_idx}:v] trim=start={clip.sourceStart}:end={clip.sourceEnd},setpts=PTS-STARTPTS"
            
            # Scale & pad
            scale_filter = f"scale={res_w}:{res_h}:force_original_aspect_ratio=decrease,pad={res_w}:{res_h}:(ow-iw)/2:(oh-ih)/2"
            
            # Eq/Brightness/Contrast/Blur
            effects = []
            if clip.brightness != 0.0 or clip.contrast != 1.0:
                effects.append(f"eq=brightness={clip.brightness}:contrast={clip.contrast}")
            if clip.blur > 0.0:
                # scale blur relative to resolution
                sigma = min(20, max(0.1, clip.blur * 2))
                effects.append(f"gblur=sigma={sigma}")
            
            # Fade-in/out
            if clip.fadeIn > 0.0:
                effects.append(f"fade=t=in:st=0:d={clip.fadeIn}")
            if clip.fadeOut > 0.0:
                effects.append(f"fade=t=out:st={clip_dur - clip.fadeOut}:d={clip.fadeOut}")

            effects_chain = f",{','.join(effects)}" if effects else ""
            
            # Chain definition
            v_label = f"v_clip_{idx}"
            filter_parts.append(f"{trim_filter},{scale_filter}{effects_chain} [{v_label}]")
            
            # Overlay onto current stream
            v_next_label = f"v_overlay_{idx}"
            filter_parts.append(f"[{current_video_label}][{v_label}] overlay=x=0:y=0:enable='between(t,{clip.start},{clip.end})' [{v_next_label}]")
            current_video_label = v_next_label

        # 2. Audio mixing processing
        delayed_audio_labels = []
        for idx, clip in enumerate(payload.audioTrack):
            in_idx = file_to_idx[resolve_filepath(clip.url)]
            clip_dur = clip.end - clip.start
            
            # Trim
            trim_filter = f"[{in_idx}:a] atrim=start={clip.sourceStart}:end={clip.sourceEnd},asetpts=PTS-STARTPTS"
            
            # Volume and afade
            audio_effects = []
            if clip.volume != 1.0:
                audio_effects.append(f"volume={clip.volume}")
            if clip.fadeIn > 0.0:
                audio_effects.append(f"afade=t=in:ss=0:d={clip.fadeIn}")
            if clip.fadeOut > 0.0:
                audio_effects.append(f"afade=t=out:st={clip_dur - clip.fadeOut}:d={clip.fadeOut}")
                
            audio_chain = f",{','.join(audio_effects)}" if audio_effects else ""
            
            # Delay in ms
            delay_ms = int(clip.start * 1000)
            
            a_label = f"a_clip_{idx}"
            filter_parts.append(f"{trim_filter}{audio_chain},adelay={delay_ms}|{delay_ms} [{a_label}]")
            delayed_audio_labels.append(f"[{a_label}]")

        # Mix all audio
        current_audio_label = "mixed_a"
        if delayed_audio_labels:
            mix_inputs = len(delayed_audio_labels) + 1
            filter_parts.append(f"[canvas_a]{''.join(delayed_audio_labels)} amix=inputs={mix_inputs}:duration=first:normalize=0 [{current_audio_label}]")
        else:
            filter_parts.append(f"[canvas_a] acopy [{current_audio_label}]")

        # 3. Text drawing
        for idx, text in enumerate(payload.textTrack):
            # Coordinates presets and expressions
            x_expr = "(w-tw)/2"
            if text.x != "center":
                try:
                    val = float(text.x)
                    x_expr = f"w*{val}" if val <= 1.0 else str(val)
                except ValueError:
                    x_expr = "20"

            y_expr = "h-th-60"
            if text.y == "top":
                y_expr = "60"
            elif text.y != "bottom" and text.y != "center":
                try:
                    val = float(text.y)
                    y_expr = f"h*{val}" if val <= 1.0 else str(val)
                except ValueError:
                    y_expr = "h-th-60"
            elif text.y == "center":
                y_expr = "(h-th)/2"

            # Clean and escape text for drawtext
            clean_text = text.text.replace("'", "'\\\\''").replace(":", "\\:")
            
            # Try to resolve Windows font, fallback to standard sans
            font_part = ""
            if os.path.exists("C:/Windows/Fonts/arial.ttf"):
                font_part = ":fontfile='C\\\\:/Windows/Fonts/arial.ttf'"
            
            v_text_label = f"v_text_{idx}"
            filter_parts.append(
                f"[{current_video_label}] drawtext=text='{clean_text}':fontsize={text.fontSize}:fontcolor={text.fontColor}{font_part}:x='{x_expr}':y='{y_expr}':enable='between(t,{text.start},{text.end})' [{v_text_label}]"
            )
            current_video_label = v_text_label

        # 4. Logo branding overlay
        if payload.logo and logo_idx is not None:
            logo = payload.logo
            
            # Scale logo
            filter_parts.append(f"[{logo_idx}:v] scale={logo.size}:-1 [logo_scaled]")
            
            # Opacity
            filter_parts.append(f"[logo_scaled] format=pix_fmts=rgba,colorchannelmixer=aa={logo.opacity} [logo_alpha]")
            
            # Positioning presets
            logo_x, logo_y = "20", "20"
            if logo.position == "top-right":
                logo_x, logo_y = "W-w-20", "20"
            elif logo.position == "bottom-left":
                logo_x, logo_y = "20", "H-h-20"
            elif logo.position == "bottom-right":
                logo_x, logo_y = "W-w-20", "H-h-20"

            v_logo_label = "v_final_logo"
            filter_parts.append(f"[{current_video_label}][logo_alpha] overlay=x='{logo_x}':y='{logo_y}' [{v_logo_label}]")
            current_video_label = v_logo_label

        # Set final outputs link labels
        final_video_label = current_video_label
        final_audio_label = current_audio_label

        # Assemble filter complex option
        filter_complex_str = ";\n".join(filter_parts)
        ffmpeg_cmd.extend(["-filter_complex", filter_complex_str])
        
        # Link inputs to final output stream
        ffmpeg_cmd.extend([
            "-map", f"[{final_video_label}]",
            "-map", f"[{final_audio_label}]",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-shortest",
            output_filepath
        ])

        logger.info(f"Generated FFmpeg Command for task {task_id}:\n" + " ".join(ffmpeg_cmd))

        # Launch process and parse progress
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        time_regex = re.compile(r"time=(\d+):(\d+):(\d+)\.(\d+)")
        
        # Monitor the execution
        while True:
            line = process.stdout.readline()
            if not line:
                break
            
            # Parse FFmpeg output for time codes
            match = time_regex.search(line)
            if match:
                h, m, s, ms = match.groups()
                current_time = int(h) * 3600 + int(m) * 60 + int(s) + float(ms) / 100
                progress = min(99, int((current_time / total_duration) * 100))
                rendering_tasks[task_id]["progress"] = progress

        process.wait()

        if process.returncode == 0:
            rendering_tasks[task_id]["status"] = "completed"
            rendering_tasks[task_id]["progress"] = 100
            rendering_tasks[task_id]["url"] = f"/static/exports/{task_id}.mp4"
            logger.info(f"Video export task {task_id} completed successfully.")
        else:
            rendering_tasks[task_id]["status"] = "failed"
            rendering_tasks[task_id]["error"] = f"FFmpeg exited with non-zero code: {process.returncode}"
            logger.error(f"Video export task {task_id} failed.")

    except Exception as e:
        logger.error(f"Error in run_ffmpeg_render task {task_id}: {e}", exc_info=True)
        rendering_tasks[task_id] = {
            "status": "failed",
            "progress": 0,
            "error": str(e),
            "url": None
        }


@router.post("/editor/export")
def export_video(payload: ExportPayload, background_tasks: BackgroundTasks):
    """Initiates the video export process and assigns a task ID."""
    import uuid
    task_id = str(uuid.uuid4())
    
    # Run the FFmpeg script in background
    background_tasks.add_task(run_ffmpeg_render, task_id, payload)
    
    return {"task_id": task_id, "status": "pending"}


@router.get("/editor/export/status/{task_id}")
def get_export_status(task_id: str):
    """Returns the current rendering progress or final download url."""
    task = rendering_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
