import React from 'react'
import BrandMark from '../../components/product/BrandMark'
import Icon from '../../components/icons/Icon'
import { usePreferences } from '../../contexts/PreferencesContext'

const DENSITIES = [
  { value: 'compact', label: 'Compact', detail: 'More records visible at once.', icon: 'rows-4' },
  { value: 'comfortable', label: 'Comfortable', detail: 'Balanced spacing for daily use.', icon: 'rows-3' },
  { value: 'spacious', label: 'Spacious', detail: 'More separation between controls.', icon: 'rows-2' },
]

export default function Appearance() {
  const { prefs, updatePrefs } = usePreferences()

  return (
    <div className="record-appearance">
      <section className="record-appearance__identity">
        <div className="record-appearance__mark"><BrandMark size={38} /></div>
        <div>
          <span>Record identity</span>
          <h2>One visual language, everywhere.</h2>
          <p>The graphite canvas, indexed-spine mark, and violet action signal stay fixed so Cash, Gym, Habits, Music, and Series always feel like the same product.</p>
        </div>
      </section>

      <section className="record-settings-card">
        <header><div><span>Interface</span><h2>Density</h2></div><small>Applies across this device</small></header>
        <div className="record-density-options" role="radiogroup" aria-label="Interface density">
          {DENSITIES.map((option) => (
            <button
              type="button"
              role="radio"
              aria-checked={prefs.density === option.value}
              className={prefs.density === option.value ? 'is-active' : ''}
              key={option.value}
              onClick={() => updatePrefs({ density: option.value })}
            >
              <Icon name={option.icon} size={19} />
              <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="record-settings-card record-settings-card--note">
        <Icon name="shield-check" size={18} />
        <div><strong>Built for continuity</strong><p>Product colors and navigation placement are intentionally protected from per-page overrides. This keeps screenshots, support guidance, and daily muscle memory consistent.</p></div>
      </section>
    </div>
  )
}
