import React from 'react'
import Icon from './icons/Icon'

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Route render failed:', error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <section className="route-error-card" role="alert">
        <div className="route-error-card__icon" aria-hidden="true">
          <Icon name="alert-triangle" size={22} />
        </div>
        <div>
          <h1>Section unavailable</h1>
          <p>This page could not render because one response was not in the expected format.</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload section
          </button>
        </div>
      </section>
    )
  }
}
