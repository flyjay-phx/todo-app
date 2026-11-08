require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const SUPABASE_MODE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
const supabase = SUPABASE_MODE ? require("./store-supabase") : null;
const sqliteStore = SUPABASE_MODE ? null : require("./store-sqlite");

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 화면이 어느 저장소 모드인지 알 수 있게 한다. anon 키는 공개해도 되는 키다(RLS가 막는다).
app.get("/api/config", (req, res) => {
  res.json(
    SUPABASE_MODE
      ? { mode: "supabase", supabaseUrl: process.env.SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY }
      : { mode: "sqlite" }
  );
});

// Supabase 모드에서는 로그인한 사용자만 쓸 수 있다.
app.use("/api", async (req, res, next) => {
  if (!SUPABASE_MODE) {
    req.store = sqliteStore;
    return next();
  }
  const token = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !(await supabase.verifyToken(token))) {
    return res.status(401).json({ error: "로그인이 필요합니다." });
  }
  req.store = supabase.storeFor(token);
  next();
});

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

// GET /api/todos?tag=공부&done=0
app.get(
  "/api/todos",
  handle(async (req, res) => {
    res.json(await req.store.listTodos({ tag: req.query.tag, done: req.query.done }));
  })
);

// POST /api/todos  { title, deadline?, tags?: string[] }
app.post(
  "/api/todos",
  handle(async (req, res) => {
    const { title, deadline, tags } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "title은 비어 있을 수 없습니다." });
    }
    res.status(201).json(await req.store.createTodo({ title: title.trim(), deadline, tags }));
  })
);

// PATCH /api/todos/:id  { title?, done?, deadline? }
app.patch(
  "/api/todos/:id",
  handle(async (req, res) => {
    const todo = await req.store.updateTodo(Number(req.params.id), req.body || {});
    if (!todo) return res.status(404).json({ error: "해당 할 일이 없습니다." });
    res.json(todo);
  })
);

// DELETE /api/todos/:id
app.delete(
  "/api/todos/:id",
  handle(async (req, res) => {
    const deleted = await req.store.deleteTodo(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: "해당 할 일이 없습니다." });
    res.status(204).end();
  })
);

// GET /api/tags
app.get(
  "/api/tags",
  handle(async (req, res) => {
    res.json(await req.store.listTags());
  })
);

app.listen(PORT, () => {
  console.log(`Todo 서버 실행 중: http://localhost:${PORT} (${SUPABASE_MODE ? "Supabase" : "SQLite"} 모드)`);
});
