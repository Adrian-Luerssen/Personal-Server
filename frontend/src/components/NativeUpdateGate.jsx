import React, { useEffect, useState } from 'react'
import {
  buildInstalledVersionAnnouncement,
  checkForAndroidUpdate,
  dismissAndroidUpdate,
  getAndroidVersionPolicy,
  installAndroidUpdate,
  writeSeenAppVersion,
} from '../appUpdate'
import { APP_VERSION } from '../appVersion.mjs'
import Icon from './icons/Icon'

function ChangelogList({ changelog }) {
  const sections = [
    ['New', changelog?.features || []],
    ['Fixed', changelog?.fixes || []],
    ['Technical', changelog?.technical || []],
  ].filter(([, items]) => items.length > 0)

  return (
    <div className="native-update-changelog">
      {changelog?.summary && <p>{changelog.summary}</p>}
      {sections.map(([title, items]) => (
        <div key={title}>
          <strong>{title}</strong>
          <ul>
            {items.slice(0, 6).map((item, index) => (
              <li key={`${title}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function NativeUpdateGate({ nativeApp }) {
  const [update, setUpdate] = useState(null)
  const [announcement, setAnnouncement] = useState(null)
  const [status, setStatus] = useState('Ready')

  useEffect(() => {
    if (!nativeApp) return
    let cancelled = false

    async function check() {
      const nextUpdate = await checkForAndroidUpdate({ force: true })
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
    if (!update) return
    setStatus('Preparing APK installer...')
    const result = await installAndroidUpdate(update).catch((error) => ({
      started: false,
      message: error.message || 'Could not start installer.',
    }))
    if (result?.needsPermission) {
      setStatus('Allow Personal Server to install unknown apps, then try again.')
      return
    }
    setStatus(result?.started === false ? (result?.message || 'Installer could not start.') : 'Android installer opened. Complete the update prompt.')
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
          <h2>{update.required ? 'Update required' : 'Update available'}</h2>
          <p>
            Installed v{update.currentVersion}. Latest {update.version}.
            {update.required ? ' This version is no longer supported by the API.' : ''}
          </p>
          <ChangelogList changelog={update.changelog} />
          <div className="native-update-gate__status">{status}</div>
          <div className="native-update-gate__actions">
            <button type="button" className="native-primary-button" onClick={install}>
              <Icon name="download" size={18} />
              Install update
            </button>
            {!update.required && (
              <button type="button" className="native-secondary-button" onClick={dismiss}>
                Later
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
