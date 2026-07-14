import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api, subscribeToApiPath } from '../api'
import { saveAndroidWidgetSnapshot } from '../androidWidgets.mjs'
import Icon from '../components/icons/Icon'
import { PageHeading, Register, RegisterRow, StatePanel, SummaryItem, SummaryStrip } from '../components/record'
import { usePreferences } from '../contexts/PreferencesContext'
import { isNativeMobileApp } from '../mobilePlatform'
import { normalizeCurrency } from '../moneyFormat.mjs'
import { isFeatureSyncEnabled } from '../modulePreferences.mjs'
import { mergeLiveStepIntoActivitySummary, subscribeToLiveStepUpdates } from '../nativeHealth.mjs'
import { buildTodayBrief, buildTodayItems } from './Home/todayModel.mjs'

const ITEM_META = Object.freeze({
  'payment-review': { icon: 'receipt', label: 'Review detected payment' },
  'active-workout': { icon: 'dumbbell', label: 'Continue active workout' },
  'habit-due': { icon: 'circle', label: 'Habit waiting' },
  'recent-stream': { icon: 'music', label: 'Recent listening' },
})

function formatToday(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date)
}

function mapHabitSummary(items) {
  return (Array.isArray(items) ? items : []).map((habit) => ({
    ...habit,
    id: habit.id || habit.habitId,
    name: habit.name || habit.habitName,
    completedToday: Boolean(habit.completedToday || habit.todayStatus === 'success'),
    todayStatus: habit.todayStatus || (habit.completedToday ? 'success' : null),
  }))
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSyncDetail(value, state) {
  if (state === 'offline') return 'Offline · using local record'
  if (state === 'syncing') return 'Checking for changes…'
  if (!value) return 'Last checked just now'
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 'Last checked just now'
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000))
  if (minutes < 1) return 'Last checked just now'
  if (minutes < 60) return `Last checked ${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Last checked ${hours}h ago`
  return `Last checked ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(time))}`
}

export default function Home() {
  const navigate = useNavigate()
  const nativeApp = isNativeMobileApp()
  const { prefs } = usePreferences()
  const [habits, setHabits] = useState([])
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [financeSummary, setFinanceSummary] = useState(null)
  const [spotifyStats, setSpotifyStats] = useState(null)
  const [activitySummary, setActivitySummary] = useState(null)
  const [paymentSuggestions, setPaymentSuggestions] = useState([])
  const [intelligence, setIntelligence] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [syncState, setSyncState] = useState('syncing')

  const applyMobileSnapshot = useCallback((nextSnapshot) => {
    if (!nextSnapshot) return
    setSnapshot(nextSnapshot)
    setHabits(mapHabitSummary(nextSnapshot.habits?.today))
    setActiveWorkout(nextSnapshot.workout?.activeSession || null)
    setFinanceSummary({
      ...(nextSnapshot.finance?.summary || {}),
      todayExpense: nextSnapshot.today?.financeSpent ?? nextSnapshot.finance?.todaySpent ?? 0,
      currency: normalizeCurrency(nextSnapshot.today?.financeCurrency ?? nextSnapshot.finance?.currency),
    })
    setSpotifyStats({
      ...(nextSnapshot.spotify?.stats || {}),
      todayStreams: nextSnapshot.today?.streams ?? nextSnapshot.spotify?.stats?.todayStreams ?? 0,
    })
    setActivitySummary(nextSnapshot.activity || null)
    setPaymentSuggestions(nextSnapshot.finance?.pendingSuggestions || [])
    setIntelligence(nextSnapshot.intelligence || null)
    setLoaded(true)
    saveAndroidWidgetSnapshot(nextSnapshot, { preferences: prefs }).catch(() => {})
  }, [prefs])

  useEffect(() => {
    let cancelled = false

    if (nativeApp) {
      const unsubscribe = subscribeToApiPath('/dashboard/mobile', (entry) => {
        if (!cancelled && entry?.data) applyMobileSnapshot(entry.data)
      })
      setSyncState('syncing')
      api.get('/dashboard/mobile')
        .then((data) => {
          if (cancelled) return
          applyMobileSnapshot(data)
          setSyncState('idle')
        })
        .catch(() => {
          if (cancelled) return
          setLoaded(true)
          setSyncState('offline')
        })
      return () => {
        cancelled = true
        unsubscribe()
      }
    }

    const requests = [
      ['habits', isFeatureSyncEnabled(prefs, 'habits'), '/habits/summary'],
      ['workout', isFeatureSyncEnabled(prefs, 'training'), '/workout/sessions/active'],
      ['finance', isFeatureSyncEnabled(prefs, 'finance'), '/finance/transactions/summary'],
      ['payments', isFeatureSyncEnabled(prefs, 'finance'), '/finance/transaction-suggestions'],
      ['spotify', isFeatureSyncEnabled(prefs, 'music'), '/streams/stats?timeframe=all'],
      ['intelligence', isFeatureSyncEnabled(prefs, 'assistant'), '/dashboard/intelligence'],
    ]

    Promise.all(requests.filter(([, enabled]) => enabled).map(async ([key, , path]) => [key, await api.get(path).catch(() => null)]))
      .then((entries) => {
        if (cancelled) return
        const data = Object.fromEntries(entries)
        setHabits(mapHabitSummary(data.habits))
        setActiveWorkout(data.workout || null)
        setFinanceSummary(data.finance || null)
        setPaymentSuggestions(Array.isArray(data.payments) ? data.payments : [])
        setSpotifyStats(data.spotify || null)
        setIntelligence(data.intelligence || null)
        setLoaded(true)
        setSyncState('idle')
      })

    return () => { cancelled = true }
  }, [applyMobileSnapshot, nativeApp, prefs])

  useEffect(() => {
    if (!nativeApp || !isFeatureSyncEnabled(prefs, 'training')) return undefined
    let cancelled = false
    let unsubscribe
    subscribeToLiveStepUpdates((event) => {
      if (!cancelled) setActivitySummary((current) => mergeLiveStepIntoActivitySummary(current, event))
    }).then((next) => { unsubscribe = next }).catch(() => {})
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [nativeApp, prefs])

  const completedHabits = habits.filter((habit) => habit.completedToday).length
  const dueHabits = habits.filter((habit) => !habit.todayStatus || habit.todayStatus === 'none')
  const currency = normalizeCurrency(financeSummary?.currency)
  const todayItems = useMemo(() => buildTodayItems({
    activeWorkout,
    habitsDue: dueHabits,
    paymentSuggestions,
  }), [activeWorkout, dueHabits, paymentSuggestions])
  const todayBrief = useMemo(() => buildTodayBrief({
    activeWorkout,
    habitsCompleted: completedHabits,
    habitsTotal: habits.length,
    paymentSuggestions,
    spentToday: Math.abs(Number(financeSummary?.todayExpense ?? financeSummary?.todaySpent ?? 0)),
    steps: Number(activitySummary?.today?.steps || activitySummary?.steps || 0),
    streamsToday: Number(spotifyStats?.todayStreams || 0),
  }), [activeWorkout, activitySummary, completedHabits, financeSummary, habits.length, paymentSuggestions, spotifyStats])

  const handleHabitDone = useCallback(async (timelineItem) => {
    const habitId = String(timelineItem.id).replace(/^habit-/, '')
    const previous = habits
    const nextHabits = habits.map((habit) => String(habit.id) === habitId
      ? { ...habit, completedToday: true, todayStatus: 'success' }
      : habit)
    setHabits(nextHabits)

    if (nativeApp && snapshot) {
      saveAndroidWidgetSnapshot({
        ...snapshot,
        generatedAt: new Date().toISOString(),
        habits: { ...(snapshot.habits || {}), today: nextHabits },
      }, { preferences: prefs }).catch(() => {})
    }

    try {
      await api.post(`/habits/${habitId}/entries`, { date: localDateKey(), status: 'success' })
    } catch {
      setHabits(previous)
    }
  }, [habits, nativeApp, prefs, snapshot])

  const askAboutToday = () => {
    const date = localDateKey()
    const sources = [
      `${habits.length} habit records`,
      activeWorkout ? '1 active workout' : 'no active workout',
      `${paymentSuggestions.filter((item) => item.status === 'pending').length} payment reviews`,
    ]
    const detail = {
      title: 'Review today',
      text: `Review my records for ${date}. Prioritize unresolved work and explain the evidence behind each suggestion.`,
      pageContext: {
        route: '/home',
        pageType: 'today-register',
        filters: { date, sources, intelligenceId: intelligence?.id || null },
      },
    }
    sessionStorage.setItem('personal-server:pending-chat-prompt', JSON.stringify(detail))
    navigate('/chat')
  }

  const syncDetail = formatSyncDetail(snapshot?.generatedAt || snapshot?.sync?.checkedAt, syncState)
  const money = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(todayBrief.facts.cash.spentToday)

  return (
    <div className="record-today" data-testid={nativeApp ? 'native-dashboard' : 'today-dashboard'}>
      <PageHeading
        eyebrow={formatToday()}
        title={todayBrief.openCount ? `${todayBrief.openCount} ${todayBrief.openCount === 1 ? 'record needs' : 'records need'} you` : 'Today is clear'}
        actions={<button type="button" className="record-button" onClick={askAboutToday}><Icon name="sparkles" size={16} />Ask from records</button>}
      >
        <p>{todayBrief.openCount
          ? 'Review the queue in order. Each item opens at the point where you can finish it.'
          : 'Nothing needs review. Your latest factual totals remain below.'}</p>
        <span className={`record-today__freshness${syncState === 'offline' ? ' is-offline' : ''}`}><i aria-hidden="true" />{syncDetail}</span>
      </PageHeading>

      <SummaryStrip>
        <SummaryItem label="Habits logged" value={`${todayBrief.facts.habits.completed}/${todayBrief.facts.habits.total}`} detail="Today" />
        <SummaryItem label="Cash out" value={money} detail="Today" tone="negative" />
        <SummaryItem label="Movement" value={todayBrief.facts.movement.steps.toLocaleString()} detail="Steps today" />
        <SummaryItem label="Listening" value={todayBrief.facts.music.streamsToday.toLocaleString()} detail="Streams today" />
      </SummaryStrip>

      <div className="record-today__grid">
        <Register
          title="Open records"
          description="Decide, continue, or confirm"
          data-testid="today-open-register"
          action={todayBrief.primary && <Link className="record-register__header-link" to={todayBrief.primary.to}>Open next <Icon name="arrow-right" size={14} /></Link>}
        >
          {!loaded ? (
            <StatePanel kind="loading" title="Opening today’s records" detail="Cached records appear first while changes are checked." />
          ) : todayItems.length === 0 ? (
            <StatePanel kind="empty" title="Nothing needs review" detail="New records will appear here when they need a decision or continuation." />
          ) : todayItems.map((item) => {
            const meta = ITEM_META[item.kind] || { icon: 'circle', label: 'Record' }
            return (
              <RegisterRow
                key={item.id}
                leading={<span className="record-today__row-icon"><Icon name={meta.icon} size={17} /></span>}
                meta={item.detail || meta.label}
                action={item.kind === 'habit-due' ? (
                  <button type="button" className="record-button record-button--compact" onClick={() => handleHabitDone(item)} aria-label={`Mark ${item.label} done`}>Done</button>
                ) : (
                  <Link className="record-button record-button--compact" to={item.to}>Open <Icon name="arrow-up-right" size={14} /></Link>
                )}
              >
                <strong>{item.label}</strong>
                <span>{meta.label}</span>
              </RegisterRow>
            )
          })}
        </Register>

        <Register title="Record sources" description="What today is based on">
          <RegisterRow leading={<Icon name="check-circle" size={17} />} meta={`${todayBrief.facts.habits.completed} logged`}><strong>Habits</strong><span>{todayBrief.facts.habits.total} scheduled today</span></RegisterRow>
          <RegisterRow leading={<Icon name="wallet" size={17} />} meta={money}><strong>Cash</strong><span>Transactions dated today</span></RegisterRow>
          <RegisterRow leading={<Icon name="footprints" size={17} />} meta={todayBrief.facts.movement.steps.toLocaleString()}><strong>Movement</strong><span>Latest device record</span></RegisterRow>
          <RegisterRow leading={<Icon name="music" size={17} />} meta={todayBrief.facts.music.streamsToday.toLocaleString()}><strong>Music</strong><span>Spotify streams today</span></RegisterRow>
        </Register>
      </div>
    </div>
  )
}
