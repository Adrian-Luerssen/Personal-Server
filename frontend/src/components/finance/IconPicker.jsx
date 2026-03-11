import React, { useState, useMemo } from 'react'
import Icon from '../icons/Icon'

const FINANCE_ICONS = [
  { name: 'shopping-cart', label: 'Shopping' },
  { name: 'shopping-bag', label: 'Shopping Bag' },
  { name: 'store', label: 'Store' },
  { name: 'utensils', label: 'Dining' },
  { name: 'coffee', label: 'Coffee' },
  { name: 'beer', label: 'Drinks' },
  { name: 'pizza', label: 'Fast Food' },
  { name: 'apple', label: 'Groceries' },
  { name: 'home', label: 'Home' },
  { name: 'sofa', label: 'Furniture' },
  { name: 'lamp', label: 'Utilities' },
  { name: 'zap', label: 'Electricity' },
  { name: 'droplets', label: 'Water' },
  { name: 'flame', label: 'Gas' },
  { name: 'wifi', label: 'Internet' },
  { name: 'tv', label: 'TV' },
  { name: 'car', label: 'Car' },
  { name: 'fuel', label: 'Fuel' },
  { name: 'bus', label: 'Bus' },
  { name: 'train-front', label: 'Train' },
  { name: 'plane', label: 'Flight' },
  { name: 'bike', label: 'Bike' },
  { name: 'parking-meter', label: 'Parking' },
  { name: 'heart-pulse', label: 'Health' },
  { name: 'pill', label: 'Medicine' },
  { name: 'stethoscope', label: 'Doctor' },
  { name: 'dumbbell', label: 'Gym' },
  { name: 'activity', label: 'Fitness' },
  { name: 'gamepad-2', label: 'Gaming' },
  { name: 'film', label: 'Movies' },
  { name: 'music', label: 'Music' },
  { name: 'book-open', label: 'Books' },
  { name: 'ticket', label: 'Events' },
  { name: 'palette', label: 'Art' },
  { name: 'briefcase', label: 'Work' },
  { name: 'laptop', label: 'Tech' },
  { name: 'smartphone', label: 'Phone' },
  { name: 'graduation-cap', label: 'Education' },
  { name: 'notebook-pen', label: 'Stationery' },
  { name: 'banknote', label: 'Cash' },
  { name: 'credit-card', label: 'Card' },
  { name: 'wallet', label: 'Wallet' },
  { name: 'piggy-bank', label: 'Savings' },
  { name: 'trending-up', label: 'Investment' },
  { name: 'receipt', label: 'Receipt' },
  { name: 'calculator', label: 'Tax' },
  { name: 'gift', label: 'Gift' },
  { name: 'heart', label: 'Donation' },
  { name: 'baby', label: 'Kids' },
  { name: 'dog', label: 'Pets' },
  { name: 'users', label: 'Family' },
  { name: 'map-pin', label: 'Travel' },
  { name: 'umbrella', label: 'Insurance' },
  { name: 'shirt', label: 'Clothing' },
  { name: 'scissors', label: 'Haircut' },
  { name: 'sparkles', label: 'Beauty' },
  { name: 'cigarette', label: 'Tobacco' },
  { name: 'package', label: 'Delivery' },
  { name: 'wrench', label: 'Repairs' },
  { name: 'shield', label: 'Security' },
  { name: 'cloud', label: 'Cloud' },
  { name: 'circle', label: 'Other' },
]

export default function IconPicker({ value, onChange, colour = '#6b7280' }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return FINANCE_ICONS
    const q = search.toLowerCase()
    return FINANCE_ICONS.filter(
      i => i.name.includes(q) || i.label.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="icon-picker">
      <input
        className="input"
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '0.75rem' }}
      />
      <div className="icon-picker-grid">
        {filtered.map(icon => (
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
    </div>
  )
}

export { FINANCE_ICONS }
