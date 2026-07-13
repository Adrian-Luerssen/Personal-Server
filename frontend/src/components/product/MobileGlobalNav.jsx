import React from 'react'
import { Link, useLocation } from 'react-router-dom'

import { GLOBAL_DESTINATIONS } from '../../product/navigation.mjs'
import Icon from '../icons/Icon'

function isActive(item, pathname) {
  if (!item.to) return false
  if (item.id === 'today') return pathname === '/home'
  if (item.id === 'apps') return pathname === '/menu'
  if (item.id === 'assistant') return pathname.startsWith('/chat')
  if (item.id === 'you') return pathname.startsWith('/settings')
  return false
}

export default function MobileGlobalNav({ onCapture }) {
  const location = useLocation()

  return (
    <aside className="mobile-global-nav native-tabbar" aria-label="Mobile navigation">
      <nav className="mobile-global-nav__items" aria-label="Primary">
        {GLOBAL_DESTINATIONS.map((item) => {
          const active = isActive(item, location.pathname)
          const contents = (
            <>
              <span className="mobile-global-nav__icon" aria-hidden="true">
                <Icon name={item.icon} size={item.id === 'capture' ? 23 : 20} />
              </span>
              <span>{item.label}</span>
            </>
          )

          if (item.action === 'capture') {
            return (
              <button
                key={item.id}
                type="button"
                className="native-tabbar__item mobile-global-nav__capture"
                onClick={onCapture}
                aria-label="Capture"
              >
                {contents}
              </button>
            )
          }

          return (
            <Link
              key={item.id}
              to={item.to}
              className={`native-tabbar__item${active ? ' active is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {contents}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
