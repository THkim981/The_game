# Bolt Rush Prototype

React + TypeScript + Vite 기반의 방치형/도박 하이브리드 프로토타입입니다. 기본 수익, 안전 업그레이드, Heat/Luck/Insight, 3단계 리스크 실험 UI가 포함되어 있습니다.

## 스크립트

- 개발 서버: `npm run dev`
- 린트: `npm run lint`
- 포맷: `npm run format` / 체크만 `npm run format:check`
- 테스트: `npm run test` (Vitest + jsdom)
- 빌드: `npm run build`

## Cloudflare Pages + D1 로컬 개발

Pages Functions + D1 조합으로 로컬에서 테스트할 때는 **마이그레이션이 적용된 로컬 D1**를 `pages dev`가 그대로 보도록 해야 합니다.

- 로컬 D1 마이그레이션 적용: `npm run cf:migrate:local`
- Pages dev 실행(정적 `dist/` + Functions + D1): `npm run cf:dev`

참고:
- `npm run cf:dev`는 `--d1 DB=<local database uuid>` 형태로 바인딩합니다.
- 이 UUID는 [wrangler.toml](wrangler.toml)의 `database_id` 값과 동일하며, `DB=the-game`처럼 이름으로 바인딩하면 로컬에서 **새 DB가 생성되어 테이블이 없다고 나올 수 있습니다**.

## Render 배포 (프론트+서버 단일 도메인)

이 프로젝트는 Express가 `dist/`를 정적 서빙하도록 되어 있어서(Render에서는 Web Service 1개로) 프론트+API를 같이 배포할 수 있습니다.

- 권장: 루트의 `render.yaml`(Blueprint)로 생성
	- Render 대시보드 → **New** → **Blueprint** → 레포 연결 → **Apply**
	- SQLite는 Persistent Disk(`/var/data`)에 저장되며, DB 파일 경로는 `SQLITE_PATH=/var/data/app.sqlite` 를 사용합니다.

- 수동 생성(클릭으로 직접 설정) 시
	- Type: **Web Service (Node)**
	- Build Command: `npm ci && npm run build`
	- Start Command: `node server/index.cjs`
	- Env Vars: `NODE_ENV=production`, `SQLITE_PATH=/var/data/app.sqlite`
	- Disks: Mount Path `/var/data` (없으면 재시작/재배포 때 DB가 초기화될 수 있습니다)

## 구조
- `src/App.tsx`: 자원 루프, 업그레이드, 리스크 실험 로직 및 UI
- `src/test/setup.ts`: 테스트 환경 설정 (`@testing-library/jest-dom`)
- `vite.config.ts`: React 플러그인 + Vitest 설정

## 추후 확장 아이디어
- Insight로 메타 업그레이드 구매하는 화면 분리
- Heat/Cash 오프라인 계산 로직 정교화
- 리스크 확률/보상 테이블을 서버 혹은 JSON으로 분리해 밸런싱 편의성 확보

## 현재 밸런스 스냅샷 (프로토타입)
- 기본 수익: 10 C/s (BASE_INCOME)
- Tick 주기: 0.2s (리소스 갱신), Cash/Chips/Heat는 per-second 값을 tick에 맞춰 나눠서 적산
- Heat 충전: 기본 100/180초 ≈ 0.556 Heat/s, 배터리 레벨당 +3% (Prestige에 의해 추가 가속)
- Gold(=Chips) 생성: 기본 1G/30s ≈ 0.0333 G/s, 정제 레벨당 +10% (Prestige에 의해 추가 가속)
- 시작 자원: Cash 420, Chips 16, Heat 0, Luck 0, Insight 0, Prestige 0

- 프린터: 시작 60C, 성장 1.12, 효과 기본 수익 +10%/레벨 (가산)
- 금고 확장: 시작 200C, 성장 1.14, 효과 수익 (1+0.05*Lv) 곱
- Heat 배터리: 시작 260C, 성장 1.16, 효과 Heat 속도 +3%/레벨
- Gold 정제: 시작 200C, 성장 1.15, 효과 Gold 속도 +10%/레벨

 전환 비용(기본값, 상황에 따라 증가)
- Cash → Gold 10: 120C × M
- Cash → Heat 10: 90C × M
- 여기서 M은 현재 수익/버프 상태에 따라 계산되는 `conversionCosts.multiplier` 입니다.

### Prestige (초기 도입)
 - Prestige 자원: PTG, 시작 0
 - 보너스: 수익 배율에 `1 + 0.05 * log10(1 + Prestige)` 곱
 - Heat/Gold 생성 속도 보너스: (Heat/s, Gold/s)에 `1 + 0.02 * Prestige` 추가 곱
 - 획득량: `floor(max(0, log10(1 + (Cash + Chips*1000 + Insight*10000)) - 8) ^ 1.4)`
 - 리셋 효과: Cash/Chips/Heat/Luck/Insight/업그레이드/버프/permBoost 초기화, Prestige 누적 유지 (permLuck은 유지)

### 도박(실험) 리스크 테이블
- 공통 조건: Heat 100 & Gold(Chips) ≥ 비용. 실행 시 Heat는 0으로 리셋되고 Gold는 비용만큼 소모됩니다.
- 결과는 4종(대성공/성공/실패/대실패)이며, 별도의 “쿨다운 타이머”는 없고 Heat 충전이 사실상 쿨다운 역할을 합니다.
- 낮음(10G): 대성공 25%, 성공 60%, 실패 10%, 대실패 5% / 버프 x1.80 또는 x1.35 (10분)
- 중간(25G): 대성공 20%, 성공 57%, 실패 15%, 대실패 8% / 버프 x2.60 또는 x1.70 (10분)
- 극단(60G): (Luck=0 기준) 대성공 19%, 성공 50%, 실패 약 18.1%, 대실패 약 12.9% / 버프 x5.00 또는 x2.40 (10분) + 대성공 시 permBoost +0.02
- 초극단(150G): 대성공 18%, 성공 45%, 실패 20%, 대실패 17% / 버프 x7.50 또는 x3.20 (12분) + 대성공 시 permBoost +0.03
- Luck 보정: Luck 1당 (대성공+성공) 합이 +0.2%p 증가(최대 100%), 대성공/성공 비율은 유지됩니다. 남는 확률은 실패/대실패 비율로 분배됩니다.

### UI/UX 피드백 장치
- 숫자: AnimatedNumber로 부드럽게 보간 (0.24s), Heat 게이지 폭 트랜지션 0.18s
- 도박 결과: 토스트 2.6s 노출, 톤별(성공/경고/실패) 라디얼 FX 0.9s

### 숫자 단위 표기 규칙
- 사용 순서: K(10E3) → M(10E6) → B(10E9) → T(10E12) 이후 10Ex 형태로 표기합니다.

### 초반 진행 의도
- 약 2~3분 내 Heat 100 도달, 낮은 리스크 1~2회 시도 가능
- 시작 현금/골드 여유로 프린터/자동 수금/정제 초기 레벨을 바로 구매 가능하도록 조정
