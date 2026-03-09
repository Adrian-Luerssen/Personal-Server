import React, { useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { refreshIfPossible } from '../auth'
import Icon from '../components/icons/Icon'
import './Landing.css'

/* ───── Intersection Observer hook ───── */
function useScrollReveal() {
  const refs = useRef([])
  const register = useCallback((el) => {
    if (el && !refs.current.includes(el)) refs.current.push(el)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    refs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return register
}

/* ───── Animated counter hook ───── */
function useCounter(target, duration = 1800) {
  const ref = useRef(null)
  const counted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true
          const start = performance.now()
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            el.textContent = Math.round(eased * target).toLocaleString()
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return ref
}

/* ───── Feature data ───── */
const FEATURES = [
  { icon: 'dumbbell', accent: 'cyan', title: 'Workouts', desc: 'Log exercises, track PRs, and visualize training volume over time with detailed analytics.' },
  { icon: 'wallet', accent: 'green', title: 'Finance', desc: 'Monitor transactions, categorize spending, and stay on top of budgets effortlessly.' },
  { icon: 'heart-pulse', accent: 'rose', title: 'Habits', desc: 'Build streaks, track daily habits, and get insights into your consistency patterns.' },
  { icon: 'music', accent: 'amber', title: 'Music', desc: 'Manage your library, create playlists, and keep notes on your favorite tracks.' },
  { icon: 'message-square', accent: 'violet', title: 'Agent Copilot', desc: 'An AI assistant that understands your data and helps you make sense of it all.' },
]

/* ───── Counter data ───── */
const COUNTERS = [
  { value: 12480, label: 'Workouts Tracked', suffix: '+' },
  { value: 53200, label: 'Transactions Logged', suffix: '+' },
  { value: 1840, label: 'Habits Completed', suffix: '' },
  { value: 99, label: 'Uptime', suffix: '%' },
]

/* ───── Mock bar chart heights ───── */
const BAR_HEIGHTS = [60, 80, 45, 90, 70, 55, 85, 75, 95, 50, 65, 88]
const BAR_COLORS = ['#7dd3fc', '#60a5fa', '#a78bfa', '#7dd3fc', '#60a5fa', '#a78bfa',
                     '#7dd3fc', '#60a5fa', '#a78bfa', '#7dd3fc', '#60a5fa', '#a78bfa']

export default function Landing() {
  const nav = useNavigate()
  const observe = useScrollReveal()

  useEffect(() => {
    (async () => {
      const ok = await refreshIfPossible()
      if (ok) nav('/home', { replace: true })
    })()
  }, [nav])

  /* Counter refs */
  const c1 = useCounter(COUNTERS[0].value)
  const c2 = useCounter(COUNTERS[1].value)
  const c3 = useCounter(COUNTERS[2].value)
  const c4 = useCounter(COUNTERS[3].value)
  const counterRefs = [c1, c2, c3, c4]

  return (
    <div className="landing-cinematic">

      {/* ════════ HERO ════════ */}
      <section className="landing-hero-section">
        <div className="hero-gradient-mesh">
          <div className="gradient-orb gradient-orb--1" />
          <div className="gradient-orb gradient-orb--2" />
          <div className="gradient-orb gradient-orb--3" />
        </div>

        <div className="hero-content">
          <span className="hero-badge">
            <Icon name="sparkles" size={14} />
            All-in-one personal platform
          </span>

          <h1 className="hero-headline">
            Your Life,<br />
            <span className="accent-text">One Dashboard</span>
          </h1>

          <p className="hero-subtitle">
            Track workouts, manage finances, build habits, and let an AI copilot
            connect the dots — all in a single, beautiful interface.
          </p>

          <div className="hero-cta-group">
            <Link to="/register" className="hero-cta-primary">
              Get Started
              <Icon name="arrow-right" size={18} />
            </Link>
            <Link to="/login" className="hero-cta-secondary">
              <Icon name="log-in" size={18} />
              Login
            </Link>
          </div>
        </div>

        {/* Floating dashboard mockup */}
        <div className="hero-mockup">
          <div className="hero-mockup-card">
            <div className="mockup-header">
              <div className="mockup-dots">
                <div className="mockup-dot mockup-dot--red" />
                <div className="mockup-dot mockup-dot--yellow" />
                <div className="mockup-dot mockup-dot--green" />
              </div>
              <span className="mockup-title">Dashboard Overview</span>
            </div>
            <div className="mockup-grid">
              <div className="mockup-stat">
                <div className="mockup-stat-label">Workouts</div>
                <div className="mockup-stat-value accent">24</div>
              </div>
              <div className="mockup-stat">
                <div className="mockup-stat-label">Savings</div>
                <div className="mockup-stat-value success">$1,240</div>
              </div>
              <div className="mockup-stat">
                <div className="mockup-stat-label">Streak</div>
                <div className="mockup-stat-value warning">18d</div>
              </div>
              <div className="mockup-bar-row">
                {BAR_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className="mockup-bar"
                    style={{ height: `${h}%`, background: BAR_COLORS[i], opacity: 0.7 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hero-scroll-hint">
          <span>Scroll to explore</span>
          <div className="scroll-arrow" />
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="section-label">
            <Icon name="layers" size={14} />
            Features
          </div>
          <h2 className="section-title">Everything you need, nothing you don't</h2>
          <p className="section-desc">
            Five integrated domains working together to give you a complete picture
            of your daily life.
          </p>

          <div className="features-grid">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="feature-card"
                data-accent={f.accent}
                ref={observe}
              >
                <div className="feature-icon" data-accent={f.accent}>
                  <Icon name={f.icon} size={24} />
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ LIVE DATA ════════ */}
      <section className="landing-section live-data-section">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label" style={{ justifyContent: 'center' }}>
            <Icon name="activity" size={14} />
            Live Data
          </div>
          <h2 className="section-title">Numbers that move with you</h2>
          <p className="section-desc" style={{ margin: '0 auto 3rem' }}>
            Real-time tracking across every domain, always up to date.
          </p>

          <div className="counters-grid">
            {COUNTERS.map((c, i) => (
              <div key={c.label} className="counter-item" ref={observe}>
                <div className="counter-value">
                  <span ref={counterRefs[i]}>0</span>{c.suffix}
                </div>
                <div className="counter-label">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="live-widget" ref={observe}>
            <div className="live-widget-header">
              <span className="live-widget-title">Recent Activity</span>
              <span className="live-dot" />
            </div>
            <div className="live-feed">
              <div className="live-feed-item">
                <div className="feed-icon cyan"><Icon name="dumbbell" size={14} /></div>
                <span className="feed-text">Bench Press — 3x8 @ 185lb</span>
                <span className="feed-time">2m ago</span>
              </div>
              <div className="live-feed-item">
                <div className="feed-icon green"><Icon name="wallet" size={14} /></div>
                <span className="feed-text">Groceries — $64.30</span>
                <span className="feed-time">1h ago</span>
              </div>
              <div className="live-feed-item">
                <div className="feed-icon amber"><Icon name="check-circle" size={14} /></div>
                <span className="feed-text">Morning run completed</span>
                <span className="feed-time">3h ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ AGENT / COPILOT ════════ */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="agent-section-layout">
            {/* Chat mockup */}
            <div className="chat-mockup" ref={observe}>
              <div className="chat-mockup-header">
                <div className="chat-mockup-status" />
                <span className="chat-mockup-name">Copilot</span>
              </div>
              <div className="chat-messages">
                <div className="chat-bubble user">
                  How did my spending compare to last month?
                </div>
                <div className="chat-bubble agent">
                  You spent 12% less this month — mostly from dining out dropping by $140. Your gym membership renewed at the usual rate.
                  <div className="chat-context-chips">
                    <span className="context-chip"><Icon name="wallet" size={10} /> Finance</span>
                    <span className="context-chip"><Icon name="trending-down" size={10} /> -12%</span>
                  </div>
                  <div className="chat-status-row">
                    <span className="chat-check"><Icon name="check" size={10} /></span>
                    Analyzed 47 transactions
                  </div>
                </div>
                <div className="chat-bubble user">
                  And my workouts?
                </div>
                <div className="chat-bubble agent">
                  You hit 5 sessions last week
                  <div className="thinking-dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation text */}
            <div className="agent-text" ref={observe}>
              <div className="section-label">
                <Icon name="bot" size={14} />
                AI Copilot
              </div>
              <h2 className="section-title">Your data, understood</h2>
              <p className="section-desc">
                Ask questions in plain language. The copilot pulls context from
                every domain to give you real, actionable answers.
              </p>
              <div className="agent-features">
                <div className="agent-feature-item">
                  <div className="agent-feature-icon"><Icon name="search" size={16} /></div>
                  <div className="agent-feature-text">
                    <h4>Cross-domain queries</h4>
                    <p>Ask about workouts, finances, and habits in one conversation.</p>
                  </div>
                </div>
                <div className="agent-feature-item">
                  <div className="agent-feature-icon"><Icon name="zap" size={16} /></div>
                  <div className="agent-feature-text">
                    <h4>Instant insights</h4>
                    <p>Get trends, comparisons, and summaries without manual analysis.</p>
                  </div>
                </div>
                <div className="agent-feature-item">
                  <div className="agent-feature-icon"><Icon name="shield" size={16} /></div>
                  <div className="agent-feature-text">
                    <h4>Private by design</h4>
                    <p>All data stays on your server. Nothing leaves your infrastructure.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ PERSONALIZATION ════════ */}
      <section className="landing-section personalization-section">
        <div className="landing-section-inner">
          <div className="section-label" style={{ justifyContent: 'center' }}>
            <Icon name="palette" size={14} />
            Personalization
          </div>
          <h2 className="section-title">Make it yours</h2>
          <p className="section-desc" style={{ margin: '0 auto 3rem' }}>
            Dark mode, light mode, and a range of accent colors to match your style.
          </p>

          <div className="theme-demo" ref={observe}>
            <div className="theme-preview theme-preview--dark">
              <div className="theme-preview-bar" />
              <div className="theme-preview-cards">
                <div className="theme-preview-card" />
                <div className="theme-preview-card" />
                <div className="theme-preview-card" />
                <div className="theme-preview-card" />
              </div>
              <div className="theme-preview-label">Dark</div>
            </div>
            <div className="theme-preview theme-preview--light">
              <div className="theme-preview-bar" />
              <div className="theme-preview-cards">
                <div className="theme-preview-card" />
                <div className="theme-preview-card" />
                <div className="theme-preview-card" />
                <div className="theme-preview-card" />
              </div>
              <div className="theme-preview-label">Light</div>
            </div>
          </div>

          <div className="accent-grid" ref={observe}>
            <div className="accent-swatch" data-color="cyan" />
            <div className="accent-swatch" data-color="violet" />
            <div className="accent-swatch" data-color="rose" />
            <div className="accent-swatch" data-color="amber" />
            <div className="accent-swatch" data-color="green" />
            <div className="accent-swatch" data-color="blue" />
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-links">
            <Link to="/login" className="footer-link">
              <Icon name="log-in" size={14} />
              Login
            </Link>
            <Link to="/register" className="footer-link">
              <Icon name="user-plus" size={14} />
              Register
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">
              <Icon name="github" size={14} />
              GitHub
            </a>
          </div>
          <div className="footer-badges">
            <span className="footer-badge">React</span>
            <span className="footer-badge">NestJS</span>
            <span className="footer-badge">PostgreSQL</span>
            <span className="footer-badge">TypeScript</span>
          </div>
          <p className="footer-copy">Built with care. Self-hosted. Open source.</p>
        </div>
      </footer>
    </div>
  )
}
