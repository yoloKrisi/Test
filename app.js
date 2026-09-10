const STORAGE_KEY = "gymlog-data-v1";
const DEFAULT_EXERCISES = ["Bankdrücken", "Kniebeugen", "Kreuzheben"];

const elements = {
  exerciseSelect: document.querySelector("#exercise-select"),
  exerciseList: document.querySelector("#exercise-list"),
  emptyExercises: document.querySelector("#empty-exercises"),
  historyList: document.querySelector("#history-list"),
  emptyHistory: document.querySelector("#empty-history"),
  totalSets: document.querySelector("#total-sets"),
  todayLabel: document.querySelector("#today-label"),
  setForm: document.querySelector("#set-form"),
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
  emptyPlan: document.querySelector("#empty-plan"),
  addDayButton: document.querySelector("#add-day-button"),
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

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.exercises) && Array.isArray(saved.sets)) {
      return { ...saved, plans: Array.isArray(saved.plans) ? saved.plans : [] };
    }
  } catch (error) {
    console.warn("Gespeicherte Trainingsdaten konnten nicht gelesen werden.", error);
  }
  return {
    exercises: DEFAULT_EXERCISES.map((name) => ({ id: createId(), name })),
    sets: [],
    plans: [],
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
  const sorted = [...state.exercises].sort((a, b) => a.name.localeCompare(b.name, "de"));
  elements.exerciseSelect.innerHTML = sorted.length
    ? sorted.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`).join("")
    : '<option value="">Zuerst Übung anlegen</option>';
  elements.exerciseSelect.disabled = sorted.length === 0;
  elements.exerciseList.innerHTML = sorted.map((exercise) => `
    <div class="exercise-row">
      <span class="exercise-name">${escapeHtml(exercise.name)}</span>
      <span class="exercise-actions">
        <button class="icon-button" type="button" data-action="edit" data-id="${escapeHtml(exercise.id)}">Bearbeiten</button>
        <button class="icon-button delete" type="button" data-action="delete" data-id="${escapeHtml(exercise.id)}">Löschen</button>
      </span>
    </div>
  `).join("");
  elements.emptyExercises.hidden = sorted.length > 0;
  renderChartExerciseOptions(sorted);
}

function renderPlans() {
  const plans = state.plans || [];
  if (activePlanId && !plans.some((plan) => plan.id === activePlanId)) activePlanId = null;
  if (!activePlanId && plans.length) activePlanId = plans[0].id;
  elements.planSelect.innerHTML = plans.length
    ? plans.map((plan) => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)}</option>`).join("")
    : '<option value="">Noch kein Trainingsplan</option>';
  elements.planSelect.disabled = !plans.length;
  if (activePlanId) elements.planSelect.value = activePlanId;
  elements.planList.innerHTML = plans.map((plan) => `
    <div class="plan-row ${plan.id === activePlanId ? "active" : ""}">
      <span>${escapeHtml(plan.name)}</span>
      <button class="icon-button delete" type="button" data-action="delete-plan" data-id="${escapeHtml(plan.id)}">Löschen</button>
    </div>
  `).join("");
  const activePlan = plans.find((plan) => plan.id === activePlanId);
  elements.activePlanName.textContent = activePlan?.name || "Kein Plan ausgewählt";
  elements.addDayButton.disabled = !activePlan;
  elements.trainingDays.innerHTML = activePlan?.days.map((day) => `
    <div class="training-day">
      <div class="training-day-heading">
        <strong>${escapeHtml(day.name)}</strong>
        <button class="icon-button delete" type="button" data-action="delete-day" data-id="${escapeHtml(day.id)}">Löschen</button>
      </div>
      <div class="day-exercises">
        ${day.exerciseIds.length
          ? day.exerciseIds.map((id) => state.exercises.find((exercise) => exercise.id === id)?.name)
            .filter(Boolean).map((name) => `<span>${escapeHtml(name)}</span>`).join("")
          : '<span class="day-empty">Noch keine Übungen zugeordnet</span>'}
      </div>
    </div>
  `).join("") || "";
  elements.emptyPlan.hidden = Boolean(activePlan?.days.length);
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
elements.setForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = validateSet();
  if (!values) return;
  state.sets.push({ id: createId(), ...values, createdAt: Date.now() });
  saveState();
  elements.setForm.reset();
  render();
  showMessage("Satz gespeichert – stark gemacht!");
});

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

document.querySelector("#add-plan-button").addEventListener("click", openPlanDialog);
document.querySelector("#close-plan-dialog-button").addEventListener("click", closePlanDialog);
document.querySelector("#cancel-plan-dialog-button").addEventListener("click", closePlanDialog);
elements.planForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.planName.value.trim().replace(/\s+/g, " ");
  const duplicate = state.plans.some((plan) => plan.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (name.length < 2 || duplicate) {
    elements.planNameError.textContent = duplicate ? "Diesen Plan gibt es bereits." : "Bitte gib mindestens 2 Zeichen ein.";
    return;
  }
  const plan = { id: createId(), name, days: [] };
  state.plans.push(plan);
  activePlanId = plan.id;
  saveState();
  render();
  closePlanDialog();
  showMessage("Trainingsplan erstellt.");
});

document.querySelector("#add-day-button").addEventListener("click", openDayDialog);
document.querySelector("#close-day-dialog-button").addEventListener("click", closeDayDialog);
document.querySelector("#cancel-day-dialog-button").addEventListener("click", closeDayDialog);
elements.dayForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.dayName.value.trim().replace(/\s+/g, " ");
  const plan = state.plans.find((item) => item.id === activePlanId);
  if (!plan) return;
  if (name.length < 2 || plan.days.some((day) => day.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    elements.dayNameError.textContent = "Bitte einen eindeutigen Namen mit mindestens 2 Zeichen eingeben.";
    return;
  }
  plan.days.push({ id: createId(), name, exerciseIds: [] });
  saveState();
  render();
  closeDayDialog();
  showMessage("Trainingstag hinzugefügt.");
});

elements.planSelect.addEventListener("change", () => {
  activePlanId = elements.planSelect.value || null;
  renderPlans();
});
elements.chartExerciseSelect.addEventListener("change", drawChart);
window.addEventListener("resize", drawChart);

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "edit") {
    const exercise = state.exercises.find((item) => item.id === id);
    if (exercise) openExerciseDialog(exercise);
  }
  if (action === "delete") {
    const exercise = state.exercises.find((item) => item.id === id);
    if (!exercise || !window.confirm(`"${exercise.name}" wirklich löschen? Die gespeicherten Sätze bleiben im Verlauf.`)) return;
    state.exercises = state.exercises.filter((item) => item.id !== id);
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
  if (action === "delete-plan") {
    const plan = state.plans.find((item) => item.id === id);
    if (!plan || !window.confirm(`"${plan.name}" wirklich löschen?`)) return;
    state.plans = state.plans.filter((item) => item.id !== id);
    activePlanId = state.plans[0]?.id || null;
    saveState();
    render();
    showMessage("Trainingsplan gelöscht.");
  }
  if (action === "delete-day") {
    const plan = state.plans.find((item) => item.id === activePlanId);
    if (!plan || !window.confirm("Diesen Trainingstag wirklich löschen?")) return;
    plan.days = plan.days.filter((day) => day.id !== id);
    saveState();
    render();
    showMessage("Trainingstag gelöscht.");
  }
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
