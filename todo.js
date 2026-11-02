const db = require("./db");

const [cmd, ...args] = process.argv.slice(2);

function now() {
  return new Date().toLocaleString("sv-SE");
}

function list() {
  const rows = db
    .prepare("SELECT id, title, done, deadline FROM todos ORDER BY done, (deadline IS NULL), deadline, id")
    .all();
  if (rows.length === 0) return console.log("할 일이 없습니다.");
  for (const r of rows) {
    const due = r.deadline ? ` (마감 ${r.deadline})` : "";
    console.log(`[${r.done ? "x" : " "}] ${r.id}. ${r.title}${due}`);
  }
}

function add() {
  const title = args.join(" ").trim();
  if (!title) return fail('사용법: node todo.js add "<내용>"');
  const info = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title);
  console.log(`추가됨: ${info.lastInsertRowid}. ${title}`);
}

function done() {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) return fail("사용법: node todo.js done <번호>");
  const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
  if (!todo) return fail(`${id}번 할 일이 없습니다.`);
  if (todo.done) return console.log(`이미 완료됨: ${id}. ${todo.title}`);
  db.prepare("UPDATE todos SET done = 1, completed_at = ? WHERE id = ?").run(now(), id);
  console.log(`완료: ${id}. ${todo.title}`);
}

function summary() {
  const today = now().slice(0, 10);
  const rows = db
    .prepare("SELECT id, title FROM todos WHERE done = 1 AND substr(completed_at, 1, 10) = ? ORDER BY completed_at")
    .all(today);
  console.log(`오늘(${today}) 완료한 할 일: ${rows.length}건`);
  for (const r of rows) console.log(`- ${r.title}`);
}

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

const commands = { list, add, done, summary };
if (commands[cmd]) commands[cmd]();
else fail("사용법: node todo.js <list|add|done|summary>");
