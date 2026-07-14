import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { refreshIfPossible } from '../auth'
import Icon from '../components/icons/Icon'
import BrandMark from '../components/product/BrandMark'
import { PRODUCT } from '../product/brand.mjs'
import { ANDROID_APK_URL } from '../mobilePlatform'

const DOMAINS = [
  ['wallet', 'Cash', 'Review transactions, budgets, and detected contactless payments.'],
  ['dumbbell', 'Gym', 'Run a focused session and keep every set available for comparison.'],
  ['heart-pulse', 'Habits', 'Log the day quickly without turning your life into a score.'],
  ['music', 'Music', 'Understand listening patterns, rankings, and the sound of a period.'],
  ['clapperboard', 'Series', 'Track television by season and anime by connected releases.'],
  ['message-square', 'Assistant', 'Ask questions with inspectable sources from your own record.'],
]

const OPEN_RECORDS = [
  ['wallet', 'Review detected payment', 'Card capture · moments ago', 'Needs review'],
  ['clapperboard', 'Continue S02E04', 'The Bear · Season 2', 'Up next'],
  ['heart-pulse', 'Log evening walk', 'Habit · due by 21:00', 'Open'],
]

function LandingActions({ mobileGate }) {
  if (mobileGate) {
    return (
      <a href={ANDROID_APK_URL} className="landing-action landing-action--primary">
        Download Android app <Icon name="download" size={16} />
      </a>
    )
  }

  return (
    <>
      <Link to="/register" className="landing-action landing-action--primary">
        Create account <Icon name="arrow-right" size={16} />
      </Link>
      <Link to="/login" className="landing-action">Sign in</Link>
    </>
  )
}

function RecordPreview() {
  return (
    <div className="landing-record-preview" aria-label="Record Today product preview">
      <div className="landing-record-preview__bar">
        <span><BrandMark size={23} /><strong>Record</strong></span>
        <small>Today · 13 July</small>
      </div>
      <div className="landing-record-preview__body">
        <aside aria-hidden="true">
          {['home', 'wallet', 'dumbbell', 'heart-pulse', 'music', 'clapperboard'].map((icon, index) => (
            <span className={index === 0 ? 'is-active' : ''} key={icon}><Icon name={icon} size={15} /></span>
          ))}
        </aside>
        <section>
          <div className="landing-record-preview__heading">
            <span>MONDAY / 03 OPEN</span>
            <h2>Start with what needs you.</h2>
            <p>The rest of your record is already in place.</p>
          </div>
          <div className="landing-record-preview__summary">
            <span><small>Open records</small><strong>03</strong></span>
            <span><small>Logged today</small><strong>12</strong></span>
            <span><small>Last sync</small><strong>Now</strong></span>
          </div>
          <div className="landing-record-preview__register">
            <header><span>Open records</span><small>Ordered by attention</small></header>
            {OPEN_RECORDS.map(([icon, title, detail, state], index) => (
              <div className="landing-record-preview__row" key={title}>
                <span className="landing-record-preview__index">0{index + 1}</span>
                <Icon name={icon} size={15} />
                <span><strong>{title}</strong><small>{detail}</small></span>
                <em>{state}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default function Landing({ mobileGate = false }) {
  const nav = useNavigate()

  useEffect(() => {
    if (mobileGate) return undefined
    ;(async () => { if (await refreshIfPossible()) nav('/home', { replace: true }) })()
    return undefined
  }, [nav, mobileGate])

  return (
    <div className="landing-record">
      <nav className="landing-nav" aria-label="Public navigation">
        <Link to="/" className="landing-wordmark">
          <BrandMark size={30} />
          <span><strong>{PRODUCT.displayName}</strong><small>Private record system</small></span>
        </Link>
        <div className="landing-nav__links">
          <a href="#product">Product</a>
          <a href="#records">Records</a>
          <a href="#ownership">Ownership</a>
          {!mobileGate && <Link to="/login">Sign in</Link>}
        </div>
      </nav>

      <main>
        <section className="landing-hero" id="product">
          <div className="landing-hero__copy">
            <span className="landing-kicker"><i /> ONE PRIVATE RECORD</span>
            <h1>Keep the life you live useful.</h1>
            <p>Record turns the things you already track—money, training, habits, music, and series—into one calm, inspectable history.</p>
            <div className="landing-actions"><LandingActions mobileGate={mobileGate} /></div>
            <div className="landing-trust" aria-label="Product principles">
              <span><Icon name="shield-check" size={14} /> Private by default</span>
              <span><Icon name="wifi-off" size={14} /> Cache-first</span>
              <span><Icon name="database" size={14} /> Self-hostable</span>
            </div>
          </div>
          <RecordPreview />
        </section>

        <section className="landing-legibility" id="records">
          <div className="landing-section-heading">
            <span>THE RECORD, NOT A DASHBOARD</span>
            <h2>Your records stay legible.</h2>
            <p>Each area uses the interaction its information needs, while the same index, typography, actions, and provenance keep the product coherent.</p>
          </div>
          <div className="landing-domain-register">
            {DOMAINS.map(([icon, title, description], index) => (
              <article className="landing-domain-row" key={title}>
                <span className="landing-domain-row__index">0{index + 1}</span>
                <span className="landing-domain-row__icon"><Icon name={icon} size={18} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <small>Purpose-built <Icon name="arrow-up-right" size={13} /></small>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-ownership" id="ownership">
          <div className="landing-section-heading">
            <span>ONE PRODUCT / TWO OPERATING MODELS</span>
            <h2>Convenience without giving up control.</h2>
            <p>Use the managed service and we handle operation. Self-host the same product when infrastructure ownership matters more.</p>
          </div>
          <div className="landing-service-register">
            <article className="is-featured">
              <span>01 / MANAGED SERVICE</span>
              <h3>Ready for normal life.</h3>
              <p>Updates, backups, secure access, and the mobile service are handled for you.</p>
              <strong>Best for most people</strong>
            </article>
            <article>
              <span>02 / SELF-HOSTED</span>
              <h3>Your infrastructure.</h3>
              <p>Run the source yourself and keep the operational boundary entirely in your hands.</p>
              <strong>Best for builders</strong>
            </article>
          </div>
        </section>

        <section className="landing-final">
          <BrandMark size={46} />
          <span>RECORD / WEB + ANDROID</span>
          <h2>Make yesterday useful today.</h2>
          <p>{PRODUCT.promise}</p>
          <div className="landing-actions"><LandingActions mobileGate={mobileGate} /></div>
        </section>
      </main>

      <footer className="landing-footer">
        <span><BrandMark size={22} /> {PRODUCT.displayName}</span>
        <span>Managed service · Self-hosted source · Android + web</span>
        <a href="https://github.com/Adrian-Luerssen/Personal-Server" target="_blank" rel="noreferrer">View source</a>
      </footer>
    </div>
  )
}
