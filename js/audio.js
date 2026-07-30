/* =========================================================
   audio.js — Web Audio synthesis
   All music & sound effects are generated in-browser so the
   project ships with zero binary/licensed audio assets.

   The ambient pad is deliberately simple and heavily filtered
   (soft low-pass + a touch of delay) so it reads as a warm,
   distant drone rather than raw, beating oscillator tones.
   ========================================================= */
const AudioEngine = (() => {
  let ctx = null;
  let masterGain, musicGain, musicFilter, delayNode, delayFeedback, sfxGain;
  let musicNodes = [];
  let musicPlaying = false;
  let unlocked = false;
  let musicPluckTimer = null;

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    // gentle low-pass so the pad reads as soft/distant, not buzzy
    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 850;
    musicFilter.Q.value = 0.3;

    // a touch of slow feedback delay for a sense of space, like a large hall
    delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.value = 0.55;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.22;
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.3;
    musicGain.connect(musicFilter);
    musicFilter.connect(masterGain);
    musicFilter.connect(delayNode);
    delayNode.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
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
    sfxGain.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.02);
  }

  /* ---------------- Ambient background music ----------------
     A slow, softly evolving pad of pure sine tones (a warm
     major-7th chord), plus an occasional soft pluck. Both run
     through the shared low-pass + delay above. */
  function startMusic() {
    if (!ctx || musicPlaying) return;
    musicPlaying = true;
    const now = ctx.currentTime;

    const padNotes = [130.81, 164.81, 196.0, 246.94]; // C3 E3 G3 B3 — warm major7 pad
    padNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0;
      // very slow, shallow vibrato — avoids any beating/dissonance
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.04 + i * 0.006;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(now);
      lfo.start(now);
      const target = 0.04 + i * 0.007;
      g.gain.linearRampToValueAtTime(target, now + 6 + i * 1.5);
      musicNodes.push(osc, lfo, g);
    });

    schedulePluck();
  }

  function schedulePluck() {
    if (!musicPlaying) return;
    const now = ctx.currentTime;
    const scale = [261.63, 329.63, 392.0, 440.0, 523.25]; // C E G A C — pentatonic-ish, always consonant
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(now);
    osc.stop(now + 3.3);

    const nextIn = 5 + Math.random() * 5;
    musicPluckTimer = setTimeout(schedulePluck, nextIn * 1000);
  }

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
    tone({ freq: 523.25, type: "sine", duration: 0.16, gainVal: 0.26 });
    tone({ freq: 783.99, type: "sine", duration: 0.22, gainVal: 0.2, delay: 0.08 });
  }
  function sfxWrong() {
    tone({ freq: 220, type: "sine", duration: 0.28, gainVal: 0.22, glideTo: 150 });
  }
  function sfxLevelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: "sine", duration: 0.3, gainVal: 0.22, delay: i * 0.09 }));
  }
  function sfxTick() {
    tone({ freq: 880, type: "sine", duration: 0.06, gainVal: 0.1 });
  }
  function sfxCombo() {
    tone({ freq: 660, type: "sine", duration: 0.15, gainVal: 0.18 });
    tone({ freq: 990, type: "sine", duration: 0.18, gainVal: 0.14, delay: 0.06 });
  }

  return {
    unlock, setVolume, setSfxEnabled,
    startMusic, stopMusic,
    sfxCorrect, sfxWrong, sfxLevelUp, sfxTick, sfxCombo
  };
})();

