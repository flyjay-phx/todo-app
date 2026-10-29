# 길 B: Supabase(클라우드 DB)로 전환하기 — 준비물과 순서

Supabase는 가입이 필요한 외부 서비스라서, 계정 생성과 로그인은 직접 하셔야 합니다.
아래 순서대로 하시면 제가 이어서 코드를 바꿔 드릴 수 있습니다.

## 1. 직접 하실 일 (계정·키 발급)
1. https://supabase.com 에서 무료 계정을 만듭니다.
2. 새 프로젝트를 만듭니다 (리전은 가까운 곳, 예: Northeast Asia).
3. 프로젝트의 **Project Settings → API**에서 아래 두 값을 복사합니다.
   - `Project URL`
   - `service_role` 키 (⚠️ `anon` 키가 아니라 **service_role**. 이 키는 백엔드에서만 쓰고 절대 화면 코드나 Git에 올리지 않습니다.)
4. 이 폴더의 `.env.example`을 복사해 `.env`로 만들고, 위 두 값을 채웁니다.
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=ey...
   ```
5. Supabase 대시보드의 **SQL Editor**에서 `todo.db`와 같은 구조로 표를 만듭니다. (이 저장소의 `DB-구조.md` 참고)
6. **Authentication → Providers**에서 이메일 로그인을 켜고, 테스트 계정 2개를 만듭니다 (서로 다른 계정의 할 일이 안 보이는지 확인할 때 씁니다).

## 2. 제가 코드를 바꿀 부분 (준비물이 갖춰지면 요청하세요)
- `@supabase/supabase-js`를 **백엔드(server.js)에서만** 사용하도록 추가. 화면(프론트)은 지금처럼 `/api/...`에만 요청하고, Supabase 키는 여전히 화면에 노출되지 않습니다.
- `db.js`를 Supabase 클라이언트 호출로 교체 (SQL 쿼리 → Supabase 테이블 API 또는 RPC).
- Supabase Auth로 로그인을 붙이고, `todos` 표에 `user_id` 칸을 추가해 할 일마다 주인을 기록.
- RLS(행 수준 보안) 정책을 켜서, 로그인한 사용자가 **자기 할 일만** 조회·추가·수정·삭제할 수 있게 설정.
- 전환 후 확인할 것 (레슨이 요구하는 항목)
  - Supabase Table Editor에서 `todos` 표에 행이 쌓이는지
  - 서로 다른 계정으로 로그인해 다른 계정의 할 일이 안 보이는지, 수정·삭제도 거절되는지
  - 배포(Render 등)에 필요한 준비물(코드 저장 위치, 환경변수, 시작 명령)을 정리해서 노트에 남기기

## 지금 상태
- 길 A(로컬 SQLite)는 완성되어 있고, 추가·새로고침·서버 재시작·완료·삭제까지 모두 확인했습니다.
- 길 B는 계정 생성 전이라 코드 전환을 시작하지 않았습니다. 1번을 마치시면 알려 주세요.
