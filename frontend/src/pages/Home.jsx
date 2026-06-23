import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { AnimatedNumber, formatDuration, formatNumberShort } from '../components/shared'
import PageHeader from '../components/PageHeader'
import ProgressRing from '../components/ProgressRing'
import ScrollReveal from '../components/ScrollReveal'
import Icon from '../components/icons/Icon'
import { isNativeMobileApp } from '../mobilePlatform'

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
    <div className="journal-snapshot-card">
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <p>{item.note}</p>
    </div>
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

function NativeHomeDashboard({
  intelligence,
  activityItems,
  weeklySummary,
  habitCompletionPct,
  todayCompleted,
  totalHabits,
  monthlySpent,
  workoutTotals,
  spotifyStats,
  openAiPrompt,
  nav,
  loaded,
}) {
  const firstPrompt = intelligence.aiPrompts?.[0]
  const primaryInsight = intelligence.insights?.[0]

  return (
    <div className="native-dashboard" data-testid="native-dashboard">
      <section className="native-dashboard-hero">
        <div>
          <span className="native-eyebrow">Daily control</span>
          <h1>{intelligence.headline}</h1>
        </div>
        <div className="native-score-orb" aria-label={`Weekly score ${intelligence.score}`}>
          <strong>{intelligence.score}</strong>
          <span>score</span>
        </div>
      </section>

      <section className="native-action-grid" aria-label="Quick actions">
        <NativeActionCard
          icon="zap"
          title="Workout"
          value={`${weeklySummary?.workouts ?? 0} this week`}
          tone="success"
          onClick={() => nav('/workout/active')}
        />
        <NativeActionCard
          icon="heart-pulse"
          title="Habits"
          value={`${todayCompleted}/${totalHabits || 0} today`}
          tone="habits"
          onClick={() => nav('/habits')}
        />
        <NativeActionCard
          icon="receipt"
          title="Money"
          value={`$${Math.round(monthlySpent)}`}
          tone="money"
          onClick={() => nav('/finance/transactions')}
        />
        <NativeActionCard
          icon="trophy"
          title="Ranking"
          value={`${spotifyStats?.totalStreams ?? 0} streams`}
          tone="music"
          onClick={() => nav('/spotify/ranking')}
        />
        <NativeActionCard
          icon="library"
          title="Media"
          value="Library"
          tone="media"
          onClick={() => nav('/media')}
        />
        <NativeActionCard
          icon="sparkles"
          title="AI"
          value="Analyze"
          tone="ai"
          onClick={() => openAiPrompt(firstPrompt)}
        />
      </section>

      <section className="native-today-card">
        <div className="native-today-card__ring">
          <ProgressRing value={habitCompletionPct} size={88} strokeWidth={8} color="#a78bfa" />
          <strong>{habitCompletionPct}%</strong>
        </div>
        <div className="native-today-card__copy">
          <span>Today</span>
          <strong>{todayCompleted} habits done</strong>
          <small>{totalHabits > 0 ? `${Math.max(totalHabits - todayCompleted, 0)} remaining` : 'No habits configured'}</small>
        </div>
        <button type="button" className="native-icon-button" onClick={() => nav('/habits')} aria-label="Open habits">
          <Icon name="chevron-right" size={20} />
        </button>
      </section>

      <section className="native-metric-strip" aria-label="Weekly snapshot">
        <NativeMetricCard
          icon="dumbbell"
          label="Training"
          value={`${workoutTotals?.totalWorkouts ?? weeklySummary?.workouts ?? 0}`}
          sub="sessions"
          accent="#4ade80"
        />
        <NativeMetricCard
          icon="wallet"
          label="Spend"
          value={`$${Math.round(monthlySpent)}`}
          sub="month"
          accent="#fbbf24"
        />
        <NativeMetricCard
          icon="music"
          label="Music"
          value={formatNumberShort(spotifyStats?.totalStreams ?? 0)}
          sub="streams"
          accent="#7dd3fc"
        />
      </section>

      {primaryInsight && (
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
            {activityItems.slice(0, 4).map((item, index) => (
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
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
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

  useEffect(() => {
    let ignore = false

    async function load() {
      const results = await Promise.allSettled([
        api.get('/dashboard/intelligence'),
        api.get('/streams/stats?timeframe=all'),
        api.get('/workout/sessions?page=1&limit=1'),
        api.get('/dashboard/streams/workout'),
        api.get('/habits/summary'),
        api.get('/habits/trends'),
        api.get('/finance/transactions/summary'),
        api.get('/workout/sessions/recent'),
        api.get('/dashboard/insights/weekly'),
        api.get('/dashboard/insights/workout-habits'),
        api.get('/finance/budgets/status'),
        api.get('/workout/sessions/prs'),
      ])

      if (ignore) return
      const values = results.map((result) => (result.status === 'fulfilled' ? result.value : null))
      const [intel, sp, wk, wms, hs, ht, fs, rs, ws, whc, bs, prs] = values

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
  }, [])

  const habitsArray = Array.isArray(habitsSummary) ? habitsSummary : []
  const totalHabits = habitsArray.length
  const todayCompleted = habitsArray.filter((habit) => habit.completedToday).length
  const habitCompletionPct = totalHabits > 0 ? Math.round((todayCompleted / totalHabits) * 100) : 0
  const bestStreak = habitsArray.reduce((max, habit) => Math.max(max, habit.longestStreak ?? 0), 0)
  const monthlySpent = Math.abs(financeSummary?.totalExpenses ?? financeSummary?.total ?? 0)
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
        { id: 'spending', label: 'Spending', value: `$${Math.round(monthlySpent)}`, note: 'Current monthly expenses' },
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
  }, [intelligence, workoutTotals, habitCompletionPct, weeklySummary, monthlySpent, workoutHabitCorrelation])

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

    window.dispatchEvent(new CustomEvent('personal-server:chat-prompt', { detail }))
  }

  if (isNativeMobileApp()) {
    return (
      <NativeHomeDashboard
        intelligence={intelligenceFallback}
        activityItems={activityItems}
        weeklySummary={weeklySummary}
        habitCompletionPct={habitCompletionPct}
        todayCompleted={todayCompleted}
        totalHabits={totalHabits}
        monthlySpent={monthlySpent}
        workoutTotals={workoutTotals}
        spotifyStats={spotifyStats}
        openAiPrompt={openAiPrompt}
        nav={nav}
        loaded={loaded}
      />
    )
  }

  return (
    <div className="dashboard-journal">
      <PageHeader
        icon="layout-dashboard"
        eyebrow="Weekly journal"
        title="Dashboard"
        subtitle="A private brief across training, habits, money, and the routines shaping the week."
        meta={
          <div className="dashboard-header-meta">
            <DashboardStatus focus={intelligenceFallback.focus} />
            <div className="dashboard-header-score">
              <span>Weekly score</span>
              <strong>{intelligenceFallback.score}</strong>
            </div>
          </div>
        }
      />

      <ScrollReveal>
        <section className="dashboard-brief-hero">
          <div className="dashboard-brief-copy">
            <span className="dashboard-section-kicker">Weekly brief</span>
            <h2>{intelligenceFallback.headline}</h2>
            <p>{intelligenceFallback.summary}</p>
            <div className="dashboard-brief-actions">
              {(intelligenceFallback.aiPrompts || []).slice(0, 2).map((prompt) => (
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
              A higher score means training, habits, and spending are reinforcing each other instead of pulling in different directions.
            </p>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={70}>
        <section className="journal-snapshot-grid">
          {intelligenceFallback.snapshot.map((item) => <SnapshotCard key={item.id} item={item} />)}
        </section>
      </ScrollReveal>

      <section className="dashboard-main-grid">
        <ScrollReveal delay={120}>
          <div className="dashboard-main-column">
            <div className="card journal-feature-panel">
              <div className="journal-feature-panel__header">
                <div>
                  <span className="dashboard-section-kicker">Cross-domain insight canvas</span>
                  <h3>What the week is trying to tell you</h3>
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

            <div className="dashboard-story-band">
              <div className="card dashboard-story-card">
                <span className="dashboard-section-kicker">Weekly cadence</span>
                <h3>Training, habits, and spending should read like one system.</h3>
                <div className="dashboard-story-metrics">
                  <div>
                    <span>This week</span>
                    <strong>{weeklySummary?.workouts ?? 0} workouts</strong>
                  </div>
                  <div>
                    <span>Habits completed</span>
                    <strong>{weeklySummary ? `${weeklySummary.habitsCompleted}/${weeklySummary.habitsTotal}` : '0/0'}</strong>
                  </div>
                  <div>
                    <span>Weekly spend</span>
                    <strong>${Math.round(weeklySummary?.spending ?? 0)}</strong>
                  </div>
                </div>
                {workoutHabitCorrelation && (
                  <p className="dashboard-story-note">
                    Habit completion is <strong>{workoutHabitCorrelation.workoutDays.completionRate}%</strong> on workout days and <strong>{workoutHabitCorrelation.restDays.completionRate}%</strong> on rest days.
                  </p>
                )}
              </div>

              <div className="card dashboard-story-card dashboard-story-card--accent">
                <span className="dashboard-section-kicker">AI analysis layer</span>
                <h3>Deep analysis stays one click away.</h3>
                <p>
                  Use the current dashboard context to ask the connected AI agent for an explanation, a correction plan, or a deeper cross-domain interpretation.
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
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={180}>
          <div className="dashboard-rail">
            <RailCard
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
            </RailCard>

            <RailCard title="Habits today" icon="target">
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
            </RailCard>

            <RailCard title="Budget pressure" icon="piggy-bank">
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
            </RailCard>

            <RailCard title="Personal records" icon="trophy">
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
            </RailCard>
          </div>
        </ScrollReveal>
      </section>

      <ScrollReveal delay={220}>
        <section className="dashboard-domain-ribbon">
          <div className="card dashboard-domain-card">
            <span className="dashboard-section-kicker">Workout and music</span>
            <h3>Performance soundtrack</h3>
            <p>
              <AnimatedNumber value={workoutStreamStats?.streams ?? 0} formatter={formatNumberShort} /> streams happened during workouts,
              covering <AnimatedNumber value={(workoutStreamStats?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} /> of training time.
            </p>
          </div>

          <div className="card dashboard-domain-card">
            <span className="dashboard-section-kicker">Listening archive</span>
            <h3>Media footprint</h3>
            <p>
              <AnimatedNumber value={spotifyStats?.totalStreams ?? 0} formatter={formatNumberShort} /> streams across{' '}
              <AnimatedNumber value={spotifyStats?.uniqueArtists ?? 0} formatter={formatNumberShort} /> artists.
            </p>
          </div>

          <div className="card dashboard-domain-card">
            <span className="dashboard-section-kicker">Training volume</span>
            <h3>Physical workload</h3>
            <p>
              <AnimatedNumber value={workoutTotals?.totalVolume ?? 0} formatter={(n) => `${formatNumberShort(n)} kg`} /> moved across{' '}
              <AnimatedNumber value={workoutTotals?.totalSets ?? 0} formatter={formatNumberShort} /> sets.
            </p>
          </div>
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
