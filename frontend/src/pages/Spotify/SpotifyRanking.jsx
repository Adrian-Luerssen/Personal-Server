import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import {
  AnimatedNumber,
  LoadingLine,
  StatCard,
  formatDuration,
  formatNumberShort,
} from '../../components/shared'

const TIMEFRAMES = [
  { label: 'Day', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '6 Months', value: '6m' },
  { label: 'Year', value: 'year' },
  { label: 'All Time', value: 'all' },
]

function formatDateTime(value) {
  if (!value) return 'No streams'
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function initials(name) {
  return (name || 'Spotify User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'SU'
}

function RankingPodiumCard({ user }) {
  const medals = ['#fbbf24', '#cbd5e1', '#f97316']
  return (
    <div className="card" style={{ display: 'grid', gap: '0.75rem', minHeight: 170 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-muted)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--color-accent)',
            fontWeight: 800,
            flexShrink: 0,
          }}>
            {initials(user.displayName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: medals[user.rank - 1], fontWeight: 800 }}>
              #{user.rank}
            </div>
            <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName}
            </div>
          </div>
        </div>
        <Icon name="trophy" size={22} style={{ color: medals[user.rank - 1] }} />
      </div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>
          {formatNumberShort(user.streamCount)}
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          streams
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
        <span>{formatNumberShort(user.uniqueTracks)} tracks</span>
        <span>{formatDuration(user.msListened)}</span>
      </div>
    </div>
  )
}

export default function SpotifyRanking() {
  const [timeframe, setTimeframe] = useState('week')
  const [ranking, setRanking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    api.get(`/streams/user-ranking?timeframe=${encodeURIComponent(timeframe)}&limit=50`)
      .then(data => {
        if (ignore) return
        setRanking(data)
      })
      .catch(err => {
        if (ignore) return
        setError(err.message || 'Failed to load ranking')
        setRanking(null)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => { ignore = true }
  }, [timeframe])

  const rows = ranking?.items || []
  const topThree = rows.slice(0, 3)
  const totals = useMemo(() => {
    return rows.reduce((acc, row) => {
      acc.streams += row.streamCount || 0
      acc.ms += row.msListened || 0
      return acc
    }, { streams: 0, ms: 0 })
  }, [rows])

  return (
    <>
      <PageHeader icon="trophy" title="Spotify Ranking" />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="tab-group">
          {TIMEFRAMES.map(option => (
            <button
              key={option.value}
              className={`tab-btn${timeframe === option.value ? ' active' : ''}`}
              onClick={() => setTimeframe(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="section">
        <div className="stat-grid">
          <StatCard
            icon="users"
            accentColor="var(--color-accent)"
            label="Ranked Users"
            value={loading ? <LoadingLine width={70} /> : <AnimatedNumber value={rows.length} formatter={formatNumberShort} />}
          />
          <StatCard
            icon="play-circle"
            accentColor="var(--color-accent)"
            label="Streams"
            value={loading ? <LoadingLine width={80} /> : <AnimatedNumber value={totals.streams} formatter={formatNumberShort} />}
          />
          <StatCard
            icon="timer"
            accentColor="var(--color-accent)"
            label="Listening Time"
            value={loading ? <LoadingLine width={100} /> : formatDuration(totals.ms)}
          />
        </div>
      </div>

      <div className="section">
        <h3>Top Listeners</h3>
        {loading ? (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card">
                <LoadingLine width="50%" />
                <LoadingLine width="80%" />
                <LoadingLine width="35%" />
              </div>
            ))}
          </div>
        ) : topThree.length === 0 ? (
          <div className="empty-state">No Spotify streams for this period.</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {topThree.map(user => <RankingPodiumCard key={user.accountId} user={user} />)}
          </div>
        )}
      </div>

      <div className="section">
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Full Ranking</h3>
          {loading ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => <LoadingLine key={i} width="100%" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state">No ranked users yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', fontSize: '0.8rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Rank</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>User</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Streams</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Tracks</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Time</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Last Stream</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(user => (
                  <tr key={user.accountId} style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800 }}>#{user.rank}</td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-accent-muted)',
                          color: 'var(--color-accent)',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 800,
                          flexShrink: 0,
                          fontSize: '0.8rem',
                        }}>
                          {initials(user.displayName)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.displayName}
                          </div>
                          {user.spotifyUserId && (
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {user.spotifyUserId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 800 }}>
                      {formatNumberShort(user.streamCount)}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      {formatNumberShort(user.uniqueTracks)}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      {formatDuration(user.msListened)}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                      {formatDateTime(user.lastStream)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
