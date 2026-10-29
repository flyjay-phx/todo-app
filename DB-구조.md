# DB 구조 (SQLite, todo.db)

오늘 배운 표·관계로 설계했습니다.

## todos (할 일) — 기본 표
| 열 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK | 고유 번호 (키) |
| title | TEXT | 할 일 제목 |
| done | INTEGER(0/1) | 완료 여부 |
| deadline | TEXT(YYYY-MM-DD, nullable) | 마감일 — 내가 넣은 기능 |
| created_at | TEXT | 생성 시각 |

## tags (태그) — 기본 표
| 열 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK | 고유 번호 |
| name | TEXT UNIQUE | 태그 이름 (예: 공부, 집안일) |

## todo_tags (연결 표) — N:M
할 일 하나에 태그 여러 개, 태그 하나에 할 일 여러 개 → 중간 연결 표로 푼다.

| 열 | 타입 | 설명 |
|---|---|---|
| todo_id | INTEGER FK → todos.id | |
| tag_id | INTEGER FK → tags.id | |

```
todos ──┬──< todo_tags >──┬── tags
   (1)       (N:M 연결표)      (1)
```

## API (엔드포인트)
| 메서드 | 주소 | 동작(CRUD) |
|---|---|---|
| GET | /api/todos | 목록 읽기 (태그·완료여부로 필터 가능) |
| POST | /api/todos | 새 할 일 추가 |
| PATCH | /api/todos/:id | 완료 표시·내용 수정 |
| DELETE | /api/todos/:id | 삭제 |
| GET | /api/tags | 태그 목록 |
| POST | /api/tags | 태그 추가 |
