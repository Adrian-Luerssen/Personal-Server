import React from 'react'
import { Link } from 'react-router-dom'

import Icon from '../../../components/icons/Icon'
import SyncState from '../../../components/product/SyncState'

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date)
}

function Fact({ icon, label, value, detail, tone }) {
  return (
    <li className={`daily-fact daily-fact--${tone}`}>
      <span className="daily-fact__icon" aria-hidden="true"><Icon name={icon} size={17} /></span>
      <span className="daily-fact__copy"><small>{label}</small><strong>{value}</strong></span>
      <span className="daily-fact__detail">{detail}</span>
    </li>
  )
}

export default function DailyBrief({ brief, currency, onAsk, syncDetail, syncState }) {
  const { facts, openCount, primary } = brief
  const money = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(facts.cash.spentToday)
  const dayClear = openCount === 0

  return (
    <header className="daily-brief">
      <div className="daily-brief__topline">
        <span>{formatDate(new Date())}</span>
        <SyncState state={syncState} detail={syncDetail} />
      </div>

      <div className="daily-brief__body">
        <section className="daily-brief__intro" aria-labelledby="daily-brief-title">
          <span className="product-kicker">Personal Record / Today</span>
          <h1 id="daily-brief-title">{dayClear ? 'Your record is clear.' : 'Start with what needs you.'}</h1>
          <p>{dayClear
            ? 'There is nothing waiting for confirmation. Recent records remain available below.'
            : `${openCount} ${openCount === 1 ? 'area needs' : 'areas need'} a decision or continuation.`}</p>
          <button type="button" className="daily-brief__ask" onClick={onAsk}>
            <Icon name="sparkles" size={16} />Ask about today
          </button>
        </section>

        <aside className="daily-brief__next" aria-label="Next action">
          <span>Next action</span>
          {primary ? (
            <>
              <Icon name={primary.kind === 'payment-review' ? 'receipt' : primary.kind === 'active-workout' ? 'dumbbell' : 'check-circle'} size={24} />
              <h2>{primary.label}</h2>
              <Link to={primary.to}>Open <Icon name="arrow-right" size={16} /></Link>
            </>
          ) : (
            <>
              <Icon name="check" size={24} />
              <h2>Nothing is waiting</h2>
              <p>New records will appear here when they need attention.</p>
            </>
          )}
        </aside>
      </div>

      <ul className="daily-facts" aria-label="Today at a glance">
        <Fact icon="check-circle" label="Habits" value={`${facts.habits.completed}/${facts.habits.total}`} detail="logged" tone="habits" />
        <Fact icon="wallet" label="Cash out" value={money} detail="today" tone="cash" />
        <Fact icon="footprints" label="Movement" value={facts.movement.steps.toLocaleString()} detail="steps" tone="gym" />
        <Fact icon="music" label="Listening" value={facts.music.streamsToday.toLocaleString()} detail="streams" tone="music" />
      </ul>
    </header>
  )
}
