/* =========================================================
   game.js — core game controller
   ========================================================= */
(() => {
  "use strict";

  /* ---------------- element refs ---------------- */
  const el = {
    sceneMenu: document.getElementById("scene-menu"),
    scenePractice: document.getElementById("scene-practice"),
    sceneGame: document.getElementById("scene-game"),
    sceneSummary: document.getElementById("scene-summary"),

    statScore: document.getElementById("stat-score"),
    statLevel: document.getElementById("stat-level"),
    statCombo: document.getElementById("stat-combo"),
    comboStat: document.getElementById("combo-stat"),

    btnStartLevels: document.getElementById("btn-start-levels"),
    btnDaily: document.getElementById("btn-daily"),
    btnPractice: document.getElementById("btn-practice"),
    btnEndless: document.getElementById("btn-endless"),
    dailySub: document.getElementById("daily-sub"),

    ledgerBest: document.getElementById("ledger-best"),
    ledgerAccuracy: document.getElementById("ledger-accuracy"),
    ledgerSolved: document.getElementById("ledger-solved"),
    ledgerTime: document.getElementById("ledger-time"),

    subjectGrid: document.getElementById("subject-grid"),
    practiceBack: document.getElementById("practice-back"),

    levelBanner: document.getElementById("level-banner"),
    questionPage: document.getElementById("question-page"),
    questionText: document.getElementById("question-text"),
    seal: document.getElementById("seal"),
    sealMark: document.getElementById("seal-mark"),
    answerForm: document.getElementById("answer-form"),
    answerInput: document.getElementById("answer-input"),
    feedback: document.getElementById("feedback"),
    timerFill: document.getElementById("timer-fill"),
    progressLabel: document.getElementById("progress-label"),
    quitBtn: document.getElementById("quit-btn"),
    gameCard: document.getElementById("game-card"),

    summaryEyebrow: document.getElementById("summary-eyebrow"),
    summaryTitle: document.getElementById("summary-title"),
    summaryScore: document.getElementById("summary-score"),
    summaryCombo: document.getElementById("summary-combo"),
    summaryAccuracy: document.getElementById("summary-accuracy"),
    summarySolved: document.getElementById("summary-solved"),
    unlockBanner: document.getElementById("unlock-banner"),
    summaryAgain: document.getElementById("summary-again"),
    summaryHome: document.getElementById("summary-home"),

    levelToast: document.getElementById("level-toast"),
    toastSub: document.getElementById("toast-sub"),
    comboFlare: document.getElementById("combo-flare"),

    settingsBtn: document.getElementById("settings-btn"),
    settingsBackdrop: document.getElementById("settings-backdrop"),
    settingsClose: document.getElementById("settings-close"),
    musicToggle: document.getElementById("music-toggle"),
    volumeSlider: document.getElementById("volume-slider"),
    sfxToggle: document.getElementById("sfx-toggle"),
    rainToggle: document.getElementById("rain-toggle"),
    themeSwatches: document.getElementById("theme-swatches"),
    badgeRow: document.getElementById("badge-row"),
    windowRain: document.getElementById("window-rain"),
  };

  const STREAK_MILESTONES = [
    { at: 10, theme: null, badge: "streak-10", label: "10 Correct — Bronze Quill badge" },
    { at: 25, theme: "forest", badge: "streak-25", label: "25 Correct — Forest desk unlocked" },
    { at: 50, theme: "burgundy", badge: "streak-50", label: "50 Correct — Burgundy desk unlocked" },
    { at: 100, theme: "navy", badge: "streak-100", label: "100 Correct — Midnight desk unlocked" },
  ];

  /* ---------------- session state ---------------- */
  let mode = "levels"; // levels | daily | practice | endless
  let practiceSubject = null;
  let level = 1;
  let question = null;
  let dailyQueue = [];
  let dailyIndex = 0;

  let score = 0;
  let combo = 0;
  let bestComboThisSession = 0;
  let solved = 0;
  let correct = 0;
  let sessionStartTime = 0;

  let timerTotal = 20;
  let timerRemaining = 20;
  let timerHandle = null;
  let timerLastTick = 0;
  let awaitingNext = false;

  /* ---------------- persisted state on load ---------------- */
  function refreshMenuLedger() {
    const s = Storage.get();
    el.ledgerBest.textContent = s.bestScore;
    const acc = s.totalSolved > 0 ? Math.round((s.totalCorrect / s.totalSolved) * 100) : null;
    el.ledgerAccuracy.textContent = acc === null ? "—" : acc + "%";
    el.ledgerSolved.textContent = s.totalSolved;
    const mins = Math.floor(s.totalTimePlayedSec / 60);
    el.ledgerTime.textContent = mins + "m";

    const today = todayStr();
    if (s.dailyCompleted[today]) {
      el.dailySub.textContent = `Completed today — score ${s.dailyCompleted[today].score}`;
    } else {
      el.dailySub.textContent = "Today's set questions";
    }

    document.body.dataset.theme = s.activeTheme;
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  /* ---------------- scene switching ---------------- */
  function showScene(name) {
    [el.sceneMenu, el.scenePractice, el.sceneGame, el.sceneSummary].forEach(s => s.hidden = true);
    ({ menu: el.sceneMenu, practice: el.scenePractice, game: el.sceneGame, summary: el.sceneSummary }[name]).hidden = false;
  }

  /* ---------------- subject grid (practice) ---------------- */
  function buildSubjectGrid() {
    el.subjectGrid.innerHTML = "";
    Object.entries(Questions.SUBJECTS).forEach(([key, def]) => {
      const btn = document.createElement("button");
      btn.className = "subject-chip";
      btn.textContent = def.label;
      btn.addEventListener("click", () => {
        AudioEngine.unlock();
        practiceSubject = key;
        mode = "practice";
        beginSession();
      });
      el.subjectGrid.appendChild(btn);
    });
  }

  /* ---------------- session lifecycle ---------------- */
  function beginSession() {
    level = 1;
    score = 0;
    combo = 0;
    bestComboThisSession = 0;
    solved = 0;
    correct = 0;
    sessionStartTime = Date.now();
    dailyIndex = 0;

    if (mode === "daily") {
      dailyQueue = Questions.dailySet(todayStr(), 10);
    }

    updateHud();
    showScene("game");
    loadQuestion();
    startAmbient();
  }

  function startAmbient() {
    AudioEngine.unlock();
    const s = Storage.get().settings;
    if (s.musicOn) AudioEngine.startMusic();
  }

  function updateHud() {
    el.statScore.textContent = score;
    el.statLevel.textContent = mode === "practice" ? "—" : level;
    if (combo >= 2) {
      el.comboStat.hidden = false;
      el.statCombo.textContent = combo;
    } else {
      el.comboStat.hidden = true;
    }
  }

  function currentLevelLabel() {
    if (mode === "practice") return `Practice · ${Questions.SUBJECTS[practiceSubject].label}`;
    if (mode === "daily") return `Daily Challenge · Question ${dailyIndex + 1} of ${dailyQueue.length}`;
    if (mode === "endless") return `Endless Study · Level ${level}`;
    return `Level ${level} · ${Questions.levelLabel(level)}`;
  }

  function loadQuestion() {
    awaitingNext = false;
    el.levelBanner.textContent = currentLevelLabel();

    if (mode === "daily") {
      if (dailyIndex >= dailyQueue.length) { endSession(); return; }
      question = dailyQueue[dailyIndex];
    } else if (mode === "practice") {
      question = Questions.next(Math.min(level + 3, 13), practiceSubject);
    } else {
      question = Questions.next(level);
    }

    el.questionText.textContent = question.text;
    el.answerInput.value = "";
    el.feedback.textContent = "";
    el.feedback.className = "feedback";
    el.progressLabel.textContent = mode === "daily"
      ? `Question ${dailyIndex + 1} of ${dailyQueue.length}`
      : `Question ${solved + 1}`;

    // page turn flourish
    el.questionPage.classList.remove("turning");
    void el.questionPage.offsetWidth;
    el.questionPage.classList.add("turning");

    timerTotal = mode === "practice" ? Questions.timerForLevel(Math.min(level + 2, 13)) : Questions.timerForLevel(level);
    timerRemaining = timerTotal;
    el.timerFill.style.width = "100%";
    el.timerFill.classList.remove("warn");
    el.gameCard.classList.remove("timer-critical");
    timerLastTick = performance.now();

    if (timerHandle) cancelAnimationFrame(timerHandle);
    timerHandle = requestAnimationFrame(tickTimer);

    setTimeout(() => el.answerInput.focus(), 60);
  }

  function tickTimer(now) {
    const dt = (now - timerLastTick) / 1000;
    timerLastTick = now;
    timerRemaining -= dt;

    const pct = Math.max(0, timerRemaining / timerTotal) * 100;
    el.timerFill.style.width = pct + "%";

    if (pct <= 25) {
      el.timerFill.classList.add("warn");
      el.gameCard.classList.add("timer-critical");
    }

    // tick sound roughly once per second under 5s remaining
    if (timerRemaining <= 5 && Math.floor(timerRemaining) !== Math.floor(timerRemaining + dt)) {
      const s = Storage.get().settings;
      if (s.sfxOn) AudioEngine.sfxTick();
    }

    if (timerRemaining <= 0) {
      handleTimeout();
      return;
    }
    timerHandle = requestAnimationFrame(tickTimer);
  }

  function handleTimeout() {
    if (awaitingNext) return;
    resolveAnswer(false, true);
  }

  function submitAnswer(e) {
    e.preventDefault();
    if (awaitingNext || !question) return;
    const raw = el.answerInput.value.trim();
    if (raw === "" || raw === "-") return;
    const val = Number(raw);
    if (Number.isNaN(val)) return;
    resolveAnswer(val === question.answer, false);
  }

  function resolveAnswer(isCorrect, timedOut) {
    awaitingNext = true;
    if (timerHandle) cancelAnimationFrame(timerHandle);
    const s = Storage.get().settings;

    solved++;

    if (isCorrect) {
      correct++;
      combo++;
      bestComboThisSession = Math.max(bestComboThisSession, combo);

      const base = 10 + level * 2;
      const comboBonus = Math.floor(combo / 3) * 5;
      score += base + comboBonus;

      el.feedback.textContent = comboBonus > 0 ? `Correct! +${base + comboBonus} (combo bonus)` : `Correct! +${base}`;
      el.feedback.className = "feedback good";
      stampSeal(true);
      if (s.sfxOn) AudioEngine.sfxCorrect();

      if (combo > 0 && combo % 3 === 0) {
        showComboFlare(combo);
        if (s.sfxOn) AudioEngine.sfxCombo();
      }

      checkStreakMilestone();
    } else {
      combo = 0;
      score = Math.max(0, score - 3);
      el.feedback.textContent = timedOut
        ? `Time's up. The answer was ${question.answer}.`
        : `Not quite. The answer was ${question.answer}.`;
      el.feedback.className = "feedback bad";
      stampSeal(false);
      if (s.sfxOn) AudioEngine.sfxWrong();
    }

    updateHud();
    persistProgressTick();

    setTimeout(() => advance(), 1000);
  }

  function stampSeal(correctAns) {
    el.seal.classList.remove("stamp-correct", "stamp-wrong");
    void el.seal.offsetWidth;
    el.sealMark.setAttribute("d", correctAns
      ? "M28 52 L44 66 L74 34"                 // check mark
      : "M32 32 L68 68 M68 32 L32 68");          // cross mark
    el.seal.classList.add(correctAns ? "stamp-correct" : "stamp-wrong");
  }

  function showComboFlare(n) {
    el.comboFlare.textContent = `${n} Combo!`;
    el.comboFlare.hidden = false;
    el.comboStat.classList.add("pulse");
    void el.comboFlare.offsetWidth;
    setTimeout(() => { el.comboFlare.hidden = true; el.comboStat.classList.remove("pulse"); }, 900);
  }

  function checkStreakMilestone() {
    const s = Storage.get();
    const lifetimeCorrect = s.totalCorrect + 1; // about to be persisted
    const milestone = STREAK_MILESTONES.find(m => m.at === lifetimeCorrect);
    if (!milestone) return;
    Storage.update(st => {
      if (!st.badges.includes(milestone.badge)) st.badges.push(milestone.badge);
      if (milestone.theme && !st.unlockedThemes.includes(milestone.theme)) st.unlockedThemes.push(milestone.theme);
    });
    pendingUnlockMessage = milestone.label;
  }

  let pendingUnlockMessage = null;

  function persistProgressTick() {
    Storage.update(s => {
      s.totalSolved += 1;
      if (solved > 0 && el.feedback.className.includes("good")) s.totalCorrect += 1;
    });
  }

  function advance() {
    if (mode === "daily") {
      dailyIndex++;
      if (dailyIndex >= dailyQueue.length) { endSession(); return; }
      loadQuestion();
      return;
    }

    if (mode === "practice") {
      loadQuestion();
      return;
    }

    // levels / endless: level up every 8 correct-in-a-row-ish (every 8 solved) — smooth curriculum pacing
    if (solved > 0 && solved % 8 === 0) {
      levelUp();
    }
    loadQuestion();
  }

  function levelUp() {
    level++;
    Storage.update(s => { s.highestLevelReached = Math.max(s.highestLevelReached, level); });
    const s = Storage.get().settings;
    if (s.sfxOn) AudioEngine.sfxLevelUp();
    el.toastSub.textContent = `${currentLevelSummary()}`;
    el.levelToast.hidden = false;
    void el.levelToast.offsetWidth;
    el.levelToast.style.animation = "none";
    requestAnimationFrame(() => { el.levelToast.style.animation = ""; });
    setTimeout(() => { el.levelToast.hidden = true; }, 3000);
  }

  function currentLevelSummary() {
    return mode === "endless" ? `Level ${level} · Rising difficulty` : `Level ${level} · ${Questions.levelLabel(level)}`;
  }

  function endSession() {
    if (timerHandle) cancelAnimationFrame(timerHandle);
    const elapsedSec = Math.round((Date.now() - sessionStartTime) / 1000);

    Storage.update(s => {
      s.bestScore = Math.max(s.bestScore, score);
      s.totalTimePlayedSec += elapsedSec;
      if (mode === "daily") {
        s.dailyCompleted[todayStr()] = { score, solved };
      }
    });

    el.summaryEyebrow.textContent = mode === "daily" ? "Daily Challenge complete" : "Session concluded";
    el.summaryTitle.textContent = pickClosingLine();
    el.summaryScore.textContent = score;
    el.summaryCombo.textContent = bestComboThisSession;
    el.summaryAccuracy.textContent = solved > 0 ? Math.round((correct / solved) * 100) + "%" : "0%";
    el.summarySolved.textContent = solved;

    if (pendingUnlockMessage) {
      el.unlockBanner.hidden = false;
      el.unlockBanner.textContent = pendingUnlockMessage;
      pendingUnlockMessage = null;
    } else {
      el.unlockBanner.hidden = true;
    }

    showScene("summary");
    refreshMenuLedger();
  }

  function pickClosingLine() {
    const lines = [
      "Well studied.", "The candle burns a little brighter.", "A fine day of scholarship.",
      "Your quill has earned its rest.", "The library grows quiet again."
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function quitSession() {
    endSession();
  }

  /* ---------------- settings modal ---------------- */
  function openSettings() {
    const s = Storage.get().settings;
    setSwitch(el.musicToggle, s.musicOn);
    setSwitch(el.sfxToggle, s.sfxOn);
    setSwitch(el.rainToggle, s.rainOn);
    el.volumeSlider.value = s.volume;
    buildThemeSwatches();
    buildBadgeRow();
    el.settingsBackdrop.hidden = false;
  }
  function closeSettings() { el.settingsBackdrop.hidden = true; }
  function setSwitch(node, on) { node.setAttribute("aria-checked", on ? "true" : "false"); }

  function buildThemeSwatches() {
    const s = Storage.get();
    el.themeSwatches.innerHTML = "";
    const all = ["brass", "forest", "burgundy", "navy"];
    all.forEach(theme => {
      const btn = document.createElement("button");
      const unlocked = s.unlockedThemes.includes(theme);
      btn.className = "swatch" + (unlocked ? "" : " locked") + (s.activeTheme === theme ? " selected" : "");
      btn.dataset.theme = theme;
      btn.title = unlocked ? theme : `Locked — reach a streak milestone`;
      btn.setAttribute("aria-label", `${theme} desk theme${unlocked ? "" : " (locked)"}`);
      if (unlocked) {
        btn.addEventListener("click", () => {
          Storage.update(st => { st.activeTheme = theme; });
          document.body.dataset.theme = theme;
          buildThemeSwatches();
        });
      }
      el.themeSwatches.appendChild(btn);
    });
  }

  function buildBadgeRow() {
    const s = Storage.get();
    el.badgeRow.innerHTML = "";
    if (s.badges.length === 0) {
      const p = document.createElement("span");
      p.className = "badge-empty";
      p.textContent = "None yet — string together correct answers to earn your first.";
      el.badgeRow.appendChild(p);
      return;
    }
    const icons = { "streak-10": "✒", "streak-25": "📖", "streak-50": "🕯", "streak-100": "🎓" };
    s.badges.forEach(b => {
      const d = document.createElement("div");
      d.className = "badge";
      d.textContent = icons[b] || "★";
      d.title = b;
      el.badgeRow.appendChild(d);
    });
  }

  /* ---------------- wire up events ---------------- */
  el.btnStartLevels.addEventListener("click", () => { AudioEngine.unlock(); mode = "levels"; beginSession(); });
  el.btnEndless.addEventListener("click", () => { AudioEngine.unlock(); mode = "endless"; beginSession(); });
  el.btnDaily.addEventListener("click", () => { AudioEngine.unlock(); mode = "daily"; beginSession(); });
  el.btnPractice.addEventListener("click", () => { showScene("practice"); });
  el.practiceBack.addEventListener("click", () => showScene("menu"));

  el.answerForm.addEventListener("submit", submitAnswer);
  el.quitBtn.addEventListener("click", quitSession);

  el.summaryAgain.addEventListener("click", () => beginSession());
  el.summaryHome.addEventListener("click", () => { AudioEngine.stopMusic(); showScene("menu"); refreshMenuLedger(); });

  el.settingsBtn.addEventListener("click", openSettings);
  el.settingsClose.addEventListener("click", closeSettings);
  el.settingsBackdrop.addEventListener("click", (e) => { if (e.target === el.settingsBackdrop) closeSettings(); });

  el.musicToggle.addEventListener("click", () => {
    const on = el.musicToggle.getAttribute("aria-checked") !== "true";
    setSwitch(el.musicToggle, on);
    Storage.update(s => { s.settings.musicOn = on; });
    if (on) { AudioEngine.unlock(); AudioEngine.startMusic(); } else { AudioEngine.stopMusic(); }
  });
  el.sfxToggle.addEventListener("click", () => {
    const on = el.sfxToggle.getAttribute("aria-checked") !== "true";
    setSwitch(el.sfxToggle, on);
    Storage.update(s => { s.settings.sfxOn = on; });
    AudioEngine.setSfxEnabled(on);
  });
  el.rainToggle.addEventListener("click", () => {
    const on = el.rainToggle.getAttribute("aria-checked") !== "true";
    setSwitch(el.rainToggle, on);
    Storage.update(s => { s.settings.rainOn = on; });
    el.windowRain.style.display = on ? "" : "none";
  });
  el.volumeSlider.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    Storage.update(s => { s.settings.volume = v; });
    AudioEngine.setVolume(v);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.settingsBackdrop.hidden) closeSettings();
  });

  /* ---------------- init ---------------- */
  function init() {
    const s = Storage.get();
    document.body.dataset.theme = s.activeTheme;
    el.windowRain.style.display = s.settings.rainOn ? "" : "none";
    AudioEngine.setVolume(s.settings.volume);
    buildSubjectGrid();
    refreshMenuLedger();
    showScene("menu");

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => { /* offline support best-effort */ });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
