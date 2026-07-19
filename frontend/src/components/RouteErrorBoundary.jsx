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
          <p>This route did not finish opening. Retry it locally or return to the previous screen; saved records are unaffected.</p>
          <div className="route-error-card__actions">
            <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
              Try section again
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => window.history.back()}>
              Go back
            </button>
          </div>
        </div>
      </section>
    )
  }
}
