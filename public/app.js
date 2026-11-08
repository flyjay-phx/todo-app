const API = "/api/todos";

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const addForm = document.getElementById("addForm");
const titleInput = document.getElementById("titleInput");
const deadlineInput = document.getElementById("deadlineInput");
const tagsInput = document.getElementById("tagsInput");
const tagFilter = document.getElementById("tagFilter");
const hideDone = document.getElementById("hideDone");
const subEl = document.getElementById("sub");
const appEl = document.getElementById("app");
const authEl = document.getElementById("auth");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const authMsg = document.getElementById("authMsg");
const userBar = document.getElementById("userBar");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

let sbClient = null;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (sbClient) {
    const { data } = await sbClient.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && sbClient) showLogin();
  return res;
}

async function loadTags() {
  const res = await api("/api/tags");
  if (!res.ok) return;
  const tags = await res.json();
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
  const res = await api(`${API}?${params.toString()}`);
  if (!res.ok) return;
  const todos = await res.json();
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
  await api(`${API}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  loadTodos();
}

async function removeTodo(id) {
  await api(`${API}/${id}`, { method: "DELETE" });
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

  await api(API, {
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

function showLogin() {
  authEl.hidden = false;
  appEl.hidden = true;
  userBar.hidden = true;
}

async function showApp(session) {
  authEl.hidden = true;
  appEl.hidden = false;
  userBar.hidden = false;
  userEmail.textContent = session.user.email;
  await loadTags();
  loadTodos();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("스크립트를 불러오지 못했습니다."));
    document.head.appendChild(s);
  });
}

async function startSupabase(config) {
  await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js");
  sbClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  subEl.textContent = "마감일 · 태그 달린 할 일 목록 (Supabase 클라우드에 저장, 로그인한 사람만 자기 것을 봅니다)";

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authMsg.textContent = "";
    const { data, error } = await sbClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
    if (error) {
      authMsg.textContent = "로그인 실패: " + error.message;
      return;
    }
    passwordInput.value = "";
    showApp(data.session);
  });

  signupBtn.addEventListener("click", async () => {
    authMsg.textContent = "";
    const { data, error } = await sbClient.auth.signUp({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
    if (error) {
      authMsg.textContent = "가입 실패: " + error.message;
      return;
    }
    if (data.session) {
      passwordInput.value = "";
      showApp(data.session);
    } else {
      authMsg.textContent = "가입 완료. 이메일 확인이 켜져 있다면 메일을 확인한 뒤 로그인하세요.";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await sbClient.auth.signOut();
    showLogin();
  });

  const { data } = await sbClient.auth.getSession();
  if (data.session) showApp(data.session);
  else showLogin();
}

async function init() {
  const config = await fetch("/api/config").then((r) => r.json());
  if (config.mode === "supabase") {
    await startSupabase(config);
  } else {
    await loadTags();
    loadTodos();
  }
}

init();
