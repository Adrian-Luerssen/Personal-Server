import React from 'react'
import Icon from '../icons/Icon'

export default function CategoryIcon({ category, size = 32 }) {
  const colour = category?.colour || '#6b7280'
  const iconName = category?.iconName || 'circle'
  const iconSize = Math.round(size * 0.5)

  return (
    <span
      className="category-icon"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: colour + '22',
        border: `1.5px solid ${colour}55`,
      }}
    >
      <Icon name={iconName} size={iconSize} style={{ color: colour }} />
    </span>
  )
}
