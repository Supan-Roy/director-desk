# Director Desk — Complete Documentation

> **AI Showrunner & Creative Director Platform**  
> Orchestrates cinematic storytelling from screenwriting to final video export.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Installation & Setup](#4-installation--setup)
5. [Product Features (End User)](#5-product-features-end-user)
6. [Multi-Agent Pipeline](#6-multi-agent-pipeline)
7. [Backend Architecture](#7-backend-architecture)
8. [API Reference](#8-api-reference)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Database Schema](#10-database-schema)
11. [AI Integration](#11-ai-integration)
12. [Video Generation Pipeline](#12-video-generation-pipeline)
13. [Production Types](#13-production-types)
14. [Video Editor](#14-video-editor)
15. [Asset Management](#15-asset-management)
16. [Authentication & Security](#16-authentication--security)
17. [VFX & Sound Effects System](#17-vfx--sound-effects-system)
18. [Configuration Reference](#18-configuration-reference)
19. [Development Guide](#19-development-guide)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Product Overview

**Director Desk** is an AI-powered film production studio that automates the entire short-form video creation pipeline. It replaces the traditional film crew with a team of specialized AI agents — a Writer, Storyboard Artist, Scene Breakdown Technician, Production Planner, and Critic — all working together to go from a single prompt to a finished video.

### What It Does

- Takes a user's creative concept (e.g., *"A cyberpunk detective chases a hacker through neon-lit streets"*)
- Orchestrates AI agents to generate a script, storyboard, production plan, and critic review
- Generates consistent character portraits, environment references, and voice profiles
- Renders each scene as a video clip using AI video models
- Compiles all clips into a finished film via a multi-track timeline editor with VFX overlays, text, and audio mixing

### Target Audience

- **Filmmakers & storytellers** exploring AI-assisted production
- **Content creators** producing short films, trailers, YouTube videos, podcast episodes
- **Hackathon/demo participants** showcasing AI video generation pipelines
- **AI researchers** exploring multi-agent orchestration and multimodal generation

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  Dashboard  │  Project View  │  Production Studio  │  Editor │
└──────────────────┬──────────────────────────────────────────┘
                   │  HTTP / SSE
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (FastAPI + Python)                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ API Routers  │  │   Services   │  │  Agent Pipeline   │  │
│  │  (53 routes) │──│  (11 classes)│──│  (7 agents)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                │                     │            │
│         ▼                ▼                     ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  SQLite/DB   │  │    Redis     │  │   FFmpeg Engine   │  │
│  │  (7 models)  │  │  (job queue) │  │  (video export)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              External AI Services (DashScope/ Alibaba Cloud) │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Qwen-Plus │  │ Wan2.6-  │  │ Wan2.7  │  │ Qwen3-TTS  │  │
│  │ (Text)    │  │ T2I      │  │ T2V/I2V │  │ (Voice)    │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow (End-to-End)

```
User Prompt
    │
    ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Showrunner   │────▶│ 2. Writer Agent │────▶│ 3. Storyboard   │
│    Agent        │     │    (script)     │     │    Agent         │
│    (detect type)│     └─────────────────┘     └─────────────────┘
└─────────────────┘                                      │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 6. Critic Agent │◀────│ 5. Planner Agent│◀────│ 4. Scene        │
│    (quality)    │     │    (plan)       │     │    Breakdown    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 7. Character    │────▶│ 8. Environment  │────▶│ 9. Voice        │
│    Gen          │     │    Gen          │     │    Gen          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 12. Final Film  │◀────│ 11. Video       │◀────│ 10. Scene Video │
│     Export      │     │     Editor      │     │     Gen         │
│     (FFmpeg)    │     │     (Timeline)  │     │     (I2V/T2V)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1 | UI framework |
| Vite | 6.3 | Build tool & dev server |
| Tailwind CSS | 3.4 | Utility-first CSS |
| React Router DOM | 7.17 | Client-side routing |
| Axios | 1.8 | HTTP client |
| react-icons | 5.6 | Icon library (Feather, etc.) |
| marked | 18.0 | Markdown → HTML |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115 | Web framework |
| Python | 3.10+ | Runtime |
| SQLAlchemy | 2.0 | ORM |
| SQLite | (built-in) | Database |
| Redis | 5.0+ | Job queue & pub/sub |
| OpenAI SDK | 2.41 | DashScope API client |
| FFmpeg | (system) | Video processing & export |
| Pillow (PIL) | (latest) | Image composition |

### AI Models (Alibaba Cloud DashScope)
| Model | Purpose |
|-------|---------|
| qwen-plus | Text generation (agents, prompts) |
| qwen-vl-plus | Image analysis & understanding |
| wan2.6-t2i | Text-to-image (character/environment portraits) |
| wan2.7-t2v | Text-to-video (scene generation) |
| wan2.1-i2v / happyhorse-1.0-i2v | Image-to-video (scene with reference) |
| qwen3-tts-flash | Text-to-speech (voice synthesis) |

---

## 4. Installation & Setup

### Prerequisites
- Node.js v18+
- Python 3.10+
- FFmpeg (for video export)
- Redis (for job queue — optional, falls back gracefully)

### Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your QWEN_API_KEY

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit VITE_API_BASE_URL if needed (default: http://localhost:8000)

npm run dev
```

### Environment Variables (backend/.env)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| QWEN_API_KEY | Yes | — | Alibaba Cloud DashScope API key |
| QWEN_API_BASE_URL | No | https://dashscope-intl.aliyuncs.com/compatible-mode/v1 | DashScope endpoint |
| QWEN_MODEL | No | qwen-plus | Text generation model |
| QWEN_IMAGE_MODEL | No | wan2.6-t2i | Image generation model |
| QWEN_VISION_MODEL | No | qwen-vl-plus | Vision model |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |
| DATABASE_URL | No | sqlite:///./director_desk.db | Database connection |
| STORAGE_PROVIDER | No | tmpfiles | CDN upload provider |
| MAILGUN_API_KEY | No | — | Email service (OTP) |
| MAILGUN_DOMAIN | No | — | Email domain |

---

## 5. Product Features (End User)

### 5.1 Dashboard (Home Page)
The main entry point features a cinematic hero section with:
- **Prompt input** — Textarea with up to 2000 characters, clipboard paste, gibberish detection
- **File upload orb** — Drag-and-drop PDF, TXT, MD, images, DOC/DOCX up to 200MB
- **Production type selector** — 11 types (Short Film, Trailer, Documentary, Podcast, etc.)
- **Aspect ratio** — 16:9, 9:16, 4:3, 1:1, 2.35:1
- **Style presets** — Cinematic, Anime, Documentary, Noir, Cyberpunk, etc.
- **Camera motion** — Static, Dolly, Pan, Crane, Handheld, Drone, etc.
- **Render quality** — Standard, High, Ultra
- **Mode selector** — Fast (single AI call) or Studio (progressive streaming)

### 5.2 Project View (Script → Storyboard → Breakdown → Plan → Review)
Once a production is generated, it appears in a 5-tab interface:
- **Script** — Full screenplay with markdown formatting, dual-version display (original/refined), inline editing, copy
- **Storyboard** — Scene cards with shot type, mood, environment description
- **Scene Breakdown** — Per-scene technical specifications with camera setup, lighting, color palette, props, VFX, AI prompts, negative prompts
- **Production Plan** — Phased project execution plan with tasks
- **Review** — AI critic assessment with score, strengths, weaknesses, suggestions; approve/refine workflow

### 5.3 Production Studio (Asset Generation)
Post-approval, the production studio handles asset generation:
- **Characters** — Generate AI portraits, version management, visual identity profiles
- **Environments** — Generate location references, version management
- **Voices** — Generate TTS voice profiles with preview player
- **Scene Videos** — Generate AI videos per scene with status tracking, approve/delete/play
- **Pipeline monitoring** — Agent activity panel showing real-time progress

### 5.4 Video Editor (Post-Production)
Full non-linear video editor with:
- **Video track** — Trim, scale, zoom, pan, brightness/contrast, blur, color effects
- **Audio track** — Trim, volume, fade-in/out
- **Text track** — Custom overlay text with font, color, position, shadow
- **VFX track** — 11 overlay effects (rain, snow, fog, sparks, explosion, etc.) + camera FX
- **Logo overlay** — Watermark/branding
- **Export** — FFmpeg-based rendering with progress monitoring and cancel support

### 5.5 Template Library
- **5 built-in presets** — Cyberpunk, Documentary, Sci-Fi Metropolis, Cinematic Noir, Space Odyssey
- **Custom templates** — Create and delete persistent presets with full technical specs
- **Hover-play previews** — Video thumbnails that play on hover
- **Apply Preset** — Auto-configures dashboard parameters

### 5.6 Agent Sandbox
- **Agent directory** — Grid of all AI agents with metadata
- **Specialized tasks** — Per-agent custom forms for targeted generation
- **Direct chat** — Free-form LLM interaction with any agent
- **Output terminal** — Copy-to-clipboard results

### 5.7 Asset Library
- **Unified search** — Query across all asset types and projects
- **Filter tabs** — All, Characters, Environments, Voices, Videos
- **Expandable cards** — Click to reveal full metadata profiles
- **Audio preview** — Inline player for voice samples
- **Video player** — Fullscreen modal for generated scene videos

### 5.8 Settings
- **Appearance** — Light/Dark/System theme
- **Profile** — Name, DOB, email, photo upload, subscription plan
- **Data & Privacy** — Workspace backup (JSON export), archived projects, delete all projects, wipe workspace, delete account (OTP-verified)

---

## 6. Multi-Agent Pipeline

### Agent Roles

| Agent | File | Role | What It Generates |
|-------|------|------|-------------------|
| **Showrunner** | `showrunner_agent.py` | Producer | Title, production type detection, orchestrates all agents |
| **Writer** | `writer_agent.py` | Screenwriter | Full script with dialogue, scene descriptions |
| **Storyboard** | `storyboard_agent.py` | Visual Planner | Scene-by-scene shot descriptions (camera, environment, mood) |
| **Scene Breakdown** | `scene_breakdown_agent.py` | Tech Specs | Per-scene camera, lighting, color, VFX, AI prompts, audio notes |
| **Planner** | `planner_agent.py` | Line Producer | Phased production plan with tasks |
| **Critic** | `critic_agent.py` | Quality Review | Score, strengths, weaknesses, suggestions |
| **Editor** | `editor_agent.py` | Script Doctor | Refined script based on critic feedback |

### Pipeline Execution

#### Fast Mode
All agents run in a single LLM call (ShowrunnerAgent generates everything). The result is progressively revealed via SSE with timed delays between sections.

```
Single LLM call → GenerateResponse → Stream title → script chunks
→ storyboard (progressive reveal) → breakdown → plan → critic
```

#### Studio Mode
Each agent runs sequentially as a separate LLM call. Streaming is genuine — each chunk appears as it's generated.

```
Writer (stream) → Storyboard (stream) → Scene Breakdown (progressive)
→ Planner (progressive) → Critic (progressive)
```

### Production Type Detection
The ShowrunnerAgent auto-detects the production type from the user's prompt via an LLM call. Valid types:
- Short Film, Trailer, Documentary, Podcast, Drama, Series Episode
- Educational Show, Interview, YouTube Video, Audio Story

Each type triggers different system prompts, format rules, and pipeline behaviors (e.g., audio-only types skip visual stages).

---

## 7. Backend Architecture

### 7.1 Project Structure
```
backend/
├── app/
│   ├── agents/             # AI agent classes
│   │   ├── showrunner_agent.py
│   │   ├── writer_agent.py
│   │   ├── storyboard_agent.py
│   │   ├── scene_breakdown_agent.py
│   │   ├── planner_agent.py
│   │   ├── critic_agent.py
│   │   └── editor_agent.py
│   ├── api/routes/         # FastAPI route handlers
│   │   ├── auth.py             # Authentication
│   │   ├── showrunner.py       # Story generation
│   │   ├── jobs.py             # Production studio jobs
│   │   ├── project.py          # Project CRUD
│   │   ├── rendering.py        # Scene video management
│   │   ├── editor.py           # Video editor & export
│   │   ├── agents.py           # Agent sandbox
│   │   ├── assets.py           # Global asset library
│   │   ├── settings_auth.py    # Account deletion
│   │   ├── scene_breakdown.py  # Breakdown data
│   │   ├── script.py           # Script data
│   │   ├── planning.py         # Plan data
│   │   ├── storyboard.py       # Storyboard data
│   │   └── health.py           # Health check
│   ├── services/           # Business logic
│   │   ├── showrunner_service.py
│   │   ├── qwen_service.py
│   │   ├── scene_compiler.py
│   │   ├── asset_resolver.py
│   │   ├── project_service.py
│   │   ├── project_state.py
│   │   ├── redis_job_service.py
│   │   ├── auth_service.py
│   │   ├── email_service.py
│   │   ├── storyboard_parser.py
│   │   ├── content_processor.py
│   │   └── ffmpeg_service.py
│   ├── db/
│   │   ├── database.py         # SQLAlchemy setup
│   │   ├── models.py           # 7 ORM models
│   │   └── repository.py       # CRUD repositories
│   ├── utils/
│   │   ├── security.py         # Rate limiting, file validation
│   │   ├── frame_extractor.py  # Video last-frame extraction
│   │   └── vfx_generator.py    # Procedural VFX overlay generation
│   ├── core/
│   │   ├── config.py           # Environment config
│   │   └── redis.py            # Redis manager
│   ├── schemas/                # Pydantic models
│   │   ├── requests.py
│   │   ├── responses.py
│   │   ├── project_schemas.py
│   │   └── health.py
│   ├── main.py                 # FastAPI app entry
│   └── router.py               # Route aggregation
├── static/                     # Static files
│   ├── uploads/                # Generated assets
│   ├── exports/                # Rendered exports
│   ├── overlays/               # VFX overlay videos
│   └── sfx/                    # Sound effects
├── .env.example
└── requirements.txt
```

### 7.2 Services Detail

**ShowrunnerService** — Core orchestrator. Manages the entire generation pipeline. Two modes (Fast/Studio) plus resume capability for interrupted generations. Streams progress via SSE with agent status changes. Handles production-type-specific branching (Podcast/Audio Story vs visual types).

**QwenService** — AI integration hub. Wraps all DashScope API calls:
- `generate_text()` — Chat completions via OpenAI-compatible SDK
- `generate_text_stream()` — Streaming chat completions
- `analyze_image()` — Vision model for image understanding
- `generate_image()` — Wan2.6-T2I via multimodal-generation endpoint
- `generate_video()` — Wan2.7-T2V / Wan2.1-I2V via async task submission + polling

**ScenePackageCompiler** — Prepares scene generation packages. Resolves character aliases (3-tier: exact match → heuristic → difflib fuzzy match). Enriches prompts with character descriptions and environment details. Selects reference images (primary character portrait or last frame from previous scene). Configurable duration (2-20s).

**AssetResolver** — Uploads local files to tmpfiles.org for public CDN URLs. Fallback to local path if upload fails.

**ProjectState** — In-memory singleton managing the active project's state (agents, script, storyboard, breakdown, plan, critic review). Used during streaming generation before persistence.

**RedisJobService** — Async job queue for production studio tasks (character generation, environment generation, voice generation, scene video generation). Uses Redis pub/sub for real-time job status updates via SSE.

### 7.3 Agents Detail

All agents are Qwen LLM calls with specific system prompts. Each follows this pattern:
1. System prompt defines the agent's role, context, and expected output format
2. LLM generates structured text (JSON for most agents)
3. Response is parsed, validated, and fed downstream

**ShowrunnerAgent** — The meta-agent. Generates everything in a single LLM call for Fast mode. Has `detect_production_type()` for auto-classification. 10 production type branches with format-specific rules.

**SceneBreakdownAgent** — The most complex agent. Generates per-scene technical specifications optimized for AI video models. Includes consistency audit across all scenes. Can generate progressively (one scene at a time) for Studio mode streaming.

---

## 8. API Reference

### 8.1 Story Generation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate` | Generate story (sync, non-streaming) |
| POST | `/generate/stream` | Stream generation via SSE |
| POST | `/generate/stream/resume/{project_id}` | Resume interrupted generation |

### 8.2 Production Studio Jobs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate/character` | Generate character portrait **Rate: 5/min** |
| POST | `/api/generate/environment` | Generate environment reference **Rate: 5/min** |
| POST | `/api/generate/voice` | Generate voice profile **Rate: 5/min** |
| POST | `/api/generate/scene` | Generate scene video **Rate: 3/min** |
| POST | `/api/generate/film` | Generate all scenes |
| GET | `/jobs/{job_id}` | Get job status |
| GET | `/jobs/stream` | SSE stream for job updates |

### 8.3 Project CRUD
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects |
| GET | `/projects/{id}` | Get full project detail |
| DELETE | `/projects/{id}` | Delete project |
| PATCH | `/projects/{id}` | Update project fields |
| POST | `/projects/save-current` | Persist in-memory project to DB |
| POST | `/projects/{id}/refine` | Refine script |
| GET | `/projects/featured` | Get demo productions |
| POST | `/projects/demo` | Load demo production |

### 8.4 Scene Video Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{id}/scenes/videos` | List all scene videos |
| GET | `/projects/{id}/scenes/status` | Scene readiness diagnostics |
| POST | `/projects/{id}/scenes/videos/{id}/approve` | Approve version |
| POST | `/projects/{id}/scenes/videos/{id}/delete` | Delete version |

### 8.5 Asset Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{id}/characters` | List character assets |
| POST | `/projects/{id}/characters/select-version` | Select preferred version |
| GET | `/projects/{id}/environments` | List environment assets |
| POST | `/projects/{id}/environments/select-version` | Select preferred version |
| GET | `/projects/{id}/voices` | List voice assets |
| POST | `/projects/{id}/voices/select-version` | Select preferred version |
| GET | `/assets/global` | Global asset search |

### 8.6 Video Editor
| Method | Path | Description |
|--------|------|-------------|
| POST | `/editor/upload` | Upload media file **Rate: 5/min** |
| POST | `/editor/export` | Start FFmpeg render |
| GET | `/editor/export/status/{task_id}` | Get render progress |
| POST | `/editor/export/cancel/{task_id}` | Cancel render |

### 8.7 Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/check-email` | Check if email exists |
| POST | `/auth/register-email` | Register with OTP |
| POST | `/auth/login-email` | Login with password |
| POST | `/auth/verify-otp` | Verify OTP code |
| POST | `/auth/resend-otp` | Resend OTP |
| POST | `/auth/google` | Google OAuth login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |
| PUT | `/auth/profile` | Update profile |

### 8.8 Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates/custom` | List custom templates |
| POST | `/templates/custom` | Create template |
| DELETE | `/templates/custom/{id}` | Delete template |

---

## 9. Frontend Architecture

### 9.1 Pages & Routes

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | `Dashboard.jsx` | Main production studio with hero section |
| `/projects/:id` | `ProjectPage.jsx` | Single project workspace |
| `/projects/:id/production` | `ProductionPage.jsx` | Production studio (asset generation) |
| `/editor` | `EditorPage.jsx` | Video timeline editor |
| `/settings` | `SettingsPage.jsx` | User settings |
| `/privacy` | `PrivacyPage.jsx` | Privacy policy |
| `/agents` | `AgentsPage.jsx` | Agent sandbox |
| `/templates` | `TemplatesPage.jsx` | Template library |
| `/assets` | `AssetsPage.jsx` | Global asset library |

### 9.2 Core Components

| Component | Purpose |
|-----------|---------|
| `HeroSection.jsx` | Main prompt input, file upload, production config |
| `Sidebar.jsx` | Navigation sidebar with project list |
| `TabbedContent.jsx` | Production output tabs (script/storyboard/breakdown/plan/review) |
| `AgentActivityPanel.jsx` | Agent pipeline status display |
| `AuthModal.jsx` | Login/register/OTP modal |
| `WorkflowTimeline.jsx` | Pipeline progress visualization |
| `CreativeModes.jsx` | Template preset cards |
| `FeaturedProductions.jsx` | Demo production showcase |
| `CreditUsageCard.jsx` | Credit meter display |
| `CustomVideoPlayer.jsx` | Video player component |
| `ProjectIcon.jsx` | SVG production type icons |

### 9.3 Context Providers

| Provider | State Managed |
|----------|---------------|
| `ProjectDataContext.jsx` | Script, storyboard, breakdown, plan, review, agents, loading state, CRUD operations |
| `AuthContext.jsx` | User session, auth modal state, login/register/logout |
| `ThemeContext.jsx` | Light/dark/system theme switching |
| `EditorContext.jsx` | Video editor tracks, clips, filters, undo/redo |

### 9.4 API Client (`apiClient.js`)
Single module containing all API calls. Key functions:
- `generateStory(prompt, mode, productionType, files)` → SSE stream reader
- `getProjects()` / `getProjectById(id)` → Project data
- `getSceneVideos(projectId)` → Scene video list
- `generateCharacterAsset(projectId, name)` → Trigger character gen
- `generateSceneVideo(projectId, sceneNumber)` → Trigger scene video gen

---

## 10. Database Schema

### 10.1 Entity Relationship

```
users ──┬── projects ──┬── character_assets
         │              ├── environment_assets
         │              ├── voice_assets
         │              └── scene_videos
         │
         └── (auth sessions via cookies)

custom_templates (standalone)
```

### 10.2 Models

**User**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| email | String | Unique, indexed |
| hashed_password | String | Nullable for Google accounts |
| is_google | Boolean | Google OAuth flag |
| is_verified | Boolean | Email verified |
| photo | Text | Profile photo URL |
| dob | String | Date of birth |
| otp_code | String | Current OTP for verification |
| otp_expires_at | DateTime | OTP expiry |
| delete_token | String | Account deletion token |
| delete_token_expires_at | DateTime | Token expiry |

**Project**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| user_id | Integer | FK → users, nullable |
| title | String | Project title |
| production_type | String | Short Film, Podcast, etc. |
| prompt | Text | Original user prompt |
| script | Text | Generated screenplay |
| original_script | Text | Pre-refinement version |
| storyboard | JSON | Array of scene objects |
| scene_breakdown | JSON | Nested breakdown dict |
| production_plan | JSON | Nested plan dict |
| critic_review | JSON | Review object |
| environments | JSON | Array of env definitions |
| voices | JSON | Array of voice definitions |
| approved | Boolean | Approval status |
| is_pinned | Boolean | Pinned in sidebar |
| is_archived | Boolean | Archived |

**CharacterAsset**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| project_id | Integer | Indexed |
| character_name | String | Indexed |
| character_profile | JSON | Age, gender, appearance, wardrobe, etc. |
| image_url | String | Generated portrait path |
| generation_prompt | Text | Prompt used for image gen |

**EnvironmentAsset**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| project_id | Integer | Indexed |
| environment_name | String | Indexed |
| environment_profile | JSON | Architecture, lighting, weather, mood |
| image_url | String | Generated reference path |
| generation_prompt | Text | Prompt used for image gen |

**VoiceAsset**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| project_id | Integer | Indexed |
| character_name | String | Indexed |
| voice_profile | JSON | Tone, energy, pace, accent, style |
| voice_signature | String | Hash-like signature string |
| voice_settings | JSON | Pitch, speed, model type |
| preview_url | String | Audio file path |

**SceneVideo**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| project_id | Integer | Indexed |
| scene_number | Integer | Indexed |
| video_url | String | Generated video path |
| thumbnail_url | String | Preview image path |
| duration | Integer | In seconds |
| generation_model | String | happyhorse-1.0-i2v, wan2.7-t2v, etc. |
| prompt_used | Text | Enriched prompt sent to model |
| status | String | processing, completed, failed |
| version | Integer | Version number |
| is_approved | Boolean | Approved for final cut |
| credits_used | Integer | Cost in credits |
| error_message | Text | Error details if failed |

### 10.3 Custom Type
**JSONType** — A TypeDecorator that transparently serializes Python dicts/lists to JSON text in SQLite and deserializes on read.

---

## 11. AI Integration

### 11.1 Qwen Service (`qwen_service.py`)

All AI calls route through a single client configured in `qwen_service.py`:

```python
client = OpenAI(
    api_key=os.getenv("QWEN_API_KEY"),
    base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
)
```

### 11.2 Text Generation
- **Model**: `qwen-plus` (customizable via `QWEN_MODEL` env)
- **Endpoint**: OpenAI-compatible chat completions
- **Usage**: All agents use this for prompt → response generation

### 11.3 Image Generation
- **Model**: `wan2.6-t2i`
- **Endpoint**: `multimodal-generation/generation` (synchronous)
- **Parameters**: size=1920×1080, n=1
- **Fallback**: Legacy `text2image/image-synthesis` (async polling, 120s timeout)

### 11.4 Video Generation
- **Models**: `wan2.7-t2v` (text-to-video), `happyhorse-1.0-i2v` / `wan2.1-i2v` (image-to-video)
- **Endpoint**: `video-generation/video-synthesis` (async, polling)
- **Parameters**: 1280×720 resolution, configurable duration (2-15s), optional reference image
- **Polling**: Up to 60 attempts at 5s intervals (300s max)
- **Progress**: Logs status transitions (RUNNING → SUCCEEDED/FAILED)

### 11.5 Voice Synthesis (TTS)
- **Model**: `qwen3-tts-flash`
- **Endpoint**: `multimodal-generation/generation`
- **System voices**: Cherry (young female), Serena (mature female), Ethan (male), Pip (child)
- **Voice selection**: Automatic based on character gender and age range

### 11.6 Image Analysis
- **Model**: `qwen-vl-plus`
- **Input**: Base64-encoded image
- **Output**: Detailed descriptive text for production context

### 11.7 Token Budget & Rate Limiting
- Character generation: 5 requests/minute
- Environment generation: 5 requests/minute
- Voice generation: 5 requests/minute
- Scene video generation: 3 requests/minute
- Editor upload: 5 requests/minute
- All limits configurable in security.py RateLimiter

---

## 12. Video Generation Pipeline

### 12.1 Scene Video Generation (`run_scene_generation_job`)

The core video generation function in `jobs.py` handles:

1. **Scene identification** — Parses scene number from string, looks up in breakdown or storyboard
2. **Compile Scene Package** — `ScenePackageCompiler` resolves characters, enriches prompts, selects reference images
3. **Model selection** — Auto-chooses I2V (if reference available) or T2V
4. **Reference strategy**:
   - **Continuation**: If same location as previous scene → use last frame of previous video
   - **Character portrait**: Use primary character's clean portrait
   - **None**: Text-to-video only
5. **Video generation** — Async DashScope API call with polling
6. **Download** — Saves generated video to `static/uploads/`
7. **DB record** — Updates `SceneVideo` with URL, duration, model, prompt, auto-approve

### 12.2 Character Consistency System

The system maintains character consistency through several layers:

**Text-level consistency** (always applied):
- Visual signature string (age, build, hair, face, wardrobe, accessories, color palette)
- Consistency hash (SHA-256 of visual signature → first 16 hex characters)
- Prompt enrichment (substitutes character names with full physical descriptions)
- Character profile stored in DB with version tracking

**Visual consistency** (model-dependent):
- Clean character portrait as I2V reference (not a composite collage)
- Last-frame extraction for same-location scene continuations

**Limitations**:
- The AI video models (Wan2.7 / HappyHorse) don't support face embeddings, character IDs, or LoRA fine-tuning
- Each generation is a fresh inference — consistent description ≠ consistent visual output
- I2V uses the reference as the first frame but doesn't guarantee the same face across different scenes

### 12.3 Audio-Only Pipeline (Podcast / Audio Story)

For audio formats, the pipeline diverges:

**Podcast**:
1. Script expansion to match desired duration (~150 words per minute)
2. Paragraph-by-paragraph TTS synthesis via DashScope
3. MP3 concatenation into final file
4. Duration selector (5/10/15 minutes)

**Audio Story**:
1. Single TTS call on scene's audio notes or full script
2. Falls back to project script if breakdown has "N/A" fields

### 12.4 Video Export (FFmpeg)

The editor's export system builds complex FFmpeg filter graphs:

```
Video Track: trim → scale/crop with zoom/pan → effects → overlay → text → VFX → logo
Audio Track: trim → volume/fade → delay → amix (multi-track mixing)
Camera FX: split screen, screen_shake, zoom_punch, motion_blur, flash_frame
```

Supports:
- Custom aspect ratios (16:9, 9:16, 4:3, 1:1, 2.35:1)
- Resolution options (1080p, 720p, 480p)
- H.264 video + AAC audio output
- Progress monitoring via time code parsing
- Cancel support (kills FFmpeg process)

---

## 13. Production Types

### 13.1 Supported Types

| Type | Visual? | Storyboard? | Pipeline Path |
|------|---------|-------------|---------------|
| **Short Film** | ✅ | ✅ 3 fields | Full visual pipeline |
| **Trailer** | ✅ | ✅ | Full visual pipeline |
| **Documentary** | ✅ | ✅ | Full visual pipeline |
| **Drama** | ✅ | ✅ | Full visual pipeline |
| **Series Episode** | ✅ | ✅ | Full visual pipeline |
| **Educational Show** | ✅ | ✅ | Full visual pipeline |
| **Interview** | ✅ | ✅ | Full visual pipeline |
| **YouTube Video** | ✅ | ✅ | Full visual pipeline |
| **Podcast** | ❌ | Empty [] | Audio pipeline with expanded TTS |
| **Audio Story** | ❌ | Empty [] | Audio pipeline (N/A fields skipped) |

### 13.2 Type-Specific Behaviors

**Visual types** all follow the same pipeline with minor differences in:
- System prompts (camera rules, formatting)
- Script structure (acts for Drama, lesson structure for Educational, hook/intro for YouTube)
- Storyboard availability (all visual types get storyboard scenes)

**Audio types** (Podcast, Audio Story):
- Skip storyboard generation
- Skip scene breakdown LLM call (use hardcoded placeholder)
- Skip critic review (return N/A)
- Use audio-only planner (mic check, recording, mixing tasks)
- Generate MP3 instead of MP4
- Audio-optimized UI (no character/environment asset tabs)

### 13.3 Frontend-Only Types
**Feature Film** and **Commercial** appear in certain frontend dropdowns but have no dedicated backend prompts — they fall through to "Standard screenplay generation rules."

---

## 14. Video Editor

### 14.1 Track System

The editor supports 4 track types + logo overlay:

**Video Track**
- Multiple clips with timeline positioning
- Trim in/out points
- Scale, zoom, pan (keyframed)
- Color effects: brightness, contrast, saturation, hue rotate, grayscale, sepia, invert
- Lens effects: blur, vignette, edge detect, sharpen
- Mirror (horizontal/vertical)
- Color presets: Teal & Orange, Classic Noir, Cyberpunk, Silver Halide, etc.

**Audio Track**
- Multiple clips with timeline positioning
- Trim in/out
- Volume control
- Fade-in/fade-out
- Time offset/delay

**Text Track**
- Custom text overlays
- Font selection, color, size
- Position (corners, center, custom)
- Drop shadow
- Timing (start, end)

**VFX Track**
- 11 procedural overlay effects: rain, snow, fog, sparks, explosion, lens flare, light leaks, magic, fire, portal, glitch
- Camera FX: split screen, screen shake, zoom punch, motion blur, flash frame, speed ramp, freeze frame
- Per-effect blend modes and intensity

**Logo Track**
- Watermark/image overlay
- Position corner selector
- Opacity control

### 14.2 Undo/Redo
Full undo/redo system via `EditorContext.jsx` that snapshots all tracks before each mutation.

### 14.3 Persistence
All track state is persisted to `localStorage`, surviving page refreshes.

### 14.4 Export Pipeline
1. Validates clips and asset paths
2. Builds FFmpeg complex filtergraph
3. Spawns FFmpeg process with progress parsing
4. Streams progress via SSE (`editor/export/status/{task_id}`)
5. Supports cancellation via SIGTERM

---

## 15. Asset Management

### 15.1 Character Assets
Generated via `run_character_generation_job()`:
1. Qwen text model expands character profile from script context
2. Creates visual signature + consistency hash
3. Generates reference portrait via Wan2.6-T2I
4. Downloads image to `static/uploads/`
5. Versions stored in `character_assets` table
6. Frontend shows profile fields (age, gender, body type, hair, face, wardrobe, accessories, color palette)

### 15.2 Environment Assets
Generated via `run_environment_generation_job()`:
1. Qwen text model expands environment profile
2. Creates environment signature + consistency hash
3. Generates reference image
4. Stores with versioning

### 15.3 Voice Assets
Generated via `run_voice_generation_job()`:
1. Qwen text model builds voice identity profile (tone, energy, pace, accent, style)
2. Maps to DashScope TTS system voice (Cherry/Serena/Ethan/Pip) based on gender + age
3. Extracts first dialogue line from script for preview
4. Synthesizes speech via qwen3-tts-flash
5. Falls back to static SFX if TTS fails

### 15.4 Versioning System
Each asset type supports versioning with:
- Incrementing version numbers
- Preferred version selection (`is_preferred` flag)
- Frontend version picker in Production Studio

---

## 16. Authentication & Security

### 16.1 Auth Methods
- **Email + Password** — Registration with OTP verification, password hashing (bcrypt-style via passlib)
- **Google OAuth** — One-tap sign-in, auto-creates account if new
- **Session cookies** — JWT-based, configurable expiry

### 16.2 Flow
1. User enters email → system checks if registered
2. New users: register → receive 6-digit OTP → verify OTP → authenticated
3. Existing users: enter password → authenticated
4. Google OAuth: one-click → account created/authenticated

### 16.3 Account Deletion
- Request deletion → sends OTP to email for confirmation
- 6-digit OTP input in UI → permanent deletion of user + all projects

### 16.4 Security Measures
- **File upload validation**: Magic number verification for all uploaded files (rejects non-media/non-text types)
- **Rate limiting**: Redis-based per-endpoint rate limits
- **Prompt validation**: Gibberish detection (10k-word dictionary) on client side
- **CORS**: Configurable allowed origins

---

## 17. VFX & Sound Effects System

### 17.1 Procedural Generation (`vfx_generator.py`)

VFX overlays and SFX are generated procedurally at startup — no AI calls needed.

**11 Visual Effects** (MP4, ~5s each):
| Effect | Technique |
|--------|-----------|
| rain | Random falling white lines with varying speed |
| snow | Random falling white dots with drift |
| fog | Perlin-noise-like gradient overlay, slow pan |
| sparks | Yellow/orange particle bursts |
| explosion | Expanding orange/red circle with particle debris |
| lens_flare | Bright gradient streak with rotation |
| light_leaks | Semicircular transparent color washes |
| magic | Blue/purple spinning particle glow |
| fire | Red/orange/yellow flickering noise bands |
| portal | Spinning blue/purple vortex ring |
| glitch | Random RGB channel shift with noise blocks |

**12 Sound Effects** (MP3):
Matching audio for each VFX (rain ambience, explosion boom, magic whoosh, etc.) plus a flash sound.

### 17.2 Generation Parameters
- Resolution: 1920×1080
- Duration: 5 seconds per effect
- FPS: 24
- Colors: Effect-specific palettes
- GIF previews also generated

---

## 18. Configuration Reference

### 18.1 Backend Configuration (`backend/.env`)
```ini
# Required
QWEN_API_KEY=sk-your-api-key

# Optional (shown with defaults)
QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
QWEN_IMAGE_MODEL=wan2.6-t2i
QWEN_VISION_MODEL=qwen-vl-plus
DATABASE_URL=sqlite:///./director_desk.db
REDIS_URL=redis://localhost:6379
STORAGE_PROVIDER=tmpfiles

# Email (OTP sending)
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_FROM=Director Desk <noreply@directordesk.app>
```

### 18.2 Frontend Configuration (`frontend/.env`)
```ini
VITE_API_BASE_URL=http://localhost:8000
```

### 18.3 Starting the Stack
```bash
# Terminal 1: Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev

# Optional: Redis (job queue)
redis-server

# Open: http://localhost:5173
```

---

## 19. Development Guide

### 19.1 Adding a New Production Type

1. **Backend**: Add to `showrunner_agent.py`:
   - `get_system_prompt()` — New `elif` block with format rules
   - `detect_production_type()` — Add to valid_types list
   - `generate_all()` — Add format-specific processing if needed

2. **Pipeline**: Check `showrunner_service.py` — ensure audio/visual branching handles the new type

3. **Frontend**: Add to:
   - `HeroSection.jsx` — `prodTypePool` and type dropdown options
   - `ProductionPage.jsx` — Tab filtering switch

4. **Scene breakdown**: If audio-only, add to the audio-type branches in `showrunner_service.py` and `rendering.py`

### 19.2 Adding a New Agent

1. Create `backend/app/agents/new_agent.py` with class + singleton
2. Add import to `agents/__init__.py`
3. Add LLM prompt logic
4. Wire into `ShowrunnerService` pipeline (Fast mode in `generate()`, Studio mode in `generate_stream()` and `resume_generate_stream()`)
5. Add frontend agent display in `ProjectDataContext.jsx` agent list

### 19.3 Adding a New VFX Effect

1. Add to `vfx_generator.py`:
   - `generate_overlay_video()` — Add `effect_id` branch with procedural generation logic
   - `generate_sfx_audio()` — Add matching sound effect
   - `generate_all_vfx_assets()` — Add effect ID to the loop

2. Frontend: Add to `EditorContext.jsx` VFX list and `EditorPage.jsx` VFX panel

### 19.4 Testing

The project doesn't have a formal test suite. Testing is manual:
1. Run backend + frontend locally
2. Enter a prompt on the dashboard
3. Verify full pipeline completes (script → storyboard → breakdown → plan → review)
4. Generate character/environment/voice assets
5. Generate scene videos
6. Test video editor export

---

## 20. Troubleshooting

### Common Issues

**"QWEN_API_KEY is not set"**
→ Copy `backend/.env.example` to `backend/.env` and add your DashScope API key.

**Story generation fails silently**
→ Check backend console logs for LLM response errors. Common causes: API key expired, rate limit exceeded, malformed JSON in LLM response.

**Scene video generation times out**
→ Video models can take 60-300 seconds. Check `qwen_service.py` polling timeout (default 300s). If consistently timing out, reduce video duration.

**Blank/stuck scene videos**
→ `SceneVideo` records are created with empty URLs before generation starts. The frontend detects `status="processing"` and shows a "generating" state. If stuck on "processing" indefinitely, the background task may have crashed — check backend logs.

**Redis connection errors**
→ Redis is optional. If not available, the job system falls back gracefully. You'll see connection warnings in logs but core functionality (story generation, asset generation) works without Redis.

**FFmpeg errors during export**
→ Verify FFmpeg is installed and available on PATH. Export supports H.264 video + AAC audio codecs.

**Audio Story produces "Ambient audio track" speech**
→ The scene breakdown returns "N/A" for audio notes. The fix (as of latest update): falls back to the full project script text.

**OTP emails not sending**
→ Mailgun API key required. Check `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` in `.env`. Without email, check backend console for OTP codes in logs (printed during development).

---

## Appendix: File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/pages/ProductionPage.jsx` | ~2800 | Production studio (largest file) |
| `frontend/src/components/Sidebar.jsx` | ~1318 | Navigation sidebar |
| `frontend/src/components/HeroSection.jsx` | ~1414 | Dashboard hero + prompt input |
| `frontend/src/pages/EditorPage.jsx` | ~4100 | Video editor |
| `frontend/src/components/TabbedContent.jsx` | ~1109 | Production output tabs |
| `frontend/src/context/ProjectDataContext.jsx` | ~650 | Central state management |
| `frontend/src/context/EditorContext.jsx` | ~700 | Editor state |
| `backend/app/api/routes/jobs.py` | ~1250 | Production studio jobs |
| `backend/app/services/showrunner_service.py` | ~1000 | Pipeline orchestrator |
| `backend/app/services/qwen_service.py` | ~430 | AI integration |
| `backend/app/services/scene_compiler.py` | ~400 | Scene package compilation |
| `backend/app/agents/scene_breakdown_agent.py` | ~430 | Scene breakdown LLM logic |
| `backend/app/agents/showrunner_agent.py` | ~170 | Meta-agent |
| `backend/app/main.py` | ~80 | App entry point |

---


