import type { Resources, Upgrade, UpgradeKey } from '../types'
import { formatNumber as defaultFormatNumber } from '../utils/number'
import type { HoveredButton } from '../hooks/useAutoBuy'
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
  autoBuyEnabled: boolean
  setAutoBuyEnabled: (value: boolean) => void
  setHoveredButton: (hover: HoveredButton) => void
  performPrestige: () => void
  prestigeGain: number
  permLuck: number
  permLuckCap: number
  nextPermLuckCost: number
  buyPermanentLuck: () => void
  totalLuck: number
  devMode: boolean
  onToggleDevMode: () => void
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
  autoBuyEnabled,
  setAutoBuyEnabled,
  setHoveredButton,
  performPrestige,
  prestigeGain,
  permLuck,
  permLuckCap,
  nextPermLuckCost,
  buyPermanentLuck,
  totalLuck,
  devMode,
  onToggleDevMode,
  collapsed,
  onToggle,
  formatNumber = defaultFormatNumber,
}: UpgradesSectionProps) {
  const actions = (
    <>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={autoBuyEnabled}
          onChange={(e) => setAutoBuyEnabled(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        <span style={{ fontSize: 13, color: autoBuyEnabled ? '#11a39c' : '#e8f7f9' }}>
          자동 구매 {autoBuyEnabled ? '활성화' : '비활성화'}
        </span>
      </label>
      <button className="ghost pill" onClick={onToggleDevMode}>
        {devMode ? '개발자 모드 숨기기' : '개발자 모드' }
      </button>
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
          : `영구 Luck +1 (-${formatNumber(nextPermLuckCost)} Shard)`}
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
              <h4>Shards로 운 올리기</h4>
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
                  : `+1 Luck (${formatNumber(nextPermLuckCost)} Shard)`}
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
                  <h4>{upgrade.name}</h4>
                  <p className="muted">{upgrade.description}</p>
                </div>
                <div className="upgrade-actions">
                  <button
                    className="ghost pill"
                    onClick={() => setOpenHelp(openHelp === upgrade.key ? null : upgrade.key)}
                  >
                    도움말
                  </button>
                  <button
                    className="ghost"
                    disabled={resources.cash < cost || locked}
                    onClick={() => handlePurchase(upgrade.key)}
                    onMouseEnter={() => setHoveredButton({ key: upgrade.key, type: 'single' })}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    {locked ? 'MAX' : `구매 ${formatNumber(cost)} C`}
                  </button>
                  <button
                    className="ghost"
                    disabled={bulkCount === 0 || resources.cash < bulkCost}
                    onClick={() => handlePurchaseBulk(upgrade.key, 10)}
                    onMouseEnter={() => setHoveredButton({ key: upgrade.key, type: 'bulk' })}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    {bulkCount === 0 ? 'MAX' : `10개 구매 ${formatNumber(bulkCost)} C`}
                  </button>
                </div>
              </div>
              {openHelp === upgrade.key && (
                <div className="help">
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
