// src/lib/templateIcons.js
// Single source of truth for template icons.
// Add new icon keys only here.

export function iconSvg(iconKey) {
  const common = `width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"`;

  // Default icon for DB templates (no iconKey)
  if (!iconKey) {
    return `<svg ${common}>
      <path d="M12 2l1.2 4.2L17 7.5l-3.8 1.3L12 13l-1.2-4.2L7 7.5l3.8-1.3L12 2z" fill="currentColor" opacity="0.95"/>
      <path d="M18 12l.8 2.6 2.2.8-2.2.8L18 18l-.8-2.6-2.2-.8 2.2-.8L18 12z" fill="currentColor" opacity="0.8"/>
    </svg>`;
  }

  // Small helpers
  const droplet = `<path d="M12 2s-6 7-6 12a6 6 0 0012 0c0-5-6-12-6-12z" fill="currentColor"/>`;
  const check = `<path d="M9.2 12.6l-1.6-1.6-1.4 1.4 3 3 7-7-1.4-1.4-5.6 5.6z" fill="currentColor"/>`;
  const bolt = `<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor"/>`;

  switch (iconKey) {
    // Hydration / health
    case "water":
    case "hydrate":
      return `<svg ${common}>${droplet}</svg>`;

    case "steps":
      return `<svg ${common}>
        <path d="M8 3c2 0 3 2 3 4v2H8c-1.7 0-3-1.3-3-3 0-1.7 1.3-3 3-3z" fill="currentColor"/>
        <path d="M16 11c2 0 3 2 3 4v2h-3c-1.7 0-3-1.3-3-3 0-1.7 1.3-3 3-3z" fill="currentColor" opacity="0.9"/>
      </svg>`;

    case "protein":
      return `<svg ${common}>
        <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" fill="currentColor" opacity="0.9"/>
        <path d="M9 8h6v2H9V8zm0 4h6v2H9v-2z" fill="black" opacity="0.28"/>
      </svg>`;

    case "calories":
      return `<svg ${common}>
        <path d="M12 3c3 2.4 5 5.3 5 9a5 5 0 11-10 0c0-3.7 2-6.6 5-9z" fill="currentColor"/>
        <path d="M12 7c.9 1.2 1.6 2.3 1.6 3.6A1.6 1.6 0 1110.4 10c0-1.1.6-2.1 1.6-3z" fill="black" opacity="0.25"/>
      </svg>`;

    case "vitamins":
    case "supplements":
      return `<svg ${common}>
        <path d="M9 3h6v6H9V3z" fill="currentColor" opacity="0.9"/>
        <path d="M7 9h10a4 4 0 010 8H7a4 4 0 010-8z" fill="currentColor"/>
        <path d="M12 9v8" stroke="black" opacity="0.25" stroke-width="1.5"/>
      </svg>`;

    case "sunlight":
    case "nature":
      return `<svg ${common}>
        <path d="M12 7a5 5 0 100 10 5 5 0 000-10z" fill="currentColor"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1"
          stroke="currentColor" stroke-width="1.5" opacity="0.75" stroke-linecap="round"/>
      </svg>`;

    case "posture":
      return `<svg ${common}>
        <path d="M12 4a2 2 0 110 4 2 2 0 010-4z" fill="currentColor"/>
        <path d="M10 21v-7l-2-3 2-2 2 2 2-2 2 2-2 3v7h-2v-6h-2v6h-2z" fill="currentColor" opacity="0.9"/>
      </svg>`;

    case "energy":
      return `<svg ${common}>${bolt}</svg>`;

    case "done":
    case "check":
      return `<svg ${common}>${check}</svg>`;

    // Fitness
    case "workout":
    case "strength":
      return `<svg ${common}>
        <path d="M5 10h2V8h2v8H7v-2H5v-4zm10-2h2v2h2v4h-2v2h-2V8zm-6 3h6v2H9v-2z" fill="currentColor"/>
      </svg>`;

    case "run":
      return `<svg ${common}>
        <path d="M13 5a2 2 0 11.001 4.001A2 2 0 0113 5z" fill="currentColor"/>
        <path d="M11 21l1-5-2-2-2 2-2-1 3-5 3-1 2 2h3v2h-2l-1 3 2 2-1 4h-2z" fill="currentColor" opacity="0.9"/>
      </svg>`;

    case "cycle":
      return `<svg ${common}>
        <path d="M7 17a3 3 0 110-6 3 3 0 010 6zm10 0a3 3 0 110-6 3 3 0 010 6z" fill="currentColor"/>
        <path d="M8 14h4l2-4h2l-3 6H8v-2z" fill="currentColor" opacity="0.9"/>
      </svg>`;

    case "swim":
      return `<svg ${common}>
        <path d="M13 6a2 2 0 11.001 4.001A2 2 0 0113 6z" fill="currentColor"/>
        <path d="M3 15c2 1.5 4 1.5 6 0 2 1.5 4 1.5 6 0 2 1.5 4 1.5 6 0v2c-2 1.5-4 1.5-6 0-2 1.5-4 1.5-6 0-2 1.5-4 1.5-6 0v-2z" fill="currentColor" opacity="0.9"/>
      </svg>`;

    case "yoga":
    case "stretch":
    case "mobility":
      return `<svg ${common}>
        <path d="M12 4a2 2 0 110 4 2 2 0 010-4z" fill="currentColor"/>
        <path d="M6 20c2-4 4-6 6-6s4 2 6 6h-2c-1.2-2.5-2.5-4-4-4s-2.8 1.5-4 4H6z" fill="currentColor" opacity="0.9"/>
      </svg>`;

    // Mind
    case "meditation":
    case "breath":
      return `<svg ${common}>
        <path d="M12 4a3 3 0 110 6 3 3 0 010-6z" fill="currentColor"/>
        <path d="M6.5 20c1.3-3 3.4-4.5 5.5-4.5S16.2 17 17.5 20H6.5z" fill="currentColor" opacity="0.9"/>
      </svg>`;

    case "journal":
    case "notes":
      return `<svg ${common}>
        <path d="M7 4h9a2 2 0 012 2v14H7a2 2 0 01-2-2V6a2 2 0 012-2z" fill="currentColor"/>
        <path d="M9 8h7v2H9V8zm0 4h7v2H9v-2z" fill="black" opacity="0.28"/>
      </svg>`;

    case "mood":
      return `<svg ${common}>
        <path d="M12 4a8 8 0 100 16 8 8 0 000-16z" fill="currentColor"/>
        <path d="M9.2 11.2a1 1 0 110-2 1 1 0 010 2zm5.6 0a1 1 0 110-2 1 1 0 010 2z" fill="black" opacity="0.25"/>
        <path d="M8.8 14.5c1 .9 2.2 1.3 3.2 1.3s2.2-.4 3.2-1.3" stroke="black" stroke-width="1.5" opacity="0.25" stroke-linecap="round"/>
      </svg>`;

    case "focus":
      return `<svg ${common}>
        <path d="M12 4a8 8 0 100 16 8 8 0 000-16z" fill="currentColor" opacity="0.9"/>
        <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" fill="black" opacity="0.22"/>
        <path d="M12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="black" opacity="0.28"/>
      </svg>`;

    case "gratitude":
      return `<svg ${common}>
        <path d="M12 21s-7-4.4-9-9c-1.5-3.5 1-7 4.5-7 1.8 0 3.2 1 4.5 2.5C13.8 6 15.2 5 17 5c3.5 0 6 3.5 4.5 7-2 4.6-9 9-9 9z" fill="currentColor"/>
      </svg>`;

    // Lifestyle / misc
    case "sleep":
      return `<svg ${common}>
        <path d="M14.5 3.5c-4.4.9-7 5.3-5.7 9.4 1.2 3.7 5.1 5.8 8.8 4.7-4.2 2.2-9.4-.1-10.7-4.6C5.4 7.9 9.1 3.2 14.5 3.5z" fill="currentColor"/>
      </svg>`;

    case "reading":
      return `<svg ${common}>
        <path d="M6 5h6a3 3 0 013 3v12H9a3 3 0 01-3-3V5z" fill="currentColor" opacity="0.95"/>
        <path d="M12 5h6v12a3 3 0 01-3 3h-3V5z" fill="currentColor" opacity="0.75"/>
      </svg>`;

    case "skincare":
      return `<svg ${common}>
        <path d="M12 3c3 2.2 5 5.5 5 9.2 0 4-2.2 7.8-5 8.8-2.8-1-5-4.8-5-8.8C7 8.5 9 5.2 12 3z" fill="currentColor"/>
      </svg>`;

    case "coffee":
      return `<svg ${common}>
        <path d="M6 8h10v6a4 4 0 01-4 4H10a4 4 0 01-4-4V8z" fill="currentColor"/>
        <path d="M16 9h1a2 2 0 010 4h-1V9z" fill="currentColor" opacity="0.85"/>
      </svg>`;

    case "screen_time":
      return `<svg ${common}>
        <path d="M7 5h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" fill="currentColor"/>
        <path d="M10 19h4" stroke="currentColor" stroke-width="1.5" opacity="0.75" stroke-linecap="round"/>
      </svg>`;

    case "social":
    case "friends":
    case "family":
      return `<svg ${common}>
        <path d="M8.5 11a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm7 0a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="currentColor"/>
        <path d="M4 20c.8-3 2.6-4.5 4.5-4.5S12.2 17 13 20H4z" fill="currentColor" opacity="0.85"/>
        <path d="M11 20c.7-2.6 2.3-4 4.5-4s3.8 1.4 4.5 4H11z" fill="currentColor" opacity="0.7"/>
      </svg>`;

    case "music":
      return `<svg ${common}>
        <path d="M10 4v12.5a2.5 2.5 0 11-1.5-2.3V6h8v8.5a2.5 2.5 0 11-1.5-2.3V4h-5z" fill="currentColor"/>
      </svg>`;

    case "learn":
    case "practice":
      return `<svg ${common}>
        <path d="M4 7l8-3 8 3-8 3-8-3z" fill="currentColor" opacity="0.9"/>
        <path d="M6 10v6l6 3 6-3v-6l-6 3-6-3z" fill="currentColor"/>
      </svg>`;

    case "chores":
    case "clean":
      return `<svg ${common}>
        <path d="M7 10h10v10H7V10z" fill="currentColor" opacity="0.9"/>
        <path d="M9 4h6l1 6H8l1-6z" fill="currentColor"/>
      </svg>`;

    case "cook":
      return `<svg ${common}>
        <path d="M7 6h10v4H7V6z" fill="currentColor"/>
        <path d="M6 10h12v10H6V10z" fill="currentColor" opacity="0.85"/>
        <path d="M9 4v2M12 3v3M15 4v2" stroke="currentColor" stroke-width="1.5" opacity="0.7" stroke-linecap="round"/>
      </svg>`;

    case "finance":
      return `<svg ${common}>
        <path d="M6 18V9h3v9H6zm5 0V6h3v12h-3zm5 0v-7h3v7h-3z" fill="currentColor"/>
      </svg>`;

    default:
      // unknown icon keys fall back to default
      return iconSvg(null);
  }
}
