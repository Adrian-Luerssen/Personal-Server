import React, { useEffect, useState } from 'react'
import { api } from '../../api'

const CELL_SIZE = 12
const CELL_GAP = 2
const WEEKS = 53

function getIntensityColor(count, maxCount) {
  if (count === 0) return 'rgba(255, 255, 255, 0.04)'
  const ratio = Math.min(count / Math.max(maxCount, 1), 1)
  if (ratio <= 0.25) return 'rgba(167, 139, 250, 0.25)'
  if (ratio <= 0.5) return 'rgba(167, 139, 250, 0.45)'
  if (ratio <= 0.75) return 'rgba(167, 139, 250, 0.65)'
  return 'rgba(167, 139, 250, 0.9)'
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function HabitHeatmap({ compact = false }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    api.get('/habits/heatmap').then(d => {
      setData(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ height: (CELL_SIZE + CELL_GAP) * 7 + 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Loading heatmap...</span>
      </div>
    )
  }

  // Build date map
  const dateMap = new Map()
  let maxCount = 0
  for (const d of data) {
    dateMap.set(d.date, d)
    if (d.count > maxCount) maxCount = d.count
  }

  // Build grid: 53 weeks x 7 days, ending today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the start: go back ~1 year to the nearest Sunday
  const start = new Date(today)
  start.setDate(start.getDate() - (WEEKS * 7 - 1))
  // Align to Sunday
  const dayOffset = start.getDay()
  start.setDate(start.getDate() - dayOffset)

  const weeks = []
  const current = new Date(start)

  for (let w = 0; w < WEEKS; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().slice(0, 10)
      const entry = dateMap.get(dateStr)
      const isFuture = current > today
      week.push({
        date: dateStr,
        count: entry?.count || 0,
        total: entry?.total || 0,
        isFuture,
        month: current.getMonth(),
      })
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }

  // Determine month labels positions
  const monthPositions = []
  let lastMonth = -1
  for (let w = 0; w < weeks.length; w++) {
    const firstDayMonth = weeks[w][0].month
    if (firstDayMonth !== lastMonth) {
      monthPositions.push({ month: firstDayMonth, weekIndex: w })
      lastMonth = firstDayMonth
    }
  }

  const dayLabels = ['', 'M', '', 'W', '', 'F', '']

  // Count totals
  const totalCompletions = data.reduce((s, d) => s + d.count, 0)
  const activeDays = data.filter(d => d.count > 0).length

  return (
    <div className={`habit-heatmap${compact ? ' habit-heatmap--compact' : ''}`}>
      <div className="habit-heatmap__summary">
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <span><strong style={{ color: 'var(--color-text-primary)' }}>{totalCompletions}</strong> completions</span>
          <span><strong style={{ color: 'var(--color-text-primary)' }}>{activeDays}</strong> active days</span>
        </div>
      </div>

      {totalCompletions === 0 && (
        <div className="habit-heatmap__empty">
          <strong>Your activity map starts with the first check-in.</strong>
          <span>Completed habits will build a year-long pattern here.</span>
        </div>
      )}

      {compact ? (
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '14px minmax(0, 1fr)',
            gap: '0.35rem',
            alignItems: 'stretch',
          }}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
              {dayLabels.map((label, index) => (
                <div key={index} style={{ minHeight: 3, fontSize: '0.48rem', color: 'var(--color-text-muted)', lineHeight: 1 }}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gap: 1, minWidth: 0 }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gap: 1, minWidth: 0 }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        minHeight: 3,
                        borderRadius: 1,
                        background: day.isFuture ? 'transparent' : getIntensityColor(day.count, maxCount),
                      }}
                      title={day.isFuture ? '' : `${day.date}: ${day.count}/${day.total} completed`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: '0.55rem',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            fontSize: '0.6rem',
            color: 'var(--color-text-muted)',
          }}>
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: getIntensityColor(ratio * maxCount || (i === 0 ? 0 : 1), maxCount || 1),
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      ) : (
            <div className="habit-heatmap__viewport">
          <div className="habit-heatmap__grid" style={{
            display: 'grid',
            gridTemplateColumns: '14px minmax(0, 1fr)',
            gap: '0.35rem',
            alignItems: 'start',
          }}>
            <div />
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
              gap: 1,
              minWidth: 0,
              marginBottom: 2,
            }}>
              {weeks.map((week, wi) => {
                const monthPosition = monthPositions.find(mp => mp.weekIndex === wi)
                return (
                  <div
                    key={wi}
                    style={{
                      minWidth: 0,
                      height: 12,
                      overflow: 'visible',
                      fontSize: '0.55rem',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1,
                    }}
                  >
                    {monthPosition ? MONTH_LABELS[week[0].month] : ''}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
              {dayLabels.map((label, i) => (
                <div key={i} style={{ minHeight: 6, fontSize: '0.55rem', color: 'var(--color-text-muted)', lineHeight: 1 }}>
                  {label}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gap: 1, minWidth: 0 }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gap: 1, minWidth: 0 }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        minHeight: 5,
                        borderRadius: 2,
                        background: day.isFuture ? 'transparent' : getIntensityColor(day.count, maxCount),
                        cursor: day.isFuture ? 'default' : 'pointer',
                        transition: 'outline 0.1s',
                      }}
                      title={day.isFuture ? '' : `${day.date}: ${day.count}/${day.total} completed`}
                      onMouseEnter={() => !day.isFuture && setTooltip(day)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: '0.5rem',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            fontSize: '0.6rem',
            color: 'var(--color-text-muted)',
          }}>
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <div
                key={i}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: 2,
                  background: getIntensityColor(ratio * maxCount || (i === 0 ? 0 : 1), maxCount || 1),
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  )
}
