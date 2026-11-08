// Supabase 모드에서 로그인·RLS 동작을 확인한다. 테스트 계정 정보는 .env의 TEST_A_*, TEST_B_*에서 읽는다(없으면 만든다).
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const ENV_PATH = path.join(__dirname, "..", ".env");
const PORT = 3197;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

function ensureAccounts() {
  if (!process.env.TEST_A_EMAIL) {
    const suffix = crypto.randomBytes(3).toString("hex");
    const add = [
      `TEST_A_EMAIL=todo.a.${suffix}@example.com`,
      `TEST_A_PASSWORD=${crypto.randomBytes(12).toString("base64url")}`,
      `TEST_B_EMAIL=todo.b.${suffix}@example.com`,
      `TEST_B_PASSWORD=${crypto.randomBytes(12).toString("base64url")}`,
    ].join("\n");
    fs.appendFileSync(ENV_PATH, "\n# 테스트 계정(로컬 확인용). 이 파일은 Git에 올리지 않습니다.\n" + add + "\n");
    require("dotenv").config({ path: ENV_PATH, override: true });
  }
}

async function session(email, password) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const up = await sb.auth.signUp({ email, password });
    if (up.error) throw new Error("signUp 실패: " + up.error.message);
    ({ data, error } = await sb.auth.signInWithPassword({ email, password }));
    if (error) throw new Error("로그인 실패: " + error.message);
  }
  return data.session.access_token;
}

const call = (token, method, url, body) =>
  fetch(BASE + url, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

(async () => {
  ensureAccounts();
  const tokenA = await session(process.env.TEST_A_EMAIL, process.env.TEST_A_PASSWORD);
  const tokenB = await session(process.env.TEST_B_EMAIL, process.env.TEST_B_PASSWORD);
  check("테스트 계정 A, B 로그인", !!tokenA && !!tokenB);

  const srv = spawn("node", ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(PORT) },
  });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  await new Promise((r) => setTimeout(r, 4000));
  check("서버가 Supabase 모드로 시작", log.includes("Supabase 모드"), log.trim().split("\n")[0]);

  try {
    check("토큰 없이 /api/todos → 401", (await call(null, "GET", "/api/todos")).status === 401);

    const createRes = await call(tokenA, "POST", "/api/todos", { title: "A의 비공개 할 일", deadline: "2026-12-31", tags: ["rls", "test"] });
    const created = await createRes.json();
    check("A가 할 일 추가(태그 2개)", createRes.status === 201 && created.tags.length === 2, `id=${created.id}`);

    const listA = await (await call(tokenA, "GET", "/api/todos")).json();
    check("A 목록에 A의 할 일이 보임", listA.some((t) => t.id === created.id));

    const patchA = await (await call(tokenA, "PATCH", `/api/todos/${created.id}`, { done: true })).json();
    check("A가 완료 표시 → completed_at 기록", patchA.done === true && !!patchA.completed_at);

    const listB = await (await call(tokenB, "GET", "/api/todos")).json();
    check("B 목록에 A의 할 일이 안 보임", !listB.some((t) => t.id === created.id));

    check("B가 A의 할 일 수정 시도 → 404", (await call(tokenB, "PATCH", `/api/todos/${created.id}`, { done: false })).status === 404);
    check("B가 A의 할 일 삭제 시도 → 404", (await call(tokenB, "DELETE", `/api/todos/${created.id}`)).status === 404);

    const tagsB = await (await call(tokenB, "GET", "/api/tags")).json();
    check("B 태그 목록에 A의 태그가 안 보임", !tagsB.some((t) => ["rls", "test"].includes(t.name)));

    // 서버를 거치지 않고 DB에 직접 요청해도 막히는지(RLS 자체 확인)
    const direct = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: directRows, error: directErr } = await direct.from("todos").select("id").eq("id", created.id);
    check("B가 DB에 직접 조회해도 0행(RLS)", !directErr && directRows.length === 0);

    const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: anonRows } = await anon.from("todos").select("id");
    check("로그인 없이 DB 직접 조회 → 0행", (anonRows || []).length === 0);

    check("A가 자기 할 일 삭제 → 204", (await call(tokenA, "DELETE", `/api/todos/${created.id}`)).status === 204);
    const tagsA = await (await call(tokenA, "GET", "/api/tags")).json();
    for (const t of tagsA.filter((x) => ["rls", "test"].includes(x.name))) {
      await direct.from("tags").delete().eq("id", t.id); // B 토큰이라 거절(0행)되어야 정상
    }
  } finally {
    srv.kill();
  }

  const failed = results.filter((x) => !x).length;
  console.log(failed ? `\n${failed}개 실패` : "\n모두 통과");
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("오류:", e.message);
  process.exit(2);
});
