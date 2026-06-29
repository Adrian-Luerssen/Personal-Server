import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/icons/Icon'
import { NATIVE_APPS } from '../nativeNavigation.mjs'

const MENU_SECTIONS = [
  {
    title: 'Daily actions',
    items: [
      { label: 'Habits', description: 'Log today, manage routines, reminders', to: '/habits', icon: 'heart-pulse', tone: 'habits' },
      { label: 'Workout', description: 'Start or resume training', to: '/workout', icon: 'dumbbell', tone: 'success' },
      { label: 'Add transaction', description: 'Record spending or income', to: '/finance/transactions?action=new', icon: 'receipt', tone: 'money' },
      { label: 'Assistant', description: 'Ask the AI copilot', to: '/chat', icon: 'message-square', tone: 'ai' },
    ],
  },
  {
    title: 'Library and insights',
    items: [
      { label: 'Finance', description: 'Transactions, wallets, budgets', to: '/finance', icon: 'wallet', tone: 'money' },
      { label: 'Spotify Ranking', description: 'Streams by day, week, month, year', to: '/spotify/ranking', icon: 'trophy', tone: 'music' },
      { label: 'Media Library', description: 'Anime, shows, movies, books, manga', to: '/media', icon: 'clapperboard', tone: 'media' },
      { label: 'Spotify Personal', description: 'Personal listening stats', to: '/spotify/personal', icon: 'music', tone: 'music' },
    ],
  },
  {
    title: 'Settings and Data',
    items: [
      { label: 'Data center', description: 'Imports, module settings, export, and reset tools', to: '/settings?section=data', icon: 'database', tone: 'info' },
      { label: 'Import habits', description: 'HabitShare CSV with live progress', to: '/habits/settings?tab=import', icon: 'calendar-check', tone: 'habits' },
      { label: 'Habit settings', description: 'Manage routines, reminders, and cadence', to: '/habits/settings', icon: 'heart-pulse', tone: 'habits' },
      { label: 'Finance settings', description: 'Wallets, categories, budgets, and subscriptions', to: '/finance/settings', icon: 'sliders-horizontal', tone: 'money' },
      { label: 'Import finance', description: 'Cashew backup import', to: '/finance/import', icon: 'landmark', tone: 'money' },
      { label: 'Media settings', description: 'Library matching, categories, and source cleanup', to: '/media/settings', icon: 'settings', tone: 'media' },
      { label: 'Import media', description: 'MAL, TVTime, Goodreads', to: '/media/import', icon: 'library', tone: 'media' },
      { label: 'Import workouts', description: 'Training data import', to: '/workout/import', icon: 'upload', tone: 'success' },
    ],
  },
  {
    title: 'App control',
    items: [
      { label: 'Notifications', description: 'Permission and reminder categories', to: '/settings?section=notifications', icon: 'bell', tone: 'info' },
      { label: 'Sync and Offline', description: 'Freshness, cache, and retries', to: '/settings?section=sync', icon: 'refresh-cw', tone: 'info' },
      { label: 'App Updates', description: 'Installed version and APK updates', to: '/settings?section=updates', icon: 'smartphone', tone: 'info' },
    ],
  },
]

function MenuRow({ item }) {
  return (
    <Link className={`native-menu-row native-menu-row--${item.tone || 'info'}`} to={item.to}>
      <span className="native-menu-row__icon" aria-hidden="true">
        <Icon name={item.icon} size={20} />
      </span>
      <span className="native-menu-row__copy">
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
      <Icon name="chevron-right" size={18} aria-hidden="true" />
    </Link>
  )
}

export default function MobileMenu() {
  const [query, setQuery] = useState('')
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section')

  const sections = useMemo(() => {
    if (section === 'imports') {
      return MENU_SECTIONS.filter((group) => group.title === 'Settings and Data')
    }
    if (section === 'data') {
      return MENU_SECTIONS.filter((group) => group.title === 'Settings and Data')
    }

    const normalized = query.trim().toLowerCase()
    if (!normalized) return MENU_SECTIONS

    return MENU_SECTIONS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => (
          item.label.toLowerCase().includes(normalized) ||
          item.description.toLowerCase().includes(normalized)
        )),
      }))
      .filter((group) => group.items.length > 0)
  }, [query, section])

  return (
    <main className="native-menu-page">
      <section className="native-menu-hero">
        <span className="native-eyebrow">Navigation</span>
        <h1>Menu</h1>
        <p>Jump directly to any app area, import flow, or system control.</p>
        <div className="native-app-grid" aria-label="App areas">
          {NATIVE_APPS.map((app) => (
            <Link key={app.id} className={`native-app-card native-app-card--${app.tone}`} to={app.root}>
              <span aria-hidden="true"><Icon name={app.icon} size={19} /></span>
              <strong>{app.label}</strong>
              <small>{app.subtitle}</small>
            </Link>
          ))}
        </div>
        <label className="native-menu-search">
          <Icon name="search" size={18} aria-hidden="true" />
          <span className="sr-only">Search app sections</span>
          <input
            type="search"
            role="searchbox"
            aria-label="Search app sections"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search app sections"
          />
        </label>
      </section>

      <div className="native-menu-groups">
        {sections.map((group) => (
          <section className="native-menu-group" key={group.title} aria-labelledby={`menu-${group.title.replace(/\s+/g, '-').toLowerCase()}`}>
            <h2 id={`menu-${group.title.replace(/\s+/g, '-').toLowerCase()}`}>{group.title}</h2>
            <div className="native-menu-list">
              {group.items.map((item) => <MenuRow key={`${group.title}-${item.label}`} item={item} />)}
            </div>
          </section>
        ))}
        {sections.length === 0 && (
          <section className="native-empty-state">
            <Icon name="search-x" size={24} />
            <strong>No matching sections</strong>
            <p>Try a broader search term.</p>
          </section>
        )}
      </div>
    </main>
  )
}
