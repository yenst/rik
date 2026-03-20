import { useEffect, useRef, useState } from 'react'

export function RikAvatar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const maxOffset = 4

      const clampedDistance = Math.min(distance, 200)
      const ratio = clampedDistance / 200

      setEyeOffset({
        x: (dx / (distance || 1)) * maxOffset * ratio,
        y: (dy / (distance || 1)) * maxOffset * ratio,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className="flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        {/* Head */}
        <circle cx="40" cy="40" r="36" className="fill-muted stroke-border" strokeWidth="2" />

        {/* Left eye */}
        <ellipse cx="28" cy="35" rx="8" ry="9" className="fill-card" />
        <circle
          cx={28 + eyeOffset.x}
          cy={35 + eyeOffset.y}
          r="4"
          className="fill-foreground transition-[cx,cy] duration-75"
        />
        <circle
          cx={28 + eyeOffset.x + 1.5}
          cy={35 + eyeOffset.y - 1.5}
          r="1.5"
          className="fill-card"
        />

        {/* Right eye */}
        <ellipse cx="52" cy="35" rx="8" ry="9" className="fill-card" />
        <circle
          cx={52 + eyeOffset.x}
          cy={35 + eyeOffset.y}
          r="4"
          className="fill-foreground transition-[cx,cy] duration-75"
        />
        <circle
          cx={52 + eyeOffset.x + 1.5}
          cy={35 + eyeOffset.y - 1.5}
          r="1.5"
          className="fill-card"
        />

        {/* Mouth — slight smile */}
        <path
          d="M 30 52 Q 40 58 50 52"
          className="stroke-foreground/40"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
