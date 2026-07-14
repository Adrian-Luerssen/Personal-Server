import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import BrandMark from './BrandMark'
import Icon from '../icons/Icon'
import { getProductBackTarget, getProductHeader } from './ProductShellState.mjs'

export default function ProductHeader({ native = false, onCapture }) {
  const location = useLocation()
  const navigate = useNavigate()
  const header = getProductHeader(location.pathname)
  const backTarget = getProductBackTarget(location.pathname)

  if (native) {
    return (
      <header className="record-route-bar record-route-bar--native">
        {backTarget ? (
          <button type="button" className="record-route-bar__icon" onClick={() => navigate(backTarget)} aria-label={`Back to ${header.eyebrow}`}>
            <Icon name="arrow-left" size={20} />
          </button>
        ) : <BrandMark className="record-route-bar__mark" size={27} />}
        <div className="record-route-bar__context">
          <span>{header.eyebrow}</span>
          <strong>{header.title}</strong>
        </div>
        <button type="button" className="record-route-bar__icon" onClick={onCapture} aria-label="New record">
          <Icon name="plus" size={20} />
        </button>
      </header>
    )
  }

  return (
    <header className="record-route-bar record-route-bar--desktop">
      <div className="record-route-bar__context">
        <span>{header.eyebrow}</span>
        <strong>{header.title}</strong>
      </div>
      <div className="record-route-bar__actions">
        <button type="button" className="record-route-bar__search" onClick={() => navigate('/chat')} aria-label="Search records">
          <Icon name="search" size={16} /><span>Search records</span><kbd>Ctrl K</kbd>
        </button>
        <span className="record-route-bar__freshness" role="status"><i aria-hidden="true" />Last checked just now</span>
        <button type="button" className="record-button record-button--primary" onClick={onCapture}>
          <Icon name="plus" size={16} />New record
        </button>
      </div>
    </header>
  )
}
