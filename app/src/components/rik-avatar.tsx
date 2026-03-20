import { useEffect, useRef, useState } from 'react'

export function RikAvatar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [blinking, setBlinking] = useState(false)
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (window.innerWidth / 2)
      const dy = (e.clientY - cy) / (window.innerHeight / 2)
      setLook({
        x: Math.min(Math.max(dx, -1), 1),
        y: Math.min(Math.max(dy, -1), 1),
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const blink = () => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 100)
    }
    const interval = setInterval(blink, 2000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const hop = () => {
      setBounce(true)
      setTimeout(() => setBounce(false), 300)
    }
    const interval = setInterval(hop, 4000 + Math.random() * 3000)
    return () => clearInterval(interval)
  }, [])

  const tiltX = look.y * 8
  const tiltY = look.x * -10
  const pupilX = look.x * 3
  const pupilY = look.y * 2
  const eyeH = blinking ? 1 : 8

  return (
    <div ref={containerRef} className="w-full h-full" style={{ perspective: '300px' }}>
      <div
        className="w-full h-full transition-transform duration-150 ease-out"
        style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(${bounce ? -4 : 0}px)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Antenna */}
          <line x1="50" y1="18" x2="50" y2="6" stroke="oklch(0.65 0.17 36)" strokeWidth="2.5" />
          <circle cx="50" cy="5" r="3.5" fill="oklch(0.65 0.17 36)">
            <animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Body shadow */}
          <rect x="22" y="78" width="56" height="6" rx="3" fill="black" opacity="0.15" />

          {/* Body */}
          <rect x="18" y="20" width="64" height="58" rx="14" fill="oklch(0.40 0.04 260)" stroke="oklch(0.50 0.05 260)" strokeWidth="1.5" />

          {/* Screen face area */}
          <rect x="24" y="26" width="52" height="36" rx="8" fill="oklch(0.22 0.03 260)" stroke="oklch(0.35 0.04 260)" strokeWidth="1" />

          {/* Screen glow */}
          <rect x="24" y="26" width="52" height="36" rx="8" fill="oklch(0.65 0.17 36)" opacity="0.03" />

          {/* Left eye */}
          <rect
            x={33 + pupilX - 5}
            y={44 - eyeH}
            width="10"
            height={eyeH * 2}
            rx={eyeH > 2 ? 3 : 5}
            fill="oklch(0.65 0.17 36)"
            className="transition-all duration-75"
          />

          {/* Right eye */}
          <rect
            x={57 + pupilX - 5}
            y={44 - eyeH}
            width="10"
            height={eyeH * 2}
            rx={eyeH > 2 ? 3 : 5}
            fill="oklch(0.65 0.17 36)"
            className="transition-all duration-75"
          />

          {/* Eye glow */}
          <rect x={33 + pupilX - 5} y={44 - eyeH} width="10" height={eyeH * 2} rx={eyeH > 2 ? 3 : 5} fill="oklch(0.65 0.17 36)" opacity="0.3" filter="url(#glow)" className="transition-all duration-75" />
          <rect x={57 + pupilX - 5} y={44 - eyeH} width="10" height={eyeH * 2} rx={eyeH > 2 ? 3 : 5} fill="oklch(0.65 0.17 36)" opacity="0.3" filter="url(#glow)" className="transition-all duration-75" />

          {/* Mouth */}
          {bounce ? (
            <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="oklch(0.65 0.17 36)" opacity="0.5" />
          ) : (
            <rect x="42" y="55" width="16" height="2.5" rx="1.25" fill="oklch(0.65 0.17 36)" opacity="0.4" />
          )}

          {/* Side bolts */}
          <circle cx="14" cy="44" r="2.5" fill="oklch(0.50 0.05 260)" stroke="oklch(0.55 0.06 260)" strokeWidth="0.5" />
          <circle cx="14" cy="52" r="2.5" fill="oklch(0.50 0.05 260)" stroke="oklch(0.55 0.06 260)" strokeWidth="0.5" />
          <circle cx="86" cy="44" r="2.5" fill="oklch(0.50 0.05 260)" stroke="oklch(0.55 0.06 260)" strokeWidth="0.5" />
          <circle cx="86" cy="52" r="2.5" fill="oklch(0.50 0.05 260)" stroke="oklch(0.55 0.06 260)" strokeWidth="0.5" />

          {/* Feet */}
          <rect x="28" y="76" width="14" height="8" rx="4" fill="oklch(0.40 0.04 260)" stroke="oklch(0.50 0.05 260)" strokeWidth="1" />
          <rect x="58" y="76" width="14" height="8" rx="4" fill="oklch(0.40 0.04 260)" stroke="oklch(0.50 0.05 260)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
