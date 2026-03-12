import React, { useState, useMemo, useRef, useEffect } from 'react'
import { icons as lucideIcons } from 'lucide-react'
import Icon from '../icons/Icon'

// Convert PascalCase to kebab-case
function toKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

// Build the full icon list once from all Lucide icons
const ALL_ICONS = Object.keys(lucideIcons).map(pascal => ({
  name: toKebab(pascal),
  label: pascal.replace(/([A-Z])/g, ' $1').trim(),
}))

// Curated icons shown before search (most commonly useful)
const CURATED_ICONS = [
  'shopping-cart', 'utensils', 'coffee', 'home', 'car', 'heart-pulse',
  'dumbbell', 'pill', 'book-open', 'music', 'film', 'gamepad-2',
  'briefcase', 'laptop', 'smartphone', 'graduation-cap', 'gift',
  'wallet', 'credit-card', 'banknote', 'piggy-bank', 'trending-up',
  'plane', 'map-pin', 'shirt', 'baby', 'dog', 'users',
  'flame', 'zap', 'droplets', 'wifi', 'cloud', 'shield',
  'wrench', 'package', 'scissors', 'sparkles', 'palette', 'camera',
  'sun', 'moon', 'star', 'heart', 'circle-check', 'target',
  'trophy', 'medal', 'flag', 'bell', 'clock', 'calendar',
  'apple', 'beer', 'cigarette', 'bike', 'bus', 'train-front',
  'receipt', 'calculator', 'umbrella', 'stethoscope', 'activity',
  'eye', 'brain', 'bed', 'alarm-clock', 'timer', 'list-checks',
]

const CURATED_SET = new Set(CURATED_ICONS)

export default function IconPicker({ value, onChange, colour = '#6b7280' }) {
  const [search, setSearch] = useState('')
  const gridRef = useRef(null)
  const [visibleCount, setVisibleCount] = useState(120)

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(120)
    if (gridRef.current) gridRef.current.scrollTop = 0
  }, [search])

  const filtered = useMemo(() => {
    if (!search.trim()) {
      // Show curated icons first, then the rest alphabetically
      const curated = CURATED_ICONS
        .map(name => ALL_ICONS.find(i => i.name === name))
        .filter(Boolean)
      const rest = ALL_ICONS.filter(i => !CURATED_SET.has(i.name))
      return [...curated, ...rest]
    }
    const q = search.toLowerCase()
    return ALL_ICONS.filter(
      i => i.name.includes(q) || i.label.toLowerCase().includes(q)
    )
  }, [search])

  const displayed = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  function handleScroll(e) {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) {
      setVisibleCount(prev => prev + 120)
    }
  }

  return (
    <div className="icon-picker">
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <input
          className="input"
          type="text"
          placeholder={`Search ${ALL_ICONS.length} icons...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingRight: '3rem' }}
        />
        {search && (
          <span style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            fontSize: '0.75rem', color: 'var(--color-text-muted)',
          }}>
            {filtered.length}
          </span>
        )}
      </div>
      <div
        ref={gridRef}
        className="icon-picker-grid"
        onScroll={handleScroll}
        style={{ maxHeight: '240px', overflowY: 'auto' }}
      >
        {displayed.map(icon => (
          <button
            key={icon.name}
            type="button"
            className={`icon-picker-item${value === icon.name ? ' selected' : ''}`}
            onClick={() => onChange(icon.name)}
            title={icon.label}
          >
            <Icon name={icon.name} size={20} style={{ color: value === icon.name ? '#fff' : colour }} />
          </button>
        ))}
      </div>
      {!search && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
          Type to search all {ALL_ICONS.length} icons
        </div>
      )}
    </div>
  )
}

// Keep backward compatibility for any code importing FINANCE_ICONS
export const FINANCE_ICONS = CURATED_ICONS.map(name => {
  const entry = ALL_ICONS.find(i => i.name === name)
  return entry || { name, label: name }
})
