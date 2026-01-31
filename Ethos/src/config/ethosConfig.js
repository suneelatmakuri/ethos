// src/config/ethosConfig.js

export const ETHOS_CONFIG = {
  defaultTracks: [],
};

export const SEED_TEMPLATES = [
  // Health
  { id: "seed_water", name: "Water", category: "Health", iconKey: "water", track: { type: "COUNTER_INCREMENT", cadence: "daily", unit: "ml", config: { incrementStep: 250 }, target: { mode: "value", value: 3000 } } },
  { id: "seed_steps", name: "Steps", category: "Health", iconKey: "steps", track: { type: "COUNTER_INCREMENT", cadence: "daily", unit: "steps", config: { incrementStep: 500 }, target: { mode: "value", value: 8000 } } },
  { id: "seed_protein", name: "Protein", category: "Health", iconKey: "protein", track: { type: "COUNTER_INCREMENT", cadence: "daily", unit: "g", config: { incrementStep: 10 }, target: { mode: "value", value: 120 } } },
  { id: "seed_calories", name: "Calories", category: "Health", iconKey: "calories", track: { type: "COUNTER_INCREMENT", cadence: "daily", unit: "kcal", config: { incrementStep: 50 }, target: { mode: "value", value: 0 } } },
  { id: "seed_vitamins", name: "Vitamins", category: "Health", iconKey: "vitamins", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_supps", name: "Supplements", category: "Health", iconKey: "supplements", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },

  // Fitness
  { id: "seed_workout", name: "Workout", category: "Fitness", iconKey: "workout", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_run", name: "Run", category: "Fitness", iconKey: "run", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_cycle", name: "Cycling", category: "Fitness", iconKey: "cycle", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_swim", name: "Swim", category: "Fitness", iconKey: "swim", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_strength", name: "Strength", category: "Fitness", iconKey: "strength", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_stretch", name: "Stretching", category: "Fitness", iconKey: "stretch", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_mobility", name: "Mobility", category: "Fitness", iconKey: "mobility", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },

  // Mind
  { id: "seed_meditation", name: "Meditation", category: "Mind", iconKey: "meditation", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_breath", name: "Breathwork", category: "Mind", iconKey: "breath", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_journal", name: "Journal", category: "Mind", iconKey: "journal", track: { type: "TEXT_APPEND", cadence: "daily", unit: "entries", config: { maxLength: 2000 }, target: { mode: "count", value: 0 } } },
  { id: "seed_mood", name: "Mood", category: "Mind", iconKey: "mood", track: { type: "DROPDOWN_EVENT", cadence: "daily", unit: "", config: { options: [{ id: "great", label: "Great" },{ id: "good", label: "Good" },{ id: "ok", label: "Okay" },{ id: "low", label: "Low" },{ id: "bad", label: "Bad" }] }, target: { mode: "count", value: 0 } } },
  { id: "seed_focus", name: "Focus", category: "Mind", iconKey: "focus", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_gratitude", name: "Gratitude", category: "Mind", iconKey: "gratitude", track: { type: "TEXT_APPEND", cadence: "daily", unit: "entries", config: { maxLength: 800 }, target: { mode: "count", value: 0 } } },

  // Lifestyle
  { id: "seed_sleep", name: "Sleep", category: "Lifestyle", iconKey: "sleep", track: { type: "NUMBER_REPLACE", cadence: "daily", unit: "hrs", config: { precision: 1, minValue: 0, maxValue: 24 }, target: null } },
  { id: "seed_reading", name: "Reading", category: "Lifestyle", iconKey: "reading", track: { type: "COUNTER_INCREMENT", cadence: "daily", unit: "min", config: { incrementStep: 10 }, target: { mode: "value", value: 20 } } },
  { id: "seed_skincare", name: "Skincare", category: "Lifestyle", iconKey: "skincare", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_screen", name: "Screen Time", category: "Lifestyle", iconKey: "screen_time", track: { type: "COUNTER_INCREMENT", cadence: "daily", unit: "min", config: { incrementStep: 15 }, target: { mode: "value", value: 0 } } },
  { id: "seed_coffee", name: "Coffee", category: "Lifestyle", iconKey: "coffee", track: { type: "COUNTER_INCREMENT", cadence: "daily", unit: "cups", config: { incrementStep: 1 }, target: { mode: "value", value: 0 } } },

  // Social
  { id: "seed_social", name: "Social", category: "Social", iconKey: "social", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_family", name: "Family Time", category: "Social", iconKey: "family", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_music", name: "Music", category: "Social", iconKey: "music", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },

  // Work / Life admin
  { id: "seed_learn", name: "Learning", category: "Work", iconKey: "learn", track: { type: "COUNTER_INCREMENT", cadence: "weekly", unit: "min", config: { incrementStep: 30 }, target: { mode: "value", value: 0 } } },
  { id: "seed_finance", name: "Finance Review", category: "Work", iconKey: "finance", track: { type: "BOOLEAN", cadence: "monthly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_chores", name: "Chores", category: "Home", iconKey: "chores", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_clean", name: "Clean", category: "Home", iconKey: "clean", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_cook", name: "Cook", category: "Home", iconKey: "cook", track: { type: "BOOLEAN", cadence: "weekly", unit: "", config: { booleanMode: "done_only" }, target: null } },

  // Optional “edge” habits
  { id: "seed_sun", name: "Sunlight", category: "Lifestyle", iconKey: "sunlight", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_posture", name: "Posture", category: "Health", iconKey: "posture", track: { type: "BOOLEAN", cadence: "daily", unit: "", config: { booleanMode: "done_only" }, target: null } },
  { id: "seed_energy", name: "Energy", category: "Mind", iconKey: "energy", track: { type: "NUMBER_REPLACE", cadence: "daily", unit: "/10", config: { precision: 0, minValue: 0, maxValue: 10 }, target: null } },

  // Misc fallback demo
  { id: "seed_misc_quick", name: "Quick Note", category: null, iconKey: "notes", track: { type: "TEXT_APPEND", cadence: "daily", unit: "entries", config: { maxLength: 600 }, target: { mode: "count", value: 0 } } },
];
