"use strict";
let habits = [];
let currentHabitIndex = 0;
let currentScreen = "setup";
let holdInterval = null;
let holdProgress = 0;
let xp = 0;
let multiplier = 1.0;
let goldHabitIndex = -1;

function render() {
  const content = document.getElementById("content");

  if (currentScreen === "setup") {
    content.innerHTML = `
      <h1>Momentum</h1>
  
      <input id="habitInput" placeholder="Enter a habit" />
  
      <button onclick="addHabit()">Add Habit</button>
  
      <div id="habitList"></div>
  
      <button onclick="goToMomentum()" ${habits.length === 0 ? "disabled" : ""}>
  Start
</button>
    `;

    renderHabits();
  }

  if (currentScreen === "momentum") {
    const habit = habits[currentHabitIndex];
    const isGold = currentHabitIndex === goldHabitIndex;

    content.innerHTML = `
      <p class="multiplier-display">x${multiplier.toFixed(1)} multiplier</p>
      <h1 class="habit-title${isGold ? " gold-habit" : ""}">${habit}</h1>
      ${isGold ? `<p class="gold-label">Gold Habit</p>` : ""}
      <p class="habit-progress">${currentHabitIndex + 1} / ${habits.length}</p>

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
          <span class="complete-stat-label">XP earned</span>
        </div>
        <div class="complete-stat">
          <span class="complete-stat-value">x${multiplier.toFixed(1)}</span>
          <span class="complete-stat-label">Final multiplier</span>
        </div>
      </div>

      <button onclick="reset()">New Session</button>
    `;
  }
}

function goToMomentum() {
  if (habits.length === 0) return;

  currentHabitIndex = 0;
  goldHabitIndex = Math.floor(Math.random() * habits.length);
  currentScreen = "momentum";
  render();
}

function goToComplete() {
  currentScreen = "complete";
  render();
}

function reset() {
  currentHabitIndex = 0;
  xp = 0;
  multiplier = 1.0;
  goldHabitIndex = -1;
  currentScreen = "setup";
  render();
}

render();

function addHabit() {
  const input = document.getElementById("habitInput");
  const value = input.value.trim();

  if (value !== "") {
    habits.push(value);
    input.value = "";
    render();
  }
}

function renderHabits() {
  const list = document.getElementById("habitList");

  list.innerHTML = habits.map((habit) => `<p>${habit}</p>`).join("");
}

function nextHabit() {
  const isGold = currentHabitIndex === goldHabitIndex;
  const earned = Math.round(10 * multiplier * (isGold ? 2 : 1));
  xp += earned;
  multiplier = Math.round((multiplier + 0.1) * 10) / 10;

  currentHabitIndex++;

  if (currentHabitIndex >= habits.length) {
    currentScreen = "complete";
  }

  render();
}

function startHold() {
  holdProgress = 0;
  holdInterval = setInterval(() => {
    holdProgress += 5;
    const bar = document.getElementById("holdProgress");
    if (bar) bar.style.width = holdProgress + "%";
    if (holdProgress >= 100) {
      clearInterval(holdInterval);
      nextHabit();
    }
  }, 50);
}

function cancelHold() {
  clearInterval(holdInterval);
  holdProgress = 0;
  const bar = document.getElementById("holdProgress");
  if (bar) bar.style.width = "0%";
}
