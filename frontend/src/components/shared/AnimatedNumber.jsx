import React, { useEffect, useRef, useState } from 'react'

export function AnimatedNumber({
  value = 0,
  formatter = (n) => String(n),
  durationMs = 800,
  decimals = 0,
  style,
}) {
  const [display, setDisplay] = useState(Number(value) || 0)
  const prevRef = useRef(Number(value) || 0)
  const rafRef = useRef(0)
  const glowTimeoutRef = useRef(0)
  const [glow, setGlow] = useState(null)

  useEffect(() => {
    const target = Number(value) || 0
    const start = prevRef.current
    if (target === start) return

    const direction = target > start ? 'up' : 'down'
    setGlow(direction)
    if (glowTimeoutRef.current) window.clearTimeout(glowTimeoutRef.current)
    glowTimeoutRef.current = window.setTimeout(() => setGlow(null), Math.min(durationMs + 200, 1200))

    const t0 = performance.now()
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
    const step = (now) => {
      const dt = Math.min(1, (now - t0) / durationMs)
      const eased = easeOutCubic(dt)
      const current = start + (target - start) * eased
      setDisplay(current)
      if (dt < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setDisplay(target)
        prevRef.current = target
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, durationMs])

  useEffect(() => () => { if (glowTimeoutRef.current) window.clearTimeout(glowTimeoutRef.current) }, [])

  const rounded = decimals > 0 ? Number(display.toFixed(decimals)) : Math.round(display)
  const green = 'var(--color-success)'
  const red = 'var(--color-error)'
  const glowColor = glow === 'up' ? green : glow === 'down' ? red : null
  const textShadow = glowColor
    ? `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`
    : 'none'

  return (
    <span style={{ textShadow, transition: 'text-shadow 260ms ease', willChange: 'contents', ...style }}>
      {formatter(rounded)}
    </span>
  )
}
