# Bolt Rush Balance Snapshot

기준일: 2026-01-02 (코드 기준)

## 기본 수치
- 기본 수익: 10 C/s
- Tick: 0.2s (초당 5회)
- Heat 충전: 100 / 180s ≈ 0.556 Heat/s (배터리 + Prestige로 가속)
- Gold(=Chips) 생성: 1G / 30s ≈ 0.0333 G/s (정제 + Prestige로 가속)
- 시작 자원: Cash 420, Chips 16, Heat 0, Luck 0, Insight 0, Prestige 0
- Prestige: 초기 0 (PTG), 로그 기반 영구 보너스 계수로 사용
- 숫자 단위 표기: K(10E3) → M(10E6) → B(10E9) → T(10E12) 이후 10Ex 형태로 표기합니다.

## 시간/기록
- “경과 시간”은 기록 초기화 이후 플레이 시간(누적)이며, 새로고침을 해도 이어집니다.
- 랭킹 시간(1e100 도달 시간)은 마지막 프리스티지 이후 시간으로 계산됩니다.

## 안전 업그레이드
- 프린터: 60C, 성장 1.12, 효과 +10% 가산/레벨
- 금고 확장: 200C, 성장 1.14, 효과 +5%p 곱/레벨
- Heat 배터리: 260C, 성장 1.16, 효과 Heat 속도 +3%/레벨
- 골드 정제: 200C, 성장 1.15, 효과 Gold 속도 +10%/레벨

## 전환/조작
- Cash → Gold 10: 120C × M
- Cash → Heat 10: 90C × M
- M(전환 비용 배수): 현재 버프/수익 상태에 따라 증가
	- `activeBuff = max(1, buffMultiplier)`
	- `incomeBoost = max(1, printer * vault)`
	- `M = max(1, activeBuff^0.98 * incomeBoost^0.98)`

## 리스크(도박) 티어
- 공통: Heat 100 필요. 실행 시 Heat는 0으로 리셋되고 Gold(Chips)는 비용만큼 소모됩니다.
- 결과는 4종(대성공/성공/실패/대실패)이며, 별도의 타이머 쿨다운은 없습니다(Heat 충전이 쿨다운).
- Luck 변화(결과별): 대성공/성공 -35, 실패 +22, 대실패 +40 (0~100으로 클램프)

### 확률(기본, Luck=0 기준)
- 낮음(10G): 대성공 25%, 성공 60%, 실패 10%, 대실패 5%
- 중간(25G): 대성공 20%, 성공 57%, 실패 15%, 대실패 8%
- 극단(60G): 대성공 19%, 성공 50%, 실패 약 18.1%, 대실패 약 12.9%
- 초극단(150G): 대성공 18%, 성공 45%, 실패 20%, 대실패 17%

### Luck 보정(코드)
- Luck 1당 (대성공+성공) 합이 +0.2%p 증가(최대 100%)
- 대성공/성공 비율은 유지되며, 남는 확률은 실패/대실패 비율로 분배됩니다.

### 보상(코드)
- 버프: 대성공=jackpotBuff, 성공=successBuff
	- 버프는 시간 제한 없이 지속됩니다.
	- 성공/대성공으로 얻는 부스트는 지속적으로 중첩됩니다(곱연산).
	- 프리스티지/기록 초기화 시 버프는 초기화됩니다.
- Insight 획득: `tier.cost * insightFactor[outcome]`
- permBoost: 극단/초극단에서 대성공 시 각각 +0.02 / +0.03

## 버프/수익 계산 메모
- 총 배율(base): 프린터 * 금고 * (1+permBoost) * 버프곱 * Insight 보너스 * Prestige 보너스
- Insight 보너스: 1 + 0.12 * log10(1 + Insight)
- Prestige 보너스: 1 + 0.05 * log10(1 + Prestige)
- Heat/Gold 속도 보너스: (1 + 0.02 * Prestige) 추가 곱

## 프리스티지
- 획득 조건: 수동 수행. 계산식으로 예상 획득량이 0보다 커야 가능.
- 획득량: `floor(max(0, log10(1 + (Cash + Chips*1000 + Insight*10000)) - 8) ^ 1.4)`
- 효과: Prestige 보너스(소득 곱) = `1 + 0.05 * log10(1 + Prestige)`
- 추가 효과(속도): Heat/s 및 Gold/s에 `1 + 0.02 * Prestige`를 추가로 곱합니다.
- 리셋 시 초기화: Cash/Chips/Heat/Luck/Insight/업그레이드/버프/permBoost 초기화, Prestige는 누적 (permLuck은 유지)
