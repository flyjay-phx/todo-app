# 길 B: Supabase(클라우드 DB)로 전환하기

코드는 이미 두 저장소를 모두 지원합니다. `.env`에 Supabase 값이 **있으면** 길 B, **비어 있으면** 길 A(로컬 SQLite)로 동작합니다.

## 1. 직접 하실 일 (계정·키)
1. https://supabase.com 에서 무료 계정과 새 프로젝트를 만듭니다.
2. **Project Settings → API**에서 `Project URL`과 **`anon public` 키**를 복사해 `.env`에 넣습니다.
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=ey...
   ```
   - `service_role` 키는 쓰지 않습니다. RLS를 우회하는 키라서 "내 것만 보인다"를 확인할 수 없습니다.
3. **SQL Editor**에 [supabase-schema.sql](supabase-schema.sql)을 통째로 붙여 넣고 Run 합니다. 표 3개와 RLS 정책이 만들어집니다.
4. **Authentication → Providers**에서 이메일 로그인을 켭니다. 이메일 확인(Confirm email)은 실습 중에는 꺼 두면 편합니다.
5. 테스트 계정 2개를 만듭니다. (앱 화면의 "가입" 버튼이나 대시보드 Users에서)

## 2. 실행
```bash
npm start
```
콘솔에 `(Supabase 모드)`가 보이면 길 B입니다. http://localhost:3100 에서 로그인 후 사용합니다.

## 3. 확인할 것
[전환-확인-기록.md](전환-확인-기록.md)의 체크리스트를 따라 하고, 결과를 한 줄씩 적습니다.
