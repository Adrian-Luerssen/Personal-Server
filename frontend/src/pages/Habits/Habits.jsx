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
import HabitCalendarGrid from '../../components/habits/HabitCalendarGrid'
import HabitDayModal from '../../components/habits/HabitDayModal'

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

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

function getFrequencyLabel(habit) {
  const ft = habit.frequencyType || 'daily'
  const target = habit.frequencyTarget || 1
  if (ft === 'daily') return 'Daily'
  if (ft === 'weekly') return `${target}x/week`
  if (ft === 'monthly') return `${target}x/month`
  if (ft === 'yearly') return `${target}x/year`
  return ft
}

export default function Habits() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState([])
  const [summary, setSummary] = useState([])
  const [calendarData, setCalendarData] = useState({ habits: {}, entries: [] })
  const [progress, setProgress] = useState({ weekly: {}, monthly: [], yearly: [] })
  const [todayEntries, setTodayEntries] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedDay, setSelectedDay] = useState(null) // date string for modal

  useEffect(() => { loadData() }, [selectedMonth])

  async function loadData() {
    setLoading(true)
    try {
      const [habitsData, summaryData, calData, progressData] = await Promise.all([
        api.get('/habits'),
        api.get('/habits/summary'),
        api.get(`/habits/calendar/${selectedMonth}`),
        api.get(`/habits/progress/${selectedMonth}`),
      ])

      setHabits(habitsData || [])
      setSummary(summaryData || [])
      setCalendarData(calData || { habits: {}, entries: [] })
      setProgress(progressData || { weekly: {}, monthly: [], yearly: [] })

      // Build today's entry map
      const today = getToday()
      const todayMap = {}
      for (const entry of (calData?.entries || [])) {
        if (entry.date === today) {
          todayMap[entry.habitId] = { status: entry.status, numericValue: entry.numericValue }
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
    const current = todayEntries[habitId]
    const currentStatus = current?.status

    // Optimistic update
    setTodayEntries(prev => ({ ...prev, [habitId]: { status } }))

    try {
      if (currentStatus) {
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
        await api.post(`/habits/${habitId}/entries`, { date: today, status })
      }
      const newSummary = await api.get('/habits/summary')
      setSummary(newSummary || [])
    } catch (e) {
      console.error('Failed to toggle habit entry:', e)
      if (currentStatus) {
        setTodayEntries(prev => ({ ...prev, [habitId]: current }))
      } else {
        setTodayEntries(prev => {
          const next = { ...prev }
          delete next[habitId]
          return next
        })
      }
    }
  }

  async function handleNumericEntry(habitId, numericValue, habit) {
    const today = getToday()
    const current = todayEntries[habitId]

    // Auto-evaluate status based on thresholds
    let status = 'fail'
    if (habit.numericPassThreshold != null && numericValue <= Number(habit.numericPassThreshold)) {
      status = 'success'
    } else if (habit.numericSkipThreshold != null && numericValue <= Number(habit.numericSkipThreshold)) {
      status = 'skip'
    }

    setTodayEntries(prev => ({ ...prev, [habitId]: { status, numericValue } }))

    try {
      if (current) {
        await api.patch(`/habits/${habitId}/entries/${today}`, { numericValue })
      } else {
        await api.post(`/habits/${habitId}/entries`, { date: today, numericValue })
      }
      const newSummary = await api.get('/habits/summary')
      setSummary(newSummary || [])
    } catch (e) {
      console.error('Failed to save numeric entry:', e)
      if (current) {
        setTodayEntries(prev => ({ ...prev, [habitId]: current }))
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
        todayStatus: todayEntries[h.id]?.status || 'none',
        todayNumericValue: todayEntries[h.id]?.numericValue,
      }
    })

  const totalHabits = mergedHabits.length
  const avgSuccessRate = totalHabits > 0
    ? Math.round(mergedHabits.reduce((sum, h) => sum + h.successRate, 0) / totalHabits)
    : 0
  const totalCurrentStreak = mergedHabits.reduce((sum, h) => sum + h.currentStreak, 0)
  const activeToday = mergedHabits.filter(h => h.todayStatus === 'success').length

  // Build entries map for selected day modal
  const dayEntries = {}
  if (selectedDay) {
    for (const entry of (calendarData.entries || [])) {
      if (entry.date === selectedDay) {
        dayEntries[entry.habitId] = entry
      }
    }
  }

  // Build full habit objects for the modal (merge entity data with calendar metadata)
  const modalHabits = habits.map(h => ({
    ...h,
    ...(calendarData.habits?.[h.id] || {}),
  }))

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
                  onNumericSubmit={handleNumericEntry}
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
            <HabitCalendarGrid
              month={selectedMonth}
              habitsMap={calendarData.habits || {}}
              entries={calendarData.entries || []}
              progress={progress}
              onDayClick={setSelectedDay}
            />
          )}
        </div>
      </div>
      </ScrollReveal>

      {/* Day Detail Modal */}
      {selectedDay && (
        <HabitDayModal
          date={selectedDay}
          habits={modalHabits}
          entries={dayEntries}
          progress={progress}
          onClose={() => setSelectedDay(null)}
          onChanged={() => {
            loadData()
          }}
        />
      )}
    </>
  )
}

// ─── Habit Card ─────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  success: 'Pass',
  fail: 'Fail',
  skip: 'Skip',
}

function HabitCard({ habit, onToggle, onNumericSubmit, t }) {
  const todayStatus = habit.todayStatus || 'none'
  const todayValue = habit.todayNumericValue
  const habitColor = habit.color || HABITS_COLOR
  const isNumeric = habit.trackingType === 'numeric'
  const [numValue, setNumValue] = React.useState(todayValue ?? '')

  React.useEffect(() => {
    setNumValue(todayValue ?? '')
  }, [todayValue])

  function handleNumericKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const num = parseFloat(numValue)
      if (!isNaN(num) && num >= 0) onNumericSubmit(habit.id, num, habit)
    }
  }

  function handleNumericBlur() {
    const num = parseFloat(numValue)
    if (!isNaN(num) && num >= 0 && num !== todayValue) {
      onNumericSubmit(habit.id, num, habit)
    }
  }

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
      {/* Icon */}
      <div style={{
        width: 40, height: 40, minWidth: 40,
        borderRadius: '50%',
        background: `${habitColor}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon name={habit.iconName || 'circle-check'} size={18} style={{ color: habitColor }} />
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
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {getFrequencyLabel(habit)}
          </span>
        </div>
      </div>

      {/* Numeric input */}
      {isNumeric ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <input
            type="number"
            min="0"
            step="1"
            value={numValue}
            onChange={e => setNumValue(e.target.value)}
            onKeyDown={handleNumericKey}
            onBlur={handleNumericBlur}
            placeholder="0"
            style={{
              width: 52,
              padding: '0.3rem 0.4rem',
              borderRadius: 6,
              border: '1px solid var(--glass-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              textAlign: 'center',
              fontSize: '0.85rem',
            }}
          />
          {habit.numericUnit && (
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              {habit.numericUnit}
            </span>
          )}
          {todayStatus !== 'none' && (
            <span style={{
              padding: '0.15rem 0.4rem',
              borderRadius: 6,
              background: `${STATUS_COLORS[todayStatus]}33`,
              color: STATUS_COLORS[todayStatus],
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              {STATUS_LABELS[todayStatus]}
            </span>
          )}
        </div>
      ) : (
        /* Boolean toggle buttons with labels */
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          {['success', 'skip', 'fail'].map(status => {
            const isActive = todayStatus === status
            return (
              <button
                key={status}
                onClick={(e) => { e.stopPropagation(); onToggle(status) }}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? 'none' : '1.5px solid var(--glass-border)',
                  background: isActive ? STATUS_COLORS[status] : 'transparent',
                  color: isActive ? '#fff' : STATUS_COLORS[status],
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  transition: 'all 0.2s ease',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
                title={STATUS_LABELS[status]}
              >
                <Icon name={STATUS_ICONS[status]} size={15} />
                <span>{STATUS_LABELS[status]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
