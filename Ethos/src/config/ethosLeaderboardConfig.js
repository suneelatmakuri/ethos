// ethosLeaderboardConfig.js

/**
 * Leaderboard priority configuration.
 *
 * Order matters:
 * - Tracks listed here will appear first (if the user uses them)
 * - Remaining tracks will appear afterwards (alphabetical fallback)
 *
 * IMPORTANT:
 * - normalizedKey MUST exactly match what is stored on user tracks
 */

export const LEADERBOARD_PRIORITY = [
  {
    normalizedKey:
      '{"name":"Water","type":"COUNTER_INCREMENT","unit":"ml","cadence":"daily","target":{"mode":"value","value":3000},"config":{"incrementStep":250}}'
  },
  {
    normalizedKey:
      '{"name":"Steps","type":"COUNTER_INCREMENT","unit":"steps","cadence":"daily","target":{"mode":"value","value":10000}}'
  },
  {
    normalizedKey:
      '{"name":"Workout","type":"BOOLEAN","unit":"times","cadence":"weekly","target":{"mode":"count","value":3},"config":{"booleanMode":"count"}}'
  },
  {
    normalizedKey:
      '{"name":"Journal","type":"TEXT_APPEND","unit":"entries","cadence":"daily","target":{"mode":"count","value":0}}'
  }
];

/**
 * Track types excluded from leaderboard entirely.
 * Metrics are intentionally excluded.
 */
export const LEADERBOARD_EXCLUDED_TYPES = new Set([
  "NUMBER_REPLACE"
]);
