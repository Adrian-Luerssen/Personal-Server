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
  success: 'check-circle',
  fail: 'x-circle',
  skip: 'minus-circle',
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export default function Habits() {
  const { t, i18n } = useTranslation()
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
              <StatCard icon="calendar-check" accentColor="#a78bfa" label={t('habits.activeToday')} value={activeToday} />
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
          ) : habits.length === 0 ? (
            <div className="empty-state">
              <Icon name="heart-pulse" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
              {t('habits.noHabitsYet')}
            </div>
          ) : (
            <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {habits.map(habit => (
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
            <CalendarGrid days={calendarDays} habits={habits} t={t} />
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
            <span style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              <Icon name="flame" size={14} style={{ color: 'var(--color-warning)' }} /> {habit.currentStreak}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <ProgressRing value={habit.successRate || 0} size={36} color={HABITS_COLOR} />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {habit.successRate || 0}%
          </span>
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
            title={t(`habits.${status === 'fail' ? 'failed' : status}`)}
          >
            <Icon name={STATUS_ICONS[status]} size={18} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({ days, habits, t }) {
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
            transition: 'background 0.3s ease, transform 0.2s ease',
          }}
          title={day.empty ? '' : `${day.date}: ${day.stats?.success || 0}/${day.stats?.total || 0} ${t('habits.complete')}`}
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
