# Director Desk Frontend — Cinematic Studio UI

This is the React-based Vite frontend for Director Desk. It provides the user interface for project creation, screenplay editing, character design, acoustic casting, multi-track timeline editing, and final theatrical packaging.

---

## 🏗️ UI Architecture & Structure

```
frontend/
├── src/
│   ├── components/     # Reusable layout and widget components (Sidebar, Hero, etc.)
│   ├── context/        # React Context providers (EditorState, ProjectState, Theme)
│   ├── data/           # Presets and hardcoded styling configurations
│   ├── hooks/          # Custom hooks to interact with backend services
│   ├── pages/          # Route-level views (Dashboard, EditorPage, Studio, etc.)
│   └── utils/          # Formatting helpers, encoders, and math modules
├── public/             # Static reference videos, banner graphics, and sound assets
├── package.json        # NPM dependencies and scripts
└── vite.config.js      # Vite build bundler configuration
```

---

## 💻 Core Pages & Workflows

### 1. Studio Project Wizard ([Dashboard.jsx](file:///d:/Programs%20and%20Codes/director-desk/frontend/src/pages/Dashboard.jsx))
*   **Project Configurator:** Collects user prompts, aspect ratios, style templates, and camera styles.
*   **Interactive Visuals:** Uses a Canvas-based drifting dust spec particle generator in spotlight beams to create a theatrical feel.
*   **Aesthetic Lookbooks:** Integrates hover-play video cards with mouse-tracking radial lens flare overlays to preview style presets.

### 2. Multi-Track Video Timeline ([EditorPage.jsx](file:///d:/Programs%20and%20Codes/director-desk/frontend/src/pages/EditorPage.jsx))
*   Provides a non-destructive timeline editor for compiling multi-track video projects.
*   **Tracks Supported:** Video Track (clips, sizing, trim), Audio Track (volume, delay), Text Track (subtitles positioning), and VFX Track (screen overlays).
*   **Aesthetic Overlays:** Integrates visual sliders to adjust filters (Brightness, Contrast, Saturation, Blur, Vignette) and apply blending transitions.
*   **Polling Render Pipeline:** Initiates exports to the backend, showing progress status bars and fetching final completed file downloads.

### 3. Post-Production Audio & Subtitles ([PostProductionStudio.jsx](file:///d:/Programs%20and%20Codes/director-desk/frontend/src/pages/PostProductionStudio.jsx))
*   **Timeline Segments Editor:** Allows users to adjust subtitle timestamps, split text segments, modify text, and add subtitle tracks.
*   **Dubbing Studio:** Exposes language translation select menus and trigger actions to compile multilingual voice casts.
*   **Audio Description Generator:** Allows users to generate synthetic descriptive narration and control dynamic backing track audio ducking.

### 4. Release Canvas & Theatrical Packaging ([ReleaseStudio.jsx](file:///d:/Programs%20and%20Codes/director-desk/frontend/src/pages/ReleaseStudio.jsx))
*   **Poster Canvas:** Uses `html2canvas` to render and compile billing blocks, movie titles, laurels, and cast details into print-ready movie posters.
*   **Trailer Engine:** Selects generated scenes, designs title card text, and exports cinematic trailers.

---

## ⚡ React Contexts & Hooks

*   **EditorContext ([EditorContext.jsx](file:///d:/Programs%20and%20Codes/director-desk/frontend/src/context/EditorContext.jsx)):** Manages the global state of the timeline tracks, handles drag-and-drop file placements, calculates total duration, monitors render tasks, and tracks player play/pause status.
*   **ProjectDataContext ([ProjectDataContext.jsx](file:///d:/Programs%20and%20Codes/director-desk/frontend/src/context/ProjectDataContext.jsx)):** Manages the active project state, caches storyboard scripts, and listens to the backend Server-Sent Events (SSE) stream to track real-time project progress.
*   **ThemeContext ([ThemeContext.jsx](file:///d:/Programs%20and%20Codes/director-desk/frontend/src/context/ThemeContext.jsx)):** Manages the global light/dark mode theme configurations.

---

## 🚀 Setup & Local Run

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn package manager

### Installation
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Configure your variables by copying `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
    Ensure the `VITE_API_BASE_URL` variable points to your running backend:
    ```env
    VITE_API_BASE_URL=http://localhost:8000
    ```
4.  Launch the Vite development server:
    ```bash
    npm run dev
    ```

The application will be accessible locally at `http://localhost:5173`.
