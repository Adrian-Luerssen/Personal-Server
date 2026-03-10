import { useEffect, useRef } from 'react'

export function useParallax(containerRef, { intensity = 0.01, enabled = true } = {}) {
  const rafRef = useRef(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return
    const isTouchDevice = 'ontouchstart' in window
    if (isTouchDevice) return

    const container = containerRef.current

    function handleMouseMove(e) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect()
        const x = (e.clientX - rect.left - rect.width / 2) * intensity
        const y = (e.clientY - rect.top - rect.height / 2) * intensity
        const cards = container.querySelectorAll('.card, .stat-card')
        cards.forEach(card => {
          card.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-2px)`
        })
      })
    }

    function handleMouseLeave() {
      const cards = container.querySelectorAll('.card, .stat-card')
      cards.forEach(card => { card.style.transform = '' })
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [containerRef, intensity, enabled])
}
