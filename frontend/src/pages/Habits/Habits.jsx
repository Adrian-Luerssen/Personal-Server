import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import {
  StatCard,
  SkeletonStatCard,
  SkeletonCard,
  ProgressBar,
} from '../../components/shared'

// Habits accent color (purple)
const HABITS_COLOR = '#a78bfa'
const HABITS_COLOR_MUTED = 'rgba(167, 139, 250, 0.15)'

// Status colors
const STATUS_COLORS = {
  success: 'var(--color-success)',
  fail: 'var(--color-error)',
  skip: 'var(--color-warning)',
  none: 'var(--color-text-muted)',
}

const STATUS_ICONS = {
  success: 'check_circle',
  fail: 'cancel',
  skip: 'remove_circle',
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export default function Habits() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState([])
  const [calendarData, setCalendarData] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  function getCurrentMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  useEffect(() => { loadData() }, [selectedMonth])

  async function loadData() {
    setLoading(true)
    try {
      const [summaryData, calendarDataResp] = await Promise.all([
        api.get('/habits/summary'),
        api.get(`/habits/calendar/${selectedMonth}`),
      ])
      setHabits(summaryData || [])
      setCalendarData(calendarDataResp || {})
    } catch (e) {
      console.error('Failed to load habits:', e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleHabitEntry(habitId, status) {
    try {
      await api.post(`/habits/${habitId}/entries`, {
        date: getToday(),
        status,
      })
      loadData()
    } catch (e) {
      console.error('Failed to toggle habit entry:', e)
    }
  }

  const totalHabits = habits.length
  const avgSuccessRate = habits.length > 0
    ? Math.round(habits.reduce((sum, h) => sum + (h.successRate || 0), 0) / habits.length)
    : 0
  const totalCurrentStreak = habits.reduce((sum, h) => sum + (h.currentStreak || 0), 0)
  const activeToday = habits.filter(h => h.todayStatus === 'success').length

  // Generate calendar days
  const calendarDays = generateCalendarDays(selectedMonth, calendarData)

  return (
    <>
      <h2>
        <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8, color: HABITS_COLOR }}>
          self_improvement
        </span>
        Habit Tracker
      </h2>

      {/* Stats Grid */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Habits" value={totalHabits} />
            <StatCard label="Avg Success Rate" value={`${avgSuccessRate}%`} />
            <StatCard label="Active Today" value={activeToday} />
            <StatCard label="Total Streak 🔥" value={totalCurrentStreak} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="section">
        <h3>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { icon: 'file_download', label: 'Import HabitShare', onClick: () => navigate('/habits/import'), accent: true },
          ].map(action => (
            <button
              key={action.label}
              className="card interactive"
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                color: 'inherit',
                border: action.accent ? `2px solid ${HABITS_COLOR}` : undefined,
                background: action.accent ? HABITS_COLOR_MUTED : undefined,
              }}
              onClick={action.onClick}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: HABITS_COLOR }}>
                {action.icon}
              </span>
              <div style={{ fontWeight: 700 }}>{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Two columns: Habits List & Calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Habits List */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8, fontSize: 20 }}>list</span>
            Today's Habits
          </h3>

          {loading ? (
            <SkeletonCard lines={4} />
          ) : habits.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons" style={{ fontSize: 48, color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }}>
                self_improvement
              </span>
              No habits yet. Import data to get started!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {habits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggle={(status) => toggleHabitEntry(habit.id, status)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>
              <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8, fontSize: 20 }}>calendar_month</span>
              Calendar
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn small"
                onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))}
                style={{ padding: '0.25rem' }}
              >
                <span className="material-icons" style={{ fontSize: 18 }}>chevron_left</span>
              </button>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
                {formatMonthYear(selectedMonth)}
              </span>
              <button
                className="btn small"
                onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
                style={{ padding: '0.25rem' }}
              >
                <span className="material-icons" style={{ fontSize: 18 }}>chevron_right</span>
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonCard lines={6} />
          ) : (
            <CalendarGrid days={calendarDays} habits={habits} />
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { color: STATUS_COLORS.success, label: 'Success' },
              { color: STATUS_COLORS.fail, label: 'Failed' },
              { color: STATUS_COLORS.skip, label: 'Skipped' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Habit Card ─────────────────────────────────────────────────────────────

function HabitCard({ habit, onToggle }) {
  const todayStatus = habit.todayStatus || 'none'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        gap: '0.75rem',
      }}
    >
      {/* Habit Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600 }}>{habit.name}</span>
          {habit.currentStreak > 0 && (
            <span style={{ fontSize: '0.85rem' }}>
              🔥 {habit.currentStreak}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {habit.successRate || 0}% success
          </span>
          <div style={{ flex: 1, maxWidth: 80 }}>
            <ProgressBar value={habit.successRate || 0} height={4} color={HABITS_COLOR} />
          </div>
        </div>
      </div>

      {/* Quick Toggle Buttons */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {['success', 'fail', 'skip'].map(status => (
          <button
            key={status}
            onClick={() => onToggle(status)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: todayStatus === status ? STATUS_COLORS[status] : 'var(--glass-border)',
              color: todayStatus === status ? '#fff' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            title={status.charAt(0).toUpperCase() + status.slice(1)}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>
              {STATUS_ICONS[status]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({ days, habits }) {
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px',
    }}>
      {/* Weekday headers */}
      {weekDays.map((d, i) => (
        <div key={i} style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          padding: '0.25rem',
        }}>
          {d}
        </div>
      ))}

      {/* Days */}
      {days.map((day, i) => (
        <div
          key={i}
          style={{
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            fontSize: '0.75rem',
            fontWeight: 500,
            background: day.empty ? 'transparent' : getDayColor(day.stats),
            color: day.empty ? 'transparent' : (day.stats?.total > 0 ? '#fff' : 'var(--color-text-muted)'),
            cursor: day.empty ? 'default' : 'pointer',
            position: 'relative',
          }}
          title={day.empty ? '' : `${day.date}: ${day.stats?.success || 0}/${day.stats?.total || 0} complete`}
        >
          {!day.empty && day.dayNum}
        </div>
      ))}
    </div>
  )
}

function getDayColor(stats) {
  if (!stats || stats.total === 0) return 'var(--color-bg-elevated)'

  const successRate = stats.success / stats.total

  if (successRate >= 0.8) return STATUS_COLORS.success
  if (successRate >= 0.5) return HABITS_COLOR
  if (stats.fail > 0) return STATUS_COLORS.fail
  return STATUS_COLORS.skip
}

// ─── Calendar Helpers ────────────────────────────────────────────────────────

function generateCalendarDays(monthStr, calendarData) {
  const [year, month] = monthStr.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const days = []

  // Empty cells for days before the 1st
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ empty: true })
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dayNum: d,
      date: dateStr,
      stats: calendarData[dateStr] || { total: 0, success: 0, fail: 0, skip: 0 },
    })
  }

  return days
}

function formatMonthYear(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
}

function getPreviousMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  const d = new Date(year, month - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getNextMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  const d = new Date(year, month, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
