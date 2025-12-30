type Point = { x: number; y: number }

type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  stroke?: string
}

function buildPath(points: Point[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  const d: string[] = [`M ${points[0].x} ${points[0].y}`]

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2

    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6

    d.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`)
  }

  return d.join(' ')
}

export function Sparkline({ data, width = 260, height = 80, stroke = '#11a39c' }: SparklineProps) {
  if (data.length === 0) return <p className="muted">데이터 없음</p>

  const min = Math.min(...data)
  const maxRaw = Math.max(...data)
  const max = maxRaw === min ? min + 1 : maxRaw
  const points: Point[] = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width
    const y = height - ((v - min) / (max - min)) * height
    return { x, y }
  })

  const pathD = buildPath(points)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="sparkline">
      <path d={pathD} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  )
}
