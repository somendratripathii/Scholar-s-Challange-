/* =========================================================
   audio.js — Web Audio synthesis
   All music & sound effects are generated in-browser so the
   project ships with zero binary/licensed audio assets.
   ========================================================= */
const AudioEngine = (() => {
  let ctx = null;
  let masterGain, musicGain, sfxGain;
  let musicNodes = [];
  let musicPlaying = false;
  let unlocked = false;

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);
  }

  // Browsers require a user gesture before audio starts
  function unlock() {
    ensureContext();
    if (!ctx || unlocked) return;
    if (ctx.state === "suspended") ctx.resume();
    unlocked = true;
  }

  function setVolume(pct) {
    if (!ctx) return;
    masterGain.gain.setTargetAtTime(pct / 100, ctx.currentTime, 0.05);
  }

  function setSfxEnabled(on) {
    if (!ctx) return;
    sfxGain.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.02);
  }

  /* ---------------- Ambient background music ----------------
     A slow, softly evolving pad built from a handful of detuned
     sine/triangle oscillators over a gentle drone, plus an
     occasional soft "piano" pluck — evokes strings + soft piano
     without any external file. */
  function startMusic() {
    if (!ctx || musicPlaying) return;
    musicPlaying = true;
    const now = ctx.currentTime;

    const padNotes = [130.81, 164.81, 196.0, 246.94]; // C3 E3 G3 B3 — warm major7 pad
    padNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.01;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(now);
      lfo.start(now);
      g.gain.linearRampToValueAtTime(0.05 + i * 0.01, now + 4 + i);
      musicNodes.push(osc, lfo, g);
    });

    schedulePluck();
  }

  function schedulePluck() {
    if (!musicPlaying) return;
    const now = ctx.currentTime;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // C major-ish, soft piano feel
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(now);
    osc.stop(now + 2.5);

    const nextIn = 3 + Math.random() * 4;
    musicPluckTimer = setTimeout(schedulePluck, nextIn * 1000);
  }
  let musicPluckTimer = null;

  function stopMusic() {
    musicPlaying = false;
    if (musicPluckTimer) clearTimeout(musicPluckTimer);
    const now = ctx ? ctx.currentTime : 0;
    musicNodes.forEach(n => {
      try {
        if (n.gain) n.gain.linearRampToValueAtTime(0, now + 1);
        if (n.stop) n.stop(now + 1.1);
      } catch (e) { /* already stopped */ }
    });
    musicNodes = [];
  }

  /* ---------------- Sound effects ---------------- */
  function tone({ freq = 440, type = "sine", duration = 0.2, gainVal = 0.3, glideTo = null, delay = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainVal, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function sfxCorrect() {
    tone({ freq: 523.25, type: "sine", duration: 0.16, gainVal: 0.28 });
    tone({ freq: 783.99, type: "sine", duration: 0.22, gainVal: 0.22, delay: 0.08 });
  }
  function sfxWrong() {
    tone({ freq: 220, type: "triangle", duration: 0.28, gainVal: 0.25, glideTo: 140 });
  }
  function sfxLevelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: "triangle", duration: 0.3, gainVal: 0.24, delay: i * 0.09 }));
  }
  function sfxTick() {
    tone({ freq: 900, type: "square", duration: 0.05, gainVal: 0.12 });
  }
  function sfxCombo() {
    tone({ freq: 660, type: "sine", duration: 0.15, gainVal: 0.2 });
    tone({ freq: 990, type: "sine", duration: 0.18, gainVal: 0.16, delay: 0.06 });
  }

  return {
    unlock, setVolume, setSfxEnabled,
    startMusic, stopMusic,
    sfxCorrect, sfxWrong, sfxLevelUp, sfxTick, sfxCombo
  };
})();
