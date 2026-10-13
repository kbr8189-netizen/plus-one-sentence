# 한 문장 더하기 실습 웹앱

신세계백화점 판매역량 향상 교육의 실습용 웹앱입니다. 참가자가 로그인 없이 휴대폰으로 입력하면 강사 보드에 몇 초 안에 모입니다.

- 참가자: `/` — 만들기 · 다른 매장 화법(동료 카드 훔쳐가기) · 내일 해봄
- 강사 보드: `/admin` — 비밀번호 로그인 후 모아보기 · 내일 해봄, 4초마다 자동 갱신, "보드 비우기"

## 구성

- 화면: `public/participant.html`, `public/board.html` (단일 HTML, `next.config.ts`에서 `/`, `/admin`으로 연결)
- API: Next.js 라우트 (`app/api/*`)
- 저장: **Upstash Redis**(Vercel Storage에서 연결, `KV_REST_API_URL`·`KV_REST_API_TOKEN` 자동 설정)
  - `hp:entries`, `hp:pledges` 해시(문서 id → JSON), `hp:steals` 해시(entryId → 횟수)
- Redis 환경 변수가 없으면 Vercel Blob을 씁니다. 문서 1개 = 파일 1개
  - `hp/entries/<id>.json`, `hp/steals/<entryId>/<uuid>.json`, `hp/pledges/<id>.json`
  - `hp/version.json`은 쓰기마다 갱신되어, 바뀐 것이 없으면 목록을 다시 읽지 않습니다.

## 환경 변수 (Vercel 프로젝트 설정)

| 이름 | 설명 |
| --- | --- |
| `ADMIN_PASSWORD` | 강사 보드 비밀번호 |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis를 프로젝트에 연결하면 자동 설정 |
| `BLOB_READ_WRITE_TOKEN` | (Redis 대신 Blob을 쓸 때) Blob 스토어 연결 시 자동 설정 |

## 로컬 실행

```bash
npm install
ADMIN_PASSWORD=test npm run dev   # Redis·Blob 설정이 없으면 .data/ 폴더에 저장
```

## 교육 전 점검

- 로그인하지 않은 휴대폰 2~3대로 동시에 제출해서 강사 보드에 바로 뜨는지 확인
- 강의장 와이파이에서 접속 확인
- 회차 시작 전 "보드 비우기"로 초기화
