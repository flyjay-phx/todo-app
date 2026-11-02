# Todo 앱

## 개요
할 일을 추가·완료·조회하는 1인용 앱 (Express + 내장 node:sqlite). 화면은 http://localhost:3100.

## 명령
- 서버 실행: npm start
- 목록: node todo.js list
- 추가: node todo.js add "<내용>"
- 완료: node todo.js done <번호>
- 오늘 완료 요약: node todo.js summary

## 규칙
- 데이터는 todo.db(SQLite)에 저장한다. DB 접근은 db.js를 통해서만 한다.
- 사용자에게는 한국어 존댓말로 답한다.

## 하지 말 것
- todo.db(실데이터)를 직접 지우거나 덮어쓰지 말 것.
- .env의 값을 출력하거나 커밋하지 말 것.
