import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AgentApiKeys from './AgentApiKeys'
import Connections from './Connections'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('agent-keys')

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
  }

  const currentLanguage = i18n.language

  return (
    <>
      <h1>{t('settings.title')}</h1>

      <div className="tab-group" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'agent-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent-keys')}
        >
          <span className="material-icons" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'middle' }}>key</span>
          {t('settings.agentApiKeys')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <span className="material-icons" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'middle' }}>link</span>
          {t('settings.connections')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <span className="material-icons" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'middle' }}>tune</span>
          {t('settings.preferences')}
        </button>
      </div>

      {activeTab === 'agent-keys' && <AgentApiKeys />}

      {activeTab === 'connections' && <Connections />}

      {activeTab === 'preferences' && (
        <div className="card section">
          <h2>{t('settings.preferences')}</h2>

          {/* Language Selector */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '0.5rem' }}>language</span>
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
                <span style={{ fontSize: '1.2rem' }}>🇬🇧</span>
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
                <span style={{ fontSize: '1.2rem' }}>🇪🇸</span>
                {t('settings.spanish')}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              {t('settings.themeDesc')}
            </p>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{t('settings.quickLinks')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <NavLink to="/profile" className="btn small btn-ghost">
                <span className="material-icons" style={{ fontSize: '16px' }}>person</span>
                {t('settings.profileSettings')}
              </NavLink>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
