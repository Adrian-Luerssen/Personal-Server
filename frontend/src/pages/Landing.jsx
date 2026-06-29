import React, { useEffect, useRef, useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { api } from '../api'
import { refreshIfPossible } from '../auth'
import Icon from '../components/icons/Icon'
import { ANDROID_APK_URL } from '../mobilePlatform'
import './Landing.css'

gsap.registerPlugin(ScrollTrigger)

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

function useHeroMotion(disabled) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return undefined

    let frameId = 0
    const applyMotion = (xRatio, yRatio) => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        el.style.setProperty('--pointer-x', `${xRatio * 100}%`)
        el.style.setProperty('--pointer-y', `${yRatio * 100}%`)
        el.style.setProperty('--hero-shift-x', `${(xRatio - 0.5) * 14}px`)
        el.style.setProperty('--hero-shift-y', `${(yRatio - 0.5) * 10}px`)
      })
    }

    const handlePointerMove = (event) => {
      const rect = el.getBoundingClientRect()
      const xRatio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
      const yRatio = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)
      applyMotion(xRatio, yRatio)
    }

    const resetMotion = () => applyMotion(0.5, 0.5)

    resetMotion()
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerleave', resetMotion)

    return () => {
      cancelAnimationFrame(frameId)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerleave', resetMotion)
    }
  }, [disabled])

  return ref
}

function useLandingGsapMotion(disabled) {
  const ref = useRef(null)

  useEffect(() => {
    if (disabled || !ref.current) return undefined

    const ctx = gsap.context(() => {
      gsap.utils.toArray('.landing-gsap-reveal').forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 36, filter: 'blur(10px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 86%',
              once: true,
            },
          },
        )
      })

      gsap.utils.toArray('.landing-media-frame img').forEach((image) => {
        gsap.fromTo(
          image,
          { autoAlpha: 0.72, scale: 0.88 },
          {
            autoAlpha: 1,
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: image,
              start: 'top 90%',
              end: 'bottom 35%',
              scrub: true,
            },
          },
        )
      })

      gsap.utils.toArray('.landing-stack-card').forEach((card, index) => {
        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 72 + index * 24, scale: 0.94 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              once: true,
            },
          },
        )
      })
    }, ref)

    return () => ctx.revert()
  }, [disabled])

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

const LANDING_METRIC_DEFAULTS = [
  {
    id: 'workouts',
    value: 0,
    suffix: '+',
    label: 'Workout sessions captured',
    note: 'Logged lifts, runs, and training blocks preserved in one timeline.',
  },
  {
    id: 'habits',
    value: 0,
    suffix: '+',
    label: 'Habit check-ins preserved',
    note: 'Daily consistency records kept as part of the same reflective system.',
  },
  {
    id: 'streams',
    value: 0,
    suffix: '+',
    label: 'Listening events mapped',
    note: 'Media history connected back to routines, workouts, and weekly review.',
  },
]

const BENTO_CARDS = [
  {
    title: 'Native first review',
    text: 'The Android app opens on today, keeps cached data visible, and lets the user act before any network round trip finishes.',
    icon: 'smartphone',
    className: 'landing-bento-card--wide',
    image: 'https://picsum.photos/seed/personal-data-native-review/1200/780',
  },
  {
    title: 'Data validity',
    text: 'Sync state, stale cache, and changed web records need to be visible so fast never means untrustworthy.',
    icon: 'refresh-cw',
    className: 'landing-bento-card--sync',
  },
  {
    title: 'Assistant relay',
    text: 'Chat persists messages, shows delivery state, and leaves reasoning to the external AI worker.',
    icon: 'message-square',
    className: 'landing-bento-card--dark',
  },
  {
    title: 'Imports with progress',
    text: 'Long-running imports belong in a data center with streaming progress, warnings, and retryable jobs.',
    icon: 'database',
    className: 'landing-bento-card--image',
    image: 'https://picsum.photos/seed/personal-data-import-center/900/720',
  },
  {
    title: 'One personal record',
    text: 'Training, habits, finance, music, and media stay separate enough to be useful but close enough to explain the week.',
    icon: 'layers',
    className: 'landing-bento-card--compact',
  },
]

const ACCORDION_PANELS = [
  {
    title: 'Habits',
    text: 'Fast daily logging with cadence-aware streaks, missed-period counts, and reminder controls that live where users expect them.',
    image: 'https://picsum.photos/seed/personal-data-habits-flow/900/1100',
  },
  {
    title: 'Money',
    text: 'Mobile transaction entry focuses on recent choices, quick review, detected payments, and a clear import/data path.',
    image: 'https://picsum.photos/seed/personal-data-money-flow/900/1100',
  },
  {
    title: 'Training',
    text: 'Steps, workouts, bodyweight, and active sessions share the same activity layer so the app can work in the background.',
    image: 'https://picsum.photos/seed/personal-data-training-flow/900/1100',
  },
  {
    title: 'Media',
    text: 'Shows, anime seasons, books, and listening history need hierarchy, source records, and review queues instead of flat cards.',
    image: 'https://picsum.photos/seed/personal-data-media-flow/900/1100',
  },
]

const FOOTER_LINKS = [
  { label: 'LinkedIn', href: 'https://linkedin.com/in/alueerssenmedina' },
  { label: 'GitHub', href: 'https://github.com/Adrian-Luerssen' },
  { label: 'Project repo', href: 'https://github.com/Adrian-Luerssen/Personal-Server' },
]

function AnimatedMetric({ value, label, note, suffix, reducedMotion }) {
  const [displayValue, setDisplayValue] = useState(0)
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
  }, [reducedMotion])

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

    const duration = 1600
    const start = performance.now()
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = Math.round(startValue + (delta * eased))
      setDisplayValue(nextValue)
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
  const heroRef = useHeroMotion(prefersReducedMotion)
  const gsapRootRef = useLandingGsapMotion(prefersReducedMotion)
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
        // Keep zero-state defaults if the public stats endpoint is unavailable.
      }
    }

    loadLandingMetrics()
    return () => { ignore = true }
  }, [])

  return (
    <div className="landing-editorial" ref={gsapRootRef}>
      <main>
        <section className="landing-editorial-hero" ref={heroRef}>
          <div className="landing-editorial-hero__content">
            <div className="landing-editorial-hero__copy">
              <div className="landing-editorial-brandchip landing-editorial-hero__intro landing-editorial-hero__intro--1">
                <span className="landing-editorial-wordmark__mark">PS</span>
                <span className="landing-editorial-brandchip__copy">
                  <span className="landing-editorial-wordmark__text">Personal Server</span>
                  <span className="landing-editorial-brandchip__meta">Private system for reflective self-review</span>
                </span>
              </div>
              <div className="landing-editorial-kicker landing-editorial-hero__intro landing-editorial-hero__intro--2">
                <Icon name="sparkles" size={14} />
                Private quantified-self journal
              </div>
              <h1 className="landing-editorial-hero__intro landing-editorial-hero__intro--3">
                Understand your life without dashboard noise.
              </h1>
              <p className="landing-editorial-hero__intro landing-editorial-hero__intro--4">
                Personal Server turns workouts, habits, spending, and media into a reflective operating journal.
                It is built to help you read patterns, not just collect numbers.
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
                      Request access
                      <Icon name="arrow-right" size={16} />
                    </Link>
                    <Link to="/login" className="landing-editorial-button landing-editorial-button--secondary">
                      Sign in
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

            <div className="landing-editorial-hero__composition" ref={observe}>
              <figure className="landing-media-frame landing-media-frame--hero" aria-label="Personal Server data workspace">
                <img
                  src="https://picsum.photos/seed/personal-data-command-center/1200/900"
                  alt="A quiet personal workspace with screens, notebooks, and evening light"
                />
              </figure>
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

        <section className="landing-editorial-section landing-editorial-section--bento" id="platform">
          <div className="landing-editorial-section__lead landing-gsap-reveal">
            <span className="landing-editorial-section__label">Product architecture</span>
            <h2>A personal system should be fast, valid, and easier to navigate than the data behind it.</h2>
          </div>
          <div className="landing-bento-grid landing-gsap-reveal">
            {BENTO_CARDS.map((card) => (
              <article key={card.title} className={`landing-bento-card ${card.className}`}>
                {card.image ? (
                  <div className="landing-bento-card__media">
                    <img src={card.image} alt="" loading="lazy" />
                  </div>
                ) : null}
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

        <section className="landing-editorial-section landing-editorial-section--accordion" id="apps">
          <div className="landing-horizontal-accordion landing-gsap-reveal" aria-label="Personal Server app areas">
            {ACCORDION_PANELS.map((panel, index) => (
              <article
                key={panel.title}
                className="landing-horizontal-accordion__panel"
                tabIndex={0}
                style={{ '--panel-index': index }}
              >
                <img src={panel.image} alt="" loading="lazy" />
                <div>
                  <span>{panel.title}</span>
                  <p>{panel.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-section landing-editorial-section--manifesto" id="story">
          <div className="landing-editorial-section__lead landing-gsap-reveal" ref={observe}>
            <span className="landing-editorial-section__label">Manifesto</span>
            <h2>Your dashboard should feel like a review of your life, not a control panel.</h2>
          </div>
          <div className="landing-editorial-principles">
            {PRINCIPLES.map((item) => (
              <article key={item.title} className="landing-editorial-principle landing-stack-card" ref={observe}>
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
              {mobileGate ? (
                <a href={ANDROID_APK_URL} className="landing-editorial-button landing-editorial-button--primary">
                  Download Android app
                  <Icon name="download" size={16} />
                </a>
              ) : (
                <>
                  <Link to="/register" className="landing-editorial-button landing-editorial-button--primary">
                    Start with your own data
                    <Icon name="arrow-right" size={16} />
                  </Link>
                  <Link to="/login" className="landing-editorial-button landing-editorial-button--secondary">
                    Sign in
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
            <p>Private quantified-self journal for people who want clarity, not dashboard clutter.</p>
            <span className="landing-editorial-footer__legal">(c) 2026 Adrian Luerssen Medina. Personal Server TM. All rights reserved.</span>
          </div>
          <div className="landing-editorial-footer__meta">
            <div className="landing-editorial-footer__links">
              {FOOTER_LINKS.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="landing-editorial-footer__link">
                  {link.label}
                </a>
              ))}
            </div>
            <span className="landing-editorial-footer__credit">Built for reflective review, private data ownership, and AI-assisted interpretation.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
