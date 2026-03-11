import React from 'react'
import Icon from '../icons/Icon'

const STATUS_COLORS = {
  success: '#4ade80',
  fail: '#f87171',
  skip: '#fbbf24',
}

const HABITS_COLOR = '#a78bfa'

/**
 * Reworked calendar with:
 * - Monthly goals banner at top
 * - Weekly goals sidebar column to the right
 * - Daily habit icons in each day cell
 * - Click any day to open day modal
 *
 * Props:
 *  - month: "YYYY-MM"
 *  - habitsMap: { [habitId]: { name, iconName, color, frequencyType, trackingType } }
 *  - entries: [{ habitId, date, status, numericValue }]
 *  - progress: { weekly: { [weekStart]: [...] }, monthly: [...], yearly: [...] }
 *  - onDayClick: (dateStr) => void
 */
export default function HabitCalendarGrid({ month, habitsMap, entries, progress, onDayClick }) {
  const [year, mon] = month.split('-').map(Number)
  const today = new Date().toISOString().slice(0, 10)

  // Build entries by date
  const entriesByDate = {}
  for (const e of (entries || [])) {
    if (!entriesByDate[e.date]) entriesByDate[e.date] = []
    entriesByDate[e.date].push(e)
  }

  // Get daily habits for rendering in cells
  const dailyHabits = Object.entries(habitsMap || {})
    .filter(([, h]) => h.frequencyType === 'daily')
    .map(([id, h]) => ({ id, ...h }))

  // Non-daily habits that appear in day cells when tracked
  const nonDailyHabitIds = new Set(
    Object.entries(habitsMap || {})
      .filter(([, h]) => h.frequencyType !== 'daily')
      .map(([id]) => id)
  )

  // Generate calendar days
  const firstDay = new Date(year, mon - 1, 1)
  const lastDay = new Date(year, mon, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0=Sun

  // Build weeks: each week is an array of day objects
  const weeks = []
  let currentWeek = []

  // Fill leading empties
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    currentWeek.push({ dayNum: d, date: dateStr })

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Fill trailing empties
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  // Find week start (Monday) for a given date
  function getWeekStart(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().slice(0, 10)
  }

  // Get weekly progress for a week containing any day in the week row
  function getWeeklyProgress(weekDays) {
    if (!progress?.weekly) return []
    const validDay = weekDays.find(d => d != null)
    if (!validDay) return []
    const ws = getWeekStart(validDay.date)
    return progress.weekly[ws] || []
  }

  // Monthly progress
  const monthlyProgress = progress?.monthly || []
  const yearlyProgress = progress?.yearly || []

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const hasWeeklyGoals = Object.values(progress?.weekly || {}).some(w => w.length > 0)

  return (
    <div>
      {/* Monthly Goals Banner */}
      {monthlyProgress.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 0.75rem',
          marginBottom: '0.75rem',
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '3px solid #60a5fa',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 50 }}>
            Monthly
          </div>
          {monthlyProgress.map(h => (
            <ProgressChip key={h.habitId} habit={h} />
          ))}
        </div>
      )}

      {/* Yearly Goals */}
      {yearlyProgress.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 0.75rem',
          marginBottom: '0.75rem',
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '3px solid #4ade80',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 50 }}>
            Yearly
          </div>
          {yearlyProgress.map(h => (
            <ProgressChip key={h.habitId} habit={h} />
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasWeeklyGoals
            ? `28px repeat(7, 1fr) minmax(110px, auto)`
            : `28px repeat(7, 1fr)`,
          gap: '2px',
          minWidth: hasWeeklyGoals ? 600 : 350,
        }}>
          {/* Header row */}
          <div /> {/* week label column */}
          {weekDays.map(d => (
            <div key={d} style={{
              textAlign: 'center',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              padding: '0.3rem 0',
              textTransform: 'uppercase',
            }}>
              {d.slice(0, 1)}
            </div>
          ))}
          {hasWeeklyGoals && (
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: HABITS_COLOR,
              textTransform: 'uppercase',
              paddingLeft: 4,
            }}>
              Weekly
            </div>
          )}

          {/* Week rows */}
          {weeks.map((week, wi) => {
            const weekProgress = getWeeklyProgress(week)

            // ISO week number
            const firstDayOfWeek = week.find(d => d != null)
            const weekNum = firstDayOfWeek ? getISOWeekNumber(firstDayOfWeek.date) : ''

            return (
              <React.Fragment key={wi}>
                {/* Week label */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  color: 'var(--color-text-muted)',
                }}>
                  {weekNum}
                </div>

                {/* Day cells */}
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={di} style={{ minHeight: 48 }} />
                  }

                  const dayEntries = entriesByDate[day.date] || []
                  const isToday = day.date === today
                  const isFuture = day.date > today

                  return (
                    <div
                      key={di}
                      onClick={() => onDayClick?.(day.date)}
                      style={{
                        background: 'var(--color-bg-elevated)',
                        borderRadius: 6,
                        padding: '3px',
                        minHeight: 48,
                        cursor: 'pointer',
                        opacity: isFuture ? 0.5 : 1,
                        outline: isToday ? `2px solid ${HABITS_COLOR}` : 'none',
                        outlineOffset: -1,
                        transition: 'background 0.15s',
                      }}
                      title={day.date}
                    >
                      <div style={{
                        fontSize: '0.7rem',
                        color: isToday ? HABITS_COLOR : 'var(--color-text-muted)',
                        fontWeight: isToday ? 700 : 400,
                        marginBottom: 2,
                        textAlign: 'center',
                      }}>
                        {day.dayNum}
                      </div>

                      {/* Habit icons */}
                      <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Daily habits */}
                        {dailyHabits.map(habit => {
                          const entry = dayEntries.find(e => e.habitId === habit.id)
                          const color = entry ? STATUS_COLORS[entry.status] : '#333'
                          const bg = entry ? `${STATUS_COLORS[entry.status]}33` : '#33333366'

                          return (
                            <div
                              key={habit.id}
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                background: bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={`${habit.name}: ${entry ? entry.status : 'not tracked'}`}
                            >
                              <Icon name={habit.iconName || 'circle-check'} size={8} style={{ color }} />
                            </div>
                          )
                        })}

                        {/* Non-daily habits that were tracked on this day */}
                        {dayEntries
                          .filter(e => nonDailyHabitIds.has(e.habitId))
                          .map(e => {
                            const habit = habitsMap[e.habitId]
                            if (!habit) return null
                            return (
                              <div
                                key={e.habitId}
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 3,
                                  background: `${STATUS_COLORS[e.status]}33`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title={`${habit.name}: ${e.status}`}
                              >
                                <Icon name={habit.iconName || 'circle-check'} size={8} style={{ color: STATUS_COLORS[e.status] }} />
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )
                })}

                {/* Weekly sidebar */}
                {hasWeeklyGoals && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingLeft: 4,
                    justifyContent: 'center',
                  }}>
                    {weekProgress.map(h => (
                      <ProgressChip key={h.habitId} habit={h} compact />
                    ))}
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '0.75rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
      }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS.success, marginRight: 4 }} />Pass</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS.skip, marginRight: 4 }} />Skip</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS.fail, marginRight: 4 }} />Fail</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#333', marginRight: 4 }} />Not tracked</span>
      </div>
    </div>
  )
}

function ProgressChip({ habit, compact }) {
  const met = habit.completed >= habit.target
  const color = met ? '#4ade80' : '#fbbf24'

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        fontSize: '0.65rem',
        padding: '1px 4px',
        background: 'var(--color-bg)',
        borderRadius: 4,
        whiteSpace: 'nowrap',
      }}>
        <Icon name={habit.habitIconName || 'circle-check'} size={10} style={{ color: habit.habitColor || HABITS_COLOR }} />
        <span style={{ color: 'var(--color-text-muted)', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {habit.habitName}
        </span>
        <span style={{ color, fontWeight: 700 }}>
          {habit.completed}/{habit.target}
          {met && ' \u2713'}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '0.2rem 0.5rem',
      background: 'var(--color-bg)',
      borderRadius: 6,
      fontSize: '0.8rem',
    }}>
      <Icon name={habit.habitIconName || 'circle-check'} size={14} style={{ color: habit.habitColor || HABITS_COLOR }} />
      <span style={{ color: 'var(--color-text-secondary)' }}>{habit.habitName}</span>
      <span style={{ color, fontWeight: 700, fontSize: '0.75rem' }}>
        {habit.completed}/{habit.target}
        {met && ' \u2713'}
      </span>
    </div>
  )
}

function getISOWeekNumber(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const yearStart = new Date(d.getFullYear(), 0, 4)
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `W${weekNo}`
}
