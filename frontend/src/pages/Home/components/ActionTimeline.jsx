import React from 'react'
import { Link } from 'react-router-dom'

import { RecordList, RecordListRow } from '../../../components/product/RecordList'
import Icon from '../../../components/icons/Icon'

const KIND_META = Object.freeze({
  'payment-review': { icon: 'receipt', label: 'Cash review' },
  'active-workout': { icon: 'dumbbell', label: 'Gym in progress' },
  'habit-due': { icon: 'circle', label: 'Habit due' },
  'recent-stream': { icon: 'music', label: 'Recently played' },
})

export default function ActionTimeline({ items, loaded, onHabitDone }) {
  return (
    <section className="action-timeline" aria-labelledby="action-timeline-title">
      <div className="action-timeline__heading">
        <div>
          <span>Daily register</span>
          <h2 id="action-timeline-title">Needs your attention</h2>
        </div>
        <small>{items.length} open</small>
      </div>

      {!loaded ? (
        <p className="action-timeline__empty">Opening the latest local record…</p>
      ) : items.length === 0 ? (
        <div className="action-timeline__empty">
          <Icon name="check" size={20} />
          <p><strong>Nothing unresolved.</strong> New records will appear here as the day changes.</p>
        </div>
      ) : (
        <RecordList label="Actionable records">
          {items.map((item) => {
            const meta = KIND_META[item.kind] || { icon: 'circle', label: 'Record' }
            return (
              <RecordListRow key={item.id} className={`action-record action-record--${item.kind}`}>
                <span className="action-record__icon" aria-hidden="true"><Icon name={meta.icon} size={18} /></span>
                <Link to={item.to} className="action-record__copy">
                  <small>{meta.label}</small>
                  <strong>{item.label}</strong>
                  {item.detail ? <span>{item.detail}</span> : null}
                </Link>
                {item.kind === 'habit-due' && onHabitDone ? (
                  <button type="button" onClick={() => onHabitDone(item)}>Done</button>
                ) : (
                  <Link to={item.to} className="action-record__open" aria-label={`Open ${item.label}`}>
                    <Icon name="arrow-up-right" size={17} />
                  </Link>
                )}
              </RecordListRow>
            )
          })}
        </RecordList>
      )}
    </section>
  )
}
