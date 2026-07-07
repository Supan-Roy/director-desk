"""
Frame extraction utility for video continuity.

Extracts the last frame from a generated scene video so it can be
used as the I2V reference image for the next scene (continuation).
"""
import os
import subprocess
import logging
import uuid

logger = logging.getLogger(__name__)


def extract_last_frame(video_path: str, output_dir: str = "static/uploads") -> str | None:
    """Extract the last frame of a video file as a PNG image.

    Args:
        video_path: Absolute or relative path to the video file.
        output_dir: Directory to save the extracted frame.

    Returns:
        The local URL path (e.g. /static/uploads/lastframe_xxx.png)
        or None if extraction failed.
    """
    if not video_path or not os.path.exists(video_path):
        logger.warning(f"Video path does not exist: {video_path}")
        return None

    os.makedirs(output_dir, exist_ok=True)

    filename = f"lastframe_{uuid.uuid4().hex[:12]}.png"
    output_path = os.path.join(output_dir, filename)

    # ffmpeg: seek to the very last frame
    # Use -sseof -0.1 to seek near the end, then extract one frame
    cmd = [
        "ffmpeg",
        "-y",
        "-sseof", "-0.1",
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            logger.error(f"ffmpeg frame extraction failed: {result.stderr[:500]}")
            return None

        if not os.path.exists(output_path):
            logger.error(f"ffmpeg did not produce output file: {output_path}")
            return None

        size = os.path.getsize(output_path)
        logger.info(f"Extracted last frame to {output_path} ({size} bytes)")
        return f"/static/uploads/{filename}"

    except subprocess.TimeoutExpired:
        logger.error("ffmpeg frame extraction timed out")
        return None
    except FileNotFoundError:
        logger.error("ffmpeg not found on system PATH")
        return None
    except Exception as e:
        logger.error(f"Frame extraction error: {e}")
        return None
