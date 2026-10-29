require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 할 일 하나에 태그 배열을 붙여서 돌려준다
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

// GET /api/todos?tag=공부&done=0
app.get("/api/todos", (req, res) => {
  const { tag, done } = req.query;
  let todos = db.prepare("SELECT * FROM todos ORDER BY (deadline IS NULL), deadline, id DESC").all();
  todos = attachTags(todos);
  if (tag) todos = todos.filter((t) => t.tags.some((x) => x.name === tag));
  if (done === "0" || done === "1") todos = todos.filter((t) => t.done === (done === "1"));
  res.json(todos);
});

// POST /api/todos  { title, deadline?, tags?: string[] }
app.post("/api/todos", (req, res) => {
  const { title, deadline, tags } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title은 비어 있을 수 없습니다." });
  }
  const insert = db.prepare("INSERT INTO todos (title, deadline) VALUES (?, ?)");
  const info = insert.run(title.trim(), deadline || null);
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

  const todo = attachTags([db.prepare("SELECT * FROM todos WHERE id = ?").get(todoId)])[0];
  res.status(201).json(todo);
});

// PATCH /api/todos/:id  { title?, done?, deadline? }
app.patch("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "해당 할 일이 없습니다." });

  const { title, done, deadline } = req.body || {};
  const next = {
    title: title !== undefined ? title : existing.title,
    done: done !== undefined ? (done ? 1 : 0) : existing.done,
    deadline: deadline !== undefined ? deadline : existing.deadline,
  };
  db.prepare("UPDATE todos SET title = ?, done = ?, deadline = ? WHERE id = ?").run(
    next.title,
    next.done,
    next.deadline,
    id
  );
  const todo = attachTags([db.prepare("SELECT * FROM todos WHERE id = ?").get(id)])[0];
  res.json(todo);
});

// DELETE /api/todos/:id
app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "해당 할 일이 없습니다." });
  res.status(204).end();
});

// GET /api/tags
app.get("/api/tags", (req, res) => {
  res.json(db.prepare("SELECT * FROM tags ORDER BY name").all());
});

app.listen(PORT, () => {
  console.log(`Todo 서버 실행 중: http://localhost:${PORT}`);
});
