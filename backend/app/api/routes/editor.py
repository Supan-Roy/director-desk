import os
import math
import re
import json
import logging
import asyncio
import subprocess
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, Query, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from app.utils.security import RateLimiter, validate_media_magic_number

logger = logging.getLogger(__name__)

router = APIRouter(tags=["editor"])

# Global task state storage
rendering_tasks: Dict[str, Dict[str, Any]] = {}

# Global process tracking for cancel support
active_processes: Dict[str, subprocess.Popen] = {}

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
    grayscale: Optional[bool] = False
    sepia: Optional[bool] = False
    invert: Optional[bool] = False
    saturation: Optional[float] = 1.0
    hueRotate: Optional[float] = 0.0
    mirrorH: Optional[bool] = False
    mirrorV: Optional[bool] = False
    vignette: Optional[float] = 0.0
    edgeDetect: Optional[bool] = False
    sharpen: Optional[bool] = False
    fitMode: Optional[str] = "contain"  # 'contain' or 'cover'
    zoom: Optional[float] = 1.0
    panX: Optional[float] = 0.0
    panY: Optional[float] = 0.0


class TextInfo(BaseModel):
    id: str
    text: str
    start: float
    end: float
    x: str  # percentage fraction or pixel or preset 'center'
    y: str  # percentage fraction or pixel or preset 'bottom'/'top'
    fontSize: Optional[int] = 28
    fontColor: Optional[str] = "white"
    fontFamily: Optional[str] = "Sofia Sans"
    bold: Optional[bool] = False
    italic: Optional[bool] = False
    align: Optional[str] = "center"
    width: Optional[str] = "auto"
    height: Optional[str] = "auto"


class LogoInfo(BaseModel):
    url: str
    position: str  # 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    size: int  # width in pixels
    opacity: float  # 0.0 to 1.0


class VfxInfo(BaseModel):
    id: str
    name: str
    type: str  # 'environment', 'cinematic', 'action', 'sci-fi', 'fantasy', 'camera_fx'
    effectId: str
    start: float
    end: float
    x: Optional[str] = "center"
    y: Optional[str] = "center"
    scale: Optional[float] = 1.0
    rotation: Optional[float] = 0.0
    opacity: Optional[float] = 1.0
    blendMode: Optional[str] = "normal"  # 'normal', 'screen', 'add', 'lighten', 'multiply'
    hasAudio: Optional[bool] = False
    audioVolume: Optional[float] = 1.0


class ExportPayload(BaseModel):
    resolution: str  # '360p', '480p', '720p', or '1080p'
    format: Optional[str] = "mp4"  # 'mp4', 'mkv', 'avi', 'mov'
    aspectRatio: Optional[str] = "16:9"  # '16:9', '9:16', '4:3', '1.85:1', '2.39:1', '1.43:1', '1.90:1'
    videoTrack: List[ClipInfo]
    audioTrack: List[ClipInfo]
    textTrack: List[TextInfo]
    vfxTrack: List[VfxInfo] = []
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

    # Check frontend public root
    public_path = os.path.abspath(os.path.join("..", "frontend", "public", clean_url.lstrip("/")))
    if os.path.exists(public_path):
        return public_path

    # Check directly inside static uploads
    filename = os.path.basename(clean_url)
    uploads_path = os.path.join("static", "uploads", filename)
    if os.path.exists(uploads_path):
        return uploads_path

    # Fallback to current path if exists
    if os.path.exists(clean_url):
        return clean_url
        
    return clean_url


@router.post("/editor/upload", dependencies=[Depends(RateLimiter(limit=5, window=60))])
async def upload_file(request: Request, filename: str = Query(...)):
    """Receives raw binary file payload and saves it to static/uploads."""
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty file payload")

    # Guardrail: Validate file header (magic numbers) to prevent script injection
    if not validate_media_magic_number(body, filename):
        raise HTTPException(
            status_code=400,
            detail="Invalid file content: The file headers (magic numbers) do not match a supported media/text format or filename extension."
        )

    # Clean filename
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    filepath = os.path.join("static", "uploads", safe_filename)

    # Guardrail: Check total uploaded size (limit 2GB)
    MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024  # 2 GB
    current_total = 0
    existing_file_size = 0
    
    uploads_dir = os.path.join("static", "uploads")
    if os.path.exists(uploads_dir):
        for entry in os.scandir(uploads_dir):
            if entry.is_file():
                try:
                    size = entry.stat().st_size
                    current_total += size
                    if entry.name == safe_filename:
                        existing_file_size = size
                except Exception:
                    pass

    incoming_size = len(body)
    if current_total - existing_file_size + incoming_size > MAX_TOTAL_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Storage limit exceeded: The total size of all uploaded assets cannot exceed 2GB."
        )

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
            "url": None,
            "output_filepath": None
        }

        # Resolve output specifications based on resolution and aspect ratio
        ar_name = payload.aspectRatio or "16:9"
        
        # Base height map
        height_map = {
            "1080p": 1080,
            "720p": 720,
            "480p": 480,
            "360p": 360
        }
        base_h = height_map.get(payload.resolution, 720)
        
        if ar_name == "9:16":
            # Swap width and height for portrait
            if payload.resolution == "1080p":
                res_w, res_h = 1080, 1920
            elif payload.resolution == "720p":
                res_w, res_h = 720, 1280
            elif payload.resolution == "480p":
                res_w, res_h = 480, 854
            elif payload.resolution == "360p":
                res_w, res_h = 360, 640
            else:
                res_w, res_h = 720, 1280
        else:
            res_h = base_h
            # Calculate width based on ratio
            ratio_map = {
                "16:9": 16 / 9,
                "4:3": 4 / 3,
                "1.85:1": 1.85,
                "2.39:1": 2.39,
                "1.43:1": 1.43,
                "1.90:1": 1.90
            }
            ratio = ratio_map.get(ar_name, 16 / 9)
            res_w = int(round(res_h * ratio / 2)) * 2

        # Resolve output format extension
        ext = payload.format.lower() if payload.format else "mp4"
        if ext not in ["mp4", "mkv", "avi", "mov"]:
            ext = "mp4"
        output_filepath = f"static/exports/{task_id}.{ext}"
        rendering_tasks[task_id]["output_filepath"] = output_filepath

        # Resolve inputs and total duration
        total_duration = 0.0
        for clip in payload.videoTrack:
            total_duration = max(total_duration, clip.end)
        for clip in payload.audioTrack:
            total_duration = max(total_duration, clip.end)
        for text in payload.textTrack:
            total_duration = max(total_duration, text.end)
        for vfx in payload.vfxTrack:
            total_duration = max(total_duration, vfx.end)

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
        for vfx in payload.vfxTrack:
            if vfx.type != "camera_fx":
                vfx_url = f"/static/overlays/{vfx.effectId}.mp4"
                add_file(vfx_url)
            if vfx.hasAudio:
                sfx_url = f"/static/sfx/{vfx.effectId}.mp3"
                add_file(sfx_url)
        
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
            
            # Scale & pad / crop & zoom & pan
            filepath = resolve_filepath(clip.url)
            media_info = get_media_info(filepath)
            streams = media_info.get("streams", [])
            video_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
            iw = int(video_stream.get("width") or 0)
            ih = int(video_stream.get("height") or 0)
            if not iw or not ih:
                iw, ih = res_w, res_h # fallback

            fit = (clip.fitMode or "contain").lower()
            zoom = clip.zoom if clip.zoom is not None else 1.0
            pan_x = clip.panX if clip.panX is not None else 0.0
            pan_y = clip.panY if clip.panY is not None else 0.0

            if fit == "contain":
                # Contain mode with zoom and pan support (maintaining natural aspect ratio)
                crop_w = iw / zoom
                crop_h = ih / zoom
                
                # Clamp crop size to input dimensions
                crop_w = min(iw, crop_w)
                crop_h = min(ih, crop_h)
                
                # Bounded offsets
                max_shift_x = (iw - crop_w) / 2
                x_offset = (iw - crop_w) / 2 + (pan_x / 100.0) * max_shift_x
                
                max_shift_y = (ih - crop_h) / 2
                y_offset = (ih - crop_h) / 2 + (pan_y / 100.0) * max_shift_y
                
                crop_w = max(4, int(round(crop_w) // 2) * 2)
                crop_h = max(4, int(round(crop_h) // 2) * 2)
                x_offset = int(round(x_offset) // 2) * 2
                y_offset = int(round(y_offset) // 2) * 2
                
                scale_filter = f"crop={crop_w}:{crop_h}:{x_offset}:{y_offset},scale={res_w}:{res_h}:force_original_aspect_ratio=decrease,pad={res_w}:{res_h}:(ow-iw)/2:(oh-ih)/2"
            else:
                # Cover / Crop, Zoom & Pan mode
                target_ar = res_w / res_h
                input_ar = iw / ih
                
                if input_ar > target_ar:
                    # wider than target, crop sides
                    base_crop_h = ih
                    base_crop_w = ih * target_ar
                else:
                    # taller than target, crop top/bottom
                    base_crop_w = iw
                    base_crop_h = iw * (1.0 / target_ar)
                
                # Apply zoom
                crop_w = base_crop_w / zoom
                crop_h = base_crop_h / zoom
                
                # Clamp crop size to input dimensions
                crop_w = min(iw, crop_w)
                crop_h = min(ih, crop_h)
                
                # Bounded offsets
                max_shift_x = (iw - crop_w) / 2
                x_offset = (iw - crop_w) / 2 + (pan_x / 100.0) * max_shift_x
                
                max_shift_y = (ih - crop_h) / 2
                y_offset = (ih - crop_h) / 2 + (pan_y / 100.0) * max_shift_y
                
                crop_w = max(4, int(round(crop_w) // 2) * 2)
                crop_h = max(4, int(round(crop_h) // 2) * 2)
                x_offset = int(round(x_offset) // 2) * 2
                y_offset = int(round(y_offset) // 2) * 2
                
                scale_filter = f"crop={crop_w}:{crop_h}:{x_offset}:{y_offset},scale={res_w}:{res_h}"
            
            # Eq/Brightness/Contrast/Blur
            effects = []
            if clip.brightness != 0.0 or clip.contrast != 1.0:
                effects.append(f"eq=brightness={clip.brightness}:contrast={clip.contrast}")
            if clip.blur > 0.0:
                # scale blur relative to resolution
                sigma = min(20, max(0.1, clip.blur * 2))
                effects.append(f"gblur=sigma={sigma}")
            
            # Grayscale / Sepia / Invert
            if clip.grayscale:
                effects.append("format=gray")
            if clip.sepia:
                effects.append("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131")
            if clip.invert:
                effects.append("negate")
                
            # Saturation and Hue Rotate
            if (clip.saturation is not None and clip.saturation != 1.0) or (clip.hueRotate is not None and clip.hueRotate != 0.0):
                sat = clip.saturation if clip.saturation is not None else 1.0
                hue_deg = clip.hueRotate if clip.hueRotate is not None else 0.0
                effects.append(f"hue=h={hue_deg}:s={sat}")
                
            # Mirror transforms
            if clip.mirrorH:
                effects.append("hflip")
            if clip.mirrorV:
                effects.append("vflip")
                
            # Vignette overlay
            if clip.vignette is not None and clip.vignette > 0.0:
                angle = clip.vignette * 0.5
                effects.append(f"vignette=angle={angle}")
                
            # Edge Detect & Sharpen
            if clip.edgeDetect:
                effects.append("edgedetect")
            if clip.sharpen:
                effects.append("unsharp=5:5:1.0:5:5:0.0")
            
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

        # 1b. VFX overlays and Camera FX processing
        def resolve_pad_coord(coord, out_dim, in_dim):
            if not coord:
                return "0"
            c_str = str(coord).strip().lower()
            if c_str == "center":
                return f"({out_dim}-{in_dim})/2"
            elif c_str == "top" or c_str == "left":
                return "20"
            elif c_str == "bottom" or c_str == "right":
                return f"{out_dim}-{in_dim}-20"
            
            is_percent = False
            if c_str.endswith('%'):
                c_str = c_str[:-1].strip()
                is_percent = True
                
            try:
                val = float(c_str)
                if is_percent:
                    return f"{out_dim}*{val/100:.4f}-{in_dim}/2"
                else:
                    return f"{out_dim}*{val}" if val <= 1.0 else str(val)
            except ValueError:
                return "0"

        for idx, vfx in enumerate(payload.vfxTrack):
            vfx_dur = vfx.end - vfx.start
            if vfx_dur <= 0.0:
                continue

            if vfx.type == "camera_fx":
                # Camera FX procedurally rendered
                v_split_label_1 = f"v_cam_split_1_{idx}"
                v_split_label_2 = f"v_cam_split_2_{idx}"
                filter_parts.append(f"[{current_video_label}] split=2 [{v_split_label_1}][{v_split_label_2}]")
                
                v_fx_in = v_split_label_2
                v_fx_out = f"v_cam_out_{idx}"
                
                cam_filter = ""
                if vfx.effectId == "screen_shake":
                    cam_filter = f"crop=w=iw-40:h=ih-40:x='20+15*sin(2*PI*12*(t-{vfx.start}))':y='20+15*cos(2*PI*12*(t-{vfx.start}))',scale={res_w}:{res_h}"
                elif vfx.effectId == "zoom_punch":
                    cam_filter = f"zoompan=z='1.0+0.35*exp(-3.5*(t-{vfx.start}))':x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':d=1:s={res_w}x{res_h}"
                elif vfx.effectId == "motion_blur":
                    cam_filter = "tblend=all_mode=average,gblur=sigma=1.5"
                elif vfx.effectId == "flash_frame":
                    v_white_label = f"white_flash_{idx}"
                    v_white_fade = f"white_fade_{idx}"
                    filter_parts.append(f"color=c=white:s={res_w}x{res_h}:d={vfx_dur} [{v_white_label}]")
                    filter_parts.append(f"[{v_white_label}] fade=t=out:st=0:d={vfx_dur} [{v_white_fade}]")
                    cam_filter = f"[{v_white_fade}] overlay=x=0:y=0"
                elif vfx.effectId == "speed_ramp":
                    cam_filter = "setpts=0.5*(PTS-STARTPTS)"
                elif vfx.effectId == "freeze_frame":
                    cam_filter = "loop=loop=-1:size=1:start=0"
                else:
                    cam_filter = "null"
                
                filter_parts.append(f"[{v_fx_in}] {cam_filter} [{v_fx_out}]")
                
                v_next_label = f"v_cam_final_{idx}"
                filter_parts.append(f"[{v_split_label_1}][{v_fx_out}] overlay=x=0:y=0:enable='between(t,{vfx.start},{vfx.end})' [{v_next_label}]")
                current_video_label = v_next_label

            else:
                # Video visual overlay compositing
                vfx_url = f"/static/overlays/{vfx.effectId}.mp4"
                in_idx = file_to_idx[resolve_filepath(vfx_url)]
                
                trim_f = f"[{in_idx}:v] trim=start=0:end={vfx_dur},setpts=PTS-STARTPTS"
                
                sc_w = int(res_w * (vfx.scale if vfx.scale is not None else 1.0))
                sc_h = int(res_h * (vfx.scale if vfx.scale is not None else 1.0))
                scale_f = f"scale={sc_w}:{sc_h}"
                
                rotate_f = ""
                if vfx.rotation and vfx.rotation != 0.0:
                    rad = vfx.rotation * math.pi / 180.0
                    rotate_f = f",rotate={rad}:c=black@0:ow='hypot(iw,ih)':oh='ow'"
                
                opacity_f = f",format=pix_fmts=rgba,colorchannelmixer=aa={vfx.opacity if vfx.opacity is not None else 1.0}"
                
                v_processed = f"vfx_proc_{idx}"
                filter_parts.append(f"{trim_f},{scale_f}{rotate_f}{opacity_f} [{v_processed}]")
                
                v_next_label = f"vfx_overlay_final_{idx}"
                blend = (vfx.blendMode or "normal").lower()
                
                if blend in ["screen", "add", "lighten", "multiply"]:
                    pad_color = "white" if blend == "multiply" else "black"
                    x_pad = resolve_pad_coord(vfx.x, "ow", "iw")
                    y_pad = resolve_pad_coord(vfx.y, "oh", "ih")
                    
                    v_padded = f"vfx_padded_{idx}"
                    filter_parts.append(f"[{v_processed}] pad={res_w}:{res_h}:{x_pad}:{y_pad}:color={pad_color} [{v_padded}]")
                    
                    blend_mode = "addition" if blend == "add" else blend
                    filter_parts.append(f"[{current_video_label}][{v_padded}] blend=all_mode={blend_mode}:enable='between(t,{vfx.start},{vfx.end})' [{v_next_label}]")
                else:
                    x_expr = resolve_pad_coord(vfx.x, "W", "w")
                    y_expr = resolve_pad_coord(vfx.y, "H", "h")
                    filter_parts.append(f"[{current_video_label}][{v_processed}] overlay=x='{x_expr}':y='{y_expr}':enable='between(t,{vfx.start},{vfx.end})' [{v_next_label}]")
                
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

        # Mix in VFX audio effects
        for idx, vfx in enumerate(payload.vfxTrack):
            if vfx.hasAudio:
                sfx_url = f"/static/sfx/{vfx.effectId}.mp3"
                in_idx = file_to_idx[resolve_filepath(sfx_url)]
                vfx_dur = vfx.end - vfx.start
                if vfx_dur <= 0.0:
                    continue
                
                trim_filter = f"[{in_idx}:a] atrim=start=0:end={vfx_dur},asetpts=PTS-STARTPTS"
                volume_filter = f"volume={vfx.audioVolume if vfx.audioVolume is not None else 1.0}"
                delay_ms = int(vfx.start * 1000)
                adelay_filter = f"adelay={delay_ms}|{delay_ms}"
                
                a_vfx_label = f"a_vfx_{idx}"
                filter_parts.append(f"{trim_filter},{volume_filter},{adelay_filter} [{a_vfx_label}]")
                delayed_audio_labels.append(f"[{a_vfx_label}]")

        # Mix all audio
        current_audio_label = "mixed_a"
        if delayed_audio_labels:
            mix_inputs = len(delayed_audio_labels) + 1
            filter_parts.append(f"[canvas_a]{''.join(delayed_audio_labels)} amix=inputs={mix_inputs}:duration=first:normalize=0 [{current_audio_label}]")
        else:
            filter_parts.append(f"[canvas_a] acopy [{current_audio_label}]")

        # 3. Text drawing
        font_map = {
            "sofia sans": "arial.ttf",
            "poppins": "calibri.ttf",
            "montserrat": "segoeuib.ttf",
            "courier new": "cour.ttf",
            "playfair display": "georgia.ttf",
            "impact": "impact.ttf"
        }

        for idx, text in enumerate(payload.textTrack):
            # Coordinates presets and expressions matching frontend positioning
            x_expr = "(w-tw)/2"
            if text.x == "center":
                if text.align == "left":
                    x_expr = "w*0.10"
                elif text.align == "right":
                    x_expr = "w*0.90-tw"
                else:
                    x_expr = "(w-tw)/2"
            else:
                try:
                    x_str = text.x.strip()
                    is_percent = False
                    if x_str.endswith('%'):
                        x_str = x_str[:-1].strip()
                        is_percent = True
                    val = float(x_str)
                    if is_percent:
                        x_expr = f"w*{val/100:.4f}-tw/2"
                    else:
                        x_expr = f"w*{val}" if val <= 1.0 else str(val)
                except ValueError:
                    x_expr = "20"

            y_expr = "h*0.78-th"  # Default bottom offset (22% bottom margin)
            if text.y == "top":
                y_expr = "h*0.10"
            elif text.y == "center":
                y_expr = "(h-th)/2"
            elif text.y == "bottom":
                y_expr = "h*0.78-th"
            else:
                try:
                    y_str = text.y.strip()
                    is_percent = False
                    if y_str.endswith('%'):
                        y_str = y_str[:-1].strip()
                        is_percent = True
                    val = float(y_str)
                    if is_percent:
                        y_expr = f"h*{val/100:.4f}-th/2"
                    else:
                        y_expr = f"h*{val}" if val <= 1.0 else str(val)
                except ValueError:
                    y_expr = "h*0.78-th"

            # Clean and escape text for drawtext
            clean_text = text.text.replace("'", "'\\\\''").replace(":", "\\:")
            
            # Convert color code hex format to 0x format for FFmpeg safety
            color_val = text.fontColor or "white"
            if color_val.startswith("#"):
                color_val = color_val.replace("#", "0x")
            
            # Try to resolve selected font family, bold, and italic combinations
            font_family = (text.fontFamily or "sofia sans").lower()
            bold = text.bold
            italic = text.italic
            
            font_name = "arial.ttf"
            if font_family == "courier new":
                if bold and italic:
                    font_name = "courbi.ttf"
                elif bold:
                    font_name = "courbd.ttf"
                elif italic:
                    font_name = "couri.ttf"
                else:
                    font_name = "cour.ttf"
            elif font_family == "playfair display":  # serif (Georgia fallback)
                if bold and italic:
                    font_name = "georgiabi.ttf"
                elif bold:
                    font_name = "georgiab.ttf"
                elif italic:
                    font_name = "georgiai.ttf"
                else:
                    font_name = "georgia.ttf"
            elif font_family == "impact":
                font_name = "impact.ttf"
            else:  # Sans-serif (Arial / Poppins / Montserrat / Sofia Sans)
                if bold and italic:
                    font_name = "arialbi.ttf"
                elif bold:
                    font_name = "arialbd.ttf"
                elif italic:
                    font_name = "ariali.ttf"
                else:
                    font_name = "arial.ttf"

            font_path = f"C:/Windows/Fonts/{font_name}"
            font_part = ""
            if os.path.exists(font_path):
                # Escape the colon for Windows absolute paths in FFmpeg
                font_part = f":fontfile='C\\:/Windows/Fonts/{font_name}'"
            elif os.path.exists("C:/Windows/Fonts/arial.ttf"):
                font_part = ":fontfile='C\\:/Windows/Fonts/arial.ttf'"

            # Shadow / Drop shadow outline support
            shadow_part = ""
            # Note: We can check if shadow is enabled
            shadow_color = "black"
            shadow_part = f":shadowcolor={shadow_color}:shadowx=2:shadowy=2"

            v_text_label = f"v_text_{idx}"
            filter_parts.append(
                f"[{current_video_label}] drawtext=text='{clean_text}':fontsize={text.fontSize}:fontcolor={color_val}{font_part}{shadow_part}:x='{x_expr}':y='{y_expr}':enable='between(t,{text.start},{text.end})' [{v_text_label}]"
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

        if rendering_tasks.get(task_id, {}).get("status") == "cancelled":
            logger.info(f"Video export task {task_id} was cancelled before starting.")
            return

        # Launch process and parse progress
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        active_processes[task_id] = process

        try:
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
                    
                    if rendering_tasks.get(task_id, {}).get("status") == "cancelled":
                        break
                    rendering_tasks[task_id]["progress"] = progress

            process.wait()
        finally:
            active_processes.pop(task_id, None)

        if rendering_tasks.get(task_id, {}).get("status") == "cancelled":
            logger.info(f"Video export task {task_id} was cancelled.")
            if os.path.exists(output_filepath):
                try:
                    os.remove(output_filepath)
                except Exception as e:
                    logger.error(f"Failed to remove partial export file {output_filepath}: {e}")
            return

        if process.returncode == 0:
            rendering_tasks[task_id]["status"] = "completed"
            rendering_tasks[task_id]["progress"] = 100
            rendering_tasks[task_id]["url"] = f"/static/exports/{task_id}.{ext}"
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


@router.post("/editor/export/cancel/{task_id}")
def cancel_export(task_id: str):
    """Cancels a running export task and kills its FFmpeg process."""
    task = rendering_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.get("status") in ["rendering", "pending"]:
        task["status"] = "cancelled"
        
        # Kill the process if active
        process = active_processes.pop(task_id, None)
        if process:
            try:
                process.kill()
                logger.info(f"Killed FFmpeg process for task {task_id}")
            except Exception as e:
                logger.error(f"Failed to kill FFmpeg process for task {task_id}: {e}")
        
        # Try to delete output file immediately if it exists (run_ffmpeg_render will also try after process exits)
        output_filepath = task.get("output_filepath")
        if output_filepath and os.path.exists(output_filepath):
            try:
                os.remove(output_filepath)
                logger.info(f"Removed partial export file for task {task_id}")
            except Exception as e:
                # File might be temporarily locked, run_ffmpeg_render will clean it up after wait()
                logger.warning(f"Could not remove file in endpoint (might be locked): {e}")

        return {"status": "cancelled"}
    
    return {"status": task.get("status"), "message": "Task is not in a cancellable state"}
