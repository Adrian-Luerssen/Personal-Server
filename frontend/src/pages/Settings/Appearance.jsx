import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePreferences } from '../../contexts/PreferencesContext'
import Icon from '../../components/icons/Icon'

const PRESET_COLORS = [
  '#7dd3fc', // sky
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
  '#fb923c', // orange
  '#fbbf24', // amber
  '#4ade80', // green
  '#2dd4bf', // teal
  '#f87171', // red
  '#e2e8f0', // slate
]

const GRADIENT_DIRECTIONS = [
  { label: 'To Top', value: 'to top' },
  { label: 'To Right', value: 'to right' },
  { label: 'To Bottom', value: 'to bottom' },
  { label: 'To Left', value: 'to left' },
  { label: 'To Top Right', value: 'to top right' },
  { label: 'To Bottom Right', value: 'to bottom right' },
  { label: 'To Bottom Left', value: 'to bottom left' },
  { label: 'To Top Left', value: 'to top left' },
]

const DEFAULTS = {
  accentColor: '#7dd3fc',
  themeMode: 'dark',
  background: null,
  sidebarPosition: 'left',
  density: 'comfortable',
  customCss: null,
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="settings-subsection-card">
      <h3 className="settings-subsection-card__title">
        <Icon name={icon} size={20} style={{ color: 'var(--color-accent)' }} />
        {title}
      </h3>
      {children}
    </div>
  )
}

function ColorSwatch({ color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: color,
        border: selected ? '3px solid var(--color-text-primary)' : '2px solid transparent',
        outline: selected ? '2px solid var(--color-accent)' : 'none',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: selected ? '0 0 8px ' + color + '88' : 'none',
        padding: 0,
      }}
      title={color}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    />
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'rgba(0,0,0,0.15)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '3px',
        gap: '2px',
      }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm, 6px)',
            border: 'none',
            background: value === opt.value ? 'var(--color-accent)' : 'transparent',
            color: value === opt.value ? '#000' : 'var(--color-text-secondary)',
            fontWeight: value === opt.value ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {opt.icon && (
            <Icon name={opt.icon} size={16} />
          )}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function RadioCard({ selected, onClick, icon, label, description }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: '120px',
        padding: '1rem',
        background: selected ? 'var(--color-accent-muted)' : 'rgba(0,0,0,0.1)',
        border: selected ? '2px solid var(--color-accent)' : '2px solid transparent',
        borderRadius: 'var(--radius-md, 8px)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'border-color 0.15s, background 0.15s',
        color: 'inherit',
      }}
    >
      <Icon name={icon} size={28} style={{ color: selected ? 'var(--color-accent)' : 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }} />
      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
      {description && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{description}</div>
      )}
    </button>
  )
}

export default function Appearance() {
  const { prefs, updatePrefs } = usePreferences()

  // Local state for custom CSS debouncing
  const [customCssLocal, setCustomCssLocal] = useState(prefs.customCss || '')
  const [hexInput, setHexInput] = useState(prefs.accentColor || '#7dd3fc')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const debounceRef = useRef(null)

  // Background local state
  const bgType = prefs.background?.type || 'solid'
  const [bgSolidColor, setBgSolidColor] = useState('#0f172a')
  const [bgGradColor1, setBgGradColor1] = useState('#0f172a')
  const [bgGradColor2, setBgGradColor2] = useState('#1e293b')
  const [bgGradDirection, setBgGradDirection] = useState('to bottom right')
  const [bgImageUrl, setBgImageUrl] = useState('')
  const [bgSubTab, setBgSubTab] = useState(bgType === 'image' ? 'image' : bgType === 'gradient' ? 'gradient' : 'solid')

  // Sync background local state from prefs on mount
  useEffect(() => {
    if (prefs.background) {
      setBgSubTab(prefs.background.type)
      if (prefs.background.type === 'solid') {
        setBgSolidColor(prefs.background.value || '#0f172a')
      } else if (prefs.background.type === 'gradient') {
        // Parse gradient value
        const val = prefs.background.value || ''
        const dirMatch = val.match(/linear-gradient\(([^,]+),/)
        if (dirMatch) setBgGradDirection(dirMatch[1].trim())
        const colorMatches = val.match(/#[0-9a-fA-F]{6}/g)
        if (colorMatches?.[0]) setBgGradColor1(colorMatches[0])
        if (colorMatches?.[1]) setBgGradColor2(colorMatches[1])
      } else if (prefs.background.type === 'image') {
        setBgImageUrl(prefs.background.value || '')
      }
    }
  }, [])

  // Sync hex input when accent color changes externally
  useEffect(() => {
    setHexInput(prefs.accentColor || '#7dd3fc')
  }, [prefs.accentColor])

  // Sync custom CSS local state
  useEffect(() => {
    setCustomCssLocal(prefs.customCss || '')
  }, [prefs.customCss])

  const handleAccentColor = (color) => {
    setHexInput(color)
    updatePrefs({ accentColor: color })
  }

  const handleHexChange = (value) => {
    setHexInput(value)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      updatePrefs({ accentColor: value })
    }
  }

  const handleThemeMode = (mode) => {
    updatePrefs({ themeMode: mode })
  }

  const handleBgSubTab = (tab) => {
    setBgSubTab(tab)
    if (tab === 'solid') {
      updatePrefs({ background: { type: 'solid', value: bgSolidColor } })
    } else if (tab === 'gradient') {
      updatePrefs({ background: { type: 'gradient', value: `linear-gradient(${bgGradDirection}, ${bgGradColor1}, ${bgGradColor2})` } })
    } else if (tab === 'image') {
      if (bgImageUrl) {
        updatePrefs({ background: { type: 'image', value: bgImageUrl } })
      }
    }
  }

  const handleBgSolid = (color) => {
    setBgSolidColor(color)
    updatePrefs({ background: { type: 'solid', value: color } })
  }

  const handleBgGradient = (color1, color2, direction) => {
    setBgGradColor1(color1)
    setBgGradColor2(color2)
    setBgGradDirection(direction)
    updatePrefs({ background: { type: 'gradient', value: `linear-gradient(${direction}, ${color1}, ${color2})` } })
  }

  const handleBgImage = (url) => {
    setBgImageUrl(url)
    if (url.trim()) {
      updatePrefs({ background: { type: 'image', value: url.trim() } })
    }
  }

  const handleSidebarPosition = (pos) => {
    updatePrefs({ sidebarPosition: pos })
  }

  const handleDensity = (d) => {
    updatePrefs({ density: d })
  }

  const debouncedCssUpdate = useCallback((text) => {
    setCustomCssLocal(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updatePrefs({ customCss: text || null })
    }, 600)
  }, [updatePrefs])

  const handleReset = () => {
    updatePrefs({ ...DEFAULTS })
    setHexInput(DEFAULTS.accentColor)
    setCustomCssLocal('')
    setBgSubTab('solid')
    setBgSolidColor('#0f172a')
    setBgGradColor1('#0f172a')
    setBgGradColor2('#1e293b')
    setBgGradDirection('to bottom right')
    setBgImageUrl('')
    setShowAdvanced(false)
  }

  const clearBackground = () => {
    updatePrefs({ background: null })
    setBgSubTab('solid')
    setBgSolidColor('#0f172a')
  }

  return (
    <div className="card section">
      <h2 style={{ marginBottom: '0.25rem' }}>Appearance</h2>
      <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>
        Customize the look and feel of your dashboard
      </p>

      {/* Accent Color */}
      <SectionCard title="Accent Color" icon="palette">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {PRESET_COLORS.map(color => (
            <ColorSwatch
              key={color}
              color={color}
              selected={prefs.accentColor === color}
              onClick={() => handleAccentColor(color)}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: prefs.accentColor,
              border: '2px solid var(--glass-border)',
              flexShrink: 0,
              boxShadow: '0 0 12px ' + prefs.accentColor + '44',
            }}
          />
          <div className="field" style={{ margin: 0, flex: 1, maxWidth: '200px' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Custom Hex</label>
            <input
              className="input"
              type="text"
              aria-label="Custom accent color hex"
              value={hexInput}
              onChange={e => handleHexChange(e.target.value)}
              placeholder="#7dd3fc"
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              maxLength={7}
            />
          </div>
        </div>
      </SectionCard>

      {/* Theme Mode */}
      <SectionCard title="Theme Mode" icon="moon">
        <SegmentedControl
          value={prefs.themeMode}
          onChange={handleThemeMode}
          options={[
            { value: 'dark', label: 'Dark', icon: 'moon' },
            { value: 'light', label: 'Light', icon: 'sun' },
            { value: 'auto', label: 'Auto', icon: 'sun-moon' },
          ]}
        />
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
          {prefs.themeMode === 'auto' ? 'Theme follows your system preference.' : `Using ${prefs.themeMode} theme.`}
        </p>
      </SectionCard>

      {/* Background */}
      <SectionCard title="Background" icon="image">
        <div style={{ marginBottom: '1rem' }}>
          <SegmentedControl
            value={bgSubTab}
            onChange={handleBgSubTab}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'image', label: 'Image' },
            ]}
          />
        </div>

        {bgSubTab === 'solid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="color"
              aria-label="Solid background color"
              value={bgSolidColor}
              onChange={e => handleBgSolid(e.target.value)}
              style={{ width: '48px', height: '44px', border: 'none', cursor: 'pointer', borderRadius: '4px', background: 'transparent' }}
            />
            <input
              className="input"
              type="text"
              aria-label="Solid background color hex"
              value={bgSolidColor}
              onChange={e => {
                setBgSolidColor(e.target.value)
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                  handleBgSolid(e.target.value)
                }
              }}
              style={{ fontFamily: 'monospace', maxWidth: '120px', fontSize: '0.9rem' }}
              maxLength={7}
            />
          </div>
        )}

        {bgSubTab === 'gradient' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>From</label>
                <input
                  type="color"
                  aria-label="Gradient start color"
                  value={bgGradColor1}
                  onChange={e => handleBgGradient(e.target.value, bgGradColor2, bgGradDirection)}
                  style={{ width: '44px', height: '44px', border: 'none', cursor: 'pointer', borderRadius: '4px', background: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>To</label>
                <input
                  type="color"
                  aria-label="Gradient end color"
                  value={bgGradColor2}
                  onChange={e => handleBgGradient(bgGradColor1, e.target.value, bgGradDirection)}
                  style={{ width: '44px', height: '44px', border: 'none', cursor: 'pointer', borderRadius: '4px', background: 'transparent' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Direction</label>
              <select
                className="input"
                aria-label="Gradient direction"
                value={bgGradDirection}
                onChange={e => handleBgGradient(bgGradColor1, bgGradColor2, e.target.value)}
                style={{ maxWidth: '200px', fontSize: '0.9rem' }}
              >
                {GRADIENT_DIRECTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div
              style={{
                width: '100%',
                height: '48px',
                borderRadius: 'var(--radius-md, 8px)',
                background: `linear-gradient(${bgGradDirection}, ${bgGradColor1}, ${bgGradColor2})`,
                border: '1px solid var(--glass-border)',
              }}
            />
          </div>
        )}

        {bgSubTab === 'image' && (
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Image URL</label>
            <input
              className="input"
              type="url"
              aria-label="Background image URL"
              value={bgImageUrl}
              onChange={e => handleBgImage(e.target.value)}
              placeholder="https://example.com/background.jpg"
              style={{ fontSize: '0.9rem' }}
            />
            {bgImageUrl && (
              <div
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  height: '80px',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: `url(${bgImageUrl}) center/cover`,
                  border: '1px solid var(--glass-border)',
                }}
              />
            )}
          </div>
        )}

        {prefs.background && (
          <button
            className="btn small btn-ghost"
            onClick={clearBackground}
            style={{ marginTop: '0.75rem' }}
          >
            <Icon name="x" size={14} />
            Clear Background
          </button>
        )}
      </SectionCard>

      {/* Sidebar Position */}
      <SectionCard title="Sidebar Position" icon="panel-left">
        <SegmentedControl
          value={prefs.sidebarPosition}
          onChange={handleSidebarPosition}
          options={[
            { value: 'left', label: 'Left', icon: 'panel-left' },
            { value: 'right', label: 'Right', icon: 'panel-right' },
          ]}
        />
      </SectionCard>

      {/* Density */}
      <SectionCard title="Density" icon="rows-3">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <RadioCard
            selected={prefs.density === 'compact'}
            onClick={() => handleDensity('compact')}
            icon="rows-4"
            label="Compact"
            description="Tighter spacing"
          />
          <RadioCard
            selected={prefs.density === 'comfortable'}
            onClick={() => handleDensity('comfortable')}
            icon="rows-3"
            label="Comfortable"
            description="Default spacing"
          />
          <RadioCard
            selected={prefs.density === 'spacious'}
            onClick={() => handleDensity('spacious')}
            icon="rows-2"
            label="Spacious"
            description="Wider spacing"
          />
        </div>
      </SectionCard>

      {/* Custom CSS (Advanced) */}
      <div
        style={{
          padding: '1.25rem',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg, 12px)',
          backdropFilter: 'blur(12px)',
          marginBottom: '1rem',
        }}
      >
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'inherit',
            padding: 0,
            width: '100%',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          <Icon name="code" size={20} style={{ color: 'var(--color-accent)' }} />
          Custom CSS
          <Icon name="chevron-down" size={20} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)' }} />
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '1rem' }}>
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: 'var(--radius-md, 8px)',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Icon name="alert-triangle" size={18} />
              Custom CSS may break the interface. Use at your own risk.
            </div>
            <textarea
              aria-label="Custom CSS"
              value={customCssLocal}
              onChange={e => debouncedCssUpdate(e.target.value)}
              placeholder={`/* Example */\n.card { border-radius: 20px; }`}
              style={{
                width: '100%',
                minHeight: '140px',
                padding: '0.75rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md, 8px)',
                color: 'var(--color-text-primary)',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>
        )}
      </div>

      {/* Reset to Defaults */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button className="btn btn-ghost" onClick={handleReset}>
          <Icon name="rotate-ccw" size={16} />
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
