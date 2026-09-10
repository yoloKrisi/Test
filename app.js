const STORAGE_KEY = "gymlog-data-v1";
const DEFAULT_EXERCISES = ["Bankdrücken", "Kniebeugen", "Kreuzheben"];

const elements = {
  totalSets: document.querySelector("#total-sets"),
  totalVolume: document.querySelector("#total-volume"),
  message: document.querySelector("#app-message"),
  dialog: document.querySelector("#exercise-dialog"),
  dialogTitle: document.querySelector("#dialog-title"),
  exerciseForm: document.querySelector("#exercise-form"),
  exerciseName: document.querySelector("#exercise-name"),
  exerciseNameError: document.querySelector("#exercise-name-error"),
  trainingDays: document.querySelector("#training-days"),
  trainingDayTabs: document.querySelector("#training-day-tabs"),
  emptyPlan: document.querySelector("#empty-plan"),
  dayExerciseSelect: document.querySelector("#day-exercise-select"),
  dayDialog: document.querySelector("#day-dialog"),
  dayForm: document.querySelector("#day-form"),
  dayName: document.querySelector("#day-name"),
  dayNameError: document.querySelector("#day-name-error"),
  calendarMonth: document.querySelector("#calendar-title"),
  calendarGrid: document.querySelector("#calendar-grid"),
  symbolLegend: document.querySelector("#symbol-legend"),
  dateDialog: document.querySelector("#date-dialog"),
  dateForm: document.querySelector("#date-form"),
  symbolPicker: document.querySelector("#symbol-picker"),
};

let state = loadState();
let editingExerciseId = null;
let activePlanId = null;
let activeDayId = null;
let calendarCursor = new Date();
let selectedDate = null;
const expandedExercises = new Set();
const SYMBOLS = ["sauna", "laufen", "restday", "krankheit"];

document.body.classList.add("dark-mode");

function trainingMarker(dayId) {
  return `training:${dayId}`;
}

function isTrainingMarker(name) {
  return typeof name === "string" && name.startsWith("training:");
}

function calendarMarkers() {
  const dayMarkers = (activePlan()?.days || []).map((day) => trainingMarker(day.id));
  return [...SYMBOLS, ...dayMarkers];
}

function markerLabel(name) {
  if (isTrainingMarker(name)) {
    return activePlan()?.days.find((day) => trainingMarker(day.id) === name)?.name || "Trainingstag";
  }
  return name;
}

function symbolMarkup(name, size = "small") {
  const special = {
    laufen: '<text x="35" y="43" text-anchor="middle" font-size="38" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="800" fill="#aeb6b2">Laufen</text>',
    sauna: '<circle cx="35" cy="35" r="17" fill="#f59e0b" stroke="#c2410c" stroke-width="3"/>',
    restday: '<text x="35" y="48" text-anchor="middle" font-size="42" font-family="Arial" font-weight="700" fill="#17365d">Z</text>',
    krankheit: '<path d="M35 18 L35 52 M18 35 L52 35" stroke="#d9363e" stroke-width="8" stroke-linecap="round"/>',
  };
  if (Object.prototype.hasOwnProperty.call(special, name)) {
    return `<svg class="person-symbol ${size} special-symbol" viewBox="0 0 70 70" aria-hidden="true">${special[name]}</svg>`;
  }
  const highlighted = {
    "brust-rücken": "chest back", "schultern-arme": "shoulders arms", beine: "legs",
    "beine-bauch": "legs abs", bauch: "abs", arme: "arms", brust: "chest",
    rücken: "back", schultern: "shoulders", push: "chest shoulders arms",
    pull: "back arms", "full body": "chest back shoulders arms abs legs",
    upper: "chest back shoulders arms", lower: "abs legs",
  }[name] || "";
  const view = size === "large" ? "0 0 70 120" : "0 0 42 72";
  const scale = size === "large" ? 1 : 0.6;
  return `<svg class="person-symbol ${size}" viewBox="${view}" aria-hidden="true">
    <g transform="translate(${size === "large" ? 0 : 8} ${size === "large" ? 0 : 5}) scale(${scale})">
      <circle cx="35" cy="10" r="7" fill="#fff" stroke="#111" stroke-width="2"/>
      <path d="M26 20 Q35 14 44 20 L50 46 Q46 54 35 53 Q24 54 20 46Z" fill="#fff" stroke="#111" stroke-width="2"/>
      <path d="M26 21 L14 43 M44 21 L56 43 M30 50 L25 77 M40 50 L45 77" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/>
      ${highlighted.includes("chest") ? '<path d="M26 25 Q35 21 44 25 L43 34 Q35 37 27 34Z" fill="#111"/>' : ""}
      ${highlighted.includes("back") ? '<path d="M27 25 Q35 21 43 25 L42 39 Q35 42 28 39Z" fill="#111"/>' : ""}
      ${highlighted.includes("shoulders") ? '<path d="M24 22 Q27 18 30 22 L29 29 Q25 31 23 27Z M40 22 Q43 18 46 22 L47 27 Q45 31 41 29Z" fill="#111"/>' : ""}
      ${highlighted.includes("arms") ? '<path d="M20 29 L16 43 Q18 47 21 43 L27 31Z M50 29 L54 43 Q52 47 49 43 L43 31Z" fill="#111"/>' : ""}
      ${highlighted.includes("abs") ? '<path d="M29 34 L41 34 L41 46 Q35 49 29 46Z" fill="#111"/>' : ""}
      ${highlighted.includes("legs") ? '<path d="M27 48 L35 50 L32 75 Q28 79 25 75Z M35 50 L43 48 L45 75 Q42 79 38 75Z" fill="#111"/>' : ""}
    </g>
  </svg>`;
}

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
      const allowedMarkers = [...SYMBOLS, ...plans.flatMap((plan) => plan.days.map((day) => trainingMarker(day.id)))];
      return {
        ...saved,
        plans: plans.length ? plans : [{ id: createId(), name: "Mein Training", days: [] }],
        calendar: Object.fromEntries(Object.entries(saved.calendar || {}).map(([date, value]) => [
          date,
          (Array.isArray(value) ? value : []).filter((name) => allowedMarkers.includes(name)),
        ])),
      };
    }
  } catch (error) {
    console.warn("Gespeicherte Trainingsdaten konnten nicht gelesen werden.", error);
  }
  return {
    exercises: DEFAULT_EXERCISES.map((name) => ({ id: createId(), name })),
    sets: [],
    plans: [{ id: createId(), name: "Mein Training", days: [] }],
    calendar: {},
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

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  elements.calendarMonth.textContent = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(calendarCursor);
  const first = new Date(year, month, 1).getDay();
  const offset = (first + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  elements.calendarGrid.innerHTML = names.map((name) => `<span class="calendar-weekday">${name}</span>`).join("");
  for (let index = 0; index < offset; index += 1) elements.calendarGrid.insertAdjacentHTML("beforeend", "<span></span>");
  for (let day = 1; day <= days; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const mark = (state.calendar[date] || []).filter((name) => calendarMarkers().includes(name));
    if (!mark.length) mark.push("restday");
    const trainingMark = mark.find(isTrainingMarker);
    const classes = mark.filter((name) => SYMBOLS.includes(name)).join(" ");
    const trainingClass = trainingMark ? " training-day" : "";
    const markerHtml = mark.filter((name) => name !== "sauna").map((name) => isTrainingMarker(name)
      ? `<span class="training-day-label">${escapeHtml(markerLabel(name))}</span>`
      : symbolMarkup(name)).join("");
    elements.calendarGrid.insertAdjacentHTML("beforeend", `<button class="calendar-day ${classes}${trainingClass}" type="button" data-date="${date}">${day}<span class="calendar-symbols">${markerHtml}</span></button>`);
  }
}

function renderSymbolPicker() {
  const selected = selectedDate ? (state.calendar[selectedDate] || [ "restday" ]) : [];
  const options = [...SYMBOLS, ...(activePlan()?.days || []).map((day) => trainingMarker(day.id))];
  elements.symbolPicker.innerHTML = options.map((name) => `<button type="button" class="symbol-choice ${selected.includes(name) ? "selected" : ""}" data-symbol="${escapeHtml(name)}"><b>${isTrainingMarker(name) ? `<span class="training-day-picker">${escapeHtml(markerLabel(name))}</span>` : symbolMarkup(name, "large")}</b><span>${isTrainingMarker(name) ? "Trainingstag" : name}</span></button>`).join("");
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
  window.requestAnimationFrame(() => {
    document.querySelectorAll("[data-chart-exercise]").forEach((canvas) => drawExerciseChart(canvas, canvas.dataset.chartExercise));
  });
}

function renderDayExercise(exerciseId) {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return "";
  const entries = state.sets.filter((entry) => entry.exerciseId === exerciseId).sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  if (!Array.isArray(exercise.rows) || !exercise.rows.length) {
    const rowId = createId();
    exercise.rows = [{ id: rowId, weight: entries[0]?.weight || "", repetitions: entries[0]?.repetitions || "" }];
    if (entries[0] && !entries[0].rowId) entries[0].rowId = rowId;
    saveState();
  }
  const expanded = expandedExercises.has(exerciseId);
  const latest = entries[0];
  return `<article class="day-exercise-card ${expanded ? "expanded" : ""}">
    <div class="exercise-toggle">
      <button class="exercise-toggle-main" type="button" data-action="toggle-exercise" data-id="${escapeHtml(exerciseId)}" aria-expanded="${expanded}">
        <span class="exercise-toggle-name">${escapeHtml(exercise.name)}</span>
        <span class="exercise-toggle-meta"><canvas class="mini-chart" data-chart-exercise="${escapeHtml(exerciseId)}"></canvas><span class="chevron">⌄</span></span>
      </button>
      <button class="icon-button delete exercise-remove" type="button" data-action="remove-day-exercise" data-id="${escapeHtml(exerciseId)}" aria-label="Übung entfernen">−</button>
    </div>
    <div class="exercise-panel">
      <div class="set-rows" data-exercise-id="${escapeHtml(exerciseId)}">
        ${exercise.rows.map((row, index) => `<div class="set-row">
          <span class="set-number">${index + 1}</span>
          <label>Gewicht<input data-row-field="weight" data-row-id="${escapeHtml(row.id)}" type="number" min="0" max="1000" step="0.5" value="${escapeHtml(row.weight)}" placeholder="kg" /></label>
          <label>Wdh.<input data-row-field="repetitions" data-row-id="${escapeHtml(row.id)}" type="number" min="1" max="1000" step="1" value="${escapeHtml(row.repetitions)}" placeholder="10" /></label>
          <button class="icon-button" type="button" data-action="remove-row" data-exercise-id="${escapeHtml(exerciseId)}" data-row-id="${escapeHtml(row.id)}" aria-label="Satz entfernen">−</button>
        </div>`).join("")}
      </div>
      <button class="button button-quiet button-small add-set-button" type="button" data-action="add-row" data-exercise-id="${escapeHtml(exerciseId)}">+ Satz</button>
      <label class="notes-label">Notizen<textarea class="exercise-notes" data-exercise-notes="${escapeHtml(exerciseId)}" maxlength="500" placeholder="Notiz zu dieser Übung...">${escapeHtml(exercise.notes || "")}</textarea></label>
      <div class="exercise-chart"><canvas data-chart-exercise="${escapeHtml(exerciseId)}" aria-label="Gewichtsverlauf ${escapeHtml(exercise.name)}"></canvas><p class="chart-empty">${entries.length ? "" : "Noch keine historischen Gewichte."}</p></div>
    </div>
  </article>`;
}

function drawExerciseChart(canvas, exerciseId) {
  const entriesByDate = new Map();
  state.sets.filter((entry) => entry.exerciseId === exerciseId).forEach((entry) => {
    const weights = entriesByDate.get(entry.date) || [];
    weights.push(Number(entry.weight));
    entriesByDate.set(entry.date, weights);
  });
  const points = [...entriesByDate.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weights]) => {
      const sorted = weights.sort((a, b) => b - a);
      return { date, highest: sorted[0], second: sorted[1] ?? null };
    });
  const context = canvas.getContext("2d");
  const width = canvas.clientWidth || 600;
  const compact = canvas.classList.contains("mini-chart");
  const height = compact ? 42 : 220;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  if (!points.length) return;
  const padding = compact ? { top: 5, right: 2, bottom: 5, left: 2 } : { top: 20, right: 18, bottom: 38, left: 44 };
  const max = Math.max(...points.flatMap((point) => [point.highest, point.second || point.highest]), 1);
  const min = Math.min(...points.flatMap((point) => [point.highest, point.second || point.highest]), 0);
  const range = Math.max(max - min, 1);
  const x = (index) => padding.left + (index / Math.max(points.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (weight) => padding.top + (1 - (weight - min) / range) * (height - padding.top - padding.bottom);
  context.strokeStyle = "#dce5df";
  context.lineWidth = 1;
  context.font = "11px system-ui";
  context.fillStyle = "#718078";
  for (let index = 0; index < (compact ? 0 : 3); index += 1) {
    const value = min + (range * index) / 2;
    const position = y(value);
    context.beginPath();
    context.moveTo(padding.left, position);
    context.lineTo(width - padding.right, position);
    context.stroke();
    context.fillText(`${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`, 4, position + 4);
  }
  const drawLine = (key, color, lineWidth) => {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    points.forEach((point, index) => {
      if (point[key] == null) return;
      if (index) context.lineTo(x(index), y(point[key]));
      else context.moveTo(x(index), y(point[key]));
    });
    context.stroke();
  };
  drawLine("second", "#a8d5b8", 1.5);
  drawLine("highest", "#246b4a", 3);
  points.forEach((point, index) => {
    context.fillStyle = "#246b4a";
    context.beginPath();
    context.arc(x(index), y(point.highest), 4, 0, Math.PI * 2);
    context.fill();
  });
  if (!compact) {
    context.fillStyle = "#718078";
    context.fillText(formatDate(points[0].date), padding.left, height - 12);
    context.textAlign = "right";
    context.fillText(formatDate(points[points.length - 1].date), width - padding.right, height - 12);
    context.textAlign = "left";
  }
}

function renderHistory() {
  elements.totalSets.textContent = state.sets.length.toLocaleString("de-DE");
  const volume = state.sets.reduce((sum, entry) => sum + (Number(entry.weight) || 0) * (Number(entry.repetitions) || 0), 0);
  elements.totalVolume.textContent = volume.toLocaleString("de-DE");
}

function render() {
  renderExercises();
  renderPlans();
  renderHistory();
  renderCalendar();
  renderSymbolPicker();
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
document.querySelector("#previous-month").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(); });
document.querySelector("#next-month").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(); });
document.querySelector("#close-date-dialog").addEventListener("click", () => elements.dateDialog.close());
document.querySelector("#cancel-date-dialog").addEventListener("click", () => elements.dateDialog.close());
elements.calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  selectedDate = button.dataset.date;
  document.querySelector("#date-dialog-title").textContent = formatDate(selectedDate);
  renderSymbolPicker();
  elements.dateDialog.showModal();
});
elements.symbolPicker.addEventListener("click", (event) => {
  const button = event.target.closest("[data-symbol]");
  if (!button || !selectedDate) return;
  const current = state.calendar[selectedDate] || ["restday"];
  const symbol = button.dataset.symbol;
  if (current.includes(symbol)) state.calendar[selectedDate] = current.filter((item) => item !== symbol);
  else if (symbol === "restday" && current.includes("sauna")) state.calendar[selectedDate] = ["sauna", "restday"];
  else if (symbol === "restday") state.calendar[selectedDate] = ["restday"];
  else if (current.length === 1 && current[0] === "restday") state.calendar[selectedDate] = [symbol];
  else if (current.length < 2) state.calendar[selectedDate] = [...current, symbol];
  else state.calendar[selectedDate] = [current[1], symbol];
  if (!state.calendar[selectedDate].length || (state.calendar[selectedDate].length === 1 && state.calendar[selectedDate][0] === "restday")) delete state.calendar[selectedDate];
  saveState();
  renderCalendar();
  renderSymbolPicker();
});
elements.dateForm.addEventListener("submit", (event) => { event.preventDefault(); elements.dateDialog.close(); });
document.addEventListener("input", (event) => {
  const textarea = event.target.closest("[data-exercise-notes]");
  if (!textarea) return;
  const exercise = state.exercises.find((item) => item.id === textarea.dataset.exerciseNotes);
  if (!exercise) return;
  exercise.notes = textarea.value;
  saveState();
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
  if (action === "add-row" || action === "remove-row") {
    const exercise = state.exercises.find((item) => item.id === button.dataset.exerciseId);
    if (!exercise) return;
    exercise.rows = Array.isArray(exercise.rows) ? exercise.rows : [];
    if (action === "add-row") exercise.rows.push({ id: createId(), weight: "", repetitions: "" });
    if (action === "remove-row" && exercise.rows.length > 1) {
      exercise.rows = exercise.rows.filter((row) => row.id !== button.dataset.rowId);
      state.sets = state.sets.filter((entry) => entry.rowId !== button.dataset.rowId);
    }
    saveState();
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

document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-row-field]");
  if (!input) return;
  const exerciseId = input.closest("[data-exercise-id]")?.dataset.exerciseId;
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  const row = exercise?.rows?.find((item) => item.id === input.dataset.rowId);
  if (!row) return;
  row[input.dataset.rowField] = input.value;
  const weight = Number(row.weight);
  const repetitions = Number(row.repetitions);
  const existing = state.sets.find((entry) => entry.rowId === row.id);
  if (Number.isFinite(weight) && weight >= 0 && Number.isInteger(repetitions) && repetitions > 0) {
    const entry = existing || { id: createId(), rowId: row.id, exerciseId, createdAt: Date.now() };
    Object.assign(entry, { weight, repetitions, date: today() });
    if (!existing) state.sets.push(entry);
  } else if (existing) {
    state.sets = state.sets.filter((entry) => entry.rowId !== row.id);
  }
  saveState();
  elements.totalSets.textContent = state.sets.length.toLocaleString("de-DE");
  elements.totalVolume.textContent = state.sets.reduce((sum, entry) => sum + Number(entry.weight) * Number(entry.repetitions), 0).toLocaleString("de-DE");
  window.requestAnimationFrame(() => {
    document.querySelectorAll("[data-chart-exercise]").forEach((canvas) => drawExerciseChart(canvas, canvas.dataset.chartExercise));
  });
});

document.addEventListener("dblclick", (event) => {
  const tab = event.target.closest(".training-day-tab[data-id]");
  if (!tab) return;
  const day = activePlan()?.days.find((item) => item.id === tab.dataset.id);
  if (!day) return;
  const enteredName = window.prompt("Trainingstag bearbeiten. Für Löschen den Namen leeren:", day.name);
  if (enteredName === null) return;
  const name = enteredName.trim().replace(/\s+/g, " ");
  if (!name) {
    if (!window.confirm(`"${day.name}" wirklich löschen?`)) return;
    activePlan().days = activePlan().days.filter((item) => item.id !== day.id);
    const markedDates = Object.keys(state.calendar).filter((date) => state.calendar[date].includes(trainingMarker(day.id)));
    markedDates.forEach((date) => {
      state.calendar[date] = state.calendar[date].filter((marker) => marker !== trainingMarker(day.id));
      if (!state.calendar[date].length) delete state.calendar[date];
    });
    activeDayId = null;
    saveState();
    render();
    showMessage("Trainingstag gelöscht.");
    return;
  }
  if (name === day.name) return;
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

render();
