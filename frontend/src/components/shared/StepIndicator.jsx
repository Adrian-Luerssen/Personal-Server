import React from 'react'

/**
 * StepIndicator — horizontal stepper with icons/numbers.
 * Props:
 *   current: number (1-based)
 *   steps: string[]  e.g. ['File', 'Preview', 'Options', 'Import', 'Done']
 */
export function StepIndicator({ current, steps }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '2rem',
      overflowX: 'auto',
      padding: '0.25rem 0',
    }}>
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isComplete = stepNum < current
        const isActive = stepNum === current

        return (
          <React.Fragment key={stepNum}>
            {/* Connector line before each step (except first) */}
            {i > 0 && (
              <div style={{
                flex: 1,
                minWidth: 16,
                maxWidth: 48,
                height: 2,
                background: isComplete
                  ? 'var(--color-accent)'
                  : 'var(--glass-border)',
                transition: 'background var(--transition-normal)',
              }} />
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              flexShrink: 0,
            }}>
              {/* Circle */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: `2px solid ${
                  isComplete ? 'var(--color-accent)' :
                  isActive   ? 'var(--color-accent)' :
                               'var(--glass-border)'
                }`,
                background: isComplete
                  ? 'var(--color-accent)'
                  : isActive
                  ? 'var(--color-accent-muted)'
                  : 'transparent',
                color: isComplete
                  ? 'var(--color-accent-text)'
                  : isActive
                  ? 'var(--color-accent)'
                  : 'var(--color-text-muted)',
                transition: 'all var(--transition-normal)',
              }}>
                {isComplete
                  ? <span className="material-icons" style={{ fontSize: 16 }}>check</span>
                  : stepNum}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '0.7rem',
                fontWeight: isActive ? 700 : 400,
                color: isActive
                  ? 'var(--color-accent)'
                  : isComplete
                  ? 'var(--color-text-secondary)'
                  : 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                transition: 'color var(--transition-normal)',
              }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
