import type { ReactNode } from 'react'

interface CollapsiblePanelProps {
  eyebrow?: string
  title: string
  description?: string
  collapsed: boolean
  onToggle: () => void
  actions?: ReactNode
  children: ReactNode
}

export function CollapsiblePanel({ eyebrow, title, description, collapsed, onToggle, actions, children }: CollapsiblePanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h3>{title}</h3>
          {description && <p className="muted">{description}</p>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {actions}
          <button className="ghost pill" onClick={onToggle}>
            {collapsed ? '펼치기 ▼' : '접기 ▲'}
          </button>
        </div>
      </div>
      {!collapsed && children}
    </section>
  )
}
