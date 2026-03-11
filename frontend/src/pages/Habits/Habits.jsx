import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import {
  StatCard,
  SkeletonStatCard,
  SkeletonCard,
} from '../../components/shared'
import Icon from '../../components/icons/Icon'
import ScrollReveal from '../../components/ScrollReveal'
import PageHeader from '../../components/PageHeader'
import ProgressRing from '../../components/ProgressRing'

const HABITS_COLOR = '#a78bfa'
const HABITS_COLOR_MUTED = 'rgba(167, 139, 250, 0.15)'

const STATUS_COLORS = {
  success: '#4ade80',
  fail: '#f87171',
  skip: '#fbbf24',
  none: 'var(--color-text-muted)',
}

const STATUS_ICONS = {
  success: 'check-circle',
  fail: 'x-circle',
  skip: 'minus-circle',
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export default function Habits() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState([])       // full habit objects from GET /habits
  const [summary, setSummary] = useState([])      // summary stats per habit
  const [todayEntries, setTodayEntries] = useState({}) // { habitId: status }
  const [calendarEntries, setCalendarEntries] = useState([]) // raw calendar entries
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  function getCurrentMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  useEffect(() => { loadData() }, [selectedMonth])

  async function loadData() {
    setLoading(true)
    try {
      const [habitsData, summaryData, calendarData] = await Promise.all([
        api.get('/habits'),
        api.get('/habits/summary'),
        api.get(`/habits/calendar/${selectedMonth}`),
      ])

      setHabits(habitsData || [])
      setSummary(summaryData || [])
      setCalendarEntries(Array.isArray(calendarData) ? calendarData : [])

      // Build today's entry map from calendar data
      const today = getToday()
      const todayMap = {}
      const entries = Array.isArray(calendarData) ? calendarData : []
      for (const entry of entries) {
        if (entry.date === today) {
          todayMap[entry.habitId] = entry.status
        }
      }
      setTodayEntries(todayMap)
    } catch (e) {
      console.error('Failed to load habits:', e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleHabitEntry(habitId, status) {
    const today = getToday()
    const currentStatus = todayEntries[habitId]

    // Optimistic update
    setTodayEntries(prev => ({ ...prev, [habitId]: status }))

    try {
      if (currentStatus) {
        // Entry exists — use PATCH to update, or DELETE if same status (toggle off)
        if (currentStatus === status) {
          await api.delete(`/habits/${habitId}/entries/${today}`)
          setTodayEntries(prev => {
            const next = { ...prev }
            delete next[habitId]
            return next
          })
        } else {
          await api.patch(`/habits/${habitId}/entries/${today}`, { status })
        }
      } else {
        // No entry yet — POST to create
        await api.post(`/habits/${habitId}/entries`, { date: today, status })
      }
      // Refresh summary (streaks etc may have changed)
      const newSummary = await api.get('/habits/summary')
      setSummary(newSummary || [])
    } catch (e) {
      console.error('Failed to toggle habit entry:', e)
      // Revert optimistic update
      if (currentStatus) {
        setTodayEntries(prev => ({ ...prev, [habitId]: currentStatus }))
      } else {
        setTodayEntries(prev => {
          const next = { ...prev }
          delete next[habitId]
          return next
        })
      }
    }
  }

  // Merge habits with summary data
  const mergedHabits = habits
    .filter(h => h.isActive !== false)
    .map(h => {
      const s = summary.find(s => s.habitId === h.id) || {}
      return {
        ...h,
        currentStreak: s.currentStreak || 0,
        longestStreak: s.longestStreak || 0,
        successRate: s.successRate || 0,
        lastSuccess: s.lastSuccess,
        todayStatus: todayEntries[h.id] || 'none',
      }
    })

  const totalHabits = mergedHabits.length
  const avgSuccessRate = totalHabits > 0
    ? Math.round(mergedHabits.reduce((sum, h) => sum + h.successRate, 0) / totalHabits)
    : 0
  const totalCurrentStreak = mergedHabits.reduce((sum, h) => sum + h.currentStreak, 0)
  const activeToday = mergedHabits.filter(h => h.todayStatus === 'success').length

  // Aggregate calendar data by date
  const calendarAgg = aggregateCalendar(calendarEntries)
  const calendarDays = generateCalendarDays(selectedMonth, calendarAgg)

  return (
    <>
      <PageHeader icon="heart-pulse" title="Habits" accentColor="#a78bfa" />

      {/* Stats Grid */}
      <ScrollReveal>
        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard icon="list-checks" accentColor="#a78bfa" label={t('habits.totalHabits')} value={totalHabits} />
              <StatCard icon="percent" accentColor="#a78bfa" label={t('habits.avgSuccessRate')} value={`${avgSuccessRate}%`} />
              <StatCard icon="calendar-check" accentColor="#a78bfa" label={t('habits.activeToday')} value={`${activeToday}/${totalHabits}`} />
              <StatCard icon="flame" accentColor="#a78bfa" label={t('habits.totalStreak')} value={totalCurrentStreak} />
            </>
          )}
        </div>
      </ScrollReveal>

      {/* Quick Actions */}
      <ScrollReveal delay={100}>
      <div className="section">
        <h3>{t('habits.quickActions')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { icon: 'settings', label: t('habits.settings'), onClick: () => navigate('/habits/settings'), accent: false },
            { icon: 'download', label: t('habits.importHabitShare'), onClick: () => navigate('/habits/settings?tab=import'), accent: true },
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
              <Icon name={action.icon} size={40} style={{ marginBottom: '.5rem', color: HABITS_COLOR }} />
              <div style={{ fontWeight: 700 }}>{action.label}</div>
            </button>
          ))}
        </div>
      </div>
      </ScrollReveal>

      {/* Two columns: Habits List & Calendar */}
      <ScrollReveal delay={200}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Habits List */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            <Icon name="list" size={20} style={{ marginRight: 8 }} />
            {t('habits.todaysHabits')}
          </h3>

          {loading ? (
            <SkeletonCard lines={4} />
          ) : mergedHabits.length === 0 ? (
            <div className="empty-state">
              <Icon name="heart-pulse" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
              {t('habits.noHabitsYet')}
            </div>
          ) : (
            <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mergedHabits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggle={(status) => toggleHabitEntry(habit.id, status)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>
              <Icon name="calendar" size={20} style={{ marginRight: 8 }} />
              {t('habits.calendar')}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn small"
                onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))}
                style={{ padding: '0.25rem' }}
              >
                <Icon name="chevron-left" size={18} />
              </button>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
                {formatMonthYear(selectedMonth, i18n.language)}
              </span>
              <button
                className="btn small"
                onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
                style={{ padding: '0.25rem' }}
              >
                <Icon name="chevron-right" size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonCard lines={6} />
          ) : (
            <CalendarGrid days={calendarDays} t={t} />
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { color: STATUS_COLORS.success, label: t('habits.success') },
              { color: STATUS_COLORS.fail, label: t('habits.failed') },
              { color: STATUS_COLORS.skip, label: t('habits.skipped') },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </ScrollReveal>
    </>
  )
}

// ─── Habit Card ─────────────────────────────────────────────────────────────

function HabitCard({ habit, onToggle, t }) {
  const todayStatus = habit.todayStatus || 'none'
  const habitColor = habit.color || HABITS_COLOR

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        gap: '0.75rem',
        borderLeft: `3px solid ${habitColor}`,
      }}
    >
      {/* Emoji / Icon */}
      <div style={{
        width: 40, height: 40, minWidth: 40,
        borderRadius: '50%',
        background: `${habitColor}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: habit.emoji ? '1.2rem' : undefined,
      }}>
        {habit.emoji || <Icon name="heart-pulse" size={18} style={{ color: habitColor }} />}
      </div>

      {/* Habit Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {habit.name}
          </span>
          {habit.currentStreak > 0 && (
            <span style={{
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.15rem',
              background: 'rgba(251, 191, 36, 0.15)',
              color: '#fbbf24',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              fontWeight: 700,
            }}>
              <Icon name="flame" size={12} /> {habit.currentStreak}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <ProgressRing value={habit.successRate || 0} size={28} color={habitColor} />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {habit.successRate || 0}%
          </span>
        </div>
      </div>

      {/* Quick Toggle Buttons */}
      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
        {['success', 'fail', 'skip'].map(status => {
          const isActive = todayStatus === status
          return (
            <button
              key={status}
              onClick={(e) => { e.stopPropagation(); onToggle(status) }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-md)',
                border: isActive ? 'none' : '1.5px solid var(--glass-border)',
                background: isActive ? STATUS_COLORS[status] : 'transparent',
                color: isActive ? '#fff' : STATUS_COLORS[status],
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
              }}
              title={t(`habits.${status === 'fail' ? 'failed' : status}`)}
            >
              <Icon name={STATUS_ICONS[status]} size={18} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({ days, t }) {
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const today = getToday()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '3px',
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
      {days.map((day, i) => {
        if (day.empty) {
          return <div key={i} style={{ aspectRatio: '1' }} />
        }

        const { stats } = day
        const total = stats.total || 0
        const isToday = day.date === today
        const bg = getDayColor(stats)

        // Build tooltip
        const parts = []
        if (stats.success) parts.push(`${stats.success} ${t('habits.success').toLowerCase()}`)
        if (stats.fail) parts.push(`${stats.fail} ${t('habits.failed').toLowerCase()}`)
        if (stats.skip) parts.push(`${stats.skip} ${t('habits.skipped').toLowerCase()}`)
        const tooltip = total > 0
          ? `${day.date}: ${parts.join(', ')}`
          : day.date

        return (
          <div
            key={i}
            title={tooltip}
            style={{
              aspectRatio: '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 600,
              background: bg,
              color: total > 0 ? '#fff' : 'var(--color-text-muted)',
              position: 'relative',
              transition: 'background 0.2s ease',
              outline: isToday ? `2px solid ${HABITS_COLOR}` : 'none',
              outlineOffset: -1,
            }}
          >
            {day.dayNum}
            {/* Small dots showing proportion */}
            {total > 0 && (
              <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
                {stats.success > 0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />}
                {stats.fail > 0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', opacity: 0.5 }} />}
                {stats.skip > 0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', opacity: 0.3 }} />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function getDayColor(stats) {
  if (!stats || stats.total === 0) return 'var(--color-bg-elevated)'

  const total = stats.success + stats.fail + stats.skip
  if (total === 0) return 'var(--color-bg-elevated)'

  const successRate = stats.success / total

  if (successRate >= 0.8) return STATUS_COLORS.success
  if (successRate >= 0.5) return HABITS_COLOR
  if (stats.fail > stats.success) return STATUS_COLORS.fail
  if (stats.skip > 0) return STATUS_COLORS.skip
  return 'var(--color-bg-elevated)'
}

// ─── Calendar Helpers ────────────────────────────────────────────────────────

// Convert flat array of { habitId, date, status } into { date: { total, success, fail, skip } }
function aggregateCalendar(entries) {
  const agg = {}
  for (const entry of entries) {
    if (!agg[entry.date]) {
      agg[entry.date] = { total: 0, success: 0, fail: 0, skip: 0 }
    }
    agg[entry.date].total++
    if (entry.status === 'success') agg[entry.date].success++
    else if (entry.status === 'fail') agg[entry.date].fail++
    else if (entry.status === 'skip') agg[entry.date].skip++
  }
  return agg
}

function generateCalendarDays(monthStr, calendarAgg) {
  const [year, month] = monthStr.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const days = []

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ empty: true })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dayNum: d,
      date: dateStr,
      stats: calendarAgg[dateStr] || { total: 0, success: 0, fail: 0, skip: 0 },
    })
  }

  return days
}

function formatMonthYear(monthStr, locale = 'en') {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
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
