import React from 'react'
import { Link, useLocation } from 'react-router-dom'

import { getDomainNavigation } from '../../product/navigation.mjs'

function isActive(item, location) {
  const targetPath = item.to.split('?')[0]
  const current = `${location.pathname}${location.search}`
  if (item.activeIncludes) return current.includes(item.activeIncludes)
  if (item.exact) return location.pathname === targetPath && !location.search
  return location.pathname.startsWith(targetPath)
}

export default function DomainNav() {
  const location = useLocation()
  const destinations = getDomainNavigation(location.pathname)

  if (destinations.length === 0) return null

  return (
    <nav className="domain-nav" aria-label="Section navigation">
      {destinations.map((item) => {
        const active = isActive(item, location)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`domain-nav__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
