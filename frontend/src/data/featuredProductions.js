const neoStoryboard = [
  { scene: 1, shot: "ESTABLISHING SHOT - METROPOLIS CANYON", description: "Hovering spinner vehicles pass through towering skyscraper canyons, massive blue holograms flicker in heavy rain.", environment: "EXT. NEO-TOKYO CANYONS", mood: "CYBERPUNK NEON" },
  { scene: 2, shot: "MEDIUM CLOSE UP - KAELEN", description: "Kaelen looks at the rain running down his high-rise window, green cybernetic lens flares reflecting in his eyes.", environment: "INT. DETECTIVE DECK", mood: "MELANCHOLY" },
  { scene: 3, shot: "DETAIL INSERT - HOLOGRAPHIC DECK", description: "A gloved finger taps against a glowing glass interface, scrolling through wireframe node nets.", environment: "INT. DETECTIVE DECK", mood: "CRITICAL TECH" }
];

const quietStoryboard = [
  { scene: 1, shot: "ESTABLISHING SHOT - SUNLIT STUDIO", description: "Warm morning light pours across a wooden desk, spotlighting an old SLR camera.", environment: "INT. APARTMENT", mood: "NOSTALGIC GOLDEN" },
  { scene: 2, shot: "CLOSE UP - ELENA'S HANDS", description: "Worn, wrinkled hands gently pick up the mechanical camera and dust the lens.", environment: "INT. APARTMENT", mood: "TENDER & PATIENT" }
];

const echoesStoryboard = [
  { scene: 1, shot: "WIDE SHOT - THE LUNAR HORIZON", description: "Astronaut in a bulky suit walking across the grey landscape, Earth tiny in the background.", environment: "EXT. MOON", mood: "DESOLATE VACUUM" },
  { scene: 2, shot: "EXTREME CLOSE UP - WRIST GAUGE", description: "A small orange needle pulses frantically, reflecting retro HUD graphics on the helmet visor.", environment: "EXT. MOON", mood: "TENSION & MYSTERY" }
];

const lighthouseStoryboard = [
  { scene: 1, shot: "ESTABLISHING WIDE - THE LIGHTHOUSE", description: "The tall stone tower stands defiantly against towering storm waves, lighting the dark stormy sea.", environment: "EXT. LIGHTHOUSE CLIFF", mood: "STORMY DRAMA" },
  { scene: 2, shot: "CLOSE UP - ALISTAIR", description: "Alistair holds a brass lantern, his face lit by the warm flame, screaming into the dark.", environment: "EXT. BALCONY", mood: "DESPERATION" }
];

const generateLighting = (sceneIdx, totalScenes) => {
  if (sceneIdx === 0) return "Hard neon backlight from street-level signage, cyan and magenta color casts on rain-slicked surfaces, volumetric beams through smoke haze";
  if (sceneIdx === totalScenes - 1) return "Mixed practical and bioluminescent key light, soft fill from holographic interface, deep shadows in surrounding machinery";
  return "Single practical source motivated through windows, warm tungsten key, blue ambient fill from exterior city glow";
};

const generateCamera = (sceneIdx) => {
  const setups = ["Arri Alexa 65, 35mm anamorphic", "RED Komodo, 50mm spherical", "Sony Venice, 24mm wide-angle", "Panavision Millennium XL, 85mm portrait"];
  return setups[sceneIdx % setups.length];
};

const generateMovement = (sceneIdx) => {
  const moves = ["Slow descending crane from high establishing position", "Steadicam push-in following character motion", "Whip pan to action then lock-off", "Dolly zoom emphasizing scale and isolation"];
  return moves[sceneIdx % moves.length];
};

const generateShotType = (sceneIdx) => {
  const shots = ["Extreme wide shot", "Medium close-up", "Over-the-shoulder", "Close-up detail insert"];
  return shots[sceneIdx % shots.length];
};

const generateTimeOfDay = (text) => {
  const t = text.toLowerCase();
  if (t.includes("night") || t.includes("dark")) return "Night";
  if (t.includes("morning") || t.includes("dawn") || t.includes("sunrise")) return "Dawn / Morning";
  if (t.includes("dusk") || t.includes("sunset") || t.includes("evening")) return "Dusk / Evening";
  if (t.includes("golden") || t.includes("afternoon")) return "Golden Hour";
  return "Variable / Ambient";
};

const generateWeather = (text) => {
  const t = text.toLowerCase();
  if (t.includes("rain") || t.includes("storm") || t.includes("thunder")) return "Heavy rain / Storm";
  if (t.includes("snow") || t.includes("blizzard")) return "Snowfall";
  if (t.includes("fog") || t.includes("mist") || t.includes("smog")) return "Fog / Smog";
  if (t.includes("vacuum") || t.includes("space") || t.includes("lunar")) return "Clear vacuum / Zero precipitation";
  return "Clear / Overcast";
};

const buildBreakdown = (storyboard) => {
  const combinedText = JSON.stringify(storyboard);
  const timeOfDay = generateTimeOfDay(combinedText);
  const weather = generateWeather(combinedText);
  const scenes = storyboard.map((s, idx) => ({
    scene_number: `SCENE ${String(s.scene || idx + 1).padStart(2, '0')}`,
    title: s.shot || "Untitled Scene",
    duration: `${8 + idx * 2} seconds`,
    location: s.environment?.replace("INT. ", "").replace("EXT. ", "").replace(" - ", ", ") || "Set",
    environment: s.environment || "Set",
    time_of_day: timeOfDay,
    weather: weather,
    characters: [],
    character_descriptions: "Refer to script for character direction",
    wardrobe: "Refer to script for costume direction",
    props: [],
    visual_style: "Cinematic",
    mood: s.mood || "Atmospheric",
    camera_setup: generateCamera(idx),
    camera_movement: generateMovement(idx),
    shot_type: generateShotType(idx),
    lighting_design: generateLighting(idx, storyboard.length),
    audio_notes: idx === 0 ? "Ambient room tone, distant environmental sounds" : (idx === storyboard.length - 1 ? "Fade to silence, end credit music swell" : "Dialogue sync, subtle atmospheric layers"),
    ai_generation_prompt: `${s.mood ? s.mood + ". " : ""}${s.description || ""}`.trim()
  }));

  return {
    total_runtime: `${scenes.length * 10} seconds`,
    consistency_warnings: ["Ensure consistent character appearance across all scenes", "Verify environment continuity between scene transitions"],
    scenes,
    asset_requirements: {
      characters_needed: [],
      locations_needed: [...new Set(storyboard.map(s => s.environment).filter(Boolean))],
      props_needed: [],
      sound_requirements: ["Ambient score", "Dialogue audio tracks", "SFX library"],
      vfx_requirements: ["Color grading pass", "Atmospheric overlays"]
    }
  };
};

export const featuredProductions = {
  'neo-tokyo': {
    title: 'Neo-Tokyo 2099',
    script: `FADE IN:

INT. DETECTIVE DECK - NIGHT

A lone figure, KAELEN (30s), stands by a massive rain-streaked window. Below, the neon canyons of Neo-Tokyo hum with glowing advertisements. Hologram carp swim through the clouds of smog.

KAELEN
(whispering)
The data doesn't lie. But who's buying?

He taps a glass interface. A green wireframe code grid reflects in his cybernetic eye.

EXT. METROPOLIS OVERPASS - LATER

Kaelen sits on the edge of a steel girder. Flying spinners dart past him, leaving light trails. 

He takes a slow drag from a synthetic cigarette. The blue tip glows.

FADE OUT.`,
    storyboard: [
      {
        scene: 1,
        shot: "ESTABLISHING SHOT - METROPOLIS CANYON",
        description: "Hovering spinner vehicles pass through towering skyscraper canyons, massive blue holograms flicker in heavy rain.",
        environment: "EXT. NEO-TOKYO CANYONS",
        mood: "CYBERPUNK NEON"
      },
      {
        scene: 2,
        shot: "MEDIUM CLOSE UP - KAELEN",
        description: "Kaelen looks at the rain running down his high-rise window, green cybernetic lens flares reflecting in his eyes.",
        environment: "INT. DETECTIVE DECK",
        mood: "MELANCHOLY"
      },
      {
        scene: 3,
        shot: "DETAIL INSERT - HOLOGRAPHIC DECK",
        description: "A gloved finger taps against a glowing glass interface, scrolling through wireframe node nets.",
        environment: "INT. DETECTIVE DECK",
        mood: "CRITICAL TECH"
      }
    ],
    sceneBreakdown: buildBreakdown(neoStoryboard),
    productionPlan: {
      title: "Neo-Tokyo 2099 - Production Plan",
      phases: [
        {
          name: "Pre-Production",
          status: "complete",
          items: [
            "Script finalized by Writer Agent",
            "Cyberpunk presets loaded (Neon theme)",
            "Storyboard rendering complete (3 visual scenes)",
            "Auditioned synth voice models for Kaelen"
          ]
        },
        {
          name: "Production",
          status: "complete",
          items: [
            "Volumetric lighting setup finalized",
            "Synthesized neon ambient backgrounds",
            "Camera movement sequences rendered"
          ]
        },
        {
          name: "Post-Production",
          status: "pending",
          items: [
            "Voice-over narration generation",
            "Synthwave audio track composition",
            "Cyberpunk color grading and glow pass"
          ]
        }
      ]
    },
    agents: [
      { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "2 mins ago" },
      { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "completed", completedAt: "1 min ago" },
      { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "completed", completedAt: "1 min ago" },
      { id: "editor", name: "Editor Agent", role: "Final Assembly", icon: "🎬", status: "active", completedAt: null }
    ],
    criticReview: {
      score: 8,
      strengths: ["Highly atmospheric worldbuilding", "Strong cyberpunk aesthetic", "Great dynamic lighting descriptions"],
      weaknesses: ["Kaelen's motivation could be clearer in scene 2", "Pacing feels slightly fast at the transition"],
      suggestions: ["Add a short beat of Kaelen reflecting on his past to establish stakes", "Extend the metropolian overpass scene to show more of the environment"]
    }
  },
  'quiet-camera': {
    title: 'The Quiet Camera',
    script: `FADE IN:

INT. STUDIO APARTMENT - MORNING

Golden light streams through a tall sash window, illuminating dust motes hanging in the air. 

ELENA (70s) sits in a rocking chair, hands folded. On the table next to her sits a vintage mechanical camera, its silver plating worn and scratched.

She reaches out, running a thumb over the camera lens.

ELENA
(softly)
Fifty years, and still the same lens...

She looks out the window at the empty street.

FADE OUT.`,
    storyboard: [
      {
        scene: 1,
        shot: "ESTABLISHING SHOT - SUNLIT STUDIO",
        description: "Warm morning light pours across a wooden desk, spotlighting an old SLR camera.",
        environment: "INT. APARTMENT",
        mood: "NOSTALGIC GOLDEN"
      },
      {
        scene: 2,
        shot: "CLOSE UP - ELENA'S HANDS",
        description: "Worn, wrinkled hands gently pick up the mechanical camera and dust the lens.",
        environment: "INT. APARTMENT",
        mood: "TENDER & PATIENT"
      }
    ],
    sceneBreakdown: buildBreakdown(quietStoryboard),
    productionPlan: {
      title: "The Quiet Camera - Production Plan",
      phases: [
        {
          name: "Pre-Production",
          status: "complete",
          items: [
            "Script drafted by Writer Agent",
            "Vintage color palettes established",
            "Natural lighting analysis completed"
          ]
        },
        {
          name: "Production",
          status: "pending",
          items: [
            "High dynamic range camera simulation",
            "Lenses aberration modeling",
            "Room tone audio recording"
          ]
        },
        {
          name: "Post-Production",
          status: "pending",
          items: [
            "Elena's voice synthesis",
            "Acoustic piano background score",
            "Warm grain film overlay"
          ]
        }
      ]
    },
    agents: [
      { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "5 mins ago" },
      { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "completed", completedAt: "4 mins ago" },
      { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "waiting", completedAt: null },
      { id: "editor", name: "Editor Agent", role: "Final Assembly", icon: "🎬", status: "waiting", completedAt: null }
    ],
    criticReview: {
      score: 9,
      strengths: ["Very emotionally resonant dialogue", "Consistent pacing and tone", "Clear and rich environment descriptions"],
      weaknesses: ["The rocking chair action repeats too frequently", "Lighting transitions could be softer"],
      suggestions: ["Vary the action cues so Elena does not only rock or touch the camera", "Specify golden hour lighting transitions explicitly in the action block"]
    }
  },
  'echoes-apollo': {
    title: 'Echoes of Apollo',
    script: `FADE IN:

EXT. LUNAR SURFACE - DAY

The black vacuum of space. The Earth hangs like a fragile blue marble in the distance. 

An astronaut, COMMANDER MILLER, walks slowly away from the spider-like lunar lander. His boots kick up fine grey regolith.

MILLER
(through static radio)
Houston, the landing site is silent. Repeat, silent.

Suddenly, a strange warm signal pulses on his wrist gauge. A beacon is blinking.

FADE OUT.`,
    storyboard: [
      {
        scene: 1,
        shot: "WIDE SHOT - THE LUNAR HORIZON",
        description: "Astronaut in a bulky suit walking across the grey landscape, Earth tiny in the background.",
        environment: "EXT. MOON",
        mood: "DESOLATE VACUUM"
      },
      {
        scene: 2,
        shot: "EXTREME CLOSE UP - WRIST GAUGE",
        description: "A small orange needle pulses frantically, reflecting retro HUD graphics on the helmet visor.",
        environment: "EXT. MOON",
        mood: "TENSION & MYSTERY"
      }
    ],
    sceneBreakdown: buildBreakdown(echoesStoryboard),
    productionPlan: {
      title: "Echoes of Apollo - Production Plan",
      phases: [
        {
          name: "Pre-Production",
          status: "complete",
          items: [
            "Sci-fi setting research completed",
            "Apollo audio filter algorithms calibrated",
            "Storyboard scenes matched to 1969 film style"
          ]
        },
        {
          name: "Production",
          status: "complete",
          items: [
            "Low-gravity physics model enabled",
            "Dust scatter simulation rendered",
            "Radio transmission distortion modeling"
          ]
        },
        {
          name: "Post-Production",
          status: "complete",
          items: [
            "Astronaut voice transmission synth complete",
            "Eerie sci-fi synth pad overlay rendered",
            "Critic review approval verified"
          ]
        }
      ]
    },
    agents: [
      { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "10 mins ago" },
      { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "completed", completedAt: "9 mins ago" },
      { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "completed", completedAt: "8 mins ago" },
      { id: "editor", name: "Editor Agent", role: "Final Assembly", icon: "completed", completedAt: "8 mins ago" }
    ],
    criticReview: {
      score: 7,
      strengths: ["Strong sci-fi premise", "Stunning visual prompts for the lunar horizon"],
      weaknesses: ["Miller's dialog is slightly generic for an experienced commander", "The warm signal reveal lacks suspense buildup"],
      suggestions: ["Give Miller more technical or professional dialogue cues", "Add a scene of Miller struggling with static before receiving the signal"]
    }
  },
  'last-lighthouse': {
    title: 'The Last Lighthouse',
    script: `FADE IN:

EXT. CLIFFS OF EIRE - NIGHT

Thunder crashes. A massive wave slams against the black jagged rocks below. 

A lone watchman, ALISTAIR (60s), stands on the balcony of the white stone lighthouse, holding a lantern high against the wind.

ALISTAIR
(shouting into the gale)
Keep off the shoals! Keep off!

Through the dark, a silent ghost ship sails with no lights, straight towards the reef.

FADE OUT.`,
    storyboard: [
      {
        scene: 1,
        shot: "ESTABLISHING WIDE - THE LIGHTHOUSE",
        description: "The tall stone tower stands defiantly against towering storm waves, lighting the dark stormy sea.",
        environment: "EXT. LIGHTHOUSE CLIFF",
        mood: "STORMY DRAMA"
      },
      {
        scene: 2,
        shot: "CLOSE UP - ALISTAIR",
        description: "Alistair holds a brass lantern, his face lit by the warm flame, screaming into the dark.",
        environment: "EXT. BALCONY",
        mood: "DESPERATION"
      }
    ],
    sceneBreakdown: buildBreakdown(lighthouseStoryboard),
    productionPlan: {
      title: "The Last Lighthouse - Production Plan",
      phases: [
        {
          name: "Pre-Production",
          status: "complete",
          items: [
            "Script finalized by Writer Agent",
            "Ocean simulator presets calibrated",
            "Storm lighting model compiled"
          ]
        },
        {
          name: "Production",
          status: "pending",
          items: [
            "Fluid dynamics wave render",
            "Alistair voice narration synth",
            "Focal sweep camera modeling"
          ]
        },
        {
          name: "Post-Production",
          status: "pending",
          items: [
            "Low-frequency thunder audio effects",
            "Moody cold color grade pass"
          ]
        }
      ]
    },
    agents: [
      { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "4 mins ago" },
      { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "completed", completedAt: "3 mins ago" },
      { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "waiting", completedAt: null },
      { id: "editor", name: "Editor Agent", role: "Final Assembly", icon: "🎬", status: "waiting", completedAt: null }
    ],
    criticReview: {
      score: 8,
      strengths: ["Excellent dramatic tension", "Highly vivid storm description", "Great dynamic storyboard sequencing"],
      weaknesses: ["Alistair's dialogue is too short to show his isolation", "Ghost ship description is sparse"],
      suggestions: ["Add an action line of Alistair looking at faded lighthouse crew photos", "Describe the torn sails and phantom-like movement of the ghost ship in detail"]
    }
  }
};
