import { useEffect, useRef } from 'react'

type PenguinState = 'idle' | 'happy' | 'bonk'

type Penguin = {
  x: number
  y: number
  vx: number
  vy: number
  state: PenguinState
  stateUntil: number
}

interface PenguinMapProps {
  width?: number
  height?: number
  backgroundSrc?: string
  showGrid?: boolean
}

// 간단한 캔버스 펭귄 맵: 클릭 시 거리 판정 → 상태 변화 후 원래 상태로 복귀
export function PenguinMap({ width = 480, height = 320, backgroundSrc, showGrid = true }: PenguinMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const penguinRef = useRef<Penguin | null>(null)
  const rafRef = useRef<number | null>(null)
  const bgRef = useRef<HTMLImageElement | null>(null)
  const bgReadyRef = useRef(false)
  const spriteRef = useRef<HTMLImageElement | null>(null)
  const spriteReadyRef = useRef(false)
  const sheetRef = useRef<HTMLImageElement | null>(null)
  const sheetReadyRef = useRef(false)
  const frameIndexRef = useRef(0)
  const frameElapsedRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    // 캐릭터 상태는 React state 대신 객체로 관리
    penguinRef.current = {
      x: width / 2,
      y: height / 2,
      vx: 60,
      vy: 35,
      state: 'idle',
      stateUntil: 0,
    }

    if (backgroundSrc) {
      const img = new Image()
      img.src = backgroundSrc
      img.onload = () => {
        bgRef.current = img
        bgReadyRef.current = true
      }
      img.onerror = () => {
        bgRef.current = null
        bgReadyRef.current = false
      }
    }

    // 펭귄 스프라이트 (Lv1 단일)
    const sprite = new Image()
    sprite.src = `${import.meta.env.BASE_URL}penguin/Lv1.png`
    sprite.onload = () => {
      spriteRef.current = sprite
      spriteReadyRef.current = true
    }
    sprite.onerror = () => {
      spriteRef.current = null
      spriteReadyRef.current = false
    }

    // 펭귄 스프라이트 시트 (Lv1)
    const sheet = new Image()
    sheet.src = `${import.meta.env.BASE_URL}penguin/Lv1-Sprite-Sheet.png`
    sheet.onload = () => {
      sheetRef.current = sheet
      sheetReadyRef.current = true
      frameIndexRef.current = 0
      frameElapsedRef.current = 0
    }
    sheet.onerror = () => {
      sheetRef.current = null
      sheetReadyRef.current = false
    }

    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) // max step clamp
      last = now

      const penguin = penguinRef.current
      if (!penguin) return

      // 상태 시간 만료 처리
      if (penguin.state !== 'idle' && now > penguin.stateUntil) {
        penguin.state = 'idle'
      }

      // 위치 업데이트 (간단한 바운스)
      penguin.x += penguin.vx * dt
      penguin.y += penguin.vy * dt
      if (penguin.x < 20 || penguin.x > width - 20) penguin.vx *= -1
      if (penguin.y < 20 || penguin.y > height - 20) penguin.vy *= -1
      penguin.x = Math.max(20, Math.min(width - 20, penguin.x))
      penguin.y = Math.max(20, Math.min(height - 20, penguin.y))

      // 그리기
      ctx.clearRect(0, 0, width, height)
      // 배경 렌더링 (이미지 있으면 우선 사용)
      if (bgReadyRef.current && bgRef.current) {
        const img = bgRef.current
        const scale = Math.max(width / img.width, height / img.height)
        const drawW = img.width * scale
        const drawH = img.height * scale
        const offsetX = (width - drawW) / 2
        const offsetY = (height - drawH) / 2
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
      } else {
        ctx.fillStyle = '#0a101d'
        ctx.fillRect(0, 0, width, height)

        if (showGrid) {
          ctx.strokeStyle = 'rgba(255,255,255,0.06)'
          ctx.lineWidth = 1
          for (let x = 0; x < width; x += 40) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()
          }
          for (let y = 0; y < height; y += 40) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(width, y)
            ctx.stroke()
          }
        }
      }

      // 펭귄 렌더링 (스프라이트 시트 → 단일 스프라이트 → 원형)
      const sheet = sheetReadyRef.current ? sheetRef.current : null
      if (sheet) {
        const columns = 8
        const rows = 4
        const frameW = sheet.width / columns
        const frameH = sheet.height / rows
        const frameDuration = 140 // ms per frame

        // 애니메이션 프레임 업데이트
        frameElapsedRef.current += dt * 1000
        if (frameElapsedRef.current >= frameDuration) {
          const steps = Math.floor(frameElapsedRef.current / frameDuration)
          frameElapsedRef.current -= steps * frameDuration
          frameIndexRef.current = (frameIndexRef.current + steps) % (columns * rows)
        }

        const frameIndex = frameIndexRef.current
        const sx = (frameIndex % columns) * frameW
        const sy = Math.floor(frameIndex / columns) * frameH
        const scale = 1
        const drawW = frameW * scale
        const drawH = frameH * scale
        ctx.drawImage(sheet, sx, sy, frameW, frameH, penguin.x - drawW / 2, penguin.y - drawH / 2, drawW, drawH)
      } else {
        const sprite = spriteReadyRef.current ? spriteRef.current : null
        if (sprite) {
          const baseSize = 72
          const scale = 1
          const drawW = baseSize * scale
          const drawH = baseSize * scale
          ctx.drawImage(sprite, penguin.x - drawW / 2, penguin.y - drawH / 2, drawW, drawH)
        } else {
          const radius = 18
          const stateColor = penguin.state === 'happy' ? '#11a39c' : penguin.state === 'bonk' ? '#f97316' : '#e8f7f9'
          ctx.fillStyle = stateColor
          ctx.beginPath()
          ctx.arc(penguin.x, penguin.y, radius, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#0a101d'
          ctx.beginPath()
          ctx.arc(penguin.x - 6, penguin.y - 4, 3, 0, Math.PI * 2)
          ctx.arc(penguin.x + 6, penguin.y - 4, 3, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.moveTo(penguin.x, penguin.y + 2)
          ctx.lineTo(penguin.x - 5, penguin.y + 10)
          ctx.lineTo(penguin.x + 5, penguin.y + 10)
          ctx.closePath()
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const penguin = penguinRef.current
      if (!penguin) return

      const dx = x - penguin.x
      const dy = y - penguin.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hit = dist <= 28

      if (hit) {
        penguin.state = 'happy'
        penguin.stateUntil = performance.now() + 1200
        // 살짝 밀려나는 효과
        const mag = Math.max(40, 160 - dist * 2)
        const norm = Math.max(1, dist)
        penguin.vx = (dx / norm) * mag
        penguin.vy = (dy / norm) * mag
      } else {
        penguin.state = 'bonk'
        penguin.stateUntil = performance.now() + 700
        penguin.vx *= -1
        penguin.vy *= -1
      }
    }

    canvas.addEventListener('click', handleClick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click', handleClick)
    }
  }, [width, height])

  return (
    <div className="penguin-map">
      <canvas ref={canvasRef} />
    </div>
  )
}
