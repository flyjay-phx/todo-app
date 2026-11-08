-- Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 Run 하세요.
-- 표 3개 + 행 수준 보안(RLS): 로그인한 사용자는 자기 데이터만 보고 고칠 수 있습니다.

create table if not exists public.todos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  deadline date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.tags (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

create table if not exists public.todo_tags (
  todo_id bigint not null references public.todos(id) on delete cascade,
  tag_id bigint not null references public.tags(id) on delete cascade,
  primary key (todo_id, tag_id)
);

create index if not exists idx_todos_user_deadline on public.todos(user_id, deadline);

alter table public.todos enable row level security;
alter table public.tags enable row level security;
alter table public.todo_tags enable row level security;

create policy "todos: owner only" on public.todos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tags: owner only" on public.tags
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "todo_tags: owner of the todo" on public.todo_tags
  for all to authenticated
  using (exists (select 1 from public.todos t where t.id = todo_id and t.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.todos t where t.id = todo_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g where g.id = tag_id and g.user_id = (select auth.uid()))
  );
