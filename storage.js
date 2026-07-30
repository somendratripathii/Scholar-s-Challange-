/* =========================================================
   storage.js — localStorage persistence
   ========================================================= */
const Storage = (() => {
  const KEY = "scholars-challenge-v1";

  const defaults = () => ({
    bestScore: 0,
    totalSolved: 0,
    totalCorrect: 0,
    totalTimePlayedSec: 0,
    highestLevelReached: 1,
    unlockedThemes: ["brass"],
    activeTheme: "brass",
    badges: [],           // e.g. "streak-10"
    dailyCompleted: {},   // { "2026-07-30": { score, solved } }
    settings: {
      musicOn: true,
      sfxOn: true,
      rainOn: true,
      volume: 45
    }
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      return Object.assign(defaults(), parsed, {
        settings: Object.assign(defaults().settings, parsed.settings || {})
      });
    } catch (e) {
      return defaults();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable — fail silently, session still works */
    }
  }

  function get() { return state; }

  function update(mutatorFn) {
    mutatorFn(state);
    save();
    return state;
  }

  return { get, update, load, KEY };
})();
