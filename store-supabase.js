// 길 B: Supabase(클라우드 PostgreSQL)를 쓰는 데이터 계층.
// 로그인한 사용자의 토큰으로 접근하므로 RLS 정책이 그대로 적용된다(service_role 키는 쓰지 않는다).
const { createClient } = require("@supabase/supabase-js");

function anonClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyToken(token) {
  const { data, error } = await anonClient().auth.getUser(token);
  return error ? null : data.user;
}

function storeFor(token) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fail = (error) => {
    throw Object.assign(new Error(error.message), { status: 500 });
  };

  const shape = (row) => ({
    id: row.id,
    title: row.title,
    done: row.done,
    deadline: row.deadline,
    created_at: row.created_at,
    completed_at: row.completed_at,
    tags: (row.todo_tags || []).map((tt) => tt.tags).filter(Boolean),
  });

  const SELECT = "*, todo_tags(tags(id, name))";

  return {
    async listTodos({ tag, done } = {}) {
      const { data, error } = await sb
        .from("todos")
        .select(SELECT)
        .order("deadline", { ascending: true, nullsFirst: false })
        .order("id", { ascending: false });
      if (error) fail(error);
      let todos = data.map(shape);
      if (tag) todos = todos.filter((t) => t.tags.some((x) => x.name === tag));
      if (done === "0" || done === "1") todos = todos.filter((t) => t.done === (done === "1"));
      return todos;
    },

    async createTodo({ title, deadline, tags }) {
      const { data: todo, error } = await sb
        .from("todos")
        .insert({ title, deadline: deadline || null })
        .select("id")
        .single();
      if (error) fail(error);

      if (Array.isArray(tags)) {
        for (const rawName of tags) {
          const name = String(rawName).trim();
          if (!name) continue;
          let { data: tagRow, error: findErr } = await sb.from("tags").select("id").eq("name", name).maybeSingle();
          if (findErr) fail(findErr);
          if (!tagRow) {
            const ins = await sb.from("tags").insert({ name }).select("id").single();
            if (ins.error) fail(ins.error);
            tagRow = ins.data;
          }
          const link = await sb
            .from("todo_tags")
            .upsert({ todo_id: todo.id, tag_id: tagRow.id }, { onConflict: "todo_id,tag_id", ignoreDuplicates: true });
          if (link.error) fail(link.error);
        }
      }
      const { data, error: getErr } = await sb.from("todos").select(SELECT).eq("id", todo.id).single();
      if (getErr) fail(getErr);
      return shape(data);
    },

    async updateTodo(id, { title, done, deadline }) {
      const { data: existing, error: getErr } = await sb.from("todos").select("*").eq("id", id).maybeSingle();
      if (getErr) fail(getErr);
      if (!existing) return null;

      const next = {
        title: title !== undefined ? title : existing.title,
        done: done !== undefined ? !!done : existing.done,
        deadline: deadline !== undefined ? deadline : existing.deadline,
      };
      next.completed_at =
        next.done === existing.done ? existing.completed_at : next.done ? new Date().toISOString() : null;

      const { data, error } = await sb.from("todos").update(next).eq("id", id).select(SELECT);
      if (error) fail(error);
      return data.length ? shape(data[0]) : null;
    },

    async deleteTodo(id) {
      const { data, error } = await sb.from("todos").delete().eq("id", id).select("id");
      if (error) fail(error);
      return data.length > 0;
    },

    async listTags() {
      const { data, error } = await sb.from("tags").select("id, name").order("name");
      if (error) fail(error);
      return data;
    },
  };
}

module.exports = { storeFor, verifyToken };
