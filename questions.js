/* =========================================================
   questions.js — question generation
   Every generator guarantees an integer answer.
   ========================================================= */
const Questions = (() => {

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  const SUBJECTS = {
    addition:      { label: "Addition",              gen: genAddition },
    subtraction:   { label: "Subtraction",            gen: genSubtraction },
    mixedAddSub:   { label: "Mixed Add / Subtract",   gen: genMixedAddSub },
    multiplication:{ label: "Multiplication",         gen: genMultiplication },
    tables:        { label: "Times Tables (2–30)",    gen: genTablesWide },
    division:      { label: "Division",               gen: genDivision },
    mixedArith:    { label: "Mixed Arithmetic",       gen: genMixedArith },
    squares:       { label: "Squares (1–30)",         gen: genSquares },
    cubes:         { label: "Cubes (1–20)",           gen: genCubes },
    percentages:   { label: "Percentages",            gen: genPercentage },
    bodmas:        { label: "BODMAS",                 gen: genBodmas },
  };

  // difficulty tier 0 (gentle) .. 3 (fierce) scales magnitude within a category
  function tierFor(level) {
    if (level <= 2) return 0;
    if (level <= 5) return 1;
    if (level <= 9) return 2;
    return 3;
  }

  function genAddition(tier) {
    const span = [ [10,99], [50,499], [100,999], [500,4999] ][tier];
    const a = randInt(span[0], span[1]);
    const b = randInt(span[0], span[1]);
    return { text: `${a} + ${b}`, answer: a + b };
  }

  function genSubtraction(tier) {
    const span = [ [10,99], [50,499], [100,999], [500,4999] ][tier];
    let a = randInt(span[0], span[1]);
    let b = randInt(span[0], span[1]);
    if (b > a) [a, b] = [b, a];
    return { text: `${a} - ${b}`, answer: a - b };
  }

  function genMixedAddSub(tier) {
    return Math.random() < 0.5 ? genAddition(tier) : genSubtraction(tier);
  }

  function genMultiplication(tier) {
    const ranges = [ [2,10,2,10], [2,12,2,20], [5,20,5,30], [10,40,10,50] ][tier];
    const a = randInt(ranges[0], ranges[1]);
    const b = randInt(ranges[2], ranges[3]);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  function genTablesWide(tier) {
    const maxTable = [12, 18, 24, 30][tier];
    const a = randInt(2, maxTable);
    const b = randInt(2, 12);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  function genDivision(tier) {
    const divisorMax = [12, 18, 24, 30][tier];
    const quotientMax = [12, 20, 30, 50][tier];
    const divisor = randInt(2, divisorMax);
    const quotient = randInt(2, quotientMax);
    const dividend = divisor * quotient;
    return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
  }

  function genMixedArith(tier) {
    const roll = Math.random();
    if (roll < 0.25) return genAddition(tier);
    if (roll < 0.5) return genSubtraction(tier);
    if (roll < 0.75) return genMultiplication(tier);
    return genDivision(tier);
  }

  function genSquares(tier) {
    const maxN = [12, 18, 24, 30][tier];
    const n = randInt(2, maxN);
    return { text: `${n}²`, answer: n * n };
  }

  function genCubes(tier) {
    const maxN = [8, 12, 16, 20][tier];
    const n = randInt(2, maxN);
    return { text: `${n}³`, answer: n * n * n };
  }

  function genPercentage(tier) {
    const percents = [ [10,25,50], [5,10,15,20,25,50,75], [5,10,15,20,30,40,60,75,80], [5,8,15,24,32,40,60,72] ][tier];
    const pct = pick(percents);
    // choose base so pct% of base is an integer
    const baseUnit = Math.ceil(100 / gcd(pct, 100));
    const multiplierMax = [20, 40, 60, 90][tier];
    const base = baseUnit * randInt(1, multiplierMax);
    const answer = (base * pct) / 100;
    return { text: `${pct}% of ${base}`, answer };
  }

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  function genBodmas(tier) {
    // build small integer-safe compound expressions
    const builders = [
      () => {
        const a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 12);
        return { text: `${a} × (${b} + ${c})`, answer: a * (b + c) };
      },
      () => {
        const b = randInt(2, 12), c = randInt(2, 12);
        const inner = b * c;
        const divisor = pick(factorsOf(inner).filter(f => f > 1));
        return { text: `${inner} ÷ (${b > 1 ? b : c} × ${divisor === b ? c : b})`, answer: inner / (divisor) }; // fallback rarely used
      },
      () => {
        const a = randInt(2, 30), b = randInt(2, 12), c = randInt(2, 50);
        return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
      },
      () => {
        const a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 12), d = randInt(2, 12);
        return { text: `(${a} + ${b}) × (${c} - ${d < c ? d : c - 1})`, answer: (a + b) * (c - (d < c ? d : c - 1)) };
      },
      () => {
        const divisor = randInt(2, 10);
        const quotient = randInt(2, 12);
        const dividend = divisor * quotient;
        const extra = randInt(2, 20);
        return { text: `${dividend} ÷ ${divisor} + ${extra}`, answer: quotient + extra };
      }
    ];
    // pick a safe, always-valid builder set based on tier (avoid the fragile #2)
    const safe = [builders[0], builders[2], builders[3], builders[4]];
    return pick(safe)();
  }

  function factorsOf(n) {
    const f = [];
    for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i);
    return f;
  }

  // ---- level curriculum: which subjects unlock at which level ----
  function subjectsForLevel(level) {
    if (level === 1) return ["addition"];
    if (level === 2) return ["subtraction"];
    if (level === 3) return ["mixedAddSub"];
    if (level === 4) return ["multiplication"];
    if (level === 5) return ["tables"];
    if (level === 6) return ["division"];
    if (level === 7) return ["mixedArith"];
    if (level === 8) return ["squares"];
    if (level === 9) return ["cubes"];
    if (level === 10) return ["percentages"];
    if (level === 11) return ["bodmas"];
    if (level === 12) return ["addition","subtraction","multiplication","division","squares","cubes","percentages","bodmas"];
    // level 13+: everything, fully random
    return Object.keys(SUBJECTS);
  }

  function levelLabel(level) {
    const names = {
      1: "Addition", 2: "Subtraction", 3: "Mixed Add / Subtract", 4: "Multiplication",
      5: "Times Tables (2–30)", 6: "Division", 7: "Mixed Arithmetic", 8: "Squares",
      9: "Cubes", 10: "Percentages", 11: "BODMAS", 12: "Mixed Challenge"
    };
    return names[level] || "The Grand Examination";
  }

  function timerForLevel(level) {
    // 20s at level 1 down to ~5s at high levels
    const t = 20 - (level - 1) * 1.4;
    return Math.max(5, Math.round(t));
  }

  function next(level, forcedSubjectKey) {
    const tier = tierFor(level);
    const key = forcedSubjectKey || pick(subjectsForLevel(level));
    const q = SUBJECTS[key].gen(tier);
    return { ...q, subject: key, subjectLabel: SUBJECTS[key].label };
  }

  // Deterministic daily question set — same seed for everyone on a given day
  function seededRandomFactory(seedStr) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function dailySet(dateStr, count = 10) {
    const rng = seededRandomFactory(dateStr);
    const originalRandom = Math.random;
    const questions = [];
    Math.random = rng;
    try {
      for (let i = 0; i < count; i++) {
        const level = 1 + Math.floor((i / count) * 12);
        questions.push(next(level));
      }
    } finally {
      Math.random = originalRandom;
    }
    return questions;
  }

  return { SUBJECTS, next, subjectsForLevel, levelLabel, timerForLevel, dailySet };
})();
