import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, apiFetch } from '../../api'
import {
  SkeletonCard,
  Modal,
} from '../../components/shared'
import Icon from '../../components/icons/Icon'
import { PageHeading, StatePanel, SummaryItem, SummaryStrip } from '../../components/record'
import ProgressRing from '../../components/ProgressRing'
import HabitCalendarGrid from '../../components/habits/HabitCalendarGrid'
import HabitHeatmap from '../../components/habits/HabitHeatmap'
import { isNativeMobileApp } from '../../mobilePlatform'
import { formatCadenceStreak } from './habitViewModel.mjs'

const HABITS_COLOR = '#7c5cff'

const STATUS_META = {
  success: {
    label: 'Done',
    shortLabel: 'Done',
    icon: 'check-circle',
    color: '#4ade80',
  },
  skip: {
    label: 'Skip',
    shortLabel: 'Skip',
    icon: 'minus-circle',
    color: '#fbbf24',
  },
  fail: {
    label: 'Missed',
    shortLabel: 'Missed',
    icon: 'x-circle',
    color: '#f87171',
  },
}

const EMPTY_CALENDAR = { habits: {}, entries: [] }
const EMPTY_PROGRESS = { weekly: {}, monthly: [], yearly: [] }

function toDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function parseDateKey(dateStr) {
  return new Date(`${dateStr}T12:00:00`)
}

function addDays(dateStr, amount) {
  const date = parseDateKey(dateStr)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

function shiftMonth(dateStr, amount) {
  const date = parseDateKey(dateStr)
  const currentDay = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + amount)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(currentDay, lastDay))
  return toDateKey(date)
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7)
}

function formatMonthYear(monthStr, locale = 'en') {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })
}

function formatSelectedDate(dateStr, locale = 'en') {
  const today = toDateKey()
  if (dateStr === today) return 'Today'
  if (dateStr === addDays(today, -1)) return 'Yesterday'
  if (dateStr === addDays(today, 1)) return 'Tomorrow'

  return parseDateKey(dateStr).toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function getFrequencyLabel(habit) {
  const type = habit.frequencyType || 'daily'
  const target = Number(habit.frequencyTarget || 1)
  if (type === 'daily') return 'Daily'
  if (type === 'weekly') return `${target}x/week`
  if (type === 'monthly') return `${target}x/month`
  if (type === 'yearly') return `${target}x/year`
  return type
}

function evaluateNumericStatus(habit, numericValue) {
  const value = Number(numericValue)
  const passThreshold = habit.numericPassThreshold
  const skipThreshold = habit.numericSkipThreshold

  if (passThreshold != null && value <= Number(passThreshold)) return 'success'
  if (skipThreshold != null && value <= Number(skipThreshold)) return 'skip'
  return 'fail'
}

function mergeHabitSummary(habits, summary, selectedEntries) {
  return (habits || [])
    .filter((habit) => habit.isActive !== false)
    .map((habit) => {
      const details = (summary || []).find((item) => item.habitId === habit.id) || {}
      const entry = selectedEntries[habit.id]
      return {
        ...habit,
        currentStreak: details.currentStreak || 0,
        longestStreak: details.longestStreak || 0,
        successRate: details.successRate || 0,
        lastSuccess: details.lastSuccess || null,
        selectedStatus: entry?.status || 'none',
        selectedNumericValue: entry?.numericValue,
      }
    })
}

function getCadenceUnit(habit) {
  const type = habit.frequencyType || 'daily'
  if (type === 'weekly') return 'weeks'
  if (type === 'monthly') return 'months'
  if (type === 'yearly') return 'years'
  return 'days'
}

function getStreakLabel(habit) {
  const streak = Number(habit.currentStreak || 0)
  if (streak <= 0) return 'No active streak'
  return formatCadenceStreak({ cadence: habit.frequencyType || 'daily', count: streak })
}

function getMissedStreakLabel(habit) {
  const missed = Number(habit.negativeStreak || habit.missedStreak || habit.currentMissedStreak || 0)
  if (missed <= 0) return 'No missed streak'
  return `${missed} missed ${getCadenceUnit(habit)}`
}

export default function Habits() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState([])
  const [summary, setSummary] = useState([])
  const [calendarData, setCalendarData] = useState(EMPTY_CALENDAR)
  const [progress, setProgress] = useState(EMPTY_PROGRESS)
  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const [savingEntries, setSavingEntries] = useState({})
  const [loadError, setLoadError] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [lastUndo, setLastUndo] = useState(null)

  const monthKey = getMonthKey(selectedDate)

  useEffect(() => {
    loadData()
  }, [monthKey])

  useEffect(() => {
    const refreshOnFocus = () => {
      loadData({ silent: true, force: true })
    }
    window.addEventListener('focus', refreshOnFocus)
    return () => window.removeEventListener('focus', refreshOnFocus)
  }, [monthKey])

  async function fetchBundle(fetcher) {
    const [habitsData, summaryData, calData, progressData] = await Promise.all([
      fetcher('/habits'),
      fetcher('/habits/summary'),
      fetcher(`/habits/calendar/${monthKey}`),
      fetcher(`/habits/progress/${monthKey}`),
    ])

    return {
      habitsData: Array.isArray(habitsData) ? habitsData : [],
      summaryData: Array.isArray(summaryData) ? summaryData : [],
      calData: calData || EMPTY_CALENDAR,
      progressData: progressData || EMPTY_PROGRESS,
    }
  }

  function applyBundle({ habitsData, summaryData, calData, progressData }) {
    setHabits(habitsData)
    setSummary(summaryData)
    setCalendarData({
      habits: calData?.habits || {},
      entries: Array.isArray(calData?.entries) ? calData.entries : [],
    })
    setProgress({
      weekly: progressData?.weekly || {},
      monthly: progressData?.monthly || [],
      yearly: progressData?.yearly || [],
    })
  }

  async function loadData({ silent = false, force = false } = {}) {
    if (!silent) setLoading(true)
    setLoadError('')

    try {
      const bundle = await fetchBundle(force ? apiFetch : api.get)
      applyBundle(bundle)
    } catch (error) {
      setLoadError(error.message || 'Failed to load habits')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function refreshSummary() {
    try {
      const nextSummary = await apiFetch('/habits/summary')
      setSummary(Array.isArray(nextSummary) ? nextSummary : [])
    } catch {
      // Keep optimistic habit state if analytics refresh fails.
    }
  }

  function updateCalendarEntry(habitId, date, nextEntry) {
    setCalendarData((current) => {
      const entries = (current.entries || []).filter(
        (entry) => !(entry.habitId === habitId && entry.date === date),
      )
      if (nextEntry) entries.push(nextEntry)
      return { ...current, entries }
    })
  }

  const selectedEntries = useMemo(() => {
    const map = {}
    for (const entry of calendarData.entries || []) {
      if (entry.date === selectedDate) map[entry.habitId] = entry
    }
    return map
  }, [calendarData.entries, selectedDate])

  const mergedHabits = useMemo(
    () => mergeHabitSummary(habits, summary, selectedEntries),
    [habits, summary, selectedEntries],
  )

  const totalHabits = mergedHabits.length
  const loggedHabits = mergedHabits.filter((habit) => habit.selectedStatus !== 'none')
  const needsLogHabits = mergedHabits.filter((habit) => habit.selectedStatus === 'none')
  const doneCount = loggedHabits.filter((habit) => habit.selectedStatus === 'success').length
  const skippedCount = loggedHabits.filter((habit) => habit.selectedStatus === 'skip').length
  const missedCount = loggedHabits.filter((habit) => habit.selectedStatus === 'fail').length
  const loggedCount = loggedHabits.length
  const averageSuccess = totalHabits
    ? Math.round(mergedHabits.reduce((sum, habit) => sum + Number(habit.successRate || 0), 0) / totalHabits)
    : 0
  const totalCurrentStreak = mergedHabits.reduce((sum, habit) => sum + Number(habit.currentStreak || 0), 0)
  const completionValue = totalHabits ? Math.round((loggedCount / totalHabits) * 100) : 0

  async function toggleHabitEntry(habit, status) {
    const current = selectedEntries[habit.id]
    const entryKey = `${habit.id}:${selectedDate}`
    const previous = current ? { ...current } : null
    const isRemoving = current?.status === status

    setSavingEntries((state) => ({ ...state, [entryKey]: true }))

    if (isRemoving) {
      updateCalendarEntry(habit.id, selectedDate, null)
    } else {
      updateCalendarEntry(habit.id, selectedDate, {
        ...current,
        habitId: habit.id,
        date: selectedDate,
        status,
        numericValue: current?.numericValue ?? null,
        comment: current?.comment ?? null,
      })
    }

    try {
      if (isRemoving) {
        await api.delete(`/habits/${habit.id}/entries/${selectedDate}`)
      } else if (current) {
        await api.patch(`/habits/${habit.id}/entries/${selectedDate}`, { status })
      } else {
        await api.post(`/habits/${habit.id}/entries`, { date: selectedDate, status })
      }
      setLastUndo({ habit, date: selectedDate, previous })
      refreshSummary()
    } catch (error) {
      updateCalendarEntry(habit.id, selectedDate, previous)
    } finally {
      setSavingEntries((state) => {
        const next = { ...state }
        delete next[entryKey]
        return next
      })
    }
  }

  async function undoHabitEntry() {
    if (!lastUndo) return
    const { habit, date, previous } = lastUndo
    setLastUndo(null)
    updateCalendarEntry(habit.id, date, previous)
    try {
      if (previous) {
        await api.patch(`/habits/${habit.id}/entries/${date}`, {
          status: previous.status,
          numericValue: previous.numericValue,
        })
      } else {
        await api.delete(`/habits/${habit.id}/entries/${date}`)
      }
      refreshSummary()
    } catch {
      loadData({ silent: true, force: true })
    }
  }

  async function saveNumericEntry(habit, numericValue) {
    const value = Number(numericValue)
    if (Number.isNaN(value) || value < 0) return

    const current = selectedEntries[habit.id]
    const previous = current ? { ...current } : null
    const entryKey = `${habit.id}:${selectedDate}`
    const status = evaluateNumericStatus(habit, value)

    setSavingEntries((state) => ({ ...state, [entryKey]: true }))
    updateCalendarEntry(habit.id, selectedDate, {
      ...current,
      habitId: habit.id,
      date: selectedDate,
      status,
      numericValue: value,
      comment: current?.comment ?? null,
    })

    try {
      if (current) {
        await api.patch(`/habits/${habit.id}/entries/${selectedDate}`, { numericValue: value })
      } else {
        await api.post(`/habits/${habit.id}/entries`, { date: selectedDate, numericValue: value })
      }
      refreshSummary()
    } catch (error) {
      updateCalendarEntry(habit.id, selectedDate, previous)
    } finally {
      setSavingEntries((state) => {
        const next = { ...state }
        delete next[entryKey]
        return next
      })
    }
  }

  async function createHabit(payload) {
    const created = await api.post('/habits', payload)
    const nextHabit = {
      ...payload,
      ...created,
      id: created?.id || `local-${Date.now()}`,
      isActive: created?.isActive ?? true,
    }
    setHabits((current) => [...current, nextHabit])
    setCalendarData((current) => ({
      ...current,
      habits: {
        ...(current.habits || {}),
        [nextHabit.id]: nextHabit,
      },
    }))
    setQuickAddOpen(false)
  }

  const headerActions = (
    <div className="habits-header-actions">
      <button className="record-button record-button--primary" type="button" onClick={() => setQuickAddOpen(true)}>
        <Icon name="plus" size={16} />
        Add Habit
      </button>
      <button className="record-button" type="button" onClick={() => navigate('/settings?section=data')}>
        <Icon name="settings" size={16} />
        Settings and Data
      </button>
    </div>
  )

  if (isNativeMobileApp()) {
    return (
      <NativeHabitsView
        i18n={i18n}
        navigate={navigate}
        loading={loading}
        loadError={loadError}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        loadData={loadData}
        totalHabits={totalHabits}
        loggedCount={loggedCount}
        doneCount={doneCount}
        skippedCount={skippedCount}
        missedCount={missedCount}
        completionValue={completionValue}
        averageSuccess={averageSuccess}
        totalCurrentStreak={totalCurrentStreak}
        mergedHabits={mergedHabits}
        needsLogHabits={needsLogHabits}
        loggedHabits={loggedHabits}
        calendarData={calendarData}
        progress={progress}
        monthKey={monthKey}
        savingEntries={savingEntries}
        setQuickAddOpen={setQuickAddOpen}
        toggleHabitEntry={toggleHabitEntry}
        saveNumericEntry={saveNumericEntry}
        quickAddOpen={quickAddOpen}
        createHabit={createHabit}
        lastUndo={lastUndo}
        onUndo={undoHabitEntry}
      />
    )
  }

  return (
    <div className="habits-page">
      <PageHeading eyebrow="Habits · Daily register" title="Habits" actions={headerActions}>
        <p>Make a decision for the selected day. Nothing is assumed before you log it.</p>
      </PageHeading>

      {loadError && (
        <StatePanel kind="offline" title="Using saved habit records" detail={loadError} />
      )}

      <section className="habits-day-board record-habits-register" aria-labelledby="habits-selected-day-title">
        <div className="habits-day-board__header">
          <div className="habits-day-board__title">
            <span className="habits-kicker">Log</span>
            <h2 id="habits-selected-day-title">{formatSelectedDate(selectedDate, i18n.language)}</h2>
            <div className="habits-date-meta">{selectedDate}</div>
          </div>

          <div className="habits-date-controls">
            <button
              className="habits-icon-button"
              type="button"
              aria-label="Previous day"
              onClick={() => setSelectedDate((date) => addDays(date, -1))}
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <button
              className="btn btn-ghost small"
              type="button"
              onClick={() => setSelectedDate(toDateKey())}
            >
              Today
            </button>
            <button
              className="habits-icon-button"
              type="button"
              aria-label="Next day"
              onClick={() => setSelectedDate((date) => addDays(date, 1))}
            >
              <Icon name="chevron-right" size={18} />
            </button>
            <button
              className="habits-icon-button"
              type="button"
              aria-label="Refresh habits"
              onClick={() => loadData({ silent: true, force: true })}
            >
              <Icon name="refresh-cw" size={16} />
            </button>
          </div>
        </div>

        <div className="habits-day-progress" aria-label={`${loggedCount} of ${totalHabits} habits logged`}>
          <div className="habits-day-progress__copy">
            <strong>{loggedCount}/{totalHabits}</strong>
            <span>logged</span>
          </div>
          <div className="habits-day-progress__track">
            <div className="habits-day-progress__bar" style={{ width: `${completionValue}%` }} />
          </div>
          <div className="habits-day-progress__states">
            <span><span className="habits-dot habits-dot--success" />{doneCount}</span>
            <span><span className="habits-dot habits-dot--skip" />{skippedCount}</span>
            <span><span className="habits-dot habits-dot--fail" />{missedCount}</span>
          </div>
        </div>

        {loading ? (
          <SkeletonCard lines={8} />
        ) : totalHabits === 0 ? (
          <div className="habits-empty">
            <Icon name="heart-pulse" size={42} />
            <strong>No active habits</strong>
            <button className="btn" type="button" onClick={() => setQuickAddOpen(true)}>
              <Icon name="plus" size={16} />
              Add Habit
            </button>
          </div>
        ) : (
          <div className="habits-board-groups">
            <HabitGroup title="Needs log" habits={needsLogHabits}>
              {needsLogHabits.map((habit) => (
                <HabitLogRow
                  key={habit.id}
                  habit={habit}
                  selectedDate={selectedDate}
                  saving={Boolean(savingEntries[`${habit.id}:${selectedDate}`])}
                  onToggle={toggleHabitEntry}
                  onNumericSubmit={saveNumericEntry}
                />
              ))}
            </HabitGroup>

            <HabitGroup title="Logged" habits={loggedHabits}>
              {loggedHabits.map((habit) => (
                <HabitLogRow
                  key={habit.id}
                  habit={habit}
                  selectedDate={selectedDate}
                  saving={Boolean(savingEntries[`${habit.id}:${selectedDate}`])}
                  onToggle={toggleHabitEntry}
                  onNumericSubmit={saveNumericEntry}
                />
              ))}
            </HabitGroup>
          </div>
        )}
      </section>

      <SummaryStrip className="habits-stat-grid" aria-label="Habit summary">
        <SummaryItem label="Active habits" value={loading ? '—' : String(totalHabits)} detail="Current plan" />
        <SummaryItem label="Logged" value={loading ? '—' : `${loggedCount}/${totalHabits}`} detail={formatSelectedDate(selectedDate, i18n.language)} />
        <SummaryItem label="Average success" value={loading ? '—' : `${averageSuccess}%`} detail="Recorded days" />
        <SummaryItem label="Current streaks" value={loading ? '—' : String(totalCurrentStreak)} detail="Cadence aware" />
      </SummaryStrip>

      <section className="habits-secondary-grid">
        <div className="habits-panel habits-panel--calendar">
          <div className="habits-panel__header">
            <div>
              <span className="habits-kicker">Calendar</span>
              <h3>{formatMonthYear(monthKey, i18n.language)}</h3>
            </div>
            <div className="habits-month-controls">
              <button
                className="habits-icon-button"
                type="button"
                aria-label="Previous month"
                onClick={() => setSelectedDate((date) => shiftMonth(date, -1))}
              >
                <Icon name="chevron-left" size={18} />
              </button>
              <button
                className="habits-icon-button"
                type="button"
                aria-label="Next month"
                onClick={() => setSelectedDate((date) => shiftMonth(date, 1))}
              >
                <Icon name="chevron-right" size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonCard lines={7} />
          ) : (
            <HabitCalendarGrid
              month={monthKey}
              habitsMap={calendarData.habits || {}}
              entries={calendarData.entries || []}
              progress={progress}
              onDayClick={setSelectedDate}
            />
          )}
        </div>

        <div className="habits-panel habits-panel--yearly">
          <div className="habits-panel__header">
            <div>
              <span className="habits-kicker">Overview</span>
              <h3>Yearly Activity</h3>
            </div>
          </div>
          <HabitHeatmap />
        </div>
      </section>

      {quickAddOpen && (
        <QuickHabitModal
          onClose={() => setQuickAddOpen(false)}
          onCreate={createHabit}
        />
      )}
    </div>
  )
}

function NativeHabitsView({
  i18n,
  navigate,
  loading,
  loadError,
  selectedDate,
  setSelectedDate,
  loadData,
  totalHabits,
  loggedCount,
  doneCount,
  skippedCount,
  missedCount,
  completionValue,
  averageSuccess,
  totalCurrentStreak,
  mergedHabits,
  needsLogHabits,
  loggedHabits,
  calendarData,
  progress,
  monthKey,
  savingEntries,
  setQuickAddOpen,
  toggleHabitEntry,
  saveNumericEntry,
  quickAddOpen,
  createHabit,
  lastUndo,
  onUndo,
}) {
  const [searchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const isValidView = ['today', 'plan', 'history', 'insights'].includes(requestedView)
  const [view, setView] = useState(isValidView ? requestedView : 'today')

  useEffect(() => {
    setView(isValidView ? requestedView : 'today')
  }, [isValidView, requestedView])

  return (
    <div className="native-habits-page">
      <section className="native-habits-hero">
        <div>
          <span className="native-eyebrow">Daily log</span>
          <h1>{formatSelectedDate(selectedDate, i18n.language)}</h1>
          <p>{loggedCount}/{totalHabits} logged. {needsLogHabits.length} remaining.</p>
        </div>
        <ProgressRing value={completionValue} size={74} color={HABITS_COLOR} />
      </section>

      {loadError && <div className="alert-error" role="alert">{loadError}</div>}

      <div className="native-habits-actions native-habits-date-rail">
        <button type="button" aria-label="Previous day" onClick={() => setSelectedDate((date) => addDays(date, -1))}>
          <Icon name="chevron-left" size={18} />
        </button>
        <button type="button" className="native-habits-date-rail__today" onClick={() => setSelectedDate(toDateKey())}>
          Today
        </button>
        <button type="button" aria-label="Next day" onClick={() => setSelectedDate((date) => addDays(date, 1))}>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>

      {view === 'today' && (
        <section className="native-habit-panel">
          <div className="native-panel-head">
            <div>
              <h2>Due now</h2>
              <p>Log each habit for the selected day. Tap a completed entry to change it.</p>
            </div>
            <button type="button" className="native-icon-button" aria-label="Refresh habits" onClick={() => loadData({ silent: true, force: true })}>
              <Icon name="refresh-cw" size={16} />
            </button>
          </div>
          {loading ? (
            <SkeletonCard lines={8} />
          ) : totalHabits === 0 ? (
            <div className="native-empty-state">
              <Icon name="heart-pulse" size={28} />
              <strong>No active habits</strong>
              <p>Create a habit to start logging from the app.</p>
              <button type="button" className="native-primary-button" onClick={() => setQuickAddOpen(true)}>Add habit</button>
            </div>
          ) : (
            <div className="native-habit-stack">
              {needsLogHabits.map((habit) => (
                <NativeHabitLogCard
                  key={habit.id}
                  habit={habit}
                  saving={Boolean(savingEntries[`${habit.id}:${selectedDate}`])}
                  onToggle={toggleHabitEntry}
                  onNumericSubmit={saveNumericEntry}
                />
              ))}
              {loggedHabits.length > 0 && (
                <>
                  <h3 className="native-subheading">Logged</h3>
                  {loggedHabits.map((habit) => (
                    <NativeHabitLogCard
                      key={habit.id}
                      habit={habit}
                      saving={Boolean(savingEntries[`${habit.id}:${selectedDate}`])}
                      onToggle={toggleHabitEntry}
                      onNumericSubmit={saveNumericEntry}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {view === 'plan' && (
        <section className="native-habit-panel">
          <div className="native-panel-head">
            <div>
              <h2>Plan</h2>
              <p>Review active habits and cadence. Imports and reminders live in Settings and Data.</p>
            </div>
            <div className="native-panel-actions">
              <button type="button" className="native-icon-button" aria-label="Open settings and data" onClick={() => navigate('/settings?section=data')}>
                <Icon name="settings" size={16} />
              </button>
              <button type="button" className="native-icon-button" aria-label="Add habit" onClick={() => setQuickAddOpen(true)}>
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>
          <div className="native-habit-stack">
            {mergedHabits.map((habit) => (
              <div key={habit.id} className="native-plan-row">
                <span className="native-plan-row__icon" style={{ color: habit.color || HABITS_COLOR, background: `${habit.color || HABITS_COLOR}22` }}>
                  <Icon name={habit.iconName || 'circle-check'} size={18} />
                </span>
                <span>
                  <strong>{habit.name}</strong>
                  <small>{getFrequencyLabel(habit)} - {getStreakLabel(habit)}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {view === 'history' && (
        <section className="native-habit-panel">
          <div className="native-panel-head">
            <div>
              <h2>{formatMonthYear(monthKey, i18n.language)}</h2>
              <p>Tap a day to log or correct old entries.</p>
            </div>
          </div>
          {loading ? (
            <SkeletonCard lines={7} />
          ) : (
            <HabitCalendarGrid
              month={monthKey}
              habitsMap={calendarData.habits || {}}
              entries={calendarData.entries || []}
              progress={progress}
              onDayClick={setSelectedDate}
              compact
            />
          )}
          <div className="native-heatmap-wrap">
            <HabitHeatmap compact />
          </div>
        </section>
      )}

      {view === 'insights' && (
        <section className="native-habit-panel">
          <div className="native-metric-strip native-habits-metrics">
            <div className="native-metric-card"><span>Logged</span><strong>{loggedCount}/{totalHabits}</strong></div>
            <div className="native-metric-card"><span>Success</span><strong>{averageSuccess}%</strong></div>
            <div className="native-metric-card"><span>Streaks</span><strong>{totalCurrentStreak}</strong></div>
          </div>
          <div className="native-status-grid">
            <div><strong>{doneCount}</strong><span>Done</span></div>
            <div><strong>{skippedCount}</strong><span>Skipped</span></div>
            <div><strong>{missedCount}</strong><span>Missed</span></div>
          </div>
          <div className="native-habit-stack">
            {mergedHabits.map((habit) => (
              <div key={habit.id} className="native-plan-row">
                <span className="native-plan-row__icon" style={{ color: habit.color || HABITS_COLOR, background: `${habit.color || HABITS_COLOR}22` }}>
                  <Icon name={habit.iconName || 'circle-check'} size={18} />
                </span>
                <span>
                  <strong>{habit.name}</strong>
                  <small>{getStreakLabel(habit)} - {getMissedStreakLabel(habit)}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {quickAddOpen && (
        <QuickHabitModal
          onClose={() => setQuickAddOpen(false)}
          onCreate={createHabit}
        />
      )}
      {lastUndo && (
        <div className="native-habit-undo" role="status">
          <span>Habit updated</span>
          <button type="button" onClick={onUndo}>Undo</button>
        </div>
      )}
    </div>
  )
}

function NativeHabitLogCard({ habit, saving, onToggle, onNumericSubmit }) {
  const status = habit.selectedStatus || 'none'
  const statusMeta = STATUS_META[status]
  const isNumeric = habit.trackingType === 'numeric'
  const color = habit.color || HABITS_COLOR

  return (
    <article
      className={`native-habit-log-card native-habit-log-card--${status}`}
      data-testid={`native-habit-card-${habit.id}`}
      style={{ '--habit-color': color }}
    >
      <div className="native-habit-log-card__top">
        <span className="native-plan-row__icon" style={{ color, background: `${color}22` }}>
          <Icon name={habit.iconName || 'circle-check'} size={18} />
        </span>
        <span>
          <strong>{habit.name}</strong>
          <small>{getFrequencyLabel(habit)} - {getStreakLabel(habit)}</small>
        </span>
        {statusMeta ? (
          <em style={{ color: statusMeta.color }}>{statusMeta.shortLabel}</em>
        ) : (
          <em className="native-habit-log-card__status-open">Ready</em>
        )}
      </div>

      {isNumeric ? (
        <NumericHabitControl habit={habit} saving={saving} onSubmit={(value) => onNumericSubmit(habit, value)} />
      ) : (
        <div className="native-habit-actions" role="group" aria-label={`${habit.name} status`}>
          {Object.entries(STATUS_META).map(([nextStatus, meta]) => (
            <button
              key={nextStatus}
              type="button"
              className={[
                nextStatus === 'success' ? 'native-habit-actions__primary' : 'native-habit-actions__secondary',
                status === nextStatus ? 'is-active' : '',
              ].filter(Boolean).join(' ')}
              style={{ '--status-color': meta.color }}
              aria-pressed={status === nextStatus}
              disabled={saving}
              onClick={() => onToggle(habit, nextStatus)}
            >
              <Icon name={meta.icon} size={17} />
              {meta.shortLabel}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

function HabitGroup({ title, habits, children }) {
  return (
    <div className="habit-group">
      <div className="habit-group__header">
        <h3>{title}</h3>
        <span aria-label={`${habits.length} habits`}>{habits.length}</span>
      </div>
      {habits.length === 0 ? (
        <div className="habits-group__empty">Clear</div>
      ) : (
        <div className="habits-log-list">{children}</div>
      )}
    </div>
  )
}

function HabitLogRow({ habit, saving, onToggle, onNumericSubmit }) {
  const status = habit.selectedStatus || 'none'
  const statusMeta = STATUS_META[status]
  const isNumeric = habit.trackingType === 'numeric'
  const color = habit.color || HABITS_COLOR

  return (
    <div
      className={`habit-log-row habit-log-row--${status}`}
      data-testid={`habit-row-${habit.id}`}
      style={{ '--habit-color': color }}
    >
      <div className="habit-log-row__identity">
        <div className="habit-log-row__icon">
          <Icon name={habit.iconName || 'circle-check'} size={18} />
        </div>
        <div className="habit-log-row__copy">
          <div className="habit-log-row__name">{habit.name}</div>
          <div className="habit-log-row__meta">
            <span>{getFrequencyLabel(habit)}</span>
            <span>{habit.successRate || 0}%</span>
            {habit.currentStreak > 0 && (
              <span className="habit-log-row__streak">
                <Icon name="flame" size={12} />
                {habit.currentStreak}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="habit-log-row__actions">
        <div className="habit-log-row__progress">
          <ProgressRing value={habit.successRate || 0} size={34} color={color} />
          <div className="habit-log-row__status">
            {statusMeta ? (
              <span style={{ '--status-color': statusMeta.color }}>
                <Icon name={statusMeta.icon} size={13} />
                {statusMeta.shortLabel}
              </span>
            ) : (
              <span className="habit-log-row__status-empty">Open</span>
            )}
          </div>
        </div>

        <div className="habit-log-row__controls">
          {isNumeric ? (
            <NumericHabitControl
              habit={habit}
              saving={saving}
              onSubmit={(value) => onNumericSubmit(habit, value)}
            />
          ) : (
            <div className="habit-status-buttons" role="group" aria-label={`${habit.name} status`}>
              {Object.entries(STATUS_META).map(([nextStatus, meta]) => (
                <button
                  key={nextStatus}
                  type="button"
                  className={`habit-status-button ${status === nextStatus ? 'is-active' : ''}`}
                  style={{ '--status-color': meta.color }}
                  aria-pressed={status === nextStatus}
                  disabled={saving}
                  onClick={() => onToggle(habit, nextStatus)}
                >
                  <Icon name={meta.icon} size={15} />
                  {meta.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NumericHabitControl({ habit, saving, onSubmit }) {
  const [value, setValue] = useState(habit.selectedNumericValue ?? '')
  const status = value === '' ? null : evaluateNumericStatus(habit, Number(value))
  const statusMeta = status ? STATUS_META[status] : null
  const isNative = isNativeMobileApp()

  useEffect(() => {
    setValue(habit.selectedNumericValue ?? '')
  }, [habit.selectedNumericValue])

  function submit() {
    const numericValue = Number(value)
    if (!Number.isNaN(numericValue) && numericValue >= 0) {
      onSubmit(numericValue)
    }
  }

  function adjust(delta) {
    const current = Number(value || 0)
    const next = Math.max(0, current + delta)
    setValue(Number.isInteger(next) ? String(next) : String(Number(next.toFixed(2))))
  }

  if (isNative) {
    return (
      <div className="habit-numeric-stepper" role="group" aria-label={`${habit.name} numeric counter`}>
        <button
          type="button"
          className="habit-numeric-stepper__button"
          aria-label={`Decrease ${habit.name}`}
          disabled={Number(value || 0) <= 0}
          onClick={() => adjust(-1)}
        >
          <Icon name="minus" size={18} />
        </button>
        <label className="habit-numeric-stepper__value" htmlFor={`habit-value-${habit.id}`}>
          <input
            id={`habit-value-${habit.id}`}
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={value}
            placeholder="0"
            aria-label={`${habit.name} value`}
            onChange={(event) => setValue(event.target.value)}
          />
          {habit.numericUnit && <span>{habit.numericUnit}</span>}
        </label>
        <button
          type="button"
          className="habit-numeric-stepper__button habit-numeric-stepper__button--plus"
          aria-label={`Increase ${habit.name}`}
          onClick={() => adjust(1)}
        >
          <Icon name="plus" size={18} />
        </button>
        <button
          type="button"
          className="habit-numeric-stepper__button habit-numeric-stepper__button--boost"
          aria-label={`Increase ${habit.name} by 5`}
          onClick={() => adjust(5)}
        >
          +5
        </button>
        <button
          className="habit-numeric-stepper__save"
          type="button"
          disabled={saving || value === ''}
          onClick={submit}
        >
          {saving ? 'Logging' : 'Log'}
        </button>
        {statusMeta && (
          <span className="habit-numeric-stepper__preview" style={{ '--status-color': statusMeta.color }}>
            {statusMeta.shortLabel}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="habit-numeric-control">
      <label className="sr-only" htmlFor={`habit-value-${habit.id}`}>
        {habit.name} value
      </label>
      <input
        id={`habit-value-${habit.id}`}
        className="input habit-numeric-control__input"
        type="number"
        min="0"
        step="1"
        value={value}
        placeholder="0"
        aria-label={`${habit.name} value`}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
      />
      {habit.numericUnit && <span className="habit-numeric-control__unit">{habit.numericUnit}</span>}
      {statusMeta && (
        <span className="habit-numeric-control__preview" style={{ '--status-color': statusMeta.color }}>
          {statusMeta.shortLabel}
        </span>
      )}
      <button className="btn small" type="button" disabled={saving || value === ''} onClick={submit}>
        Save
      </button>
    </div>
  )
}

function QuickHabitModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    color: HABITS_COLOR,
    iconName: 'circle-check',
    trackingType: 'boolean',
    frequencyType: 'daily',
    frequencyTarget: 1,
    numericUnit: '',
    numericPassThreshold: 0,
    numericSkipThreshold: 1,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isNumeric = form.trackingType === 'numeric'

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    const name = form.name.trim()
    if (!name) {
      setError('Habit name is required')
      return
    }

    const payload = {
      name,
      color: form.color,
      iconName: form.iconName || 'circle-check',
      trackingType: form.trackingType,
      frequencyType: form.frequencyType,
      frequencyTarget: Math.max(1, Number(form.frequencyTarget || 1)),
    }

    if (isNumeric) {
      payload.numericUnit = form.numericUnit.trim()
      payload.numericPassThreshold = Number(form.numericPassThreshold || 0)
      payload.numericSkipThreshold = Number(form.numericSkipThreshold || form.numericPassThreshold || 0)
    }

    setSaving(true)
    try {
      await onCreate(payload)
    } catch (err) {
      setError(err.message || 'Failed to create habit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Habit" onClose={onClose} size="medium">
      <form className="habit-quick-form" onSubmit={submit}>
        {error && <div className="alert-error" role="alert">{error}</div>}

        <label className="field">
          <span>Habit name</span>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            autoFocus
          />
        </label>

        <div className="habit-quick-form__row">
          <label className="field">
            <span>Icon</span>
            <input
              className="input"
              type="text"
              value={form.iconName}
              onChange={(event) => setField('iconName', event.target.value)}
            />
          </label>
          <label className="field habit-quick-form__color">
            <span>Color</span>
            <input
              type="color"
              value={form.color}
              onChange={(event) => setField('color', event.target.value)}
            />
          </label>
        </div>

        <div className="habit-quick-form__row">
          <label className="field">
            <span>Tracking</span>
            <select
              className="input"
              value={form.trackingType}
              onChange={(event) => setField('trackingType', event.target.value)}
            >
              <option value="boolean">Done / Skip / Missed</option>
              <option value="numeric">Numeric</option>
            </select>
          </label>

          <label className="field">
            <span>Frequency</span>
            <select
              className="input"
              value={form.frequencyType}
              onChange={(event) => setField('frequencyType', event.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </div>

        {form.frequencyType !== 'daily' && (
          <label className="field">
            <span>Target</span>
            <input
              className="input"
              type="number"
              min="1"
              value={form.frequencyTarget}
              onChange={(event) => setField('frequencyTarget', event.target.value)}
            />
          </label>
        )}

        {isNumeric && (
          <div className="habit-quick-form__numeric">
            <label className="field">
              <span>Unit</span>
              <input
                className="input"
                type="text"
                value={form.numericUnit}
                onChange={(event) => setField('numericUnit', event.target.value)}
              />
            </label>
            <div className="habit-quick-form__row">
              <label className="field">
                <span>Done at or below</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.numericPassThreshold}
                  onChange={(event) => setField('numericPassThreshold', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Skip at or below</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.numericSkipThreshold}
                  onChange={(event) => setField('numericSkipThreshold', event.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <div className="habit-quick-form__actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={saving}>
            Create Habit
          </button>
        </div>
      </form>
    </Modal>
  )
}
