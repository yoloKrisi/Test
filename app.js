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
  setDate: document.querySelector("#set-date"),
  message: document.querySelector("#app-message"),
  dialog: document.querySelector("#exercise-dialog"),
  dialogTitle: document.querySelector("#dialog-title"),
  exerciseForm: document.querySelector("#exercise-form"),
  exerciseName: document.querySelector("#exercise-name"),
  exerciseNameError: document.querySelector("#exercise-name-error"),
};

let state = loadState();
let editingExerciseId = null;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.exercises) && Array.isArray(saved.sets)) return saved;
  } catch (error) {
    console.warn("Gespeicherte Trainingsdaten konnten nicht gelesen werden.", error);
  }
  return {
    exercises: DEFAULT_EXERCISES.map((name) => ({ id: createId(), name })),
    sets: [],
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
    date: elements.setDate.value,
  };
  const errors = {};
  if (!values.exercise) errors.exercise = "Bitte wähle eine Übung.";
  if (!Number.isFinite(values.weight) || values.weight < 0 || values.weight > 1000) errors.weight = "Gib 0 bis 1.000 kg ein.";
  if (!Number.isInteger(values.repetitions) || values.repetitions < 1 || values.repetitions > 1000) errors.repetitions = "Gib 1 bis 1.000 Wiederholungen ein.";
  if (!values.date || values.date > new Date().toISOString().slice(0, 10)) errors.date = "Das Datum darf nicht in der Zukunft liegen.";
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

elements.setDate.value = new Date().toISOString().slice(0, 10);
elements.todayLabel.textContent = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date());
elements.setForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = validateSet();
  if (!values) return;
  state.sets.push({ id: createId(), ...values, createdAt: Date.now() });
  saveState();
  elements.setForm.reset();
  elements.setDate.value = new Date().toISOString().slice(0, 10);
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
