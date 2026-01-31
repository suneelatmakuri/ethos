// src/pages/settingsTrackTemplates.js

import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";
import {
  readTrackTemplates,
  computeNormalizedKey,
  getUserProfile,
  getProfilesMap,
} from "../lib/db.js";
import { SEED_TEMPLATES } from "../config/ethosConfig.js";
import { iconSvg } from "../lib/templateIcons.js";
import { auth } from "../lib/firebase.js";

const TYPE_LABELS = {
  COUNTER_INCREMENT: "Counter",
  BOOLEAN: "Checklist",
  NUMBER_REPLACE: "Metric",
  TEXT_APPEND: "Notes",
  DROPDOWN_EVENT: "Choice",
};

function cadenceLabel(c) {
  if (!c) return "";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

// TRUE random gradients (changes on refresh)
const RANDOM_GRADIENT_CLASSES = [
  "tt-g1","tt-g2","tt-g3","tt-g4","tt-g5",
  "tt-g7","tt-g8","tt-g9","tt-g10","tt-g11","tt-g12"
];
function pickGradientClassRandom() {
  return RANDOM_GRADIENT_CLASSES[Math.floor(Math.random() * RANDOM_GRADIENT_CLASSES.length)];
}

// Stable category accent (divider color)
const CAT_ACCENT_CLASSES = ["tt-cat1", "tt-cat2", "tt-cat3", "tt-cat4", "tt-cat5", "tt-cat6"];
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pickCategoryAccentClass(groupName) {
  return CAT_ACCENT_CLASSES[hashString(String(groupName || "")) % CAT_ACCENT_CLASSES.length];
}

export async function settingsTrackTemplatesPage() {
  const root = document.getElementById("app");

  const me = auth.currentUser;
  if (!me?.uid) {
    root.innerHTML = Shell({
      title: "Templates",
      activeTab: "settings",
      content: `<div class="tt-page"><div class="muted">Please log in.</div></div>`,
    });
    return;
  }

  // Load my private profile (only for friends[])
  let myProfile = null;
  try {
    myProfile = await getUserProfile(me.uid);
  } catch (e) {
    console.warn("Failed to load my profile:", e?.message || e);
  }
  const friends = Array.isArray(myProfile?.friends) ? myProfile.friends : [];

  // Allowed creators for DB templates
  const allowedCreators = new Set([me.uid, ...friends]);

  // Pre-fetch friend names from /profiles
  // const friendNameMap = await getProfilesMap(friends);
  const friendNameMap = {};
    for (const f of friends) {
      const u = await getUserProfile(f); // reads /users/{f}
      friendNameMap[f] = (u?.displayName || "").trim();
    }


  // Load DB templates (may include many; we'll filter hard)
  let dbTemplates = [];
  try {
    dbTemplates = await readTrackTemplates();
  } catch (e) {
    console.warn("Failed to load DB templates:", e?.message || e);
  }

  // Seed templates (always visible)
  const seedTemplates = (SEED_TEMPLATES || []).map((t) => ({
    id: t.id,
    name: t.name,
    displayLabel: t.displayLabel || t.name,
    category: t.category ?? null,
    createdBy: t.createdBy ?? null,
    createdByName: t.createdByName ?? null,
    iconKey: t.iconKey ?? null,
    track: t.track,
    source: "seed",
    normalizedKey:
      t.normalizedKey ||
      computeNormalizedKey({
        name: t.name,
        type: t.track?.type,
        cadence: t.track?.cadence,
        unit: t.track?.unit,
        target: t.track?.target,
        config: t.track?.config,
      }),
  }));

  // DB templates (visible ONLY if createdBy is me or a friend)
  const dbTemplatesNormalized = (dbTemplates || [])
    .map((t) => ({
      id: t.id,
      name: t.name,
      displayLabel: t.displayLabel || t.name,
      category: t.category ?? null,
      createdBy: t.createdBy ?? null,
      createdByName: t.createdByName ?? null,
      iconKey: null, // DB templates default icon (seed can have iconKey)
      track: {
        type: t.type,
        cadence: t.cadence,
        unit: t.unit,
        target: t.target ?? null,
        config: t.config ?? {},
      },
      source: "db",
      normalizedKey:
        t.normalizedKey ||
        computeNormalizedKey({
          name: t.name,
          type: t.type,
          cadence: t.cadence,
          unit: t.unit,
          target: t.target ?? null,
          config: t.config ?? {},
        }),
    }))
    .filter((t) => {
      // 🔥 HARD FILTER: if no createdBy, or createdBy not allowed => NOT SHOWN
      if (!t.createdBy) return false;
      return allowedCreators.has(t.createdBy);
    });

  // Merge + de-dupe (DB wins)
  const byKey = {};
  for (const t of seedTemplates) byKey[t.normalizedKey] = t;
  for (const t of dbTemplatesNormalized) byKey[t.normalizedKey] = t;
  const templates = Object.values(byKey);

  // Grouping rules:
  // - DB templates: createdBy == me => Added by you
  // - DB templates: friend => Added by <displayName>
  // - Seed templates: category if present else Misc
  const grouped = {};
  for (const t of templates) {
    let groupName = "Misc";

    if (t.source === "db") {
      if (t.createdBy === me.uid) {
        groupName = "Added by you";
      } 
      else groupName = `Added by ${friendNameMap[t.createdBy] || "friend"}`;
    } else {
      // seed
      if (t.category) groupName = t.category;
    }

    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(t);
  }

  // Sort groups: categories first, then Added by..., misc last
  const groupNames = Object.keys(grouped).sort((a, b) => {
    const aMisc = a === "Misc";
    const bMisc = b === "Misc";
    if (aMisc && !bMisc) return 1;
    if (!aMisc && bMisc) return -1;

    const aAdded = a.startsWith("Added by") || a === "Added by friend";
    const bAdded = b.startsWith("Added by") || b === "Added by friend";
    if (aAdded && !bAdded) return 1;
    if (!aAdded && bAdded) return -1;

    return a.localeCompare(b);
  });

  for (const g of groupNames) {
    grouped[g].sort((x, y) => (x.displayLabel || x.name).localeCompare(y.displayLabel || y.name));
  }

  root.innerHTML = Shell({
    title: "Templates",
    activeTab: "settings",
    content: `
      <div class="tt-page">
        ${groupNames
          .map((group) => {
            const items = grouped[group] || [];
            const catClass = pickCategoryAccentClass(group);
            return `
              <section class="tt-group">
                <div class="tt-header ${catClass}">
                  <div class="tt-hTitle">${group}</div>
                  <div class="tt-divider"></div>
                </div>

                <div class="tt-grid">
                  ${items
                    .map((t) => {
                      const typeText = TYPE_LABELS[t.track?.type] || t.track?.type || "";
                      const cadText = cadenceLabel(t.track?.cadence);
                      const gClass = pickGradientClassRandom();

                      return `
                        <button
                          class="tt-tile ${gClass}"
                          data-template-id="${t.id}"
                          data-source="${t.source}"
                          type="button">
                          <div class="tt-icon">${iconSvg(t.iconKey)}</div>
                          <div class="tt-title">${t.displayLabel || t.name}</div>
                          <div class="tt-footer">
                            <span class="tt-cadence">${cadText || "—"}</span>
                            <span class="tt-type">${typeText}</span>
                          </div>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    `,
  });

  root.querySelectorAll(".tt-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.templateId;
      const source = btn.dataset.source;
      if (!id) return;
      if (source === "seed") navigate(`#/settings/tracks/new?seedId=${id}`);
      else navigate(`#/settings/tracks/new?templateId=${id}`);
    });
  });
}
