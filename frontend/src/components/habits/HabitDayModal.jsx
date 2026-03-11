import React, { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { api } from '../../api'
import Icon from '../icons/Icon'

const STATUS_COLORS = {
  success: '#4ade80',
  fail: '#f87171',
  skip: '#fbbf24',
}

const STATUS_LABELS = {
  success: 'Pass',
  fail: 'Fail',
  skip: 'Skip',
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function getFrequencyLabel(habit) {
  if (!habit) return ''
  const ft = habit.frequencyType || 'daily'
  const target = habit.frequencyTarget || 1
  if (ft === 'daily') return 'Daily'
  if (ft === 'weekly') return `${target}x / week`
  if (ft === 'monthly') return `${target}x / month`
  if (ft === 'yearly') return `${target}x / year`
  return ft
}

export default function HabitDayModal({ date, habits, entries, progress, onClose, onChanged }) {
  // habits: array of habit objects (from GET /habits or calendar habits metadata)
  // entries: { [habitId]: { status, numericValue, comment } } for this date
  // progress: { weekly, monthly, yearly } from progress endpoint

  const [localEntries, setLocalEntries] = useState({})

  useEffect(() => {
    setLocalEntries(entries || {})
  }, [entries])

  const activeHabits = (habits || []).filter(h => h.isActive !== false)

  async function handleToggle(habitId, status) {
    const current = localEntries[habitId]
    const currentStatus = current?.status

    // Optimistic update
    if (currentStatus === status) {
      // Toggle off — remove entry
      setLocalEntries(prev => {
        const next = { ...prev }
        delete next[habitId]
        return next
      })
      try {
        await api.delete(`/habits/${habitId}/entries/${date}`)
        onChanged()
      } catch {
        setLocalEntries(prev => ({ ...prev, [habitId]: current }))
      }
    } else if (currentStatus) {
      // Update existing
      setLocalEntries(prev => ({ ...prev, [habitId]: { ...prev[habitId], status } }))
      try {
        await api.patch(`/habits/${habitId}/entries/${date}`, { status })
        onChanged()
      } catch {
        setLocalEntries(prev => ({ ...prev, [habitId]: current }))
      }
    } else {
      // Create new
      setLocalEntries(prev => ({ ...prev, [habitId]: { status } }))
      try {
        await api.post(`/habits/${habitId}/entries`, { date, status })
        onChanged()
      } catch {
        setLocalEntries(prev => {
          const next = { ...prev }
          delete next[habitId]
          return next
        })
      }
    }
  }

  async function handleNumericSubmit(habitId, numericValue, habit) {
    const current = localEntries[habitId]

    // Auto-evaluate status
    let status = 'fail'
    if (habit.numericPassThreshold != null && numericValue <= Number(habit.numericPassThreshold)) {
      status = 'success'
    } else if (habit.numericSkipThreshold != null && numericValue <= Number(habit.numericSkipThreshold)) {
      status = 'skip'
    }

    setLocalEntries(prev => ({ ...prev, [habitId]: { status, numericValue } }))

    try {
      if (current) {
        await api.patch(`/habits/${habitId}/entries/${date}`, { numericValue })
      } else {
        await api.post(`/habits/${habitId}/entries`, { date, numericValue })
      }
      onChanged()
    } catch {
      if (current) {
        setLocalEntries(prev => ({ ...prev, [habitId]: current }))
      } else {
        setLocalEntries(prev => {
          const next = { ...prev }
          delete next[habitId]
          return next
        })
      }
    }
  }

  function getProgressLabel(habit) {
    if (!habit || !progress) return null
    const ft = habit.frequencyType || 'daily'
    if (ft === 'daily') return null

    if (ft === 'weekly') {
      // Find the week this date falls in
      for (const [weekStart, weekHabits] of Object.entries(progress.weekly || {})) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const ws = weekStart
        const we = weekEnd.toISOString().slice(0, 10)
        if (date >= ws && date <= we) {
          const h = weekHabits.find(wh => wh.habitId === habit.id)
          if (h) return `${h.completed}/${h.target} this week`
        }
      }
    }

    if (ft === 'monthly') {
      const h = (progress.monthly || []).find(mh => mh.habitId === habit.id)
      if (h) return `${h.completed}/${h.target} this month`
    }

    if (ft === 'yearly') {
      const h = (progress.yearly || []).find(yh => yh.habitId === habit.id)
      if (h) return `${h.completed}/${h.target} this year`
    }

    return null
  }

  return (
    <Modal title={formatDateDisplay(date)} onClose={onClose} size="medium">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeHabits.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
            No active habits
          </div>
        )}

        {activeHabits.map(habit => {
          const entry = localEntries[habit.id]
          const currentStatus = entry?.status
          const habitColor = habit.color || '#a78bfa'
          const isNumeric = habit.trackingType === 'numeric'
          const progressLabel = getProgressLabel(habit)

          return (
            <div
              key={habit.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                borderLeft: `3px solid ${currentStatus ? STATUS_COLORS[currentStatus] : 'var(--glass-border)'}`,
                gap: '0.75rem',
              }}
            >
              {/* Habit info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 32, height: 32, minWidth: 32,
                  borderRadius: 8,
                  background: `${habitColor}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={habit.iconName || 'circle-check'} size={16} style={{ color: habitColor }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {habit.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {getFrequencyLabel(habit)}
                    {progressLabel && ` · ${progressLabel}`}
                    {isNumeric && habit.numericUnit && ` · ${habit.numericUnit}`}
                  </div>
                </div>
              </div>

              {/* Input area */}
              {isNumeric ? (
                <NumericInput
                  habit={habit}
                  entry={entry}
                  onSubmit={(val) => handleNumericSubmit(habit.id, val, habit)}
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                  {['success', 'skip', 'fail'].map(status => {
                    const isActive = currentStatus === status
                    return (
                      <button
                        key={status}
                        onClick={() => handleToggle(habit.id, status)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: 6,
                          border: isActive ? 'none' : '1.5px solid var(--glass-border)',
                          background: isActive ? STATUS_COLORS[status] : 'transparent',
                          color: isActive ? '#000' : STATUS_COLORS[status],
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          transition: 'all 0.15s',
                        }}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function NumericInput({ habit, entry, onSubmit }) {
  const [value, setValue] = useState(entry?.numericValue ?? '')

  useEffect(() => {
    setValue(entry?.numericValue ?? '')
  }, [entry?.numericValue])

  const currentStatus = entry?.status

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const num = parseFloat(value)
      if (!isNaN(num) && num >= 0) {
        onSubmit(num)
      }
    }
  }

  function handleBlur() {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0 && num !== entry?.numericValue) {
      onSubmit(num)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="0"
        style={{
          width: 56,
          padding: '0.3rem 0.4rem',
          borderRadius: 6,
          border: '1px solid var(--glass-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text-primary)',
          textAlign: 'center',
          fontSize: '0.9rem',
        }}
      />
      {currentStatus && (
        <span style={{
          padding: '0.2rem 0.5rem',
          borderRadius: 6,
          background: `${STATUS_COLORS[currentStatus]}33`,
          color: STATUS_COLORS[currentStatus],
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}>
          {STATUS_LABELS[currentStatus]}
        </span>
      )}
    </div>
  )
}
