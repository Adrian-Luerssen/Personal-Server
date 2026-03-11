import React from 'react'
import CategoryIcon from './CategoryIcon'

/**
 * Displays a category with its icon and name.
 * If the category is a subcategory (has parentCategory), shows "Parent > Sub".
 * Uses the parent's icon/colour for the icon if the sub doesn't have its own.
 */
export default function CategoryLabel({ category, size = 22, fallback = 'Uncategorized' }) {
  if (!category) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <CategoryIcon category={null} size={size} />
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{fallback}</span>
      </div>
    )
  }

  const parent = category.parentCategory
  const displayCategory = {
    ...category,
    colour: category.colour || parent?.colour,
    iconName: category.iconName || parent?.iconName,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
      <CategoryIcon category={displayCategory} size={size} />
      <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {parent ? (
          <>
            <span style={{ color: 'var(--color-text-muted)' }}>{parent.name}</span>
            <span style={{ color: 'var(--color-text-muted)', margin: '0 0.2rem' }}>›</span>
            <span>{category.name}</span>
          </>
        ) : (
          category.name
        )}
      </span>
    </div>
  )
}
