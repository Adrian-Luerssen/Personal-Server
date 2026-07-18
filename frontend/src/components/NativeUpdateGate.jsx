import React, { useEffect, useState } from 'react'
import {
  buildInstalledVersionAnnouncement,
  checkForAndroidUpdate,
  dismissAndroidUpdate,
  getAndroidVersionPolicy,
  installAndroidUpdate,
  writeSeenAppVersion,
} from '../appUpdate'
import { APP_VERSION, normalizeAppVersion } from '../appVersion.mjs'
import Icon from './icons/Icon'

function ChangelogList({ changelog }) {
  const isPlaceholder = (item) => /^no .+ (entries|changes) were detected/i.test(String(item || '').trim())
  const sections = [
    ['New', changelog?.features || []],
    ['Fixed', changelog?.fixes || []],
    ['Technical', changelog?.technical || []],
  ].map(([title, items]) => [title, items.filter((item) => !isPlaceholder(item))])
    .filter(([, items]) => items.length > 0)

  if (sections.length === 0) return null

  return (
    <details className="native-update-changelog">
      <summary>What changed</summary>
      {sections.map(([title, items]) => (
        <section key={title} className="native-update-changelog__section" aria-label={`${title} in this update`}>
          <strong>{title}</strong>
          <ul>
            {items.slice(0, 6).map((item, index) => (
              <li key={`${title}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </details>
  )
}

export default function NativeUpdateGate({ nativeApp }) {
  const [update, setUpdate] = useState(null)
  const [announcement, setAnnouncement] = useState(null)
  const [status, setStatus] = useState('')
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (!nativeApp) return
    let cancelled = false

    async function check() {
      const nextUpdate = await checkForAndroidUpdate({ force: false })
      if (cancelled) return
      if (nextUpdate) {
        setUpdate(nextUpdate)
        return
      }

      const policy = await getAndroidVersionPolicy()
      if (cancelled) return
      const nextAnnouncement = buildInstalledVersionAnnouncement({
        currentVersion: APP_VERSION,
        installedRelease: policy?.installed,
      })
      if (nextAnnouncement) setAnnouncement(nextAnnouncement)
    }

    check().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [nativeApp])

  if (!nativeApp) return null

  async function install() {
    if (!update || installing) return
    setInstalling(true)
    setStatus('Preparing APK installer...')
    const result = await installAndroidUpdate(update).catch((error) => ({
      started: false,
      message: error.message || 'Could not start installer.',
    }))
    if (result?.needsPermission) {
      setStatus('Allow Record to install unknown apps, return here, then tap Install update again.')
      setInstalling(false)
      return
    }
    setStatus(result?.started === false ? (result?.message || 'Installer could not start.') : 'Android installer opened. Complete the update prompt.')
    setInstalling(false)
  }

  function dismiss() {
    if (!update?.required) {
      dismissAndroidUpdate(update?.id)
      setUpdate(null)
    }
  }

  function acknowledgeAnnouncement() {
    writeSeenAppVersion(undefined, APP_VERSION)
    setAnnouncement(null)
  }

  if (update) {
    return (
      <div className={`native-update-gate ${update.required ? 'is-blocking' : ''}`} role="dialog" aria-modal={update.required ? 'true' : 'false'}>
        <div className="native-update-gate__panel">
          <span className="native-update-gate__icon" aria-hidden="true">
            <Icon name="smartphone" size={22} />
          </span>
          <span className="native-update-gate__eyebrow">Record for Android</span>
          <h2>{update.required ? 'Update required' : 'A new version is ready'}</h2>
          <p className="native-update-gate__version">v{normalizeAppVersion(update.currentVersion)} <span aria-hidden="true">→</span> v{normalizeAppVersion(update.version)}</p>
          <p className="native-update-gate__summary">{update.changelog?.summary || (update.required ? 'Update to keep using Record.' : 'Install the latest improvements when you are ready.')}</p>
          <ChangelogList changelog={update.changelog} />
          {status && <div className="native-update-gate__status" role="status">{status}</div>}
          <div className="native-update-gate__actions">
            <button type="button" className="native-primary-button" onClick={install} disabled={installing}>
              <Icon name="download" size={18} />
              {installing ? 'Preparing update…' : 'Install update'}
            </button>
            {!update.required && (
              <button type="button" className="native-secondary-button" onClick={dismiss}>
                Not now
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (announcement) {
    return (
      <div className="native-update-gate" role="dialog" aria-modal="false">
        <div className="native-update-gate__panel">
          <span className="native-update-gate__icon" aria-hidden="true">
            <Icon name="sparkles" size={22} />
          </span>
          <h2>Updated to v{announcement.version}</h2>
          <ChangelogList changelog={announcement.changelog} />
          <div className="native-update-gate__actions">
            <button type="button" className="native-primary-button" onClick={acknowledgeAnnouncement}>
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
