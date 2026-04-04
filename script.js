"use strict";
let habits = [];
let currentHabitIndex = 0;
let currentScreen = "setup";
let holdTimer = null;
let xp = 0;

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

    content.innerHTML = `
      <h1>${habit}</h1>
      <p>${currentHabitIndex + 1} / ${habits.length}</p>
  
      <div 
  id="holdButton"
  onmousedown="startHold()" 
  onmouseup="cancelHold()" 
  onmouseleave="cancelHold()"
>
  Hold to Complete
</div>
    `;
  }

  if (currentScreen === "complete") {
    content.innerHTML = `
      <h1>Momentum Complete</h1>
      <p>You completed ${habits.length} habits</p>
      <p>Total XP: ${xp}</p>
  
      <button onclick="reset()">Start New Session</button>
    `;
  }
}

function goToMomentum() {
  if (habits.length === 0) return;

  currentHabitIndex = 0;
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
  xp += 10;

  currentHabitIndex++;

  if (currentHabitIndex >= habits.length) {
    currentScreen = "complete";
  }

  render();
}
function startHold() {
  holdTimer = setTimeout(() => {
    nextHabit();
  }, 1000); // 1 second hold
}

function cancelHold() {
  clearTimeout(holdTimer);
}
