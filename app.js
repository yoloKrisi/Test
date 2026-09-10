const STORAGE_KEY = "gymlog-data-v1";
const DEFAULT_EXERCISES = ["Bankdrücken", "Kniebeugen", "Kreuzheben"];

const elements = {
  exerciseList: document.querySelector("#exercise-list"),
  emptyExercises: document.querySelector("#empty-exercises"),
  historyList: document.querySelector("#history-list"),
  emptyHistory: document.querySelector("#empty-history"),
  totalSets: document.querySelector("#total-sets"),
  todayLabel: document.querySelector("#today-label"),
  message: document.querySelector("#app-message"),
  dialog: document.querySelector("#exercise-dialog"),
  dialogTitle: document.querySelector("#dialog-title"),
  exerciseForm: document.querySelector("#exercise-form"),
  exerciseName: document.querySelector("#exercise-name"),
  exerciseNameError: document.querySelector("#exercise-name-error"),
  planSelect: document.querySelector("#plan-select"),
  planList: document.querySelector("#plan-list"),
  activePlanName: document.querySelector("#active-plan-name"),
  trainingDays: document.querySelector("#training-days"),
  trainingDayTabs: document.querySelector("#training-day-tabs"),
  emptyPlan: document.querySelector("#empty-plan"),
  addDayButton: document.querySelector("#add-day-button"),
  dayExerciseSelect: document.querySelector("#day-exercise-select"),
  planDialog: document.querySelector("#plan-dialog"),
  planForm: document.querySelector("#plan-form"),
  planName: document.querySelector("#plan-name"),
  planNameError: document.querySelector("#plan-name-error"),
  dayDialog: document.querySelector("#day-dialog"),
  dayForm: document.querySelector("#day-form"),
  dayName: document.querySelector("#day-name"),
  dayNameError: document.querySelector("#day-name-error"),
  chartExerciseSelect: document.querySelector("#chart-exercise-select"),
  chart: document.querySelector("#progress-chart"),
  emptyChart: document.querySelector("#empty-chart"),
};

let state = loadState();
let editingExerciseId = null;
let activePlanId = null;
let activeDayId = null;
const expandedExercises = new Set();

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.exercises) && Array.isArray(saved.sets)) {
      const plans = (Array.isArray(saved.plans) ? saved.plans : []).map((plan) => ({
        ...plan,
        days: (Array.isArray(plan.days) ? plan.days : []).map((day) => ({
          ...day,
          exerciseIds: Array.isArray(day.exerciseIds) ? day.exerciseIds : [],
        })),
      }));
      return {
        ...saved,
        plans: plans.length ? plans : [{ id: createId(), name: "Mein Training", days: [] }],
      };
    }
  } catch (error) {
    console.warn("Gespeicherte Trainingsdaten konnten nicht gelesen werden.", error);
  }
  return {
    exercises: DEFAULT_EXERCISES.map((name) => ({ id: createId(), name })),
    sets: [],
    plans: [{ id: createId(), name: "Mein Training", days: [] }],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character]));
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${dateString}T12:00:00`));
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function showMessage(text) {
  elements.message.textContent = text;
  window.clearTimeout(showMessage.timeout);
  showMessage.timeout = window.setTimeout(() => { elements.message.textContent = ""; }, 3200);
}

function renderExercises() {
  const available = state.exercises.filter((exercise) => !activeDay()?.exerciseIds.includes(exercise.id));
  elements.dayExerciseSelect.innerHTML = available.length
    ? available.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`).join("")
    : '<option value="">Alle Übungen sind bereits hinzugefügt</option>';
  elements.dayExerciseSelect.disabled = !activeDay() || !available.length;
  document.querySelector("#add-day-exercise-button").disabled = !activeDay() || !available.length;
}

function activePlan() {
  return state.plans[0];
}

function activeDay() {
  return activePlan()?.days.find((day) => day.id === activeDayId);
}

function renderPlans() {
  const plan = activePlan();
  if (activeDayId && !plan?.days.some((day) => day.id === activeDayId)) activeDayId = null;
  if (!activeDayId && plan?.days.length) activeDayId = plan.days[0].id;
  elements.trainingDayTabs.innerHTML = (plan?.days || []).map((day) => `
    <button class="training-day-tab ${day.id === activeDayId ? "active" : ""}" type="button"
      role="tab" aria-selected="${day.id === activeDayId}" data-action="select-day" data-id="${escapeHtml(day.id)}">
      ${escapeHtml(day.name)}
    </button>
  `).join("") + '<button class="training-day-tab add-tab" type="button" data-action="add-day" aria-label="Neuen Trainingstag hinzufügen">+</button>';
  const day = activeDay();
  elements.trainingDays.innerHTML = day ? day.exerciseIds.map((exerciseId) => renderDayExercise(exerciseId)).join("") : "";
  elements.emptyPlan.hidden = Boolean(day);
  renderExercises();
}

function renderDayExercise(exerciseId) {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return "";
  const entries = state.sets.filter((entry) => entry.exerciseId === exerciseId).sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  const expanded = expandedExercises.has(exerciseId);
  const latest = entries[0];
  return `<article class="day-exercise-card ${expanded ? "expanded" : ""}">
    <div class="exercise-toggle">
      <button class="exercise-toggle-main" type="button" data-action="toggle-exercise" data-id="${escapeHtml(exerciseId)}" aria-expanded="${expanded}">
        <span class="exercise-toggle-name">${escapeHtml(exercise.name)}</span>
        <span class="exercise-toggle-meta">${latest ? `${latest.weight.toLocaleString("de-DE")} kg · ${formatDate(latest.date)}` : "Noch kein Satz"} <span class="chevron">⌄</span></span>
      </button>
      <button class="icon-button delete exercise-remove" type="button" data-action="remove-day-exercise" data-id="${escapeHtml(exerciseId)}">Entfernen</button>
    </div>
    <div class="exercise-panel">
      <form class="inline-set-form" data-exercise-id="${escapeHtml(exerciseId)}" novalidate>
        <div class="field"><label>Gewicht (kg)</label><input name="weight" type="number" min="0" max="1000" step="0.5" required placeholder="60" /></div>
        <div class="field"><label>Wiederholungen</label><input name="repetitions" type="number" min="1" max="1000" step="1" required placeholder="10" /></div>
        <div class="field"><label>Anzahl Sätze</label><input name="setCount" type="number" min="1" max="30" step="1" value="3" required /></div>
        <button class="button button-primary" type="submit">Sätze speichern</button>
      </form>
      <p class="today-note">Heute gespeichert · ${entries.length ? `${entries.length} historische Sätze` : "Noch kein Verlauf"}</p>
      <div class="exercise-history">${entries.slice(0, 6).map((entry) => `<div><span>${formatDate(entry.date)}</span><strong>${entry.weight.toLocaleString("de-DE")} kg</strong><span>${entry.repetitions} Wdh.</span></div>`).join("") || '<p class="day-empty">Dein Gewichtsverlauf erscheint hier.</p>'}</div>
    </div>
  </article>`;
}

function renderChartExerciseOptions(sortedExercises) {
  const previous = elements.chartExerciseSelect.value;
  elements.chartExerciseSelect.innerHTML = sortedExercises.length
    ? sortedExercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`).join("")
    : '<option value="">Keine Übungen</option>';
  if (sortedExercises.some((exercise) => exercise.id === previous)) elements.chartExerciseSelect.value = previous;
  elements.chartExerciseSelect.disabled = !sortedExercises.length;
  drawChart();
}

function drawChart() {
  const canvas = elements.chart;
  const entries = state.sets.filter((entry) => entry.exerciseId === elements.chartExerciseSelect.value)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const context = canvas.getContext("2d");
  const width = canvas.clientWidth || 600;
  const height = 260;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  elements.emptyChart.hidden = entries.length > 1;
  if (entries.length < 2) return;
  const padding = { top: 20, right: 18, bottom: 38, left: 44 };
  const max = Math.max(...entries.map((entry) => entry.weight), 1);
  const min = Math.min(...entries.map((entry) => entry.weight), 0);
  const range = Math.max(max - min, 1);
  const x = (index) => padding.left + (index / (entries.length - 1)) * (width - padding.left - padding.right);
  const y = (weight) => padding.top + (1 - (weight - min) / range) * (height - padding.top - padding.bottom);
  context.strokeStyle = "#dce5df";
  context.lineWidth = 1;
  context.font = "11px system-ui";
  context.fillStyle = "#718078";
  for (let index = 0; index < 3; index += 1) {
    const value = min + (range * index) / 2;
    const position = y(value);
    context.beginPath();
    context.moveTo(padding.left, position);
    context.lineTo(width - padding.right, position);
    context.stroke();
    context.fillText(`${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`, 4, position + 4);
  }
  context.strokeStyle = "#246b4a";
  context.lineWidth = 3;
  context.beginPath();
  entries.forEach((entry, index) => index ? context.lineTo(x(index), y(entry.weight)) : context.moveTo(x(index), y(entry.weight)));
  context.stroke();
  entries.forEach((entry, index) => {
    context.fillStyle = "#e58b51";
    context.beginPath();
    context.arc(x(index), y(entry.weight), 5, 0, Math.PI * 2);
    context.fill();
  });
  context.fillStyle = "#718078";
  context.fillText(formatDate(entries[0].date), padding.left, height - 12);
  context.textAlign = "right";
  context.fillText(formatDate(entries[entries.length - 1].date), width - padding.right, height - 12);
  context.textAlign = "left";
}

function renderHistory() {
  const sorted = [...state.sets].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  elements.historyList.innerHTML = sorted.map((entry) => {
    const exercise = state.exercises.find((item) => item.id === entry.exerciseId);
    return `
      <div class="history-row">
        <div><div class="history-exercise">${escapeHtml(exercise?.name || "Gelöschte Übung")}</div><div class="history-date">${formatDate(entry.date)}</div></div>
        <div class="history-value">${entry.weight.toLocaleString("de-DE")} <span>kg</span></div>
        <div class="history-value">${entry.repetitions} <span>Wdh.</span></div>
        <button class="icon-button delete" type="button" data-action="delete-set" data-id="${escapeHtml(entry.id)}" aria-label="Satz löschen">Löschen</button>
      </div>`;
  }).join("");
  elements.emptyHistory.hidden = sorted.length > 0;
  elements.totalSets.textContent = state.sets.length.toLocaleString("de-DE");
}

function render() {
  renderExercises();
  renderPlans();
  renderHistory();
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((element) => { element.textContent = ""; });
}

function validateSet() {
  clearErrors();
  const values = {
    exercise: elements.exerciseSelect.value,
    weight: Number(document.querySelector("#weight").value),
    repetitions: Number(document.querySelector("#repetitions").value),
    date: today(),
  };
  const errors = {};
  if (!values.exercise) errors.exercise = "Bitte wähle eine Übung.";
  if (!Number.isFinite(values.weight) || values.weight < 0 || values.weight > 1000) errors.weight = "Gib 0 bis 1.000 kg ein.";
  if (!Number.isInteger(values.repetitions) || values.repetitions < 1 || values.repetitions > 1000) errors.repetitions = "Gib 1 bis 1.000 Wiederholungen ein.";
  Object.entries(errors).forEach(([key, message]) => {
    const errorElement = document.querySelector(`[data-error-for="${key}"]`);
    if (errorElement) errorElement.textContent = message;
  });
  return Object.keys(errors).length ? null : values;
}

function openExerciseDialog(exercise = null) {
  editingExerciseId = exercise?.id || null;
  elements.dialogTitle.textContent = exercise ? "Übung bearbeiten" : "Übung hinzufügen";
  elements.exerciseName.value = exercise?.name || "";
  elements.exerciseNameError.textContent = "";
  elements.dialog.showModal();
  elements.exerciseName.focus();
}

function closeExerciseDialog() {
  elements.dialog.close();
  editingExerciseId = null;
}

function openPlanDialog() {
  elements.planName.value = "";
  elements.planNameError.textContent = "";
  elements.planDialog.showModal();
  elements.planName.focus();
}

function closePlanDialog() {
  elements.planDialog.close();
}

function openDayDialog() {
  elements.dayName.value = "";
  elements.dayNameError.textContent = "";
  elements.dayDialog.showModal();
  elements.dayName.focus();
}

function closeDayDialog() {
  elements.dayDialog.close();
}

elements.todayLabel.textContent = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date());

document.querySelector("#add-exercise-button").addEventListener("click", () => openExerciseDialog());
document.querySelector("#close-dialog-button").addEventListener("click", closeExerciseDialog);
document.querySelector("#cancel-dialog-button").addEventListener("click", closeExerciseDialog);
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeExerciseDialog();
});
elements.exerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.exerciseName.value.trim().replace(/\s+/g, " ");
  const duplicate = state.exercises.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.id !== editingExerciseId);
  if (name.length < 2 || duplicate) {
    elements.exerciseNameError.textContent = duplicate ? "Diese Übung gibt es bereits." : "Bitte gib mindestens 2 Zeichen ein.";
    return;
  }
  if (editingExerciseId) {
    state.exercises = state.exercises.map((item) => item.id === editingExerciseId ? { ...item, name } : item);
    showMessage("Übung aktualisiert.");
  } else {
    state.exercises.push({ id: createId(), name });
    showMessage("Übung hinzugefügt.");
  }
  saveState();
  render();
  closeExerciseDialog();
});

document.querySelector("#close-day-dialog-button").addEventListener("click", closeDayDialog);
document.querySelector("#cancel-day-dialog-button").addEventListener("click", closeDayDialog);
elements.dayForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.dayName.value.trim().replace(/\s+/g, " ");
  const plan = activePlan();
  if (!plan) return;
  if (name.length < 2 || plan.days.some((day) => day.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    elements.dayNameError.textContent = "Bitte einen eindeutigen Namen mit mindestens 2 Zeichen eingeben.";
    return;
  }
  const day = { id: createId(), name, exerciseIds: [] };
  plan.days.push(day);
  activeDayId = day.id;
  saveState();
  render();
  closeDayDialog();
  showMessage("Trainingstag hinzugefügt.");
});

document.querySelector("#add-day-exercise-button").addEventListener("click", () => {
  const plan = activePlan();
  const day = plan?.days.find((item) => item.id === activeDayId);
  const exerciseId = elements.dayExerciseSelect.value;
  if (!day || !exerciseId || day.exerciseIds.includes(exerciseId)) return;
  day.exerciseIds.push(exerciseId);
  saveState();
  renderPlans();
  showMessage("Übung zum Trainingstag hinzugefügt.");
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "select-day") {
    activeDayId = id;
    renderPlans();
  }
  if (action === "add-day") openDayDialog();
  if (action === "toggle-exercise") {
    if (expandedExercises.has(id)) expandedExercises.clear();
    else {
      expandedExercises.clear();
      expandedExercises.add(id);
    }
    renderPlans();
  }
  if (action === "edit") {
    const exercise = state.exercises.find((item) => item.id === id);
    if (exercise) openExerciseDialog(exercise);
  }
  if (action === "delete") {
    const exercise = state.exercises.find((item) => item.id === id);
    if (!exercise || !window.confirm(`"${exercise.name}" wirklich löschen? Die gespeicherten Sätze bleiben im Verlauf.`)) return;
    state.exercises = state.exercises.filter((item) => item.id !== id);
    state.plans.forEach((plan) => plan.days.forEach((day) => {
      day.exerciseIds = day.exerciseIds.filter((exerciseId) => exerciseId !== id);
    }));
    saveState();
    render();
    showMessage("Übung gelöscht.");
  }
  if (action === "delete-set") {
    state.sets = state.sets.filter((item) => item.id !== id);
    saveState();
    render();
    showMessage("Satz aus dem Verlauf entfernt.");
  }
  if (action === "delete-day") {
    const plan = activePlan();
    if (!plan || !window.confirm("Diesen Trainingstag wirklich löschen?")) return;
    plan.days = plan.days.filter((day) => day.id !== id);
    saveState();
    render();
    showMessage("Trainingstag gelöscht.");
  }
  if (action === "remove-day-exercise") {
    const plan = activePlan();
    const day = plan?.days.find((item) => item.id === activeDayId);
    if (!day || !window.confirm("Diese Übung aus dem Trainingstag entfernen?")) return;
    day.exerciseIds = day.exerciseIds.filter((exerciseId) => exerciseId !== id);
    saveState();
    renderPlans();
    showMessage("Übung aus dem Trainingstag entfernt.");
  }
});

document.addEventListener("dblclick", (event) => {
  const tab = event.target.closest(".training-day-tab[data-id]");
  if (!tab) return;
  const day = activePlan()?.days.find((item) => item.id === tab.dataset.id);
  if (!day) return;
  const name = window.prompt("Name des Trainingstags:", day.name)?.trim().replace(/\s+/g, " ");
  if (!name || name === day.name) return;
  if (activePlan().days.some((item) => item.id !== day.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    showMessage("Diesen Trainingstag gibt es bereits.");
    return;
  }
  day.name = name;
  saveState();
  renderPlans();
  showMessage("Trainingstag umbenannt.");
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest(".inline-set-form");
  if (!form) return;
  event.preventDefault();
  const weight = Number(form.elements.weight.value);
  const repetitions = Number(form.elements.repetitions.value);
  const setCount = Number(form.elements.setCount.value);
  if (!Number.isFinite(weight) || weight < 0 || weight > 1000 || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 1000 || !Number.isInteger(setCount) || setCount < 1 || setCount > 30) {
    showMessage("Bitte Gewicht, Wiederholungen und Satzanzahl gültig ausfüllen.");
    return;
  }
  for (let index = 0; index < setCount; index += 1) {
    state.sets.push({ id: createId(), exercise: form.dataset.exerciseId, exerciseId: form.dataset.exerciseId, weight, repetitions, date: today(), createdAt: Date.now() + index });
  }
  saveState();
  render();
  expandedExercises.add(form.dataset.exerciseId);
  showMessage(`${setCount} Sätze gespeichert – stark gemacht!`);
});

document.querySelector("#clear-history-button").addEventListener("click", () => {
  if (!state.sets.length) return;
  if (!window.confirm("Möchtest du wirklich den gesamten Trainingsverlauf löschen?")) return;
  state.sets = [];
  saveState();
  render();
  showMessage("Trainingsverlauf gelöscht.");
});

render();
