import React from 'react'

export default function CategoryPicker({ categories, value, onChange, placeholder = 'Select category...' }) {
  const parents = (categories || []).filter(c => !c.parentCategoryId)
  const childrenOf = (parentId) => (categories || []).filter(c => c.parentCategoryId === parentId)

  return (
    <select
      className="input"
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {parents.map(parent => {
        const children = childrenOf(parent.id)
        return (
          <React.Fragment key={parent.id}>
            <option value={parent.id}>
              {parent.name}
            </option>
            {children.map(child => (
              <option key={child.id} value={child.id}>
                &nbsp;&nbsp;&nbsp;&nbsp;{child.name}
              </option>
            ))}
          </React.Fragment>
        )
      })}
    </select>
  )
}
