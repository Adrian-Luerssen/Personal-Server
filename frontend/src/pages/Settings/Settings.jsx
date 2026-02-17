import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import AgentApiKeys from './AgentApiKeys'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('agent-keys')

  return (
    <>
      <h1>Settings</h1>

      <div className="tab-group" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'agent-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent-keys')}
        >
          <span className="material-icons" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'middle' }}>key</span>
          Agent API Keys
        </button>
        <button
          className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <span className="material-icons" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'middle' }}>link</span>
          Connections
        </button>
        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <span className="material-icons" style={{ fontSize: '16px', marginRight: '4px', verticalAlign: 'middle' }}>tune</span>
          Preferences
        </button>
      </div>

      {activeTab === 'agent-keys' && <AgentApiKeys />}

      {activeTab === 'connections' && (
        <div className="card section">
          <h2>Connected Accounts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎵</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Spotify</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Music streaming integration</div>
                </div>
              </div>
              <NavLink to="/profile" className="btn small btn-ghost">
                Manage in Profile
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="card section">
          <h2>Preferences</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Theme and display preferences are available in the sidebar.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Quick Links</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <NavLink to="/profile" className="btn small btn-ghost">
                <span className="material-icons" style={{ fontSize: '16px' }}>person</span>
                Profile Settings
              </NavLink>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
