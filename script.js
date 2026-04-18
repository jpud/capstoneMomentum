"use strict";

// Apply saved theme before anything renders to prevent flash
document.body.setAttribute(
  "data-theme",
  localStorage.getItem("momentum_theme") || "dark"
);

let habits = JSON.parse(localStorage.getItem("momentum_habits")) || [];
let currentHabitIndex = 0;
let currentScreen = "setup";
let holdRafId = null;
let holdStartTime = null;
let holdProgress = 0;
let xp = 0;
let baseXP = 0;
let goldBonusXP = 0;
let totalXP = parseInt(localStorage.getItem("momentum_totalXP")) || 0;
let streak = parseInt(localStorage.getItem("momentum_streak")) || 0;
let lastCompletionDate = localStorage.getItem("momentum_lastDate") || null;
let multiplier = 1.0;
let goldHabitIndex = -1;

function render() {
  const content = document.getElementById("content");

  if (currentScreen === "setup" || currentScreen === "complete") {
    if (window.Starfield) Starfield.triggerGoldHabitEnd();
    momoSetState(null);
  }

  if (currentScreen === "setup") {
    content.innerHTML = `
      <h1>Momentum</h1>

      <div class="level-block" style="margin-top: 12px;">
        <div class="level-header">
          <span>Level ${getLevel()}${getLevel() === 77 ? " · Max" : ""}</span>
          <span>${
            getLevel() < 77
              ? `${getXPIntoLevel()} / ${getXPForNextLevel()} XP`
              : "Max Level"
          }</span>
        </div>
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width: ${
            getLevel() < 77
              ? Math.floor((getXPIntoLevel() / getXPForNextLevel()) * 100)
              : 100
          }%"></div>
        </div>
        <div class="level-footer">
          <p class="xp-to-next">${
            getLevel() < 77
              ? `${getXPForNextLevel() - getXPIntoLevel()} XP to Level ${
                  getLevel() + 1
                }`
              : "Max Level Reached"
          }</p>
          <p class="streak-display">${streak} day${
      streak !== 1 ? "s" : ""
    } streak</p>
        </div>
        <div class="momentum-setup-row">
          ${
            MomentumMeter.isMaxed()
              ? `<span class="momentum-maxed">Momentum Maxed</span><span class="momentum-maxed">x${MomentumMeter.getMultiplier().toFixed(
                  2
                )}</span>`
              : `<span>Momentum</span><span>${MomentumMeter.get()} / 10</span>`
          }
        </div>
        <div class="momentum-setup-track">
          <div class="momentum-setup-fill${
            MomentumMeter.isMaxed() ? " maxed" : ""
          }" style="width: ${MomentumMeter.get() * 10}%"></div>
        </div>
      </div>

      <input id="habitInput" placeholder="Enter a habit" />

      <button onclick="addHabit()">Add Habit</button>

      <div class="habit-scroll-container">
        <div id="habitList"></div>
      </div>

      <button onclick="goToMomentum()" ${
        habits.length === 0 ? "disabled" : ""
      }>Start</button>

      <button class="reset-all-btn" onclick="fullReset()" onmouseenter="Starfield.triggerResetHoverStart();momoSetState('reset-hover')" onmouseleave="Starfield.triggerResetHoverEnd();momoSetState(null)">Reset All Progress</button>
    `;

    renderHabits();
  }

  if (currentScreen === "momentum") {
    const habit = habits[currentHabitIndex];
    const isGold = currentHabitIndex === goldHabitIndex;
    if (window.Starfield) {
      isGold
        ? Starfield.triggerGoldHabitStart()
        : Starfield.triggerGoldHabitEnd();
    }
    momoSetState(isGold ? "gold" : null);

    content.innerHTML = `
      <div class="momentum-meter">
        <div class="momentum-header">
          ${
            MomentumMeter.isMaxed()
              ? `<span class="momentum-maxed">Momentum Maxed</span><span class="momentum-maxed">x${MomentumMeter.getMultiplier().toFixed(
                  2
                )}</span>`
              : `<span>Momentum</span><span>${MomentumMeter.get()} / 10</span>`
          }
        </div>
        <div class="momentum-bar-track">
          <div class="momentum-bar-fill${
            MomentumMeter.isMaxed() ? " maxed" : ""
          }" style="width: ${MomentumMeter.get() * 10}%"></div>
        </div>
      </div>

      <h1 class="habit-title${isGold ? " gold-habit" : ""}">${habit}</h1>
      ${isGold ? `<p class="gold-label">Gold Habit &middot; 2x XP</p>` : ""}
      <p class="habit-progress">${currentHabitIndex + 1} / ${habits.length}</p>
      <p class="multiplier-display">x${multiplier.toFixed(1)} multiplier</p>

      <div
        id="holdButton"
        onmousedown="startHold()"
        onmouseup="cancelHold()"
        onmouseleave="cancelHold()"
      >
        <div id="holdProgress"></div>
        <span>Hold to Complete</span>
      </div>
    `;
  }

  if (currentScreen === "complete") {
    content.innerHTML = `
      <p class="complete-eyebrow">Session Complete</p>
      <h1>${habits.length} ${habits.length === 1 ? "habit" : "habits"}</h1>

      <div class="complete-stats">
        <div class="complete-stat">
          <span class="complete-stat-value">${xp}</span>
          <span class="complete-stat-label">Total XP</span>
        </div>
        <div class="complete-stat">
          <span class="complete-stat-value">x${MomentumMeter.getMultiplier().toFixed(
            2
          )}</span>
          <span class="complete-stat-label">Final multiplier</span>
        </div>
      </div>

      ${
        goldBonusXP > 0
          ? `
      <div class="xp-breakdown">
        <div class="xp-breakdown-row">
          <span>Base XP</span>
          <span>${baseXP}</span>
        </div>
        <div class="xp-breakdown-row gold-row">
          <span>Gold Bonus</span>
          <span>+${goldBonusXP}</span>
        </div>
      </div>`
          : ""
      }

      <button onclick="reset()">New Session</button>
    `;
  }
}

function goToMomentum() {
  if (habits.length === 0) return;

  currentHabitIndex = 0;
  goldHabitIndex = Math.floor(Math.random() * habits.length);
  fadeOutThen(() => {
    currentScreen = "momentum";
    render();
  });
}

function reset() {
  fadeOutThen(() => {
    currentHabitIndex = 0;
    xp = 0;
    baseXP = 0;
    goldBonusXP = 0;
    multiplier = 1.0;
    goldHabitIndex = -1;
    currentScreen = "setup";
    render();
  });
}

const onboardingSteps = [
  {
    eyebrow: "The problem",
    title: "Most people fail because they try to do everything at once.",
    body: "Momentum is different. You focus on one task at a time — and build forward.",
  },
  {
    eyebrow: "How it works",
    title: "One task. One win.",
    body: "You won't see a list while working. Just the next step. Finish it, gain momentum, and keep going.",
  },
  {
    eyebrow: "Why it works",
    title: "Momentum compounds.",
    body: "Each completed task increases your multiplier. The more consistent you are, the faster you progress.",
  },
  {
    eyebrow: "Getting started",
    title: "Start simple.",
    body: "Add 2–3 habits. That's all you need to begin.",
  },
];

let onboardingStep = 0;

function showOnboarding() {
  const overlay = document.getElementById("onboarding-overlay");
  overlay.classList.add("active");
  renderOnboardingStep();
  if (window.Starfield) Starfield.startOnboardingComets();
}

function renderOnboardingStep() {
  const step = onboardingSteps[onboardingStep];
  const isLast = onboardingStep === onboardingSteps.length - 1;
  const isFirst = onboardingStep === 0;

  document.getElementById("onboarding-eyebrow").textContent = step.eyebrow;
  document.getElementById("onboarding-title").textContent = step.title;
  document.getElementById("onboarding-body").textContent = step.body;
  document.getElementById("onboarding-next-btn").textContent = isLast
    ? "Begin"
    : "Next";

  const backBtn = document.getElementById("onboarding-back-btn");
  if (isFirst) {
    backBtn.classList.remove("visible");
  } else {
    backBtn.classList.add("visible");
  }

  const nameInput = document.getElementById("onboarding-name-input");
  const nextBtn = document.getElementById("onboarding-next-btn");
  if (isLast) {
    nameInput.classList.add("visible");
    nextBtn.disabled = nameInput.value.trim() === "";
    setTimeout(() => nameInput.focus(), 200);
  } else {
    nameInput.classList.remove("visible");
    nextBtn.disabled = false;
  }
}

function stepOnboarding(direction) {
  const card = document.getElementById("onboarding-card");
  card.classList.add("fading");
  setTimeout(() => {
    onboardingStep += direction;
    renderOnboardingStep();
    card.classList.remove("fading");
  }, 150);
}

function finishOnboarding() {
  if (window.Starfield) Starfield.stopOnboardingComets();

  const nameInput = document.getElementById("onboarding-name-input");
  const rawName = nameInput ? nameInput.value.trim() : "";
  localStorage.setItem("momentumUserName", rawName || "Explorer");

  const overlay = document.getElementById("onboarding-overlay");
  overlay.style.transition = "opacity 0.3s ease";
  overlay.style.opacity = "0";
  setTimeout(() => {
    overlay.classList.remove("active");
    overlay.style.opacity = "";
    localStorage.setItem("momentum_onboarding_done", "1");
    render();
    triggerFadeIn();
    const wq = MOMO_PERSONAL_QUOTES[Math.floor(Math.random() * MOMO_PERSONAL_QUOTES.length)];
    showMomoQuote(false, formatQuote(wq));
  }, 300);
}

document.getElementById("onboarding-next-btn").addEventListener("click", () => {
  if (onboardingStep < onboardingSteps.length - 1) {
    stepOnboarding(1);
  } else {
    finishOnboarding();
  }
});

document.getElementById("onboarding-back-btn").addEventListener("click", () => {
  if (onboardingStep > 0) stepOnboarding(-1);
});

document.getElementById("onboarding-name-input").addEventListener("input", () => {
  if (onboardingStep === onboardingSteps.length - 1) {
    document.getElementById("onboarding-next-btn").disabled =
      document.getElementById("onboarding-name-input").value.trim() === "";
  }
});

document.getElementById("onboarding-name-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const nextBtn = document.getElementById("onboarding-next-btn");
    if (!nextBtn.disabled) nextBtn.click();
  }
});

if (localStorage.getItem("momentum_onboarding_done")) {
  render();
  triggerFadeIn();
} else {
  showOnboarding();
}

function triggerFadeIn() {
  const content = document.getElementById("content");
  content.classList.remove("fade-in");
  void content.offsetWidth;
  content.classList.add("fade-in");
}

function fadeOutThen(callback) {
  const content = document.getElementById("content");
  content.classList.add("fade-out");
  setTimeout(() => {
    content.classList.remove("fade-out");
    callback();
    triggerFadeIn();
  }, 180);
}

function xpRequired(level) {
  return 100 + (level - 1) * 50;
}

function getLevel() {
  let level = 0;
  let spent = 0;
  while (level < 77) {
    const needed = xpRequired(level + 1);
    if (spent + needed > totalXP) break;
    spent += needed;
    level++;
  }
  return level;
}

function getXPIntoLevel() {
  let spent = 0;
  const level = getLevel();
  for (let i = 1; i <= level; i++) spent += xpRequired(i);
  return totalXP - spent;
}

function getXPForNextLevel() {
  return xpRequired(getLevel() + 1);
}

function getTodayString() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function updateStreak() {
  const today = getTodayString();
  if (lastCompletionDate === today) return;
  const prev = new Date();
  prev.setDate(prev.getDate() - 1);
  const yesterday =
    prev.getFullYear() +
    "-" +
    String(prev.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(prev.getDate()).padStart(2, "0");
  streak = lastCompletionDate === yesterday ? streak + 1 : 1;
  lastCompletionDate = today;
  localStorage.setItem("momentum_streak", streak);
  localStorage.setItem("momentum_lastDate", today);
}

let modalCallback = null;

function openModal({ title, message, confirmLabel = "Confirm", onConfirm }) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;
  document.getElementById("modal-confirm-btn").textContent = confirmLabel;
  modalCallback = onConfirm;
  const overlay = document.getElementById("modal-overlay");
  overlay.classList.remove("closing");
  overlay.classList.add("active");
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("closing");
  setTimeout(() => {
    overlay.classList.remove("active", "closing");
    modalCallback = null;
  }, 180);
}

document
  .getElementById("modal-cancel-btn")
  .addEventListener("click", closeModal);

document.getElementById("modal-confirm-btn").addEventListener("click", () => {
  const cb = modalCallback;
  closeModal();
  setTimeout(() => {
    if (cb) cb();
  }, 190);
});

document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeSettings();
  }
});

function fullReset() {
  openModal({
    title: "Reset Progress?",
    message: "This will permanently delete your XP, level, and momentum.",
    confirmLabel: "Reset",
    onConfirm: () => {
      fadeOutThen(() => {
        localStorage.removeItem("momentum_habits");
        localStorage.removeItem("momentum_totalXP");
        localStorage.removeItem("momentum_streak");
        localStorage.removeItem("momentum_lastDate");
        localStorage.removeItem("momentum_level");
        localStorage.removeItem("momentum_onboarding_done");
        habits = [];
        totalXP = 0;
        streak = 0;
        lastCompletionDate = null;
        xp = 0;
        baseXP = 0;
        goldBonusXP = 0;
        multiplier = 1.0;
        goldHabitIndex = -1;
        MomentumMeter.reset();
        currentHabitIndex = 0;
        currentScreen = "setup";
        render();
      });
    },
  });
}

function saveHabits() {
  localStorage.setItem("momentum_habits", JSON.stringify(habits));
}

function addHabit() {
  const input = document.getElementById("habitInput");
  const value = input.value.trim();

  if (value !== "") {
    habits.push(value);
    input.value = "";
    saveHabits();
    render();
  }
}

function removeHabit(index) {
  habits.splice(index, 1);
  saveHabits();
  render();
}

function renderHabits() {
  const list = document.getElementById("habitList");

  list.innerHTML = habits
    .map(
      (habit, i) => `
    <div class="habit-item">
      <span>${habit}</span>
      <button class="delete-btn" onclick="removeHabit(${i})">×</button>
    </div>
  `
    )
    .join("");
}

function nextHabit() {
  const isGold = currentHabitIndex === goldHabitIndex;
  const earned = Math.round(
    10 * multiplier * MomentumMeter.getMultiplier() * (isGold ? 2 : 1)
  );
  const bonus = isGold
    ? earned - Math.round(10 * multiplier * MomentumMeter.getMultiplier())
    : 0;
  xp += earned;
  baseXP += earned - bonus;
  goldBonusXP += bonus;
  multiplier = Math.round((multiplier + 0.1) * 10) / 10;

  currentHabitIndex++;

  if (currentHabitIndex >= habits.length) {
    currentScreen = "complete";
    totalXP += xp;
    localStorage.setItem("momentum_totalXP", totalXP);
    MomentumMeter.increase();
    updateStreak();
  }

  render();
}

const HOLD_DURATION = 1000;

function startHold() {
  holdProgress = 0;
  holdStartTime = null;
  Starfield.triggerHoldStart();

  function holdFrame(ts) {
    if (!holdStartTime) holdStartTime = ts;
    holdProgress = Math.min(100, ((ts - holdStartTime) / HOLD_DURATION) * 100);
    const bar = document.getElementById("holdProgress");
    if (bar) bar.style.width = holdProgress + "%";
    if (holdProgress < 100) {
      holdRafId = requestAnimationFrame(holdFrame);
    } else {
      holdRafId = null;
      onHoldComplete();
    }
  }

  holdRafId = requestAnimationFrame(holdFrame);
}

function onHoldComplete() {
  Starfield.triggerCompletion();
  const isGold = currentHabitIndex === goldHabitIndex;
  if (isGold && window.Starfield) Starfield.triggerGoldRipple();
  const earned = Math.round(
    10 * multiplier * MomentumMeter.getMultiplier() * (isGold ? 2 : 1)
  );
  const btn = document.getElementById("holdButton");
  if (btn) {
    btn.classList.add("hold-done");
    const span = btn.querySelector("span");
    if (span)
      span.textContent = isGold ? `+${earned} XP · Gold` : `+${earned} XP`;
  }
  showMomoQuote(isGold);
  setTimeout(() => fadeOutThen(nextHabit), 300);
}

function cancelHold() {
  if (holdProgress >= 100) return;
  Starfield.triggerHoldEnd();
  if (holdRafId !== null) {
    cancelAnimationFrame(holdRafId);
    holdRafId = null;
  }
  holdStartTime = null;
  holdProgress = 0;
  const bar = document.getElementById("holdProgress");
  if (bar) bar.style.width = "0%";
}

function applyTheme(theme) {
  document.body.classList.add("theme-switching");
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("momentum_theme", theme);
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = theme === "light" ? "Dark Mode" : "Light Mode";
  setTimeout(() => document.body.classList.remove("theme-switching"), 350);
}

function openSettings() {
  const current = document.body.getAttribute("data-theme");
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = current === "light" ? "Dark Mode" : "Light Mode";
  document.getElementById("settings-overlay").classList.add("active");
}

function closeSettings() {
  document.getElementById("settings-overlay").classList.remove("active");
}

document.getElementById("settings-btn").addEventListener("click", openSettings);

document
  .getElementById("settings-close-btn")
  .addEventListener("click", closeSettings);

document.getElementById("settings-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("settings-overlay")) closeSettings();
});

document.getElementById("theme-toggle-btn").addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  applyTheme(current === "light" ? "dark" : "light");
});

// ─── Character state helpers ────────────────────────────

function momoSetState(state) {
  const wrap = document.getElementById("character-wrap");
  if (!wrap) return;
  wrap.classList.remove("gold", "reset-hover");
  if (state) wrap.classList.add(state);
}

// ─── MOMO Quote system ──────────────────────────────────

const MOMO_QUOTES = [
  "Ad astra.",
  "To the stars.",
  "Keep moving.",
  "Further.",
  "One step at a time.",
  "We choose to go.",
  "Stay the course.",
  "Across the void.",
  "Eyes on the horizon.",
  "The stars await.",
  "Forward.",
  "One small step.",
];

const MOMO_PERSONAL_QUOTES = [
  "Let's adventure, {name}.",
  "Your journey begins, {name}.",
  "Stay the course, {name}.",
  "One step at a time, {name}.",
  "You're moving forward, {name}.",
  "Keep going, {name}.",
  "The stars await, {name}.",
];

function getUserName() {
  return localStorage.getItem("momentumUserName") || "Explorer";
}

function formatQuote(template) {
  return template.replace("{name}", getUserName());
}

let _momoQuoteTimer = null;
let _lastQuoteIndex = -1;

function showMomoQuote(isGold, overrideText) {
  const el = document.getElementById("momo-quote");
  if (!el) return;

  if (_momoQuoteTimer !== null) {
    clearTimeout(_momoQuoteTimer);
    _momoQuoteTimer = null;
  }
  el.classList.remove("active", "gold");

  _momoQuoteTimer = setTimeout(() => {
    let text;
    if (overrideText) {
      text = overrideText;
    } else if (isGold && Math.random() < 0.28) {
      const pool = MOMO_PERSONAL_QUOTES;
      text = formatQuote(pool[Math.floor(Math.random() * pool.length)]);
    } else {
      let index;
      do {
        index = Math.floor(Math.random() * MOMO_QUOTES.length);
      } while (index === _lastQuoteIndex && MOMO_QUOTES.length > 1);
      _lastQuoteIndex = index;
      text = MOMO_QUOTES[index];
    }

    el.textContent = text;
    if (isGold) el.classList.add("gold");
    el.classList.add("active");

    _momoQuoteTimer = setTimeout(() => {
      el.classList.remove("active", "gold");
      _momoQuoteTimer = null;
    }, 3500);
  }, 200);
}
