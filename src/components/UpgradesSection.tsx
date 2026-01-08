import type { Resources, Upgrade, UpgradeKey } from '../types'
import { formatNumber as defaultFormatNumber } from '../utils/number'
import { CollapsiblePanel } from './CollapsiblePanel'

interface UpgradesSectionProps {
  upgrades: Upgrade[]
  upgradeHelp: Record<UpgradeKey, string>
  levels: Record<UpgradeKey, number>
  resources: Resources
  openHelp: UpgradeKey | null
  setOpenHelp: (key: UpgradeKey | null) => void
  handlePurchase: (key: UpgradeKey) => void
  handlePurchaseBulk: (key: UpgradeKey, quantity: number) => void
  autoBuyByButton: Record<UpgradeKey, { single: boolean; bulk: boolean }>
  setAutoBuyEnabled: (key: UpgradeKey, type: 'single' | 'bulk', enabled: boolean) => void
  performPrestige: () => void
  prestigeGain: number
  permLuck: number
  permLuckCap: number
  nextPermLuckCost: number
  buyPermanentLuck: () => void
  totalLuck: number
  collapsed: boolean
  onToggle: () => void
  formatNumber?: (value: number) => string
}

export function UpgradesSection({
  upgrades,
  upgradeHelp,
  levels,
  resources,
  openHelp,
  setOpenHelp,
  handlePurchase,
  handlePurchaseBulk,
  autoBuyByButton,
  setAutoBuyEnabled,
  performPrestige,
  prestigeGain,
  permLuck,
  permLuckCap,
  nextPermLuckCost,
  buyPermanentLuck,
  totalLuck,
  collapsed,
  onToggle,
  formatNumber = defaultFormatNumber,
}: UpgradesSectionProps) {
  const actions = (
    <>
      <button className="ghost pill" disabled={prestigeGain <= 0} onClick={performPrestige}>
        {prestigeGain <= 0 ? '프리스티지 불가' : `프리스티지 (+${formatNumber(prestigeGain)})`}
      </button>
      <button
        className="ghost pill"
        disabled={permLuck >= permLuckCap || resources.prestige < nextPermLuckCost}
        onClick={buyPermanentLuck}
      >
        {permLuck >= permLuckCap
          ? '영구 Luck 최대'
          : `영구 Luck +1 (-${formatNumber(nextPermLuckCost)} PTG)`}
      </button>
    </>
  )

  return (
    <CollapsiblePanel eyebrow="안전 업그레이드" title="스트레스 없는 성장 축" collapsed={collapsed} onToggle={onToggle} actions={actions}>
      <div className="grid upgrades">
        <div className="card">
          <div className="row space">
            <div>
              <p className="eyebrow">영구 Luck</p>
              <h4>Prestige로 운 올리기</h4>
              <p className="muted">총 Luck {totalLuck.toFixed(0)} / 100 · 영구 {permLuck}/{permLuckCap}</p>
            </div>
            <div className="upgrade-actions">
              <button
                className="ghost"
                disabled={permLuck >= permLuckCap || resources.prestige < nextPermLuckCost}
                onClick={buyPermanentLuck}
              >
                {permLuck >= permLuckCap
                  ? 'MAX'
                  : `+1 Luck (${formatNumber(nextPermLuckCost)} PTG)`}
              </button>
            </div>
          </div>
        </div>
        {upgrades.map((upgrade) => {
          const level = levels[upgrade.key] ?? 0
          const cost = upgrade.baseCost * Math.pow(upgrade.growth, level)
          const locked = upgrade.maxLevel ? level >= upgrade.maxLevel : false
          const bulkCount = locked ? 0 : upgrade.maxLevel ? Math.max(0, Math.min(10, upgrade.maxLevel - level)) : 10
          let bulkCost = 0
          for (let i = 0; i < bulkCount; i += 1) {
            bulkCost += upgrade.baseCost * Math.pow(upgrade.growth, level + i)
          }

          return (
            <div key={upgrade.key} className="card">
              <div className="row space">
                <div>
                  <p className="eyebrow">Lv.{level}</p>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{upgrade.name}</span>
                    <button
                      type="button"
                      className="term-help"
                      onClick={() => setOpenHelp(openHelp === upgrade.key ? null : upgrade.key)}
                      aria-label={`${upgrade.name} 도움말`}
                      aria-expanded={openHelp === upgrade.key}
                      aria-controls={`upgrade-help-${upgrade.key}`}
                    >
                      !
                    </button>
                  </h4>
                  <p className="muted">{upgrade.description}</p>
                </div>
                <div className="upgrade-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={autoBuyByButton[upgrade.key]?.single ?? false}
                        onChange={(e) => setAutoBuyEnabled(upgrade.key, 'single', e.target.checked)}
                        disabled={locked}
                        style={{ width: 14, height: 14, cursor: locked ? 'not-allowed' : 'pointer' }}
                      />
                      <span className="muted" style={{ fontSize: 12 }}>
                        자동
                      </span>
                    </label>
                    <button
                      className="ghost"
                      disabled={resources.cash < cost || locked}
                      onClick={() => handlePurchase(upgrade.key)}
                    >
                      {locked ? 'MAX' : `구매 ${formatNumber(cost)} C`}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={autoBuyByButton[upgrade.key]?.bulk ?? false}
                        onChange={(e) => setAutoBuyEnabled(upgrade.key, 'bulk', e.target.checked)}
                        disabled={bulkCount === 0}
                        style={{ width: 14, height: 14, cursor: bulkCount === 0 ? 'not-allowed' : 'pointer' }}
                      />
                      <span className="muted" style={{ fontSize: 12 }}>
                        자동
                      </span>
                    </label>
                    <button
                      className="ghost"
                      disabled={bulkCount === 0 || resources.cash < bulkCost}
                      onClick={() => handlePurchaseBulk(upgrade.key, 10)}
                    >
                      {bulkCount === 0 ? 'MAX' : `10개 구매 ${formatNumber(bulkCost)} C`}
                    </button>
                  </div>
                </div>
              </div>
              {openHelp === upgrade.key && (
                <div className="help" id={`upgrade-help-${upgrade.key}`}>
                  <p>{upgradeHelp[upgrade.key]}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </CollapsiblePanel>
  )
}
