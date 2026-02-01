// src/config/ethosConfig.js

export const ETHOS_CONFIG = {
  defaultTracks: [],
};

// NOTE: Template shape must remain:
// { id, name, category, iconKey, track: { ... } }
// Also: templates should NOT set targets; users will customize targets after adding.

export const SEED_TEMPLATES = [
  // -------------------------
  // FITNESS
  // -------------------------
  {
    id: "seed_run",
    name: "Run",
    category: "Fitness",
    iconKey: "run",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "weekly",
      unit: "km",
      config: { incrementStep: 1 },
      target: null,
    },
  },
  {
    id: "seed_workout",
    name: "Workout",
    category: "Fitness",
    iconKey: "workout",
    track: {
      type: "DROPDOWN_EVENT",
      cadence: "weekly",
      unit: "sessions",
      config: {
        allowMultiSelect: false,
        optionsAreUserEditable: true,
        options: [
          { id: "upper_body", label: "Upper Body" },
          { id: "lower_body", label: "Lower Body" },
          { id: "back", label: "Back" },
          { id: "biceps", label: "Biceps" },
          { id: "arms", label: "Arms" },
          { id: "shoulders", label: "Shoulders" },
          { id: "legs", label: "Legs" },
        ],
      },
      target: null,
    },
  },
  {
    id: "seed_dance",
    name: "Dance",
    category: "Fitness",
    iconKey: "dance",
    track: {
      type: "BOOLEAN",
      cadence: "weekly",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },
  {
    id: "seed_yoga",
    name: "Yoga",
    category: "Fitness",
    iconKey: "yoga",
    track: {
      type: "BOOLEAN",
      cadence: "weekly",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },

  // -------------------------
  // HEALTH
  // -------------------------
  {
    id: "seed_water",
    name: "Water",
    category: "Health",
    iconKey: "water",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "daily",
      unit: "ml",
      config: { incrementStep: 250 },
      target: null,
    },
  },
  {
    id: "seed_steps",
    name: "Steps",
    category: "Health",
    iconKey: "steps",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "daily",
      unit: "steps",
      config: { incrementStep: 500 },
      target: null,
    },
  },
  {
    id: "seed_protein",
    name: "Protein",
    category: "Health",
    iconKey: "protein",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "daily",
      unit: "g",
      config: { incrementStep: 5 },
      target: null,
    },
  },
  {
    id: "seed_calories",
    name: "Calories",
    category: "Health",
    iconKey: "calories",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "daily",
      unit: "kcal",
      config: { incrementStep: 50 },
      target: null,
    },
  },
  {
    id: "seed_supplements",
    name: "Supplements",
    category: "Health",
    iconKey: "supplements",
    track: {
      type: "BOOLEAN",
      cadence: "daily",
      unit: "times",
      config: { booleanMode: "count", suggestedDelta: 1 },
      target: null,
    },
  },
  {
    id: "seed_weight",
    name: "Weight",
    category: "Health",
    iconKey: "weight",
    track: {
      type: "NUMBER_REPLACE",
      cadence: "weekly",
      unit: "kg",
      config: { precision: 1, minValue: 0, maxValue: 500 },
      target: null,
    },
  },
  {
    id: "seed_body_fat",
    name: "Body Fat",
    category: "Health",
    iconKey: "body_fat",
    track: {
      type: "NUMBER_REPLACE",
      cadence: "weekly",
      unit: "%",
      config: { precision: 1, minValue: 0, maxValue: 100 },
      target: null,
    },
  },

  // -------------------------
  // HOME
  // -------------------------
  {
    id: "seed_cleaning",
    name: "Cleaning",
    category: "Home",
    iconKey: "cleaning",
    track: {
      type: "BOOLEAN",
      cadence: "weekly",
      unit: "times",
      config: { booleanMode: "count", suggestedDelta: 1 },
      target: null,
    },
  },
  {
    id: "seed_cooking",
    name: "Cooking",
    category: "Home",
    iconKey: "cooking",
    track: {
      type: "BOOLEAN",
      cadence: "weekly",
      unit: "times",
      config: { booleanMode: "count", suggestedDelta: 1 },
      target: null,
    },
  },
  {
    id: "seed_chores",
    name: "Chores",
    category: "Home",
    iconKey: "chores",
    track: {
      type: "BOOLEAN",
      cadence: "weekly",
      unit: "times",
      config: { booleanMode: "count", suggestedDelta: 1 },
      target: null,
    },
  },

  // -------------------------
  // LIFESTYLE
  // -------------------------
  {
    id: "seed_reading_time",
    name: "Reading Time",
    category: "Lifestyle",
    iconKey: "reading",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "weekly",
      unit: "min",
      config: { incrementStep: 10 },
      target: null,
    },
  },
  {
    id: "seed_screen_time",
    name: "Screen Time",
    category: "Lifestyle",
    iconKey: "screen_time",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "daily",
      unit: "min",
      config: { incrementStep: 15 },
      target: null,
    },
  },
  {
    id: "seed_skincare",
    name: "Skincare",
    category: "Lifestyle",
    iconKey: "skincare",
    track: {
      type: "DROPDOWN_EVENT",
      cadence: "daily",
      unit: "sessions",
      config: {
        allowMultiSelect: false,
        optionsAreUserEditable: true,
        options: [
          { id: "morning", label: "Morning" },
          { id: "midday", label: "Midday" },
          { id: "bedtime", label: "Bedtime" },
        ],
      },
      target: null,
    },
  },
  {
    id: "seed_sunlight",
    name: "Sunlight",
    category: "Lifestyle",
    iconKey: "sunlight",
    track: {
      type: "BOOLEAN",
      cadence: "daily",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },
  {
    id: "seed_sleep",
    name: "Sleep",
    category: "Lifestyle",
    iconKey: "sleep",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "daily",
      unit: "hours",
      config: { incrementStep: 0.5 },
      target: null,
    },
  },
  {
    id: "seed_food_log",
    name: "Food Log",
    category: "Lifestyle",
    iconKey: "food",
    track: {
      type: "TEXT_APPEND",
      cadence: "daily",
      unit: "entries",
      config: { maxLength: 2000, showOnDashboard: true },
      target: null,
    },
  },

  // -------------------------
  // MIND
  // -------------------------
  {
    id: "seed_journal",
    name: "Journal",
    category: "Mind",
    iconKey: "journal",
    track: {
      type: "TEXT_APPEND",
      cadence: "daily",
      unit: "entries",
      config: { maxLength: 4000, showOnDashboard: true },
      target: null,
    },
  },
  {
    id: "seed_meditation",
    name: "Meditation",
    category: "Mind",
    iconKey: "meditation",
    track: {
      type: "BOOLEAN",
      cadence: "weekly",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },
  {
    id: "seed_mood",
    name: "Mood",
    category: "Mind",
    iconKey: "mood",
    track: {
      type: "DROPDOWN_EVENT",
      cadence: "daily",
      unit: "",
      config: {
        allowMultiSelect: false,
        optionsAreUserEditable: true,
        options: [
          { id: "great", label: "Great" },
          { id: "good", label: "Good" },
          { id: "okay", label: "Okay" },
          { id: "low", label: "Low" },
          { id: "bad", label: "Bad" },
        ],
      },
      target: null,
    },
  },
  {
    id: "seed_breathwork",
    name: "Breathwork",
    category: "Mind",
    iconKey: "breathwork",
    track: {
      type: "BOOLEAN",
      cadence: "daily",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },
  {
    id: "seed_gratitude",
    name: "Gratitude",
    category: "Mind",
    iconKey: "gratitude",
    track: {
      type: "TEXT_APPEND",
      cadence: "daily",
      unit: "entries",
      config: { maxLength: 2000, showOnDashboard: true },
      target: null,
    },
  },
  {
    id: "seed_focus",
    name: "Focus",
    category: "Mind",
    iconKey: "focus",
    track: {
      type: "BOOLEAN",
      cadence: "daily",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },

  // -------------------------
  // SOCIAL
  // -------------------------
  {
    id: "seed_social_activity",
    name: "Social Activity",
    category: "Social",
    iconKey: "social",
    track: {
      type: "TEXT_APPEND",
      cadence: "weekly",
      unit: "entries",
      config: { maxLength: 2000, showOnDashboard: false },
      target: null,
    },
  },

  // -------------------------
  // LEARNING
  // -------------------------
  {
    id: "seed_learning_improvement",
    name: "Learning Improvement",
    category: "Learning",
    iconKey: "learning",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "weekly",
      unit: "min",
      config: { incrementStep: 10 },
      target: null,
    },
  },
  {
    id: "seed_skill_up",
    name: "Skill Up",
    category: "Learning",
    iconKey: "skill",
    track: {
      type: "COUNTER_INCREMENT",
      cadence: "weekly",
      unit: "min",
      config: { incrementStep: 10 },
      target: null,
    },
  },
  {
    id: "seed_language_learning",
    name: "Language Learning",
    category: "Learning",
    iconKey: "language",
    track: {
      type: "BOOLEAN",
      cadence: "daily",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },

  // -------------------------
  // FINANCE
  // -------------------------
  {
    id: "seed_expense_review",
    name: "Expense Review",
    category: "Finance",
    iconKey: "finance",
    track: {
      type: "BOOLEAN",
      cadence: "weekly",
      unit: "",
      config: { booleanMode: "done_only" },
      target: null,
    },
  },
];
