/* ==========================================================================
   themes/themes.js  ·  programmatic access to the 5 theme tokens
   --------------------------------------------------------------------------
   For app code that needs theme values at runtime (e.g. tinting a Canvas, an
   SVG `stroke=` attribute on the epicycle viewer, a plot library, etc).
   Each entry mirrors the CSS custom properties exposed by themes/<name>.css.
   ========================================================================== */

const THEMES = {
  "codex-vesper": {
    label:     "Codex Vesper",
    subtitle:  "Manuscript midnight · antique gold · parchment cream",
    mode:      "dark",
    color: {
      bg:              "#0B1530",
      surface:         "#142242",
      surfaceRaised:   "#1E2F58",
      fg:              "#E8D9A6",
      heading:         "#F5C76B",
      dim:             "#A99670",
      accent:          "#D4A845",
      accent2:         "#F5C76B",
      ornament:        "#D4A845",
      danger:          "#B85A3A",
      success:         "#6B8E5A",
      deferent:        "#D4A845",
      epicycle:        "#B9D4FF",
      equant:          "#B85A3A",
      planet:          "#F5C76B",
      earth:           "#E8D9A6",
    },
  },
  "parchment-scholastica": {
    label:     "Parchment Scholastica",
    subtitle:  "Aged page · sepia ink · rust-gold rubrica",
    mode:      "light",
    color: {
      bg:              "#E8D7A8",
      surface:         "#F3E3B5",
      surfaceRaised:   "#FBF0CD",
      fg:              "#3F3120",
      heading:         "#2F2418",
      dim:             "#7A6240",
      accent:          "#8B5E2A",
      accent2:         "#B17833",
      ornament:        "#8B5E2A",
      danger:          "#913423",
      success:         "#4C6B33",
      deferent:        "#2F2418",
      epicycle:        "#913423",
      equant:          "#7A6240",
      planet:          "#B17833",
      earth:           "#2F2418",
    },
  },
  "marble-olympus": {
    label:     "Marble Olympus",
    subtitle:  "Twilight mauve · sun gold · marble cream",
    mode:      "dark",
    color: {
      bg:              "#1B1530",
      surface:         "#2A2240",
      surfaceRaised:   "#3A2F50",
      fg:              "#F5EBD8",
      heading:         "#FFD993",
      dim:             "#C9B89A",
      accent:          "#E5B458",
      accent2:         "#FFD993",
      ornament:        "#E5B458",
      danger:          "#C4724A",
      success:         "#6E8758",
      deferent:        "#E5B458",
      epicycle:        "#E8D8B5",
      equant:          "#C4724A",
      planet:          "#FFD993",
      earth:           "#F5EBD8",
    },
  },
  "lapis-auream": {
    label:     "Lapis Auream",
    subtitle:  "Lapis blue · leaf gold · ivory · rubrica red",
    mode:      "dark",
    color: {
      bg:              "#0E1E5C",
      surface:         "#1A2D75",
      surfaceRaised:   "#25408F",
      fg:              "#F8F2D6",
      heading:         "#FFD24A",
      dim:             "#BFB28B",
      accent:          "#FFD24A",
      accent2:         "#FFE680",
      ornament:        "#FFD24A",
      danger:          "#C8323A",
      success:         "#5C8755",
      deferent:        "#FFD24A",
      epicycle:        "#F8F2D6",
      equant:          "#C8323A",
      planet:          "#FFE680",
      earth:           "#F8F2D6",
    },
  },
  "nyx-astera": {
    label:     "Nyx Astera",
    subtitle:  "Near-black void · starlight silver · muted gold",
    mode:      "dark",
    color: {
      bg:              "#050610",
      surface:         "#0C0E1E",
      surfaceRaised:   "#14172E",
      fg:              "#D9DAE0",
      heading:         "#FFD27A",
      dim:             "#7A7E8E",
      accent:          "#CFA84A",
      accent2:         "#FFD27A",
      ornament:        "#CFA84A",
      danger:          "#A04545",
      success:         "#4F806A",
      deferent:        "#9CA3B8",
      epicycle:        "#B8C6E0",
      equant:          "#A04545",
      planet:          "#FFD27A",
      earth:           "#D9DAE0",
    },
  },
};

/* ─── public API ─────────────────────────────────────────────────────────── */
function setTheme(name, target) {
  const root = target || document.documentElement;
  Object.keys(THEMES).forEach((k) => root.classList.remove(`theme-${k}`));
  root.classList.add(`theme-${name}`);
  root.dataset.theme = name;
}
function getTheme(name) { return THEMES[name]; }
function listThemes()   { return Object.keys(THEMES); }

/* ── attach to window for vanilla / script use ── */
if (typeof window !== "undefined") {
  window.PTOLEMY_THEMES = { THEMES, setTheme, getTheme, listThemes };
}

/* ── named exports for ES module use ─────────────────────────────── */
export { THEMES, setTheme, getTheme, listThemes };
