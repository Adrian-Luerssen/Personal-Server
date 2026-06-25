import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AgentApiKeys from './AgentApiKeys'
import Connections from './Connections'
import Appearance from './Appearance'
import Account from './Account'
import DataManagement from './DataManagement'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import { APP_BUILD_TIME, APP_VERSION, formatBuildTime } from '../../appVersion.mjs'

const SETTINGS_TABS = new Set(['account', 'connections', 'agent-keys', 'appearance', 'preferences', 'data'])

function normalizeTab(tab) {
  return SETTINGS_TABS.has(tab) ? tab : 'account'
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const spotifyError = searchParams.get('spotify_error') || ''
  const [activeTab, setActiveTab] = useState(
    spotifyError ? 'connections' : normalizeTab(requestedTab)
  )

  useEffect(() => {
    if (spotifyError) {
      setActiveTab('connections')
      return
    }
    if (requestedTab) setActiveTab(normalizeTab(requestedTab))
  }, [requestedTab, spotifyError])

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
  }

  const currentLanguage = i18n.language

  return (
    <>
      <PageHeader icon="settings" title="Settings" />

      <div className="tab-group" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <Icon name="user" size={16} style={{ marginRight: '4px' }} />
          Account
        </button>
        <button
          className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <Icon name="link" size={16} style={{ marginRight: '4px' }} />
          {t('settings.connections')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'agent-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent-keys')}
        >
          <Icon name="key-round" size={16} style={{ marginRight: '4px' }} />
          {t('settings.agentApiKeys')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          <Icon name="palette" size={16} style={{ marginRight: '4px' }} />
          Appearance
        </button>
        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Icon name="sliders-horizontal" size={16} style={{ marginRight: '4px' }} />
          {t('settings.preferences')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <Icon name="database" size={16} style={{ marginRight: '4px' }} />
          Data
        </button>
      </div>

      {activeTab === 'account' && <Account />}

      {activeTab === 'agent-keys' && <AgentApiKeys />}

      {activeTab === 'connections' && <Connections initialError={spotifyError} />}

      {activeTab === 'appearance' && <Appearance />}

      {activeTab === 'data' && <DataManagement />}

      {activeTab === 'preferences' && (
        <div className="card section">
          <h2>{t('settings.preferences')}</h2>

          {/* Language Selector */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              <Icon name="globe" size={18} style={{ marginRight: '0.5rem' }} />
              {t('settings.language')}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {t('settings.languageDesc')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className={`btn ${currentLanguage === 'en' ? '' : 'btn-ghost'}`}
                onClick={() => changeLanguage('en')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '120px',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>EN</span>
                {t('settings.english')}
              </button>
              <button
                className={`btn ${currentLanguage === 'es' ? '' : 'btn-ghost'}`}
                onClick={() => changeLanguage('es')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '120px',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>ES</span>
                {t('settings.spanish')}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              {t('settings.themeDesc')}
            </p>
          </div>

          <div className="settings-version-card">
            <div>
              <span>App version</span>
              <strong>v{APP_VERSION}</strong>
            </div>
            <div>
              <span>Build</span>
              <strong>{formatBuildTime(APP_BUILD_TIME)}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
