import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { refreshIfPossible } from '../auth'
import Icon from '../components/icons/Icon'
import { ANDROID_APK_URL } from '../mobilePlatform'
import './Landing.css'

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return prefersReducedMotion
}

function useScrollReveal(disabled) {
  const refs = useRef([])
  const register = useCallback((el) => {
    if (el && !refs.current.includes(el)) refs.current.push(el)
  }, [])

  useEffect(() => {
    if (disabled) {
      refs.current.forEach((el) => el.classList.add('visible'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -50px 0px' },
    )

    refs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [disabled])

  return register
}

const RECORD_TYPES = [
  {
    icon: 'dumbbell',
    title: 'Training',
    text: 'Sessions, sets, personal records, bodyweight, and live step snapshots.',
    tone: 'training',
  },
  {
    icon: 'heart-pulse',
    title: 'Habits',
    text: 'Done, skipped, missed, numeric values, cadence-aware streaks, and reminders.',
    tone: 'habits',
  },
  {
    icon: 'wallet',
    title: 'Finance',
    text: 'Wallets, transactions, categories, imports, budgets, and detected payments.',
    tone: 'finance',
  },
  {
    icon: 'music',
    title: 'Music',
    text: 'Spotify streams, profile state, rankings, workout listening, and widgets.',
    tone: 'music',
  },
  {
    icon: 'message-square',
    title: 'Assistant',
    text: 'Persisted chat sessions that read from the same private review ledger.',
    tone: 'assistant',
  },
]

const LEDGER_ROWS = [
  { source: 'Training', record: 'Upper session', value: '3 PRs', state: 'verified' },
  { source: 'Habits', record: 'No alcohol', value: '18-day streak', state: 'cached' },
  { source: 'Money', record: 'Revolut Ultra', value: 'EUR 55.00', state: 'changed' },
  { source: 'Music', record: 'Today streams', value: '310', state: 'synced' },
]

const WORKFLOW_STEPS = [
  {
    title: 'Open from cache',
    text: 'The Android app renders the latest local snapshot first, so the screen is usable before the network responds.',
  },
  {
    title: 'Verify changed records',
    text: 'Watermarks and focused refreshes check whether the database changed on web, import, or background sync.',
  },
  {
    title: 'Review the week',
    text: 'Daily rows become a weekly brief: what changed, what is due, and what deserves attention.',
  },
]

const DIFFERENCE_ROWS = [
  ['Normal dashboard', 'Personal Server'],
  ['Large tiles and synthetic summaries', 'Source records, compact totals, correction paths'],
  ['Waits for the API before showing useful state', 'Cached locally first, then verified when changed'],
  ['Five disconnected modules', 'One review ledger with module-specific controls'],
  ['AI as a floating chat widget', 'Assistant messages persisted beside the records they analyze'],
]

const LANDING_METRIC_DEFAULTS = [
  {
    id: 'workouts',
    value: 0,
    suffix: '+',
    label: 'Workout records',
    note: 'Sessions, sets, personal records, and steps.',
  },
  {
    id: 'habits',
    value: 0,
    suffix: '+',
    label: 'Habit decisions',
    note: 'Done, skipped, missed, and numeric entries.',
  },
  {
    id: 'streams',
    value: 0,
    suffix: '+',
    label: 'Listening records',
    note: 'Streams, ranking rows, and workout context.',
  },
]

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`landing-status-pill landing-status-pill--${tone}`}>{children}</span>
}

function LedgerPreview() {
  return (
    <article className="landing-ledger-preview" aria-label="Weekly ledger preview">
      <div className="landing-ledger-preview__top">
        <div>
          <span className="landing-micro-label">Weekly brief</span>
          <h2>The week, made reviewable.</h2>
        </div>
        <StatusPill tone="sync">Cached locally</StatusPill>
      </div>

      <div className="landing-ledger-sync">
        <span>Last verified</span>
        <strong>just now</strong>
        <span>Changed records</span>
        <strong>4</strong>
      </div>

      <div className="landing-ledger-rows">
        {LEDGER_ROWS.map((row) => (
          <div className={`landing-ledger-row landing-ledger-row--${row.state}`} key={`${row.source}-${row.record}`}>
            <span>{row.source}</span>
            <strong>{row.record}</strong>
            <em>{row.value}</em>
            <StatusPill tone={row.state}>{row.state}</StatusPill>
          </div>
        ))}
      </div>

      <div className="landing-ledger-brief">
        <Icon name="sparkles" size={16} />
        <p>Spending rose, training stayed consistent, and two habits need a decision before tonight.</p>
      </div>
    </article>
  )
}

function AnimatedMetric({ value, label, note, suffix, reducedMotion }) {
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0)
  const [isVisible, setIsVisible] = useState(reducedMotion)
  const ref = useRef(null)
  const frameRef = useRef(0)
  const lastValueRef = useRef(0)

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true)
      setDisplayValue(value)
      lastValueRef.current = value
      return undefined
    }

    const el = ref.current
    if (!el) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.45 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [reducedMotion, value])

  useEffect(() => {
    if (!isVisible) return undefined
    if (reducedMotion) {
      setDisplayValue(value)
      lastValueRef.current = value
      return undefined
    }

    cancelAnimationFrame(frameRef.current)
    const startValue = lastValueRef.current
    const delta = value - startValue

    if (delta === 0) {
      setDisplayValue(value)
      return undefined
    }

    const duration = 900
    const start = performance.now()
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(startValue + (delta * eased)))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        lastValueRef.current = value
      }
    }

    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, isVisible, reducedMotion])

  return (
    <div className="landing-editorial-metric" ref={ref}>
      <strong>
        <span>{displayValue.toLocaleString()}</span>
        {suffix ? <span className="landing-editorial-metric__suffix">{suffix}</span> : null}
      </strong>
      <span>{label}</span>
      <p>{note}</p>
    </div>
  )
}

export default function Landing({ mobileGate = false }) {
  const nav = useNavigate()
  const prefersReducedMotion = usePrefersReducedMotion()
  const observe = useScrollReveal(prefersReducedMotion)
  const [landingMetrics, setLandingMetrics] = useState(LANDING_METRIC_DEFAULTS)

  useEffect(() => {
    if (mobileGate) return undefined
    ;(async () => {
      const ok = await refreshIfPossible()
      if (ok) nav('/home', { replace: true })
    })()
    return undefined
  }, [nav, mobileGate])

  useEffect(() => {
    let ignore = false

    async function loadLandingMetrics() {
      try {
        const data = await api.get('/dashboard/landing-stats')
        if (!ignore && Array.isArray(data?.metrics) && data.metrics.length > 0) {
          setLandingMetrics(data.metrics)
        }
      } catch {
        // Public metrics are optional. Keep static zero-state defaults if unavailable.
      }
    }

    loadLandingMetrics()
    return () => { ignore = true }
  }, [])

  return (
    <div className="landing-editorial">
      <main>
        <section className="landing-editorial-hero">
          <div className="landing-editorial-hero__content">
            <div className="landing-editorial-hero__copy">
              <div className="landing-editorial-brandchip landing-editorial-hero__intro landing-editorial-hero__intro--1">
                <span className="landing-editorial-wordmark__mark">PS</span>
                <span className="landing-editorial-brandchip__copy">
                  <span className="landing-editorial-wordmark__text">Personal Server</span>
                  <span className="landing-editorial-brandchip__meta">Private records for daily review</span>
                </span>
              </div>
              <h1 className="landing-editorial-hero__intro landing-editorial-hero__intro--3">
                Your private ledger for the week.
              </h1>
              <p className="landing-editorial-hero__intro landing-editorial-hero__intro--4">
                Personal Server keeps workouts, habits, spending, music, media, and assistant notes in one cache-first system
                so you can review what changed without turning your life into a dashboard.
              </p>
              <div className="landing-editorial-hero__actions landing-editorial-hero__intro landing-editorial-hero__intro--5">
                {mobileGate ? (
                  <a href={ANDROID_APK_URL} className="landing-editorial-button landing-editorial-button--primary">
                    Download Android app
                    <Icon name="download" size={16} />
                  </a>
                ) : (
                  <>
                    <Link to="/register" className="landing-editorial-button landing-editorial-button--primary">
                      Create account
                      <Icon name="arrow-right" size={16} />
                    </Link>
                    <Link to="/login" className="landing-editorial-button landing-editorial-button--secondary">
                      Open login
                    </Link>
                  </>
                )}
              </div>
              {mobileGate ? (
                <p className="landing-editorial-mobile-note landing-editorial-hero__intro landing-editorial-hero__intro--5">
                  Mobile browser access is disabled. Use the Android app for the platform experience.
                </p>
              ) : null}
            </div>

            <div className="landing-editorial-hero__composition visible">
              <div className="landing-ledger-visual" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <LedgerPreview />
            </div>
          </div>
        </section>

        <section className="landing-editorial-proofbar" aria-label="Product traits">
          <div className="landing-editorial-proofbar__inner visible">
            {['Cached locally', 'Verified when changed', 'Private by default', 'Records, not noise'].map((item) => (
              <div key={item} className="landing-editorial-proofbar__item">
                <Icon name="circle" size={10} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--bento" id="records">
          <div className="landing-editorial-section__lead visible">
            <span className="landing-micro-label">What it keeps</span>
            <h2>One review system. Module controls stay specific.</h2>
          </div>
          <div className="landing-bento-grid visible">
            {RECORD_TYPES.map((card) => (
              <article key={card.title} className={`landing-bento-card landing-bento-card--${card.tone}`}>
                <div className="landing-bento-card__copy">
                  <span className="landing-bento-card__icon">
                    <Icon name={card.icon} size={18} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--workflow" id="workflow">
          <div className="landing-editorial-section__lead" ref={observe}>
            <span className="landing-micro-label">How it works</span>
            <h2>Local first does not mean guessing.</h2>
          </div>
          <div className="landing-workflow-grid" ref={observe}>
            {WORKFLOW_STEPS.map((step, index) => (
              <article key={step.title} className="landing-workflow-card">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--difference" id="different">
          <div className="landing-editorial-story-layout">
            <div className="landing-editorial-story-rail visible">
              <span className="landing-micro-label">Why it is different</span>
              <h2>No dashboard theater.</h2>
              <p>
                The point is not to track more things. The point is to make the week reviewable without losing the source rows.
              </p>
            </div>
            <div className="landing-difference-table" ref={observe}>
              {DIFFERENCE_ROWS.map((row, index) => (
                <div key={row.join('-')} className={index === 0 ? 'landing-difference-table__head' : ''}>
                  <span>{row[0]}</span>
                  <strong>{row[1]}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--privacy" id="privacy">
          <div className="landing-privacy-panel" ref={observe}>
            <div>
              <span className="landing-micro-label">Privacy and validity</span>
              <h2>Private data should feel inspectable, not mysterious.</h2>
              <p>
                Cache age, import progress, sync failures, payment detection, and assistant message state stay visible.
                The app should tell you when a record is fresh and when it still needs verification.
              </p>
            </div>
            <div className="landing-privacy-panel__checks">
              <StatusPill tone="sync">Local data first</StatusPill>
              <StatusPill tone="verified">Database verified</StatusPill>
              <StatusPill tone="cached">Offline usable</StatusPill>
            </div>
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--metrics">
          <div className="landing-editorial-metrics visible">
            {landingMetrics.map((counter) => (
              <AnimatedMetric
                key={counter.id}
                value={counter.value}
                label={counter.label}
                note={counter.note}
                suffix={counter.suffix}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--closer">
          <div className="landing-editorial-quote" ref={observe}>
            <p>Records, not noise.</p>
          </div>
          <div className="landing-editorial-cta" ref={observe}>
            <h2>The web app reviews the week. The Android app keeps the day moving.</h2>
            <p className="landing-editorial-cta__copy">
              Use desktop for correction and weekly review. Use mobile for fast logging, widgets, notifications, and offline-first access.
            </p>
            <div className="landing-editorial-hero__actions">
              {mobileGate ? (
                <a href={ANDROID_APK_URL} className="landing-editorial-button landing-editorial-button--primary">
                  Download Android app
                  <Icon name="download" size={16} />
                </a>
              ) : (
                <>
                  <Link to="/register" className="landing-editorial-button landing-editorial-button--primary">
                    Create account
                    <Icon name="arrow-right" size={16} />
                  </Link>
                  <Link to="/login" className="landing-editorial-button landing-editorial-button--secondary">
                    Open login
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-editorial-footer">
        <div className="landing-editorial-footer__inner">
          <div className="landing-editorial-footer__brand">
            <div className="landing-editorial-wordmark">
              <span className="landing-editorial-wordmark__mark">PS</span>
              <span className="landing-editorial-wordmark__text">Personal Server</span>
            </div>
            <p>Private records for daily review. Cached locally. Verified when changed.</p>
          </div>
          <div className="landing-editorial-footer__meta">
            <div className="landing-editorial-footer__links">
              <a href="https://github.com/Adrian-Luerssen/Personal-Server" target="_blank" rel="noreferrer" className="landing-editorial-footer__link">
                Project repo
              </a>
              <Link to="/login" className="landing-editorial-footer__link">Login</Link>
              <Link to="/register" className="landing-editorial-footer__link">Create account</Link>
            </div>
            <span className="landing-editorial-footer__credit">The week, made reviewable.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
