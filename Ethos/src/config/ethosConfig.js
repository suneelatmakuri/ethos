// src/config/ethosConfig.js
export const ETHOS_CONFIG = {
    retentionDays: 30,
    historyDefaultDays: 14,
    allowBackfillDays: 2,
  
    defaultTimeZone: "Asia/Kolkata",
  
    defaultTracks: [
      {
        name: "Water",
        type: "COUNTER_INCREMENT",
        cadence: "daily",
        unit: "ml",
        target: { mode: "value", value: 3000 },
        config: { incrementStep: 250, minDelta: 1, maxDelta: 1000000 },
      },
      {
        name: "Meditation",
        type: "BOOLEAN",
        cadence: "daily",
        unit: "sessions",
        target: { mode: "count", value: 1 },
        config: { booleanMode: "done_only" },
      },
      {
        name: "Skincare",
        type: "BOOLEAN",
        cadence: "daily",
        unit: "times",
        target: { mode: "count", value: 2 },
        config: { booleanMode: "count", suggestedDelta: 1 },
      },
      {
        name: "Weight",
        type: "NUMBER_REPLACE",
        cadence: "daily",
        unit: "kg",
        target: { mode: "value", value: 0 },
        config: { minValue: 0, maxValue: 500, precision: 1 },
      },
      {
        name: "Food Notes",
        type: "TEXT_APPEND",
        cadence: "daily",
        unit: "entries",
        target: { mode: "count", value: 0 },
        config: { maxLength: 2000, showOnDashboard: true },
      },
      {
        name: "Workout Type",
        type: "DROPDOWN_EVENT",
        cadence: "weekly",
        unit: "sessions",
        target: { mode: "count", value: 3 },
        config: {
          optionsAreUserEditable: true,
          allowMultiSelect: false,
          options: [
            { id: "legs", label: "Legs" },
            { id: "chest", label: "Chest" },
            { id: "back", label: "Back" },
            { id: "cardio", label: "Cardio" },
          ],
        },
      },
    ],
  };
  