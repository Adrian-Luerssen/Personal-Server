import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { refreshIfPossible } from '../auth'
import Icon from '../components/icons/Icon'
import BrandMark from '../components/product/BrandMark'
import { PRODUCT } from '../product/brand.mjs'
import { ANDROID_APK_URL } from '../mobilePlatform'
import './Landing.css'

const DOMAINS = [
  ['dumbbell', 'Gym', 'Live sessions, sets, progress and body signals.', 'gym'],
  ['heart-pulse', 'Habits', 'Daily choices, cadence and honest streaks.', 'habits'],
  ['wallet', 'Cash', 'Transactions, budgets and contactless capture.', 'cash'],
  ['music', 'Music', 'Listening identity, rankings and movement.', 'music'],
  ['clapperboard', 'Series', 'TV seasons, anime continuity and next episodes.', 'series'],
  ['message-square', 'Assistant', 'Answers grounded in the records you can inspect.', 'assistant'],
]

const SIGNALS = [
  ['Habits', '5 / 7', 'habits'],
  ['Cash out', '€42.30', 'cash'],
  ['Movement', '8,420', 'gym'],
  ['Listening', '128', 'music'],
]

function ProductStage() {
  return (
    <div className="landing-product-stage" aria-label="Personal Record Today product preview">
      <aside className="landing-stage-sidebar">
        <div className="landing-stage-brand"><BrandMark size={25} /><strong>Record</strong></div>
        {DOMAINS.slice(0, 5).map(([icon, label, , tone]) => <span key={label} data-tone={tone}><Icon name={icon} size={14} />{label}</span>)}
      </aside>
      <div className="landing-stage-canvas">
        <div className="landing-stage-bar"><span>TODAY / MON 13 JUL</span><strong><i /> READY</strong></div>
        <div className="landing-stage-grid">
          <article className="landing-stage-hero"><span>PERSONAL RECORD / TODAY</span><h2>Start with what needs you.</h2><p>Two records are open. Everything else is already in place.</p><button type="button">Ask about today</button></article>
          <article className="landing-stage-next"><span>NEXT ACTION</span><Icon name="wallet" size={18} /><strong>Review a detected payment</strong><small>Contactless payment · moments ago</small><button type="button">Review capture <Icon name="arrow-right" size={12} /></button></article>
          {SIGNALS.map(([label, value, tone]) => <article className="landing-stage-metric" data-tone={tone} key={label}><span>{label}</span><strong>{value}</strong><small>Today</small></article>)}
        </div>
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

  const actions = mobileGate ? (
    <a href={ANDROID_APK_URL} className="landing-action landing-action--primary">Download Android app <Icon name="download" size={16} /></a>
  ) : (
    <><Link to="/register" className="landing-action landing-action--primary">Create account <Icon name="arrow-right" size={16} /></Link><Link to="/login" className="landing-action">Open login</Link></>
  )

  return (
    <div className="landing-premium">
      <nav className="landing-nav" aria-label="Public navigation">
        <Link to="/" className="landing-wordmark"><BrandMark size={30} /><span><strong>{PRODUCT.displayName}</strong><small>Private life intelligence</small></span></Link>
        <div><a href="#product">Product</a><a href="#domains">Domains</a><a href="#service">Service</a>{!mobileGate && <Link to="/login">Sign in</Link>}</div>
      </nav>

      <main>
        <section className="landing-hero" id="product">
          <div className="landing-hero__copy">
            <span className="landing-kicker"><i /> YOUR LIFE, CONNECTED</span>
            <h1>Everything you are,<br />in context.</h1>
            <p>One private place for the records that shape your day. Fast on mobile, deep on desktop, and useful before the network catches up.</p>
            <div className="landing-actions">{actions}</div>
            <div className="landing-trust"><span><Icon name="shield-check" size={14} /> Private by default</span><span><Icon name="wifi-off" size={14} /> Cache-first</span><span><Icon name="database" size={14} /> Self-hostable</span></div>
          </div>
          <ProductStage />
        </section>

        <section className="landing-domain-section" id="domains">
          <div className="landing-section-copy"><span>ONE RECORD, DISTINCT INSTRUMENTS</span><h2>Your domains keep their character.</h2><p>Cash should feel like Cash. Gym should feel built for a set in progress. Personal Record connects them without making them identical.</p></div>
          <div className="landing-domain-register">
            {DOMAINS.map(([icon, title, text, tone], index) => <article className="landing-domain-row" data-tone={tone} key={title}><span className="landing-domain-row__index">0{index + 1}</span><span className="landing-domain-row__icon"><Icon name={icon} size={18} /></span><h3>{title}</h3><p>{text}</p><small>Purpose-built <Icon name="arrow-up-right" size={13} /></small></article>)}
          </div>
          <div className="landing-instrument-register" aria-label="Live product records">
            {SIGNALS.concat([['Next episode', 'S02 E04', 'series']]).map(([label, value, tone]) => <div className="landing-instrument-row" data-tone={tone} key={label}><i /><span>{label}</span><strong>{value}</strong><small>Synced</small></div>)}
          </div>
        </section>

        <section className="landing-service" id="service">
          <div className="landing-section-copy"><span>YOUR DATA, YOUR OPERATING MODEL</span><h2>Managed for convenience. Self-hosted for control.</h2></div>
          <div className="landing-service-grid">
            <article data-featured="true"><span>Managed cloud</span><h3>Ready when you are.</h3><p>We operate updates, backups, secure access and the mobile service. You use the product.</p><strong>Best for most people</strong></article>
            <article><span>Self-hosted</span><h3>Your infrastructure.</h3><p>Run the open source code for yourself and keep operational responsibility in your hands.</p><strong>Best for builders</strong></article>
          </div>
        </section>

        <section className="landing-final"><BrandMark size={48} /><h2>Make your records useful.</h2><p>{PRODUCT.promise}</p><div className="landing-actions">{actions}</div></section>
      </main>

      <footer className="landing-footer"><span><BrandMark size={22} /> {PRODUCT.displayName}</span><span>Managed service · Self-hosted source · Android + web</span><a href="https://github.com/Adrian-Luerssen/Personal-Server" target="_blank" rel="noreferrer">Source</a></footer>
    </div>
  )
}
