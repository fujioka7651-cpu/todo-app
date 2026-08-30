const STORAGE_KEY = "todo-app.todos";
const VIEW_STORAGE_KEY = "todo-app.view";
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const MAX_CHIPS_PER_CELL = 3;

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const prioritySelect = document.getElementById("priority-select");
const dueInput = document.getElementById("due-input");
const list = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const itemsLeft = document.getElementById("items-left");
const clearCompletedBtn = document.getElementById("clear-completed");
const filterButtons = document.querySelectorAll(".filter-btn");
const filtersGroup = document.getElementById("filters");
const viewButtons = document.querySelectorAll(".view-btn");
const listView = document.getElementById("list-view");
const calendarView = document.getElementById("calendar-view");
const calendarGrid = document.getElementById("calendar-grid");
const calendarLabel = document.getElementById("calendar-label");
const calendarPrevBtn = document.getElementById("calendar-prev");
const calendarNextBtn = document.getElementById("calendar-next");
const calendarTodayBtn = document.getElementById("calendar-today");
const noDueList = document.getElementById("no-due-list");

let todos = loadTodos();
let currentFilter = "all";
let currentView = loadView();
let calendarCursor = startOfMonth(new Date());

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function loadView() {
  const raw = localStorage.getItem(VIEW_STORAGE_KEY);
  return raw === "calendar" ? "calendar" : "list";
}

function saveView() {
  localStorage.setItem(VIEW_STORAGE_KEY, currentView);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isOverdue(todo) {
  if (!todo.due || todo.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(todo.due) < today;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function createTodoItemElement(todo) {
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.completed ? " completed" : "");
  li.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.addEventListener("change", () => toggleTodo(todo.id));

  const dot = document.createElement("span");
  dot.className = `priority-dot ${todo.priority}`;

  const content = document.createElement("div");
  content.className = "content";

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = todo.text;
  content.appendChild(text);

  if (todo.due) {
    const meta = document.createElement("div");
    meta.className = "meta" + (isOverdue(todo) ? " overdue" : "");
    meta.textContent = `期限: ${formatDate(todo.due)}`;
    content.appendChild(meta);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "✕";
  deleteBtn.setAttribute("aria-label", "削除");
  deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

  li.appendChild(checkbox);
  li.appendChild(dot);
  li.appendChild(content);
  li.appendChild(deleteBtn);

  return li;
}

function renderList() {
  const filtered = todos.filter((t) => {
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    return true;
  });

  list.innerHTML = "";
  filtered.forEach((todo) => list.appendChild(createTodoItemElement(todo)));
  emptyState.hidden = filtered.length !== 0;
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  calendarLabel.textContent = `${year}年${month + 1}月`;

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const todayStr = toDateStr(new Date());

  const todosByDate = new Map();
  todos.forEach((t) => {
    if (!t.due) return;
    if (!todosByDate.has(t.due)) todosByDate.set(t.due, []);
    todosByDate.get(t.due).push(t);
  });

  calendarGrid.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const cellDateStr = toDateStr(cellDate);
    const isOtherMonth = cellDate.getMonth() !== month;
    const isToday = cellDateStr === todayStr;

    const cell = document.createElement("div");
    cell.className =
      "calendar-cell" +
      (isOtherMonth ? " other-month" : "") +
      (isToday ? " today" : "");
    cell.dataset.date = cellDateStr;

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = cellDate.getDate();
    cell.appendChild(dayNumber);

    const dayTodos = todosByDate.get(cellDateStr) || [];
    const chipContainer = document.createElement("div");
    chipContainer.className = "chip-container";

    dayTodos.slice(0, MAX_CHIPS_PER_CELL).forEach((todo) => {
      const chip = document.createElement("div");
      chip.className =
        `calendar-chip ${todo.priority}` + (todo.completed ? " completed" : "");
      chip.textContent = todo.text;
      chip.title = todo.text;
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTodo(todo.id);
      });
      chipContainer.appendChild(chip);
    });

    if (dayTodos.length > MAX_CHIPS_PER_CELL) {
      const more = document.createElement("div");
      more.className = "calendar-more";
      more.textContent = `+${dayTodos.length - MAX_CHIPS_PER_CELL}件`;
      chipContainer.appendChild(more);
    }

    cell.appendChild(chipContainer);

    cell.addEventListener("click", () => {
      dueInput.value = cellDateStr;
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    calendarGrid.appendChild(cell);
  }
}

function renderNoDueList() {
  const noDueTodos = todos.filter((t) => !t.due);
  noDueList.innerHTML = "";
  if (noDueTodos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "期限なしのタスクはありません";
    noDueList.appendChild(empty);
    return;
  }
  noDueTodos.forEach((todo) => noDueList.appendChild(createTodoItemElement(todo)));
}

function renderAll() {
  if (currentView === "calendar") {
    listView.hidden = true;
    calendarView.hidden = false;
    filtersGroup.hidden = true;
    clearCompletedBtn.hidden = true;
    renderCalendar();
    renderNoDueList();
  } else {
    listView.hidden = false;
    calendarView.hidden = true;
    filtersGroup.hidden = false;
    clearCompletedBtn.hidden = false;
    renderList();
  }

  const remaining = todos.filter((t) => !t.completed).length;
  itemsLeft.textContent = `${remaining} 件残り`;
}

function addTodo(textValue, priority, due) {
  const trimmed = textValue.trim();
  if (!trimmed) return;
  todos.unshift({
    id: uid(),
    text: trimmed,
    completed: false,
    priority,
    due: due || null,
    createdAt: Date.now(),
  });
  saveTodos();
  renderAll();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderAll();
  }
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  renderAll();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  renderAll();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo(input.value, prioritySelect.value, dueInput.value);
  input.value = "";
  dueInput.value = "";
  input.focus();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderAll();
  });
});

viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    viewButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    saveView();
    renderAll();
  });
});

calendarPrevBtn.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderAll();
});

calendarNextBtn.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderAll();
});

calendarTodayBtn.addEventListener("click", () => {
  calendarCursor = startOfMonth(new Date());
  renderAll();
});

viewButtons.forEach((btn) => {
  if (btn.dataset.view === currentView) btn.classList.add("active");
  else btn.classList.remove("active");
});

renderAll();
