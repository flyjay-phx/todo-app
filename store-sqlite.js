// 길 A: 내 컴퓨터의 todo.db(SQLite)를 쓰는 데이터 계층
const db = require("./db");

function attachTags(todos) {
  const tagRows = db
    .prepare(
      `SELECT tt.todo_id, t.id, t.name
       FROM todo_tags tt JOIN tags t ON t.id = tt.tag_id`
    )
    .all();
  const byTodo = new Map();
  for (const row of tagRows) {
    if (!byTodo.has(row.todo_id)) byTodo.set(row.todo_id, []);
    byTodo.get(row.todo_id).push({ id: row.id, name: row.name });
  }
  return todos.map((t) => ({ ...t, done: !!t.done, tags: byTodo.get(t.id) || [] }));
}

async function listTodos({ tag, done } = {}) {
  let todos = db.prepare("SELECT * FROM todos ORDER BY (deadline IS NULL), deadline, id DESC").all();
  todos = attachTags(todos);
  if (tag) todos = todos.filter((t) => t.tags.some((x) => x.name === tag));
  if (done === "0" || done === "1") todos = todos.filter((t) => t.done === (done === "1"));
  return todos;
}

async function createTodo({ title, deadline, tags }) {
  const info = db.prepare("INSERT INTO todos (title, deadline) VALUES (?, ?)").run(title, deadline || null);
  const todoId = info.lastInsertRowid;

  if (Array.isArray(tags)) {
    const findTag = db.prepare("SELECT id FROM tags WHERE name = ?");
    const insertTag = db.prepare("INSERT INTO tags (name) VALUES (?)");
    const link = db.prepare("INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)");
    for (const rawName of tags) {
      const name = String(rawName).trim();
      if (!name) continue;
      let row = findTag.get(name);
      if (!row) {
        const r = insertTag.run(name);
        row = { id: r.lastInsertRowid };
      }
      link.run(todoId, row.id);
    }
  }
  return attachTags([db.prepare("SELECT * FROM todos WHERE id = ?").get(todoId)])[0];
}

async function updateTodo(id, { title, done, deadline }) {
  const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
  if (!existing) return null;
  const next = {
    title: title !== undefined ? title : existing.title,
    done: done !== undefined ? (done ? 1 : 0) : existing.done,
    deadline: deadline !== undefined ? deadline : existing.deadline,
  };
  const completedAt =
    next.done === existing.done
      ? existing.completed_at
      : next.done
        ? new Date().toLocaleString("sv-SE")
        : null;
  db.prepare("UPDATE todos SET title = ?, done = ?, deadline = ?, completed_at = ? WHERE id = ?").run(
    next.title,
    next.done,
    next.deadline,
    completedAt,
    id
  );
  return attachTags([db.prepare("SELECT * FROM todos WHERE id = ?").get(id)])[0];
}

async function deleteTodo(id) {
  return db.prepare("DELETE FROM todos WHERE id = ?").run(id).changes > 0;
}

async function listTags() {
  return db.prepare("SELECT * FROM tags ORDER BY name").all();
}

module.exports = { listTodos, createTodo, updateTodo, deleteTodo, listTags };
