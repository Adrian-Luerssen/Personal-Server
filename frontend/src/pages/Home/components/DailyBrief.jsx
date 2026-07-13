import React from 'react'

import Icon from '../../../components/icons/Icon'
import MetricValue from '../../../components/product/MetricValue'
import SignalRing from '../../../components/product/SignalRing'
import SyncState from '../../../components/product/SyncState'

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date)
}

export default function DailyBrief({ activitySummary, currency, habitsCompleted, habitsTotal, onAsk, spentToday, streamsToday, syncDetail, syncState }) {
  const steps = Number(activitySummary?.today?.steps || activitySummary?.steps || 0)
  const habitProgress = habitsTotal ? habitsCompleted / habitsTotal : 1
  const movementProgress = Math.min(1, steps / 8000)
  const dailySignal = Math.round((habitProgress * 0.68 + movementProgress * 0.32) * 100)
  const money = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(spentToday || 0)

  return (
    <header className="daily-brief today-command">
      <div className="daily-brief__topline">
        <span>{formatDate(new Date())}</span>
        <SyncState state={syncState} detail={syncDetail} />
      </div>
      <section className="today-command__hero">
        <div className="today-command__intro">
          <span>PERSONAL RECORD / TODAY</span>
          <h1>Good day.</h1>
          <p>{habitsCompleted}/{habitsTotal} habits logged. Your unresolved records are already ordered below.</p>
          <button type="button" onClick={onAsk}><Icon name="sparkles" size={16} /> Ask about today</button>
        </div>
        <div className="daily-signal">
          <SignalRing value={dailySignal} label="Daily signal" domain="today" size={132} />
          <div><span>Daily signal</span><strong>{dailySignal >= 75 ? 'On course' : dailySignal >= 45 ? 'Building' : 'Needs attention'}</strong><small>Habits + movement</small></div>
        </div>
        <div className="today-command__metric today-command__metric--habits"><MetricValue label="Habits" value={`${habitsCompleted}/${habitsTotal}`} detail="Completed today" trend={`${Math.round(habitProgress * 100)}%`} domain="habits" /></div>
        <div className="today-command__metric today-command__metric--cash"><MetricValue label="Cash out" value={money} detail="Recorded today" domain="cash" /></div>
        <div className="today-command__metric today-command__metric--music"><MetricValue label="Listening" value={Number(streamsToday || 0).toLocaleString()} detail="Streams today" domain="music" /></div>
        <div className="today-command__metric today-command__metric--movement"><MetricValue label="Movement" value={steps.toLocaleString()} detail="Steps today" trend={`${Math.round(movementProgress * 100)}% goal`} domain="gym" /></div>
      </section>
    </header>
  )
}
