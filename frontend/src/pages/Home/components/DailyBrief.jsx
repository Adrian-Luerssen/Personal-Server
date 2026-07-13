import React from 'react'

import SyncState from '../../../components/product/SyncState'

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export default function DailyBrief({
  activitySummary,
  currency,
  habitsCompleted,
  habitsTotal,
  onAsk,
  spentToday,
  streamsToday,
  syncDetail,
  syncState,
}) {
  return (
    <header className="daily-brief">
      <div className="daily-brief__topline">
        <span>{formatDate(new Date())}</span>
        <SyncState state={syncState} detail={syncDetail} />
      </div>
      <div className="daily-brief__heading">
        <div>
          <h1>Today</h1>
          <p>{habitsCompleted}/{habitsTotal} habits logged. The unresolved records are first.</p>
        </div>
        <button type="button" onClick={onAsk}>Ask about today</button>
      </div>
      <dl className="daily-brief__register" aria-label="Today at a glance">
        <div>
          <dt>Habits</dt>
          <dd>{habitsCompleted}/{habitsTotal}</dd>
        </div>
        <div>
          <dt>Cash out</dt>
          <dd>{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(spentToday || 0)}</dd>
        </div>
        <div>
          <dt>Listening</dt>
          <dd>{streamsToday || 0} streams</dd>
        </div>
        <div>
          <dt>Mobility</dt>
          <dd>{Number(activitySummary?.today?.steps || activitySummary?.steps || 0).toLocaleString()} steps</dd>
        </div>
      </dl>
    </header>
  )
}
