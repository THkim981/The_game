## Plan: 익명 UUID 점수/랭킹 추가

익명 UUID를 localStorage에 생성/보관하고, 게임 완료 시 점수를 서버에 POST해 저장·갱신하며, 서버에서 TOP N 랭킹을 받아와 표시하는 흐름을 만든다. 프론트는 Vite+React로 UUID 생성·API 연동·랭킹 UI를 추가하고, 서버는 Express+SQLite로 `/score`, `/ranking` REST를 구현한다.

### Steps
1) UUID 보관 유틸: localStorage에 익명 `userId` 생성/조회 헬퍼를 새 파일로 만들고 App 진입에서 사용해 `GameApp`에 주입.
2) API 클라이언트 확장: `apiFetch`/`profileStorage`에 `userId` 전달을 붙이고 `postScore(userId, score)`, `getRanking(limit)` fetch 함수 추가.
3) 점수 전송 트리거: 마지막 프리스티지 이후 1e100 도달 시간을 측정/확정하는 지점(useGameLogic → `saveRankTime`)에서 `postScore(userId, secondsTo1e100)` 호출.
4) 랭킹 UI: RankPromptModal 안에서 `getRanking` 결과 TOP N 리스트 표시 (시간은 낮을수록 상위).
5) 서버 라우트: Express에 `/score` POST, `/ranking` GET 추가. 최고 점수만 갱신.
6) DB 스키마: `users(user_id TEXT PK, best_score INTEGER, updated_at TIMESTAMP)` 초기화와 UPSERT/SELECT TOP N 쿼리.

### Decisions Needed
- 점수 정의(확정): 마지막 프리스티지 이후 1e100까지 걸린 시간(초)만 우선 저장/랭킹.
- TOP N 크기: 기본 10? 정해지면 클라이언트/쿼리 모두 맞춤.
- 랭킹 UI 위치(확정): RankPromptModal 안에서 랭킹을 보여주고, Settings 탭에는 “랭킹 보기” 버튼을 추가해 RankPromptModal(또는 랭킹 모달)을 열기.
