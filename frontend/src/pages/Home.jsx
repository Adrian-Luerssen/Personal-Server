import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, subscribeToApiPath } from '../api'
import { saveAndroidWidgetSnapshot } from '../androidWidgets.mjs'
import { AnimatedNumber, MetricCard, formatDuration, formatNumberShort } from '../components/shared'
import { formatCompactMoney, formatMoney, normalizeCurrency } from '../moneyFormat.mjs'
import PageHeader from '../components/PageHeader'
import ProgressRing from '../components/ProgressRing'
import ScrollReveal from '../components/ScrollReveal'
import Icon from '../components/icons/Icon'
import { isNativeMobileApp } from '../mobilePlatform'
import { usePreferences } from '../contexts/PreferencesContext'
import {
  getEnabledHomeWidgets,
  isFeatureShownOnHome,
  isFeatureSyncEnabled,
} from '../modulePreferences.mjs'
import { mergeLiveStepIntoActivitySummary, subscribeToLiveStepUpdates } from '../nativeHealth.mjs'

function DashboardStatus({ focus }) {
  const map = {
    momentum: { label: 'Momentum', tone: 'positive' },
    steady: { label: 'Steady', tone: 'neutral' },
    attention: { label: 'Attention', tone: 'warning' },
  }
  const current = map[focus] || map.steady
  return (
    <span className={`dashboard-status dashboard-status--${current.tone}`}>
      {current.label}
    </span>
  )
}

function SnapshotCard({ item }) {
  return (
    <MetricCard
      label={item.label}
      value={item.value}
      note={item.note}
      tone={item.id}
    />
  )
}

function InsightCard({ insight, onAskAi }) {
  return (
    <article className={`journal-insight-card journal-insight-card--${insight.tone || 'neutral'}`}>
      <div className="journal-insight-card__header">
        <span>{(insight.domains || []).join(' / ')}</span>
        <strong>{insight.title}</strong>
      </div>
      <p>{insight.summary}</p>
      {Array.isArray(insight.evidence) && insight.evidence.length > 0 && (
        <ul className="journal-evidence-list">
          {insight.evidence.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      <button className="btn btn-ghost small journal-ai-inline-btn" onClick={onAskAi}>
        <Icon name="sparkles" size={14} />
        Ask AI to go deeper
      </button>
    </article>
  )
}

function RailCard({ title, icon, children, action }) {
  return (
    <div className="card journal-rail-card">
      <div className="journal-rail-card__head">
        <div>
          <span>{title}</span>
        </div>
        {icon && <Icon name={icon} size={16} />}
      </div>
      <div>{children}</div>
      {action}
    </div>
  )
}

function NativeActionCard({ icon, title, value, tone = 'default', onClick }) {
  return (
    <button type="button" className={`native-action-card native-action-card--${tone}`} onClick={onClick}>
      <span className="native-action-card__icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="native-action-card__copy">
        <strong>{title}</strong>
        {value && <small>{value}</small>}
      </span>
    </button>
  )
}

function NativeMetricCard({ icon, label, value, sub, accent = 'var(--color-accent)' }) {
  return (
    <article className="native-metric-card">
      <div className="native-metric-card__icon" style={{ color: accent, background: `${accent}1f` }}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </article>
  )
}

function NativeHabitRow({ habit, onStatus }) {
  const currentStatus = habit.todayStatus || 'none'
  const color = habit.habitColor || habit.color || '#a78bfa'
  const logged = currentStatus !== 'none'

  return (
    <div className={`native-habit-row native-habit-row--${logged ? currentStatus : 'open'}`}>
      <div className="native-habit-row__icon" style={{ color, background: `${color}22` }}>
        <Icon name={habit.habitIconName || habit.iconName || 'circle-check'} size={17} />
      </div>
      <div className="native-habit-row__copy">
        <strong>{habit.habitName || habit.name}</strong>
        <small>{habit.currentStreak ? `${habit.currentStreak} day streak` : 'Ready to log'}</small>
      </div>
      <div className="native-habit-row__actions" aria-label={`${habit.habitName || habit.name} status`}>
        <button
          type="button"
          className={currentStatus === 'success' ? 'is-active' : ''}
          onClick={() => onStatus(habit, 'success')}
          aria-label={`Mark ${habit.habitName || habit.name} done`}
        >
          <Icon name="check" size={15} />
        </button>
        <button
          type="button"
          className={currentStatus === 'skip' ? 'is-active' : ''}
          onClick={() => onStatus(habit, 'skip')}
          aria-label={`Skip ${habit.habitName || habit.name}`}
        >
          <Icon name="minus" size={15} />
        </button>
        <button
          type="button"
          className={currentStatus === 'fail' || currentStatus === 'missed' ? 'is-active' : ''}
          onClick={() => onStatus(habit, 'fail')}
          aria-label={`Mark ${habit.habitName || habit.name} missed`}
        >
          <Icon name="x" size={15} />
        </button>
      </div>
    </div>
  )
}

function NativePrimaryAction({ activeWorkout, weeklySummary, nav }) {
  if (activeWorkout) {
    return (
      <section className="native-primary-action native-primary-action--workout">
        <div>
          <span className="native-eyebrow">Active workout</span>
          <h1>{activeWorkout.name || 'Workout in progress'}</h1>
          <p>{activeWorkout.startedAt ? `Started ${formatLastSynced(activeWorkout.startedAt)}` : 'Resume and keep logging without rebuilding context.'}</p>
        </div>
        <button type="button" className="native-primary-action__button" onClick={() => nav('/workout/active')}>
          <Icon name="play" size={18} />
          Continue
        </button>
      </section>
    )
  }

  return (
    <section className="native-primary-action">
      <div>
        <span className="native-eyebrow">Next action</span>
        <h1>Start the day from what is due now</h1>
        <p>{weeklySummary?.workouts ? `${weeklySummary.workouts} workouts this week. Keep the loop short.` : 'Log habits first, then start training when ready.'}</p>
      </div>
      <button type="button" className="native-primary-action__button" onClick={() => nav('/workout/active')}>
        <Icon name="dumbbell" size={18} />
        Train
      </button>
    </section>
  )
}

function NativeHomeDashboard({
  intelligence,
  activityItems,
  weeklySummary,
  habitCompletionPct,
  todayCompleted,
  totalHabits,
  todaySpent,
  financeCurrency,
  workoutTotals,
  spotifyStats,
  todayStreams,
  activitySummary,
  openAiPrompt,
  nav,
  loaded,
  snapshotMeta,
  syncState,
  activeWorkout,
  habits,
  onHabitStatus,
  visibleHomeWidgets,
  prefs,
}) {
  const firstPrompt = intelligence.aiPrompts?.[0]
  const primaryInsight = intelligence.insights?.[0]
  const visibleWidgetIds = new Set((visibleHomeWidgets || []).map((widget) => widget.id))
  const showHabits = visibleWidgetIds.has('habits-today') && isFeatureShownOnHome(prefs, 'habits')
  const showTraining = visibleWidgetIds.has('training-today') && isFeatureShownOnHome(prefs, 'training')
  const showFinance = visibleWidgetIds.has('finance-today') && isFeatureShownOnHome(prefs, 'finance')
  const showMusic = visibleWidgetIds.has('music-ranking') && isFeatureShownOnHome(prefs, 'music')
  const showAssistant = visibleWidgetIds.has('assistant-prompt') && isFeatureShownOnHome(prefs, 'assistant')
  const hasQuickActions = showFinance || showMusic || showAssistant
  const hasMetrics = showTraining || showFinance || showMusic
  const openHabits = habits.filter((habit) => !habit.todayStatus || habit.todayStatus === 'none')
  const loggedHabits = habits.filter((habit) => habit.todayStatus && habit.todayStatus !== 'none')
  const visibleHabits = [...openHabits, ...loggedHabits].slice(0, 3)
  const loggedCount = loggedHabits.length
  const incompleteCount = Math.max(totalHabits - loggedCount, 0)

  return (
    <div className="native-dashboard" data-testid="native-dashboard">
      <section className={`native-sync-strip native-sync-strip--${syncState || 'idle'}`}>
        <span>{syncState === 'offline' ? 'Offline cache' : syncState === 'syncing' ? 'Refreshing cache' : 'Cached'}</span>
        <strong>{formatLastSynced(snapshotMeta?.generatedAt || snapshotMeta?.checkedAt)}</strong>
      </section>

      {showTraining && <NativePrimaryAction activeWorkout={activeWorkout} weeklySummary={weeklySummary} nav={nav} />}

      {showHabits && (
      <section className="native-checklist-card">
        <div className="native-section-head">
          <div>
            <span className="native-eyebrow">Today</span>
            <h2>{loggedCount}/{totalHabits} habits logged</h2>
            <p>{incompleteCount > 0 ? `${incompleteCount} remaining` : 'Daily checklist clear'}</p>
          </div>
          <div className="native-today-card__ring">
            <ProgressRing value={habitCompletionPct} size={64} strokeWidth={7} color="#a78bfa" />
            <strong>{habitCompletionPct}%</strong>
          </div>
        </div>
        <div className="native-habit-list">
          {!loaded ? (
            <p className="journal-empty">Loading cached habits...</p>
          ) : visibleHabits.length === 0 ? (
            <p className="journal-empty">No active habits configured.</p>
          ) : (
            visibleHabits.map((habit) => (
              <NativeHabitRow
                key={habit.id || habit.habitId}
                habit={habit}
                onStatus={onHabitStatus}
              />
            ))
          )}
        </div>
        <button type="button" className="native-link-row" onClick={() => nav('/habits')}>
          <span>Open full habit log</span>
          <Icon name="chevron-right" size={17} />
        </button>
      </section>
      )}

      {hasQuickActions && <section className="native-quick-row" aria-label="Secondary actions">
        {showFinance && <button type="button" onClick={() => nav('/finance/transactions')}>
          <Icon name="receipt" size={18} />
          <span>Add expense</span>
          <small>{formatCompactMoney(todaySpent, financeCurrency)}</small>
        </button>}
        {showMusic && <button type="button" onClick={() => nav('/spotify/ranking')}>
          <Icon name="trophy" size={18} />
          <span>Ranking</span>
          <small>{formatNumberShort(todayStreams)} today</small>
        </button>}
        {showAssistant && <button type="button" onClick={() => openAiPrompt(firstPrompt)}>
          <Icon name="sparkles" size={18} />
          <span>Ask AI</span>
          <small>{intelligence.score} score</small>
        </button>}
      </section>}

      {hasMetrics && <section className="native-metric-strip native-metric-strip--compact" aria-label="Weekly snapshot">
        {showTraining && <NativeMetricCard
          icon="dumbbell"
          label="Training"
          value={`${workoutTotals?.totalWorkouts ?? weeklySummary?.workouts ?? 0}`}
          sub="sessions"
          accent="#4ade80"
        />}
        {showFinance && <NativeMetricCard
          icon="wallet"
          label="Spend"
          value={formatMoney(todaySpent, financeCurrency)}
          sub="today"
          accent="#fbbf24"
        />}
        {showMusic && <NativeMetricCard
          icon="music"
          label="Music"
          value={formatNumberShort(todayStreams)}
          sub="today"
          accent="#7dd3fc"
        />}
        {showTraining && <NativeMetricCard
          icon="activity"
          label="Steps"
          value={formatNumberShort(activitySummary?.today?.steps ?? 0)}
          sub="today"
          accent="#38bdf8"
        />}
      </section>}

      {primaryInsight && showAssistant && (
        <section className={`native-insight-card native-insight-card--${primaryInsight.tone || 'neutral'}`}>
          <div>
            <span className="native-eyebrow">{(primaryInsight.domains || ['Insight']).join(' / ')}</span>
            <h2>{primaryInsight.title}</h2>
            <p>{primaryInsight.summary}</p>
          </div>
          <button type="button" className="btn btn-ghost small" onClick={() => openAiPrompt(null, primaryInsight)}>
            <Icon name="sparkles" size={14} />
            Ask
          </button>
        </section>
      )}

      {showTraining && (
      <section className="native-activity-card">
        <div className="native-section-head">
          <h2>Recent</h2>
          <button type="button" onClick={() => nav('/workout/history')}>History</button>
        </div>
        {!loaded ? (
          <p className="journal-empty">Loading activity...</p>
        ) : activityItems.length === 0 ? (
          <p className="journal-empty">No recent activity yet.</p>
        ) : (
          <div className="journal-activity-list">
            {activityItems.slice(0, 3).map((item, index) => (
              <div key={`${item.text}-${index}`} className="journal-activity-item">
                <div className="journal-activity-item__icon" style={{ color: item.color, background: `${item.color}15` }}>
                  <Icon name={item.icon} size={14} />
                </div>
                <div>
                  <strong>{item.text}</strong>
                  <span>{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const nativeApp = isNativeMobileApp()
  const { prefs } = usePreferences()
  const visibleHomeWidgets = useMemo(() => getEnabledHomeWidgets(prefs), [prefs])
  const [spotifyStats, setSpotifyStats] = useState(null)
  const [workoutTotals, setWorkoutTotals] = useState(null)
  const [workoutStreamStats, setWorkoutStreamStats] = useState(null)
  const [habitsSummary, setHabitsSummary] = useState(null)
  const [habitsTrends, setHabitsTrends] = useState(null)
  const [financeSummary, setFinanceSummary] = useState(null)
  const [recentSessions, setRecentSessions] = useState(null)
  const [weeklySummary, setWeeklySummary] = useState(null)
  const [workoutHabitCorrelation, setWorkoutHabitCorrelation] = useState(null)
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [workoutPRs, setWorkoutPRs] = useState(null)
  const [intelligence, setIntelligence] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [mobileSnapshotMeta, setMobileSnapshotMeta] = useState(null)
  const [mobileSyncState, setMobileSyncState] = useState('idle')
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [activitySummary, setActivitySummary] = useState(null)

  const applyMobileSnapshot = useCallback((snapshot) => {
    if (!snapshot) return
    saveAndroidWidgetSnapshot(snapshot, { preferences: prefs }).catch(() => {})
    setIntelligence(snapshot.intelligence || null)
    setSpotifyStats({
      ...(snapshot.spotify?.stats || {}),
      todayStreams: snapshot.today?.streams ?? snapshot.spotify?.stats?.todayStreams ?? 0,
      todayMsListened: snapshot.today?.msListened ?? snapshot.spotify?.stats?.todayMsListened ?? 0,
    })
    setWorkoutTotals(snapshot.workout?.totals || null)
    setActiveWorkout(snapshot.workout?.activeSession || null)
    setWorkoutStreamStats(null)
    setHabitsSummary(mapMobileHabitSummary(snapshot.habits?.today || []))
    setHabitsTrends({ dailyCompletions: snapshot.habits?.dailyCompletions || [] })
    setFinanceSummary({
      ...(snapshot.finance?.summary || {}),
      totalExpenses: snapshot.finance?.summary?.totalExpense ?? snapshot.finance?.monthlySpent ?? 0,
      todayExpense: snapshot.today?.financeSpent ?? snapshot.finance?.summary?.todayExpense ?? snapshot.finance?.todaySpent ?? 0,
      todayIncome: snapshot.today?.financeIncome ?? snapshot.finance?.summary?.todayIncome ?? 0,
      currency: normalizeCurrency(snapshot.today?.financeCurrency ?? snapshot.finance?.currency ?? snapshot.finance?.summary?.currency),
    })
    setActivitySummary(snapshot.activity || null)
    setRecentSessions(snapshot.workout?.recentSessions || [])
    setWeeklySummary(snapshot.weeklySummary || null)
    setWorkoutHabitCorrelation(snapshot.workoutHabitCorrelation || null)
    setBudgetStatus(null)
    setWorkoutPRs(null)
    setMobileSnapshotMeta({
      generatedAt: snapshot.generatedAt,
      checkedAt: snapshot.sync?.checkedAt,
      watermarks: snapshot.sync?.watermarks || {},
    })
    setLoaded(true)
  }, [prefs])

  useEffect(() => {
    let ignore = false

    if (nativeApp) {
      const unsubscribe = subscribeToApiPath('/dashboard/mobile', (entry) => {
        if (!ignore && entry?.data) applyMobileSnapshot(entry.data)
      })

      async function loadMobile() {
        setMobileSyncState('syncing')
        try {
          const snapshot = await api.get('/dashboard/mobile')
          if (!ignore) applyMobileSnapshot(snapshot)
          if (!ignore) setMobileSyncState('idle')
        } catch {
          if (!ignore) {
            setLoaded(true)
            setMobileSyncState('offline')
          }
        }
      }

      loadMobile()
      return () => {
        ignore = true
        unsubscribe()
      }
    }

    async function load() {
      const requests = [
        ['intel', isFeatureSyncEnabled(prefs, 'assistant'), () => api.get('/dashboard/intelligence')],
        ['sp', isFeatureSyncEnabled(prefs, 'music'), () => api.get('/streams/stats?timeframe=all')],
        ['wk', isFeatureSyncEnabled(prefs, 'training'), () => api.get('/workout/sessions?page=1&limit=1')],
        ['wms', isFeatureSyncEnabled(prefs, 'training') && isFeatureSyncEnabled(prefs, 'music'), () => api.get('/dashboard/streams/workout')],
        ['hs', isFeatureSyncEnabled(prefs, 'habits'), () => api.get('/habits/summary')],
        ['ht', isFeatureSyncEnabled(prefs, 'habits'), () => api.get('/habits/trends')],
        ['fs', isFeatureSyncEnabled(prefs, 'finance'), () => api.get('/finance/transactions/summary')],
        ['rs', isFeatureSyncEnabled(prefs, 'training'), () => api.get('/workout/sessions/recent')],
        ['ws', true, () => api.get('/dashboard/insights/weekly')],
        ['whc', isFeatureSyncEnabled(prefs, 'training') && isFeatureSyncEnabled(prefs, 'habits'), () => api.get('/dashboard/insights/workout-habits')],
        ['bs', isFeatureSyncEnabled(prefs, 'finance'), () => api.get('/finance/budgets/status')],
        ['prs', isFeatureSyncEnabled(prefs, 'training'), () => api.get('/workout/sessions/prs')],
      ]
      const entries = await Promise.all(
        requests
          .filter(([, enabled]) => enabled)
          .map(async ([key, , request]) => [key, await request().catch(() => null)]),
      )

      if (ignore) return
      const { intel, sp, wk, wms, hs, ht, fs, rs, ws, whc, bs, prs } = Object.fromEntries(entries)

      if (intel) setIntelligence(intel)
      if (sp) setSpotifyStats(sp)
      if (wk) {
        setWorkoutTotals({
          totalWorkouts: wk.totalWorkouts ?? (Array.isArray(wk.sessions) ? wk.sessions.length : 0),
          totalVolume: wk.totalVolume ?? 0,
          totalSets: wk.totalSets ?? 0,
          totalReps: wk.totalReps ?? 0,
          totalTimeSeconds: wk.totalTimeSeconds ?? 0,
        })
      }
      if (wms) setWorkoutStreamStats(wms)
      if (hs) setHabitsSummary(hs)
      if (ht) setHabitsTrends(ht)
      if (fs) setFinanceSummary(fs)
      if (rs) setRecentSessions(rs)
      if (ws) setWeeklySummary(ws)
      if (whc) setWorkoutHabitCorrelation(whc)
      if (bs) setBudgetStatus(bs)
      if (prs) setWorkoutPRs(prs)
      setLoaded(true)
    }

    load()
    return () => { ignore = true }
  }, [nativeApp, applyMobileSnapshot, prefs])

  useEffect(() => {
    if (!nativeApp || !isFeatureSyncEnabled(prefs, 'training')) return undefined
    let cancelled = false
    let unsubscribe = null
    subscribeToLiveStepUpdates((event) => {
      if (cancelled) return
      setActivitySummary((current) => mergeLiveStepIntoActivitySummary(current, event))
    })
      .then((nextUnsubscribe) => {
        unsubscribe = nextUnsubscribe
      })
      .catch(() => {})

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [nativeApp, prefs])

  const habitsArray = Array.isArray(habitsSummary) ? habitsSummary : []
  const totalHabits = habitsArray.length
  const todayCompleted = habitsArray.filter((habit) => habit.completedToday).length
  const habitCompletionPct = totalHabits > 0 ? Math.round((todayCompleted / totalHabits) * 100) : 0
  const bestStreak = habitsArray.reduce((max, habit) => Math.max(max, habit.longestStreak ?? 0), 0)
  const monthlySpent = Math.abs(financeSummary?.totalExpenses ?? financeSummary?.total ?? 0)
  const financeCurrency = normalizeCurrency(financeSummary?.currency)
  const todaySpent = Math.abs(financeSummary?.todayExpense ?? financeSummary?.todaySpent ?? 0)
  const todayStreams = Number(spotifyStats?.todayStreams ?? 0) || 0
  const activityItems = useMemo(() => buildActivityFeed(habitsArray, recentSessions), [habitsArray, recentSessions])

  const intelligenceFallback = useMemo(() => {
    if (intelligence) return intelligence
    const workouts = workoutTotals?.totalWorkouts ?? 0
    const focus = workouts >= 4 && habitCompletionPct >= 70 ? 'momentum' : habitCompletionPct >= 45 ? 'steady' : 'attention'
    return {
      focus,
      score: focus === 'momentum' ? 78 : focus === 'steady' ? 58 : 32,
      headline: focus === 'momentum'
        ? 'Momentum is forming across the week'
        : focus === 'steady'
          ? 'The week is holding, but not compounding yet'
          : 'This week needs tighter structure',
      summary: 'The intelligence layer is still loading, so this brief is derived from current dashboard signals.',
      snapshot: [
        { id: 'training', label: 'Training', value: `${weeklySummary?.workouts ?? 0} sessions`, note: 'Weekly workout cadence' },
        { id: 'habits', label: 'Habits', value: `${habitCompletionPct}%`, note: "Today's completion rate" },
        { id: 'spending', label: 'Spending', value: formatMoney(monthlySpent, financeCurrency), note: 'Current monthly expenses' },
        { id: 'media', label: 'Listening', value: `${weeklySummary?.streams ?? 0} streams`, note: 'Streams in the current week' },
      ],
      insights: workoutHabitCorrelation ? [
        {
          id: 'habit-workout-correlation',
          title: 'Consistency shifts with training days',
          summary: `Habit completion is ${workoutHabitCorrelation.workoutDays.completionRate}% on workout days versus ${workoutHabitCorrelation.restDays.completionRate}% on rest days.`,
          tone: workoutHabitCorrelation.workoutDays.completionRate >= workoutHabitCorrelation.restDays.completionRate ? 'positive' : 'warning',
          domains: ['workout', 'habits'],
          evidence: [`${workoutHabitCorrelation.totalWorkoutDays} workout days in the measured window`],
        },
      ] : [],
      aiPrompts: [
        {
          id: 'dashboard-review',
          label: 'Ask AI for a dashboard review',
          prompt: 'Review my current dashboard state and tell me what the biggest cross-domain pattern is right now.',
          pageContext: { route: '/home', pageType: 'dashboard', filters: { source: 'dashboard-fallback' } },
        },
      ],
    }
  }, [intelligence, workoutTotals, habitCompletionPct, weeklySummary, monthlySpent, financeCurrency, workoutHabitCorrelation])

  const openAiPrompt = (prompt, insight) => {
    const detail = {
      title: prompt?.label || insight?.title || 'AI analysis',
      text: [
        prompt?.prompt || `Analyze this dashboard insight in more depth: ${insight?.title}.`,
        insight ? `Insight summary: ${insight.summary}` : null,
        insight?.evidence?.length ? `Evidence:\n- ${insight.evidence.join('\n- ')}` : null,
      ].filter(Boolean).join('\n\n'),
      pageContext: prompt?.pageContext || {
        route: '/home',
        pageType: 'dashboard',
        filters: { source: 'dashboard-ui', insightId: insight?.id || 'manual' },
      },
    }

    if (nativeApp) {
      sessionStorage.setItem('personal-server:pending-chat-prompt', JSON.stringify(detail))
      nav('/chat')
      return
    }

    window.dispatchEvent(new CustomEvent('personal-server:chat-prompt', { detail }))
  }

  const handleNativeHabitStatus = useCallback(async (habit, status) => {
    const habitId = habit.id || habit.habitId
    if (!habitId) return
    const date = toLocalDateKey()
    const previous = habitsSummary
    const currentStatus = habit.todayStatus || 'none'
    const nextStatus = currentStatus === status ? 'none' : status

    setHabitsSummary((items) => (items || []).map((item) => {
      const itemId = item.id || item.habitId
      if (itemId !== habitId) return item
      return {
        ...item,
        todayStatus: nextStatus === 'none' ? null : nextStatus,
        completedToday: nextStatus === 'success',
      }
    }))

    const nextHabits = (habitsSummary || []).map((item) => {
      const itemId = item.id || item.habitId
      if (itemId !== habitId) return item
      return {
        ...item,
        todayStatus: nextStatus === 'none' ? null : nextStatus,
        completedToday: nextStatus === 'success',
      }
    })

    saveAndroidWidgetSnapshot({
      generatedAt: new Date().toISOString(),
      intelligence: intelligenceFallback,
      habits: { today: nextHabits },
      workout: { totals: workoutTotals },
      today: { financeSpent: todaySpent, financeCurrency, streams: todayStreams },
      finance: { summary: financeSummary },
      spotify: { stats: spotifyStats },
      weeklySummary,
    }, { preferences: prefs }).catch(() => {})

    try {
      if (nextStatus === 'none') {
        await api.delete(`/habits/${habitId}/entries/${date}`)
      } else if (currentStatus !== 'none') {
        await api.patch(`/habits/${habitId}/entries/${date}`, { status: nextStatus })
      } else {
        await api.post(`/habits/${habitId}/entries`, { date, status: nextStatus })
      }
    } catch {
      setHabitsSummary(previous)
    }
  }, [financeCurrency, financeSummary, habitsSummary, intelligenceFallback, prefs, spotifyStats, todaySpent, todayStreams, weeklySummary, workoutTotals])

  if (nativeApp) {
    return (
      <NativeHomeDashboard
        intelligence={intelligenceFallback}
        activityItems={activityItems}
        weeklySummary={weeklySummary}
        habitCompletionPct={habitCompletionPct}
        todayCompleted={todayCompleted}
        totalHabits={totalHabits}
        todaySpent={todaySpent}
        financeCurrency={financeCurrency}
        workoutTotals={workoutTotals}
        spotifyStats={spotifyStats}
        todayStreams={todayStreams}
        activitySummary={activitySummary}
        openAiPrompt={openAiPrompt}
        nav={nav}
        loaded={loaded}
        snapshotMeta={mobileSnapshotMeta}
        syncState={mobileSyncState}
        activeWorkout={activeWorkout}
        habits={habitsArray}
        onHabitStatus={handleNativeHabitStatus}
        visibleHomeWidgets={visibleHomeWidgets}
        prefs={prefs}
      />
    )
  }

  const desktopWidgetIds = new Set(visibleHomeWidgets.map((widget) => widget.id))
  const desktopShowHabits = desktopWidgetIds.has('habits-today') && isFeatureShownOnHome(prefs, 'habits')
  const desktopShowTraining = desktopWidgetIds.has('training-today') && isFeatureShownOnHome(prefs, 'training')
  const desktopShowFinance = desktopWidgetIds.has('finance-today') && isFeatureShownOnHome(prefs, 'finance')
  const desktopShowMusic = desktopWidgetIds.has('music-ranking') && isFeatureShownOnHome(prefs, 'music')
  const desktopShowAssistant = desktopWidgetIds.has('assistant-prompt') && isFeatureShownOnHome(prefs, 'assistant')
  const activeDomainLabels = [
    desktopShowTraining ? 'training' : null,
    desktopShowHabits ? 'habits' : null,
    desktopShowFinance ? 'money' : null,
    desktopShowMusic ? 'music' : null,
  ].filter(Boolean)
  const visibleSnapshot = intelligenceFallback.snapshot.filter((item) => {
    const moduleBySnapshotId = {
      training: 'training',
      habits: 'habits',
      spending: 'finance',
      media: 'music',
    }
    const moduleId = moduleBySnapshotId[item.id]
    if (!moduleId) return true
    return isFeatureShownOnHome(prefs, moduleId)
  })

  return (
    <div className="dashboard-journal">
      <PageHeader
        icon="layout-dashboard"
        eyebrow="Private ledger"
        title="Today"
        subtitle={activeDomainLabels.length ? `Cached records across ${activeDomainLabels.join(', ')}. Verified when changed.` : 'Choose active modules in Settings to build this review surface.'}
        meta={
          <div className="dashboard-header-meta">
            <DashboardStatus focus={intelligenceFallback.focus} />
            <div className="dashboard-header-score">
              <span>Review score</span>
              <strong>{intelligenceFallback.score}</strong>
            </div>
          </div>
        }
      />

      <ScrollReveal>
        <section className="dashboard-brief-hero">
          <div className="dashboard-brief-copy">
            <span className="dashboard-section-kicker">What deserves attention</span>
            <h2>{intelligenceFallback.headline}</h2>
            <p>{intelligenceFallback.summary}</p>
            <div className="dashboard-brief-actions">
              {desktopShowAssistant && (intelligenceFallback.aiPrompts || []).slice(0, 2).map((prompt) => (
                <button key={prompt.id} className="btn" onClick={() => openAiPrompt(prompt)}>
                  <Icon name="sparkles" size={14} />
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-brief-scorecard card">
            <div className="dashboard-brief-scorecard__top">
              <span>Signal quality</span>
              <DashboardStatus focus={intelligenceFallback.focus} />
            </div>
            <div className="dashboard-brief-ring">
              <ProgressRing
                value={intelligenceFallback.score}
                size={118}
                strokeWidth={8}
                color={
                  intelligenceFallback.focus === 'attention'
                    ? '#f87171'
                    : intelligenceFallback.focus === 'steady'
                      ? '#fbbf24'
                      : 'var(--color-accent)'
                }
              />
              <strong>{intelligenceFallback.score}</strong>
            </div>
            <p>
              Calculated from cached records and refreshed when sync confirms changed data.
            </p>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={70}>
        <section className="journal-snapshot-grid">
          {visibleSnapshot.map((item) => <SnapshotCard key={item.id} item={item} />)}
        </section>
      </ScrollReveal>

      <section className="dashboard-main-grid">
        <ScrollReveal delay={120}>
          <div className="dashboard-main-column">
            <div className="card journal-feature-panel">
              <div className="journal-feature-panel__header">
                <div>
                  <span className="dashboard-section-kicker">Evidence</span>
                  <h3>Signals that need review</h3>
                </div>
              </div>
              <div className="journal-insight-grid">
                {(intelligenceFallback.insights || []).map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onAskAi={() => openAiPrompt(null, insight)}
                  />
                ))}
              </div>
            </div>

            {(desktopShowTraining || desktopShowHabits || desktopShowFinance || desktopShowAssistant) && <div className="dashboard-story-band">
              {(desktopShowTraining || desktopShowHabits || desktopShowFinance) && (
              <div className="card dashboard-story-card">
                <span className="dashboard-section-kicker">Cadence</span>
                <h3>Weekly cadence by active modules.</h3>
                <div className="dashboard-story-metrics">
                  {desktopShowTraining && <div>
                    <span>This week</span>
                    <strong>{weeklySummary?.workouts ?? 0} workouts</strong>
                  </div>}
                  {desktopShowHabits && <div>
                    <span>Habits completed</span>
                    <strong>{weeklySummary ? `${weeklySummary.habitsCompleted}/${weeklySummary.habitsTotal}` : '0/0'}</strong>
                  </div>}
                  {desktopShowFinance && <div>
                    <span>Weekly spend</span>
                    <strong>{formatMoney(weeklySummary?.spending ?? 0, financeCurrency)}</strong>
                  </div>}
                </div>
                {workoutHabitCorrelation && (
                  <p className="dashboard-story-note">
                    Habit completion is <strong>{workoutHabitCorrelation.workoutDays.completionRate}%</strong> on workout days and <strong>{workoutHabitCorrelation.restDays.completionRate}%</strong> on rest days.
                  </p>
                )}
              </div>
              )}

              {desktopShowAssistant && (
              <div className="card dashboard-story-card dashboard-story-card--accent">
                <span className="dashboard-section-kicker">Assistant</span>
                <h3>Ask against the current records.</h3>
                <p>
                  Send the current dashboard context to the connected assistant without rebuilding the query manually.
                </p>
                <div className="dashboard-ai-prompt-list">
                  {(intelligenceFallback.aiPrompts || []).map((prompt) => (
                    <button key={prompt.id} className="journal-ai-prompt" onClick={() => openAiPrompt(prompt)}>
                      <span>{prompt.label}</span>
                      <Icon name="arrow-up-right" size={15} />
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={180}>
          <div className="dashboard-rail">
            {desktopShowTraining && <RailCard
              title="Recent activity"
              icon="activity"
              action={<button className="btn btn-ghost small" onClick={() => nav('/workout/history')}>Open history</button>}
            >
              {!loaded ? (
                <p className="journal-empty">Loading the latest activity...</p>
              ) : activityItems.length === 0 ? (
                <p className="journal-empty">No recent activity yet.</p>
              ) : (
                <div className="journal-activity-list">
                  {activityItems.slice(0, 5).map((item, index) => (
                    <div key={`${item.text}-${index}`} className="journal-activity-item">
                      <div className="journal-activity-item__icon" style={{ color: item.color, background: `${item.color}15` }}>
                        <Icon name={item.icon} size={14} />
                      </div>
                      <div>
                        <strong>{item.text}</strong>
                        <span>{item.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </RailCard>}

            {desktopShowHabits && <RailCard title="Habits today" icon="target">
              <div className="journal-progress-block">
                <div className="journal-progress-ring">
                  <ProgressRing value={habitCompletionPct} size={92} strokeWidth={8} color="#a78bfa" />
                  <strong>{habitCompletionPct}%</strong>
                </div>
                <div className="journal-progress-copy">
                  <p>{todayCompleted} of {totalHabits} habits completed today.</p>
                  <span>Best streak: {bestStreak} days</span>
                </div>
              </div>
            </RailCard>}

            {desktopShowFinance && <RailCard title="Budget pressure" icon="piggy-bank">
              {!Array.isArray(budgetStatus) || budgetStatus.length === 0 ? (
                <p className="journal-empty">No budget data available yet.</p>
              ) : (
                <div className="journal-budget-list">
                  {budgetStatus.slice(0, 4).map((budget) => (
                    <div key={budget.id} className="journal-budget-item">
                      <div className="journal-budget-item__head">
                        <strong>{budget.categoryName}</strong>
                        <span>${budget.spent.toFixed(0)} / ${budget.amount.toFixed(0)}</span>
                      </div>
                      <div className="journal-budget-bar">
                        <div
                          className="journal-budget-bar__fill"
                          style={{
                            width: `${Math.min(budget.percentage, 100)}%`,
                            background: budget.isOver ? '#f87171' : budget.percentage > 80 ? '#fbbf24' : '#4ade80',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </RailCard>}

            {desktopShowTraining && <RailCard title="Personal records" icon="trophy">
              {!Array.isArray(workoutPRs) || workoutPRs.length === 0 ? (
                <p className="journal-empty">No PRs recorded yet.</p>
              ) : (
                <div className="journal-pr-list">
                  {workoutPRs.slice(0, 4).map((pr) => (
                    <div key={pr.exerciseId} className="journal-pr-item">
                      <div>
                        <strong>{pr.exerciseName}</strong>
                        <span>{pr.reps ? `${pr.reps} reps` : 'Best load'}</span>
                      </div>
                      <b>{pr.maxWeight}kg</b>
                    </div>
                  ))}
                </div>
              )}
            </RailCard>}
          </div>
        </ScrollReveal>
      </section>

      <ScrollReveal delay={220}>
        <section className="dashboard-domain-ribbon">
          {desktopShowTraining && desktopShowMusic && <div className="card dashboard-domain-card">
            <span className="dashboard-section-kicker">Training and music</span>
            <h3>Workout listening</h3>
            <p>
              <AnimatedNumber value={workoutStreamStats?.streams ?? 0} formatter={formatNumberShort} /> streams happened during workouts,
              covering <AnimatedNumber value={(workoutStreamStats?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} /> of training time.
            </p>
          </div>}

          {desktopShowMusic && <div className="card dashboard-domain-card">
            <span className="dashboard-section-kicker">Music</span>
            <h3>Listening records</h3>
            <p>
              <AnimatedNumber value={spotifyStats?.totalStreams ?? 0} formatter={formatNumberShort} /> streams across{' '}
              <AnimatedNumber value={spotifyStats?.uniqueArtists ?? 0} formatter={formatNumberShort} /> artists.
            </p>
          </div>}

          {desktopShowTraining && <div className="card dashboard-domain-card">
            <span className="dashboard-section-kicker">Training</span>
            <h3>Volume</h3>
            <p>
              <AnimatedNumber value={workoutTotals?.totalVolume ?? 0} formatter={(n) => `${formatNumberShort(n)} kg`} /> moved across{' '}
              <AnimatedNumber value={workoutTotals?.totalSets ?? 0} formatter={formatNumberShort} /> sets.
            </p>
          </div>}
        </section>
      </ScrollReveal>
    </div>
  )
}

function buildActivityFeed(habitsArray, recentSessions) {
  const items = []

  for (const habit of habitsArray) {
    if (habit.completedToday) {
      items.push({
        icon: 'check-circle',
        color: '#a78bfa',
        text: habit.name,
        sub: 'Completed today',
        time: Date.now(),
      })
    }
  }

  if (Array.isArray(recentSessions)) {
    for (const session of recentSessions.slice(0, 5)) {
      items.push({
        icon: 'dumbbell',
        color: '#4ade80',
        text: session.name || 'Workout session',
        sub: session.date ? new Date(session.date).toLocaleDateString() : '',
        time: session.date ? new Date(session.date).getTime() : 0,
      })
    }
  }

  items.sort((a, b) => b.time - a.time)
  return items
}

function mapMobileHabitSummary(items) {
  return items.map((habit) => ({
    ...habit,
    id: habit.habitId,
    name: habit.habitName,
    habitName: habit.habitName,
    completedToday: Boolean(habit.completedToday),
    todayStatus: habit.todayStatus || (habit.completedToday ? 'success' : null),
    longestStreak: habit.longestStreak ?? 0,
    currentStreak: habit.currentStreak ?? 0,
  }))
}

function formatLastSynced(value) {
  if (!value) return 'No local snapshot'
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 'Cached'
  const diffMs = Date.now() - time
  if (diffMs < 30_000) return 'Just synced'
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
