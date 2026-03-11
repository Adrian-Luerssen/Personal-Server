import React, { useState, useRef, useEffect } from 'react'
import CategoryIcon from './CategoryIcon'
import Icon from '../icons/Icon'

export default function CategoryPicker({ categories, value, onChange, placeholder = 'Select category...' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const parents = (categories || []).filter(c => !c.parentCategoryId)
  const childrenOf = (parentId) => (categories || []).filter(c => c.parentCategoryId === parentId)

  const selected = (categories || []).find(c => c.id === value)

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const lowerSearch = search.toLowerCase()
  const filteredParents = parents.filter(p => {
    const children = childrenOf(p.id)
    return p.name.toLowerCase().includes(lowerSearch) ||
      children.some(c => c.name.toLowerCase().includes(lowerSearch))
  })

  function select(cat) {
    onChange(cat?.id || null)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        className="input"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '0.6rem 0.75rem',
        }}
      >
        {selected ? (
          <>
            <CategoryIcon category={selected} size={22} />
            <span style={{ flex: 1 }}>{selected.name}</span>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>{placeholder}</span>
        )}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 9999,
          marginTop: 4,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxHeight: 300,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Clear option */}
            {value && (
              <div
                onClick={() => select(null)}
                style={{
                  ...optionStyle,
                  color: 'var(--color-text-muted)',
                  fontStyle: 'italic',
                  borderBottom: '1px solid var(--glass-border)',
                }}
              >
                <Icon name="x" size={14} /> {placeholder}
              </div>
            )}

            {filteredParents.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No categories found
              </div>
            )}

            {filteredParents.map(parent => {
              const children = childrenOf(parent.id).filter(c =>
                !lowerSearch || c.name.toLowerCase().includes(lowerSearch) || parent.name.toLowerCase().includes(lowerSearch)
              )

              return (
                <div key={parent.id}>
                  <div
                    onClick={(e) => { e.stopPropagation(); select(parent) }}
                    style={{
                      ...optionStyle,
                      fontWeight: 600,
                      background: parent.id === value ? `${parent.colour || '#6b7280'}15` : undefined,
                    }}
                  >
                    <CategoryIcon category={parent} size={26} />
                    <span>{parent.name}</span>
                  </div>
                  {children.map(child => (
                    <div
                      key={child.id}
                      onClick={(e) => { e.stopPropagation(); select(child) }}
                      style={{
                        ...optionStyle,
                        paddingLeft: '2rem',
                        background: child.id === value ? `${(child.colour || parent.colour || '#6b7280')}15` : undefined,
                      }}
                    >
                      <CategoryIcon
                        category={{ ...child, colour: child.colour || parent.colour, iconName: child.iconName || parent.iconName }}
                        size={22}
                      />
                      <span>{child.name}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const optionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.15s',
}
