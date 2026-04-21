import React, { useEffect, useRef, useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { refreshIfPossible } from '../auth'
import Icon from '../components/icons/Icon'
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

function useCounter(target, duration = 1800, disabled = false) {
  const ref = useRef(null)
  const counted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    if (disabled) {
      el.textContent = target.toLocaleString()
      return undefined
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || counted.current) return
      counted.current = true
      const start = performance.now()
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        el.textContent = Math.round(eased * target).toLocaleString()
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
      observer.unobserve(el)
    }, { threshold: 0.5 })

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, disabled])

  return ref
}

const PRINCIPLES = [
  {
    icon: 'book-open',
    title: 'Read your life as a journal',
    text: 'The product should feel like a living review, not a stack of admin dashboards.',
  },
  {
    icon: 'orbit',
    title: 'See relationships, not just rows',
    text: 'Training, habits, money, and media should connect into patterns you can act on.',
  },
  {
    icon: 'sparkles',
    title: 'Use AI for interpretation',
    text: 'The intelligence layer should explain the week and help you decide what matters next.',
  },
]

const PROOF_ITEMS = [
  'Private by default',
  'Cross-domain weekly briefs',
  'On-demand AI analysis',
  'Built for reflective review',
]

const STORY_PANELS = [
  {
    eyebrow: 'Body',
    title: 'Training becomes a story, not a spreadsheet.',
    text: 'Review cadence, recovery, personal records, and the routines that support or sabotage performance.',
    accent: 'var(--color-success)',
    metrics: ['4 sessions this week', '81% habit completion on training days'],
  },
  {
    eyebrow: 'Money',
    title: 'Spending gets context instead of guilt.',
    text: 'Track drift early, read category pressure clearly, and connect spending with the rhythms of your week.',
    accent: 'var(--color-warning)',
    metrics: ['$182 spent this week', 'Dining out trending below baseline'],
  },
  {
    eyebrow: 'Intelligence',
    title: 'Ask for deeper analysis only when you need it.',
    text: 'The system can surface its own weekly brief, then hand the exact context to your AI agent for deeper analysis.',
    accent: 'var(--color-accent)',
    metrics: ['Proactive weekly briefs', 'On-demand AI deep dives'],
  },
]

const COUNTERS = [
  { value: 365, label: 'Days of patterns preserved' },
  { value: 12840, label: 'Signals turned into story' },
  { value: 4, label: 'Life domains in one journal' },
]

function AnimatedMetric({ value, label, reducedMotion }) {
  const ref = useCounter(value, 1800, reducedMotion)
  return (
    <div className="landing-editorial-metric">
      <strong><span ref={ref}>0</span>{value >= 1000 ? '+' : ''}</strong>
      <span>{label}</span>
    </div>
  )
}

export default function Landing() {
  const nav = useNavigate()
  const prefersReducedMotion = usePrefersReducedMotion()
  const observe = useScrollReveal(prefersReducedMotion)

  useEffect(() => {
    ;(async () => {
      const ok = await refreshIfPossible()
      if (ok) nav('/home', { replace: true })
    })()
  }, [nav])

  return (
    <div className="landing-editorial">
      <header className="landing-editorial-topbar">
        <div className="landing-editorial-wordmark">
          <span className="landing-editorial-wordmark__mark">PS</span>
          <span className="landing-editorial-wordmark__text">Personal Server</span>
        </div>
      </header>

      <main>
        <section className="landing-editorial-hero">
          <div className="landing-editorial-hero__mesh" aria-hidden="true">
            <div className="landing-editorial-hero__orb landing-editorial-hero__orb--a" />
            <div className="landing-editorial-hero__orb landing-editorial-hero__orb--b" />
            <div className="landing-editorial-hero__orb landing-editorial-hero__orb--c" />
          </div>

          <div className="landing-editorial-hero__content">
            <div className="landing-editorial-hero__copy">
              <div className="landing-editorial-kicker">
                <Icon name="sparkles" size={14} />
                Premium quantified-self journal
              </div>
              <h1>
                A private place
                <span>to understand the shape of your life.</span>
              </h1>
              <p>
                Personal Server turns workouts, habits, spending, and media into a reflective operating journal.
                It is built to help you read patterns, not just collect numbers.
              </p>
              <div className="landing-editorial-hero__actions">
                <Link to="/register" className="landing-editorial-button landing-editorial-button--primary">
                  Request access
                  <Icon name="arrow-right" size={16} />
                </Link>
                <Link to="/login" className="landing-editorial-button landing-editorial-button--secondary">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="landing-editorial-hero__composition" ref={observe}>
              <div className="landing-editorial-sheet landing-editorial-sheet--primary">
                <div className="landing-editorial-sheet__eyebrow">Weekly brief</div>
                <h3>Momentum is building across the week</h3>
                <p>
                  Training cadence is holding, habit completion is stronger on workout days, and spending pressure is still contained.
                </p>
                <div className="landing-editorial-sheet__grid">
                  <div>
                    <span>Training</span>
                    <strong>4 sessions</strong>
                  </div>
                  <div>
                    <span>Habits</span>
                    <strong>79%</strong>
                  </div>
                  <div>
                    <span>Spending</span>
                    <strong>$182</strong>
                  </div>
                  <div>
                    <span>Focus</span>
                    <strong>Consolidate</strong>
                  </div>
                </div>
              </div>

              <div className="landing-editorial-sheet landing-editorial-sheet--secondary">
                <div className="landing-editorial-sheet__eyebrow">AI analysis</div>
                <p>Ask why spending shifted, which habits create momentum, or whether your training week is actually coherent.</p>
                <div className="landing-editorial-mini-prompt">"Which habits are worth doubling down on?"</div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-editorial-proofbar" aria-label="Proof and product traits">
          <div className="landing-editorial-proofbar__inner" ref={observe}>
            {PROOF_ITEMS.map((item) => (
              <div key={item} className="landing-editorial-proofbar__item">
                <Icon name="circle" size={10} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--manifesto" id="story">
          <div className="landing-editorial-section__lead" ref={observe}>
            <span className="landing-editorial-section__label">Manifesto</span>
            <h2>Your dashboard should feel like a review of your life, not a control panel.</h2>
          </div>
          <div className="landing-editorial-principles">
            {PRINCIPLES.map((item) => (
              <article key={item.title} className="landing-editorial-principle" ref={observe}>
                <div className="landing-editorial-principle__icon">
                  <Icon name={item.icon} size={18} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--story">
          <div className="landing-editorial-story-layout">
            <div className="landing-editorial-story-rail" ref={observe}>
              <span className="landing-editorial-section__label">Editorial storytelling</span>
              <h2>A homepage that reads like a premium weekly review.</h2>
              <p>
                The system should move from life area to life area with restraint, letting one idea dominate at a time.
                That means fewer equal-weight boxes and more narrative pacing.
              </p>
            </div>
            <div className="landing-editorial-story-grid">
              {STORY_PANELS.map((panel, index) => (
                <article
                  key={panel.title}
                  className={`landing-editorial-story-card landing-editorial-story-card--${index + 1}`}
                  ref={observe}
                  style={{ '--story-accent': panel.accent }}
                >
                  <span className="landing-editorial-story-card__eyebrow">{panel.eyebrow}</span>
                  <h3>{panel.title}</h3>
                  <p>{panel.text}</p>
                  <ul>
                    {panel.metrics.map((metric) => (
                      <li key={metric}>{metric}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--metrics">
          <div className="landing-editorial-metrics" ref={observe}>
            {COUNTERS.map((counter) => (
              <AnimatedMetric
                key={counter.label}
                value={counter.value}
                label={counter.label}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--closer">
          <div className="landing-editorial-quote" ref={observe}>
            <p>"The point is not to track more. The point is to notice what the week is trying to tell you."</p>
          </div>
          <div className="landing-editorial-cta" ref={observe}>
            <span className="landing-editorial-section__label">Trust and ownership</span>
            <h2>Your data stays yours. The intelligence stays close to the records that matter.</h2>
            <p className="landing-editorial-cta__copy">
              No bloated product theatre, no noisy growth loops, and no need to pretend this is an enterprise dashboard.
              It is a personal system for noticing patterns and making better decisions.
            </p>
            <div className="landing-editorial-hero__actions">
              <Link to="/register" className="landing-editorial-button landing-editorial-button--primary">
                Start with your own data
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link to="/login" className="landing-editorial-button landing-editorial-button--secondary">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-editorial-footer">
        <div className="landing-editorial-footer__inner">
          <div className="landing-editorial-wordmark">
            <span className="landing-editorial-wordmark__mark">PS</span>
            <span className="landing-editorial-wordmark__text">Personal Server</span>
          </div>
          <p>Private quantified-self journal for people who want clarity, not dashboard clutter.</p>
        </div>
      </footer>
    </div>
  )
}
