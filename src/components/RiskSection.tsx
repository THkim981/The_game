import { HEAT_MAX } from '../constants'
import type { Resources, RiskKey, RiskTier } from '../types'
import { CollapsiblePanel } from './CollapsiblePanel'

interface RiskSectionProps {
  riskTiers: RiskTier[]
  resources: Resources
  adjustProbs: (tier: RiskTier) => RiskTier['baseProbs']
  rollOutcome: (tier: RiskTier) => void
  selectedAutoRisk: RiskKey | null
  onSelectAutoRisk: (key: RiskKey | null) => void
  collapsed: boolean
  onToggle: () => void
}

export function RiskSection({ riskTiers, resources, adjustProbs, rollOutcome, selectedAutoRisk, onSelectAutoRisk, collapsed, onToggle }: RiskSectionProps) {
  return (
    <CollapsiblePanel
      eyebrow="고위험 실험(도박)"
      title="Heat 100에서만 버튼이 깜빡입니다"
      description="낮음이 가장 안전하고, 티어가 높을수록 성공률은 내려가지만 보상은 커집니다. Luck이 높을수록 성공/대성공 확률이 조금 올라갑니다. 실패해도 Insight가 쌓입니다."
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="grid risk-grid">
        {riskTiers.map((tier) => {
          const probs = adjustProbs(tier)
          const ready = resources.heat >= HEAT_MAX && resources.chips >= tier.cost
          return (
            <div key={tier.key} className={`card risk ${ready ? 'ready' : ''}`}>
              <div className="row space">
                <div>
                  <p className="eyebrow">{tier.label}</p>
                  <h4>Gold {tier.cost} 필요</h4>
                  <p className="muted">
                    부스트 {tier.reward.successBuff.toFixed(2)}x ~ {tier.reward.jackpotBuff.toFixed(2)}x / {tier.reward.buffMinutes}분
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedAutoRisk === tier.key}
                    onChange={(e) => onSelectAutoRisk(e.target.checked ? tier.key : null)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span className="muted" style={{ fontSize: 13 }}>자동 실행</span>
                </label>
                <button disabled={!ready} onClick={() => rollOutcome(tier)}>
                  {ready ? '실험 실행' : '조건 부족'}
                </button>
              </div>
              <div className="prob-row">
                <span>대성공 {Math.round(probs.jackpot * 100)}%</span>
                <span>성공 {Math.round(probs.success * 100)}%</span>
                <span>실패 {Math.round(probs.fail * 100)}%</span>
                <span>대실패 {Math.round(probs.crash * 100)}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </CollapsiblePanel>
  )
}
