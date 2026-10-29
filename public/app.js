const API = "/api/todos";

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const addForm = document.getElementById("addForm");
const titleInput = document.getElementById("titleInput");
const deadlineInput = document.getElementById("deadlineInput");
const tagsInput = document.getElementById("tagsInput");
const tagFilter = document.getElementById("tagFilter");
const hideDone = document.getElementById("hideDone");

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function loadTags() {
  const tags = await fetch("/api/tags").then((r) => r.json());
  const current = tagFilter.value;
  tagFilter.innerHTML = '<option value="">전체</option>';
  for (const t of tags) {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.name;
    tagFilter.appendChild(opt);
  }
  tagFilter.value = current;
}

async function loadTodos() {
  const params = new URLSearchParams();
  if (tagFilter.value) params.set("tag", tagFilter.value);
  const todos = await fetch(`${API}?${params.toString()}`).then((r) => r.json());
  render(hideDone.checked ? todos.filter((t) => !t.done) : todos);
}

function render(todos) {
  listEl.innerHTML = "";
  emptyEl.hidden = todos.length > 0;
  const today = todayStr();

  for (const todo of todos) {
    const li = document.createElement("li");
    li.className = "item" + (todo.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleDone(todo.id, checkbox.checked));

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = todo.title;

    li.appendChild(checkbox);
    li.appendChild(title);

    if (todo.deadline) {
      const d = document.createElement("span");
      d.className = "deadline" + (!todo.done && todo.deadline < today ? " overdue" : "");
      d.textContent = todo.deadline;
      li.appendChild(d);
    }

    for (const tag of todo.tags) {
      const t = document.createElement("span");
      t.className = "tag";
      t.textContent = "#" + tag.name;
      li.appendChild(t);
    }

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.title = "삭제";
    del.addEventListener("click", () => removeTodo(todo.id));
    li.appendChild(del);

    listEl.appendChild(li);
  }
}

async function toggleDone(id, done) {
  await fetch(`${API}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  loadTodos();
}

async function removeTodo(id) {
  await fetch(`${API}/${id}`, { method: "DELETE" });
  await loadTags();
  loadTodos();
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  const tags = tagsInput.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, deadline: deadlineInput.value || null, tags }),
  });

  titleInput.value = "";
  deadlineInput.value = "";
  tagsInput.value = "";
  titleInput.focus();
  await loadTags();
  loadTodos();
});

tagFilter.addEventListener("change", loadTodos);
hideDone.addEventListener("change", loadTodos);

loadTags().then(loadTodos);
