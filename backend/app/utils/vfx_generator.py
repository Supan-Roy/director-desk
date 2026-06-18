import os
import math
import struct
import random
import subprocess
import wave

# Ensure target directories exist
os.makedirs("static/overlays", exist_ok=True)
os.makedirs("static/sfx", exist_ok=True)

def draw_line(frame, w, h, x0, y0, x1, y1, color):
    dx = x1 - x0
    dy = y1 - y0
    steps = max(abs(dx), abs(dy))
    if steps == 0:
        return
    x_inc = dx / steps
    y_inc = dy / steps
    x = x0
    y = y0
    for _ in range(int(steps) + 1):
        ix, iy = int(round(x)), int(round(y))
        if 0 <= ix < w and 0 <= iy < h:
            idx = (iy * w + ix) * 3
            frame[idx] = color[0]
            frame[idx+1] = color[1]
            frame[idx+2] = color[2]
        x += x_inc
        y += y_inc

def draw_circle(frame, w, h, cx, cy, radius, color):
    cx_i, cy_i, r_i = int(cx), int(cy), int(radius)
    for y in range(max(0, cy_i - r_i), min(h, cy_i + r_i + 1)):
        for x in range(max(0, cx_i - r_i), min(w, cx_i + r_i + 1)):
            if (x - cx)**2 + (y - cy)**2 <= radius**2:
                idx = (y * w + x) * 3
                # Additive drawing helper
                frame[idx] = min(255, frame[idx] + color[0])
                frame[idx+1] = min(255, frame[idx+1] + color[1])
                frame[idx+2] = min(255, frame[idx+2] + color[2])

def draw_glow_blob(frame, w, h, cx, cy, radius, max_color):
    cx_i, cy_i, r_i = int(cx), int(cy), int(radius)
    for y in range(max(0, cy_i - r_i), min(h, cy_i + r_i + 1)):
        for x in range(max(0, cx_i - r_i), min(w, cx_i + r_i + 1)):
            dist_sq = (x - cx)**2 + (y - cy)**2
            if dist_sq <= radius**2:
                dist = math.sqrt(dist_sq)
                factor = 1.0 - (dist / radius)
                # Soft cosine decay for smoother visual blending
                factor = (1.0 - math.cos(factor * math.pi)) / 2.0
                idx = (y * w + x) * 3
                frame[idx] = min(255, frame[idx] + int(max_color[0] * factor))
                frame[idx+1] = min(255, frame[idx+1] + int(max_color[1] * factor))
                frame[idx+2] = min(255, frame[idx+2] + int(max_color[2] * factor))

# Generators for each unique visual overlay effect
def generate_overlay_video(effect_id, output_path, w=640, h=360, duration=5, fps=24):
    print(f"Generating procedural VFX overlay video: {effect_id} -> {output_path}")
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{w}x{h}",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "26",
        output_path
    ]
    
    try:
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"Failed to start FFmpeg for overlay generation: {e}")
        return

    num_frames = duration * fps
    
    # Initialize states for frame animation
    random.seed(42)
    
    # Rain drops
    rain_drops = [{"x": random.randint(0, w), "y": random.randint(0, h), "speed": random.uniform(15, 25), "len": random.uniform(10, 20)} for _ in range(50)]
    
    # Snow flakes
    snow_flakes = [{"x": random.uniform(0, w), "y": random.uniform(0, h), "speed": random.uniform(1.5, 3.5), "size": random.uniform(2, 4), "phase": random.uniform(0, math.pi * 2)} for _ in range(70)]
    
    # Sparks particles
    sparks = [{"x": random.uniform(0, w), "y": random.uniform(h, h + 50), "vx": random.uniform(-1.5, 1.5), "vy": random.uniform(-4, -8), "life": random.uniform(0.3, 1.0), "max_life": random.uniform(1.0, 2.0)} for _ in range(60)]
    
    # Magic particles
    magic_particles = [{"x": random.uniform(w*0.3, w*0.7), "y": random.uniform(h*0.3, h*0.7), "vx": random.uniform(-2, 2), "vy": random.uniform(-2, 2), "color": [random.randint(180, 255), random.randint(100, 200), 255], "life": random.uniform(0.5, 1.5)} for _ in range(40)]
    
    # Light leaks blobs
    leaks = [
        {"cx": w * 0.2, "cy": h * 0.3, "vx": 1.2, "vy": 0.8, "color": [255, 120, 40], "radius": 180},
        {"cx": w * 0.8, "cy": h * 0.7, "vx": -1.0, "vy": -0.6, "color": [40, 150, 255], "radius": 200},
        {"cx": w * 0.5, "cy": h * 0.2, "vx": 0.5, "vy": 1.0, "color": [180, 40, 255], "radius": 150}
    ]

    for frame_idx in range(num_frames):
        frame = bytearray(w * h * 3)
        t = frame_idx / fps

        if effect_id == "rain":
            for drop in rain_drops:
                # Draw diagonal rain streak
                draw_line(frame, w, h, drop["x"], drop["y"], drop["x"] - 2, drop["y"] + drop["len"], (180, 210, 240))
                # Update position
                drop["y"] += drop["speed"]
                drop["x"] -= 2
                if drop["y"] > h:
                    drop["y"] = -20
                    drop["x"] = random.randint(0, w)

        elif effect_id == "snow":
            for flake in snow_flakes:
                draw_circle(frame, w, h, flake["x"], flake["y"], flake["size"], (255, 255, 255))
                # Update drift
                flake["y"] += flake["speed"]
                flake["x"] += math.sin(frame_idx * 0.08 + flake["phase"]) * 0.6
                if flake["y"] > h:
                    flake["y"] = -10
                    flake["x"] = random.uniform(0, w)

        elif effect_id == "fog":
            # Procedural moving slow white clouds
            for offset in [0.0, 1.5, 3.1]:
                cx = w * 0.5 + w * 0.25 * math.sin(t * 0.6 + offset)
                cy = h * 0.5 + h * 0.15 * math.cos(t * 0.8 + offset)
                draw_glow_blob(frame, w, h, cx, cy, 140 + 20 * math.sin(t + offset), (40, 40, 45))

        elif effect_id == "sparks":
            for spark in sparks:
                # Only draw if spark is alive
                opacity_factor = max(0.0, 1.0 - (spark["life"] / spark["max_life"]))
                color = (int(255 * opacity_factor), int(140 * opacity_factor), int(20 * opacity_factor))
                if opacity_factor > 0:
                    draw_circle(frame, w, h, spark["x"], spark["y"], 2, color)
                # Update
                spark["x"] += spark["vx"]
                spark["y"] += spark["vy"]
                spark["life"] += 1.0 / fps
                if spark["life"] >= spark["max_life"] or spark["y"] < -10:
                    spark["x"] = random.uniform(0, w)
                    spark["y"] = h + 10
                    spark["life"] = 0.0
                    spark["max_life"] = random.uniform(1.0, 2.0)

        elif effect_id == "explosion":
            # Growing blast at center (starts at t=0, peaks at t=1s, then dissipates)
            blast_duration = 2.0
            blast_t = t % blast_duration
            if blast_t < 1.2:
                # Radial growth
                radius = 160 * (1.0 - math.exp(-6 * blast_t))
                color_factor = max(0.0, 1.0 - blast_t / 1.2)
                # concentric layers
                draw_glow_blob(frame, w, h, w/2, h/2, radius * 1.0, (int(255 * color_factor), int(100 * color_factor), int(20 * color_factor)))
                draw_glow_blob(frame, w, h, w/2, h/2, radius * 0.6, (int(255 * color_factor), int(200 * color_factor), int(80 * color_factor)))
                draw_glow_blob(frame, w, h, w/2, h/2, radius * 0.3, (int(255 * color_factor), int(255 * color_factor), int(255 * color_factor)))

        elif effect_id == "lens_flare":
            # Horizontal bright beam
            for y_offset in range(-12, 13):
                dist_factor = 1.0 - (abs(y_offset) / 12.0)
                color = (int(20 * dist_factor), int(80 * dist_factor), int(180 * dist_factor))
                draw_line(frame, w, h, 0, h/2 + y_offset, w, h/2 + y_offset, color)
            # Center bright flare orb
            draw_glow_blob(frame, w, h, w/2, h/2, 60, (255, 255, 255))
            draw_glow_blob(frame, w, h, w/2, h/2, 100, (80, 160, 255))
            # Diagonal ghost rings
            for offset_mult in [-0.6, -0.3, 0.3, 0.6]:
                draw_circle(frame, w, h, w/2 + w*0.35*offset_mult, h/2 + h*0.25*offset_mult, 15, (20, 60, 40))

        elif effect_id == "light_leaks":
            for leak in leaks:
                # Move
                leak["cx"] += leak["vx"]
                leak["cy"] += leak["vy"]
                # Bounce
                if leak["cx"] < 0 or leak["cx"] > w:
                    leak["vx"] *= -1
                if leak["cy"] < 0 or leak["cy"] > h:
                    leak["vy"] *= -1
                # Pulse brightness
                pulse = 0.7 + 0.3 * math.sin(t * 1.5 + leak["radius"])
                color = (int(leak["color"][0] * pulse), int(leak["color"][1] * pulse), int(leak["color"][2] * pulse))
                draw_glow_blob(frame, w, h, leak["cx"], leak["cy"], leak["radius"], color)

        elif effect_id == "magic":
            for part in magic_particles:
                draw_circle(frame, w, h, part["x"], part["y"], 3, part["color"])
                # update
                part["x"] += part["vx"]
                part["y"] += part["vy"]
                part["life"] -= 1.0 / fps
                if part["life"] <= 0:
                    part["x"] = w/2 + random.uniform(-40, 40)
                    part["y"] = h/2 + random.uniform(-40, 40)
                    part["vx"] = random.uniform(-3, 3)
                    part["vy"] = random.uniform(-3, 3)
                    part["life"] = random.uniform(0.5, 1.5)

        elif effect_id == "fire":
            # Draw fire flame particles rising from center bottom
            for _ in range(5):
                fx = w / 2 + random.normalvariate(0, 30)
                fy = h - 5
                draw_glow_blob(frame, w, h, fx, fy - t * 40 % 100, 25, (255, 100, 10))
                draw_glow_blob(frame, w, h, fx, fy - t * 45 % 80, 15, (255, 200, 30))

        elif effect_id == "portal":
            # Rotating glowing circle
            angle = t * 4.0
            portal_radius = 90
            for i in range(24):
                theta = i * (math.pi / 12) + angle
                px = w / 2 + portal_radius * math.cos(theta)
                py = h / 2 + portal_radius * math.sin(theta)
                draw_glow_blob(frame, w, h, px, py, 25, (40, 220, 255))
            draw_glow_blob(frame, w, h, w/2, h/2, portal_radius - 10, (10, 40, 80))

        elif effect_id == "glitch":
            # Intermittent chromatic shift bars
            glitch_trigger = int(t * 8) % 4
            if glitch_trigger == 1:
                # Draw cyan/magenta/yellow bars
                for _ in range(4):
                    gy = random.randint(20, h-40)
                    gheight = random.randint(5, 25)
                    gcolor = random.choice([(0, 255, 255), (255, 0, 255), (255, 255, 0)])
                    for y_bar in range(gy, min(h, gy + gheight)):
                        draw_line(frame, w, h, 0, y_bar, w, y_bar, gcolor)

        try:
            process.stdin.write(frame)
        except Exception as err:
            print(f"Error piping frame {frame_idx} for {effect_id}: {err}")
            break

    try:
        process.stdin.close()
        process.wait()
    except Exception as err:
        print(f"Error finalizing FFmpeg generation for {effect_id}: {err}")

# Sound Synthesizer utility
def generate_sfx_audio(effect_id, output_path, duration=3.0, sample_rate=44100):
    print(f"Generating procedural VFX sound effect: {effect_id} -> {output_path}")
    num_samples = int(duration * sample_rate)
    audio_data = bytearray()
    
    random.seed(42)
    
    for i in range(num_samples):
        t = i / sample_rate
        val = 0
        
        if effect_id in ["explosion", "sparks"]:
            # Deep rumble + decay white noise
            noise = random.uniform(-1, 1)
            decay = math.exp(-3 * t)
            val = int(noise * decay * 30000)
        elif effect_id in ["rain", "snow"]:
            # Continuous soft noise
            noise = random.uniform(-1, 1)
            val = int(noise * 3000)
        elif effect_id == "fog":
            # Continuous low wind whoosh
            noise = random.uniform(-1, 1)
            val = int((noise * 0.6 + math.sin(2 * math.pi * 50 * t) * 0.4) * 2000)
        elif effect_id == "laser":
            # Sci-Fi swept frequency beep
            freq = 900 * math.exp(-12 * t)
            val = int(math.sin(2 * math.pi * freq * t) * 28000)
        elif effect_id == "glitch":
            # Horizontal scan noise chirps
            if (int(t * 12) % 3) == 0:
                val = int(random.uniform(-1, 1) * 12000)
            else:
                val = 0
        elif effect_id == "fire":
            # Low rumble crackle
            crackle = 30000 if random.random() < 0.007 else 0
            val = int(math.sin(2 * math.pi * 90 * t) * 3000 + crackle)
        elif effect_id == "portal":
            # Rotating sweeping phaser hum
            freq = 150 + math.sin(2 * math.pi * 4 * t) * 60
            val = int(math.sin(2 * math.pi * freq * t) * 12000)
        elif effect_id == "flash":
            # Short metallic shutter sound
            decay = math.exp(-22 * t)
            val = int(math.sin(2 * math.pi * 1200 * t) * decay * 30000)
        elif effect_id == "lens_flare":
            # Warm hum
            val = int(math.sin(2 * math.pi * 60 * t) * 10000)
        else:
            # Default soft bell
            decay = math.exp(-4 * t)
            val = int(math.sin(2 * math.pi * 440 * t) * decay * 10000)
            
        audio_data.extend(struct.pack('<h', val))
        
    temp_wav = output_path + ".wav"
    try:
        with wave.open(temp_wav, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data)
            
        # Convert WAV to MP3 using FFmpeg
        subprocess.run(["ffmpeg", "-y", "-i", temp_wav, "-c:a", "libmp3lame", "-q:a", "5", output_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as err:
        print(f"Error generating WAV/MP3 sound for {effect_id}: {err}")
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except:
                pass

def generate_all_vfx_assets():
    vfx_list = [
        "rain", "snow", "fog", "sparks", "explosion", 
        "lens_flare", "light_leaks", "magic", "fire", "portal", "glitch"
    ]
    
    # Also generate sfx for flash frame
    sfx_list = vfx_list + ["flash"]
    
    print("Pre-generating VFX timeline elements...")
    for vfx in vfx_list:
        vpath = f"static/overlays/{vfx}.mp4"
        if not os.path.exists(vpath):
            generate_overlay_video(vfx, vpath)
            
    for sfx in sfx_list:
        apath = f"static/sfx/{sfx}.mp3"
        if not os.path.exists(apath):
            generate_sfx_audio(sfx, apath)
    print("VFX pre-generation complete.")
