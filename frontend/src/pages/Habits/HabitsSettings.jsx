import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, apiFetch } from '../../api'
import { getTokens } from '../../auth'
import { getApiBase } from '../../config'
import { SkeletonCard, LoadingSpinner, StepIndicator, ImportProgressPanel } from '../../components/shared'
import { Modal } from '../../components/shared/Modal'
import Icon from '../../components/icons/Icon'
import IconPicker from '../../components/finance/IconPicker'
import PageHeader from '../../components/PageHeader'
import { getImportAccept, getImportFileDescription } from '../../importFileTypes.mjs'
import { isNativeMobileApp } from '../../mobilePlatform'
import { streamImportProgress } from '../../importProgress.mjs'
import {
  cancelNotifications,
  deliverCustomNotification,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleHabitReminder,
} from '../../notifications'
import {
  readNotificationPreferences,
  updateNotificationPreference,
} from '../../notificationPreferences.mjs'

const HABITS_COLOR = '#7c5cff'

function getFrequencyLabel(habit) {
  const ft = habit.frequencyType || 'daily'
  const target = habit.frequencyTarget || 1
  if (ft === 'daily') return 'Daily'
  if (ft === 'weekly') return `${target}x/week`
  if (ft === 'monthly') return `${target}x/month`
  if (ft === 'yearly') return `${target}x/year`
  return ft
}

const TABS = [
  { key: 'habits', label: 'Habits', icon: 'heart-pulse' },
  { key: 'reminders', label: 'Reminders', icon: 'bell' },
  { key: 'import', label: 'Import', icon: 'upload' },
]

// ─── Habit Form Modal ─────────────────────────────────────────────────────────

function HabitForm({ habit, onClose, onSaved }) {
  const isEdit = !!habit?.id
  const [form, setForm] = useState({
    name: '',
    iconName: 'circle-check',
    description: '',
    color: HABITS_COLOR,
    isActive: true,
    trackingType: 'boolean',
    frequencyType: 'daily',
    frequencyTarget: 1,
    numericPassThreshold: '',
    numericSkipThreshold: '',
    numericUnit: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (habit) {
      setForm({
        name: habit.name || '',
        iconName: habit.iconName || 'circle-check',
        description: habit.description || '',
        color: habit.color || HABITS_COLOR,
        isActive: habit.isActive !== false,
        trackingType: habit.trackingType || 'boolean',
        frequencyType: habit.frequencyType || 'daily',
        frequencyTarget: habit.frequencyTarget || 1,
        numericPassThreshold: habit.numericPassThreshold ?? '',
        numericSkipThreshold: habit.numericSkipThreshold ?? '',
        numericUnit: habit.numericUnit || '',
      })
    }
  }, [habit])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        iconName: form.iconName,
        description: form.description.trim() || null,
        color: form.color,
        isActive: form.isActive,
        trackingType: form.trackingType,
        frequencyType: form.frequencyType,
        frequencyTarget: form.frequencyType === 'daily' ? 1 : Math.max(1, parseInt(form.frequencyTarget) || 1),
      }
      if (form.trackingType === 'numeric') {
        payload.numericPassThreshold = form.numericPassThreshold !== '' ? parseFloat(form.numericPassThreshold) : null
        payload.numericSkipThreshold = form.numericSkipThreshold !== '' ? parseFloat(form.numericSkipThreshold) : null
        payload.numericUnit = form.numericUnit.trim() || null
      }
      if (isEdit) {
        await api.patch(`/habits/${habit.id}`, payload)
      } else {
        await api.post('/habits', payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api.delete(`/habits/${habit.id}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const isNumeric = form.trackingType === 'numeric'
  const passT = parseFloat(form.numericPassThreshold)
  const skipT = parseFloat(form.numericSkipThreshold)

  return (
    <Modal title={isEdit ? 'Edit Habit' : 'Add Habit'} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <label className="form-label">Name</label>
        <input className="input" type="text" aria-label="Habit name" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Meditate" required style={{ marginBottom: '0.75rem' }} />

        {/* Icon & Color row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Icon</label>
            <IconPicker value={form.iconName} onChange={val => setField('iconName', val)} color={form.color} />
          </div>
          <div>
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="color" aria-label="Habit color" value={form.color} onChange={e => setField('color', e.target.value)} style={{ width: 44, height: 44, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'transparent' }} />
            </div>
          </div>
        </div>

        <label className="form-label">Description</label>
        <textarea className="input" aria-label="Habit description" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Optional description..." rows={2} style={{ marginBottom: '0.75rem', resize: 'vertical' }} />

        {/* Tracking Type */}
        <label className="form-label">Tracking Type</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className={`btn small ${form.trackingType === 'boolean' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setField('trackingType', 'boolean')}
          >
            <Icon name="check" size={14} /> Yes / No
          </button>
          <button
            type="button"
            className={`btn small ${form.trackingType === 'numeric' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setField('trackingType', 'numeric')}
          >
            <Icon name="hash" size={14} /> Numeric
          </button>
        </div>

        {/* Numeric Thresholds */}
        {isNumeric && (
          <div style={{ padding: '0.75rem', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
            <label className="form-label">Unit</label>
            <input className="input" type="text" aria-label="Numeric habit unit" value={form.numericUnit} onChange={e => setField('numericUnit', e.target.value)} placeholder="e.g. cigarettes, drinks" style={{ marginBottom: '0.5rem' }} />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Pass if &le;</label>
                <input className="input" type="number" aria-label="Numeric pass threshold" step="0.01" value={form.numericPassThreshold} onChange={e => setField('numericPassThreshold', e.target.value)} placeholder="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Skip if &le;</label>
                <input className="input" type="number" aria-label="Numeric skip threshold" step="0.01" value={form.numericSkipThreshold} onChange={e => setField('numericSkipThreshold', e.target.value)} placeholder="1" />
              </div>
            </div>

            {/* Live preview */}
            {!isNaN(passT) && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                <span style={{ color: '#4ade80' }}>Pass: &le; {passT}{form.numericUnit ? ` ${form.numericUnit}` : ''}</span>
                {!isNaN(skipT) && skipT > passT && (
                  <> &middot; <span style={{ color: '#fbbf24' }}>Skip: &le; {skipT}{form.numericUnit ? ` ${form.numericUnit}` : ''}</span></>
                )}
                <> &middot; <span style={{ color: '#f87171' }}>Fail: &gt; {!isNaN(skipT) && skipT > passT ? skipT : passT}{form.numericUnit ? ` ${form.numericUnit}` : ''}</span></>
              </div>
            )}
          </div>
        )}

        {/* Frequency */}
        <label className="form-label">Frequency</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { value: 'daily', label: 'Every day' },
            { value: 'weekly', label: 'Per week' },
            { value: 'monthly', label: 'Per month' },
            { value: 'yearly', label: 'Per year' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`btn small ${form.frequencyType === opt.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setField('frequencyType', opt.value)}
              style={{ fontSize: '0.8rem' }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {form.frequencyType !== 'daily' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Times per {form.frequencyType === 'weekly' ? 'week' : form.frequencyType === 'monthly' ? 'month' : 'year'}</label>
            <input className="input" type="number" aria-label={`Times per ${form.frequencyType === 'weekly' ? 'week' : form.frequencyType === 'monthly' ? 'month' : 'year'}`} min="1" value={form.frequencyTarget} onChange={e => setField('frequencyTarget', e.target.value)} style={{ width: 100 }} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="checkbox" id="habit-active" aria-label="Habit active" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} style={{ width: 44, height: 44 }} />
          <label htmlFor="habit-active" style={{ fontSize: '0.9rem' }}>Active</label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {isEdit && !showDelete && (
            <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)', marginRight: 'auto' }} onClick={() => setShowDelete(true)}>
              <Icon name="trash-2" size={14} /> Delete
            </button>
          )}
          {isEdit && showDelete && (
            <div style={{ marginRight: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Delete?</span>
              <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDelete} disabled={saving}>Yes</button>
              <button type="button" className="btn small btn-ghost" onClick={() => setShowDelete(false)}>No</button>
            </div>
          )}
          <button type="button" className="btn small btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn small btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Habits Tab ───────────────────────────────────────────────────────────────

function HabitsTab() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState([])
  const [editHabit, setEditHabit] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/habits')
      setHabits(Array.isArray(data) ? data : data?.items || [])
    } catch (e) {
      console.error('Failed to load habits:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditHabit(null)
    setShowForm(true)
  }

  function openEdit(habit) {
    setEditHabit(habit)
    setShowForm(true)
  }

  const activeCount = habits.filter(h => h.isActive !== false).length

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          {activeCount} active habit{activeCount !== 1 ? 's' : ''}
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="plus" size={16} /> Add Habit
        </button>
      </div>

      {loading ? (
        <div className="habit-settings-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icon name="heart-pulse" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
          <div style={{ color: 'var(--color-text-secondary)' }}>No habits yet. Add your first habit to get started!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {habits.map(habit => {
            const isInactive = habit.isActive === false

            return (
              <div
                key={habit.id}
                className="card habit-settings-card"
                style={{
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  opacity: isInactive ? 0.6 : 1,
                }}
                onClick={() => openEdit(habit)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: 'var(--radius-md)',
                    background: `${habit.color || HABITS_COLOR}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name={habit.iconName || 'circle-check'} size={22} style={{ color: habit.color || HABITS_COLOR }} />
                  </div>

                  {/* Name & description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{habit.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{getFrequencyLabel(habit)}</span>
                      {habit.trackingType === 'numeric' && <span>· Numeric</span>}
                      {habit.description && <span>· {habit.description}</span>}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: isInactive ? 'var(--color-error)22' : 'var(--color-success)22',
                      color: isInactive ? 'var(--color-error)' : 'var(--color-success)',
                      fontWeight: 600,
                    }}>
                      {isInactive ? 'Inactive' : 'Active'}
                    </span>
                  </div>

                  <Icon name="chevron-right" size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <HabitForm
          habit={editHabit}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </>
  )
}

// ─── Import Tab (migrated from HabitsImport.jsx) ─────────────────────────────

const STEPS = ['File', 'Preview', 'Import', 'Done']

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const thStyle = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8rem',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--glass-border)',
}

const tdStyle = {
  padding: '0.6rem 0.75rem',
  fontSize: '0.9rem',
  borderBottom: '1px solid var(--glass-border)',
}

function FileSelectStep({ file, setFile, onNext }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const fileDescription = getImportFileDescription('habitshare')

  const handleFile = (f) => {
    if (f) setFile(f)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon name="upload" size={20} />
        Select HabitShare CSV
      </h3>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragging ? HABITS_COLOR : file ? 'var(--color-success)' : 'var(--glass-border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: dragging
            ? `${HABITS_COLOR}22`
            : file
            ? 'var(--color-success-muted)'
            : 'var(--color-bg-elevated)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          marginBottom: '1rem',
        }}
      >
        <Icon
          name={file ? 'check-circle' : 'cloud-upload'}
          size={48}
          style={{
            color: file ? 'var(--color-success)' : HABITS_COLOR,
            marginBottom: '0.75rem',
            display: 'block',
            margin: '0 auto 0.75rem',
          }}
        />

        {file ? (
          <>
            <div style={{ fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.25rem' }}>
              {file.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {formatFileSize(file.size)} · Click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Drag & drop your HabitShare CSV here
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              or click to browse · {fileDescription} files
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={getImportAccept('habitshare', { native: isNativeMobileApp() })}
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <details style={{ marginBottom: '1.5rem' }}>
        <summary style={{
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: 'var(--color-text-secondary)',
          userSelect: 'none',
          padding: '0.5rem 0',
        }}>
          <Icon name="help-circle" size={16} style={{ marginRight: 4 }} />
          How to export from HabitShare
        </summary>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          <li>Open HabitShare on your device</li>
          <li>Go to Settings → Export Data</li>
          <li>Export as CSV format</li>
          <li>Transfer the CSV file to this computer</li>
        </ol>
      </details>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn"
          onClick={onNext}
          disabled={!file}
          style={{ opacity: file ? 1 : 0.4, background: HABITS_COLOR, color: '#fff' }}
        >
          <Icon name="search" size={18} />
          Preview Import
        </button>
      </div>
    </div>
  )
}

function PreviewStep({ preview, loading, error, onNext, onBack }) {
  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <LoadingSpinner size={40} />
        <div style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          Analysing your HabitShare data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
        <button className="btn" onClick={onBack} style={{ background: 'var(--glass-border)' }}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
      </div>
    )
  }

  if (!preview) return null

  const counts = preview.counts || {}

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon name="eye" size={20} />
        Import Preview
      </h3>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.25rem',
        padding: '0.75rem 1rem',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.85rem',
        color: 'var(--color-text-secondary)',
      }}>
        <span>
          <Icon name="hard-drive" size={16} style={{ marginRight: 4 }} />
          {preview.file?.name || 'HabitShare CSV'}
        </span>
        {preview.dateRange?.earliest && (
          <span>
            <Icon name="calendar-range" size={16} style={{ marginRight: 4 }} />
            {preview.dateRange.earliest} → {preview.dateRange.latest}
          </span>
        )}
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
              <th style={{ ...thStyle, textAlign: 'right', color: 'var(--color-success)' }}>New</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Existing</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Habits', icon: 'heart-pulse', counts: counts.habits },
              { label: 'Entries', icon: 'calendar-check', counts: counts.entries },
            ].filter(r => r.counts).map(({ label, icon, counts: c }) => (
              <tr key={label}>
                <td style={tdStyle}>
                  <Icon name={icon} size={15} style={{ marginRight: 6, color: HABITS_COLOR }} />
                  {label}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{(c.total || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>{(c.new || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>{(c.existing || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview.habits?.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            Habits Found
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {preview.habits.slice(0, 10).map((h, i) => (
              <span key={i} style={{
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                background: `${HABITS_COLOR}22`,
                color: HABITS_COLOR,
                fontSize: '0.8rem',
              }}>
                {h.name || h}
              </span>
            ))}
            {preview.habits.length > 10 && (
              <span style={{
                padding: '0.2rem 0.6rem',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
              }}>
                +{preview.habits.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {preview.warnings?.length > 0 && (
        <div className="alert-warning" style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icon name="alert-triangle" size={16} /> Warnings</div>
          {preview.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.9rem' }}>{w}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
        <button className="btn" onClick={onNext} style={{ background: HABITS_COLOR, color: '#fff' }}>
          <Icon name="play" size={18} />
          Start Import
        </button>
      </div>
    </div>
  )
}

function ProgressStep({ previewId, onComplete, onError }) {
  const [progress, setProgress] = useState({ stage: 'starting', progress: 0, current: 0, total: 0, message: 'Starting import...' })
  const [errorMsg, setErrorMsg] = useState(null)
  const [events, setEvents] = useState([])

  React.useEffect(() => {
    if (!previewId) return

    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      try {
        const { accessToken } = getTokens()
        const base = getApiBase()
        const url = `${base}/habits/import/habitshare/execute/${previewId}`
        await streamImportProgress({
          url,
          accessToken,
          signal: controller.signal,
          onEvent: (data) => {
            if (cancelled) return
            setProgress(data)
            setEvents((items) => [...items, data].slice(-20))
            if (data.stage === 'complete') {
              onComplete(data.summary || data)
              controller.abort()
            }
            if (data.stage === 'error') {
              const message = data.error || data.message || 'Import error'
              setErrorMsg(message)
              onError(message)
              controller.abort()
            }
          }
        })
      } catch (e) {
        if (!cancelled && e.name !== 'AbortError') {
          setErrorMsg(e.message)
          onError(e.message)
        }
      }
    }

    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [previewId])

  const STAGE_ICONS = { starting: 'hourglass', habits: 'list', entries: 'calendar', complete: 'check-circle', error: 'alert-circle' }
  const STAGE_LABELS = { starting: 'Preparing...', habits: 'Creating habits...', entries: 'Importing entries...', complete: 'Complete!', error: 'Error' }

  return (
    <ImportProgressPanel
      progress={progress}
      events={events}
      errorMsg={errorMsg}
      stageIcons={STAGE_ICONS}
      stageLabels={STAGE_LABELS}
      color={HABITS_COLOR}
    />
  )
}

function SummaryStep({ summary, onReset }) {
  if (!summary) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <Icon name="check-circle" size={56} style={{ color: 'var(--color-success)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
        <h3>Import Complete!</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>Your HabitShare data has been imported.</p>
        <button className="btn" onClick={onReset} style={{ marginTop: '1.5rem' }}>
          Import Another File
        </button>
      </div>
    )
  }

  const rows = []
  const addRow = (label, icon, obj) => {
    if (!obj) return
    rows.push({ label, icon, imported: obj.imported ?? obj.created ?? 0, skipped: obj.skipped ?? obj.existing ?? 0 })
  }
  addRow('Habits', 'heart-pulse', summary.habits)
  addRow('Entries', 'calendar-check', summary.entries)

  const totalImported = rows.reduce((s, r) => s + r.imported, 0)

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <Icon name="check-circle" size={56} style={{ color: 'var(--color-success)', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
        <h3 style={{ marginBottom: '0.25rem' }}>Import Complete!</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Successfully imported <strong style={{ color: 'var(--color-success)' }}>{totalImported.toLocaleString()}</strong> records
        </p>
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: 'right', color: 'var(--color-success)' }}>Imported</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Skipped</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, icon, imported, skipped }) => (
                <tr key={label}>
                  <td style={tdStyle}>
                    <Icon name={icon} size={15} style={{ marginRight: 6, color: HABITS_COLOR }} />
                    {label}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>
                    {imported.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {skipped.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={onReset}>
          <Icon name="refresh-cw" size={18} />
          Import Another File
        </button>
        <a href="/habits" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon name="heart-pulse" size={18} />
          Go to Habits
        </a>
      </div>
    </div>
  )
}

function ImportTab() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [importError, setImportError] = useState(null)

  const handlePreview = async () => {
    if (!file) return
    setPreviewLoading(true)
    setPreviewError(null)
    setStep(2)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await apiFetch('/habits/import/habitshare/preview', {
        method: 'POST',
        body: formData,
      })
      setPreview(data)
    } catch (e) {
      setPreviewError(e.message || 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleStartImport = () => {
    setImportError(null)
    setSummary(null)
    setStep(3)
  }

  const handleComplete = (summaryData) => {
    setSummary(summaryData)
    setStep(4)
  }

  const handleImportError = (msg) => {
    setImportError(msg)
  }

  const handleReset = () => {
    setStep(1)
    setFile(null)
    setPreview(null)
    setPreviewError(null)
    setPreviewLoading(false)
    setSummary(null)
    setImportError(null)
  }

  return (
    <>
      <StepIndicator current={step} steps={STEPS} />

      {step === 1 && (
        <FileSelectStep file={file} setFile={setFile} onNext={handlePreview} />
      )}

      {step === 2 && (
        <PreviewStep
          preview={preview}
          loading={previewLoading}
          error={previewError}
          onNext={handleStartImport}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <>
          {importError && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>{importError}</div>
          )}
          <ProgressStep
            previewId={preview?.previewId}
            onComplete={handleComplete}
            onError={handleImportError}
          />
          {importError && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setStep(2)}>
                <Icon name="arrow-left" size={18} />
                Back to Preview
              </button>
              <button className="btn" onClick={handleReset}>
                <Icon name="refresh-cw" size={18} />
                Start Over
              </button>
            </div>
          )}
        </>
      )}

      {step === 4 && (
        <SummaryStep summary={summary} onReset={handleReset} />
      )}
    </>
  )
}

// ─── Reminders Tab ───────────────────────────────────────────────────────────

function RemindersTab() {
  const nativeApp = isNativeMobileApp()
  const [permission, setPermission] = useState(
    nativeApp ? 'prompt' : typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [reminderTime, setReminderTime] = useState(
    () => readNotificationPreferences().habitReminders.time
  )
  const [enabled, setEnabled] = useState(
    () => readNotificationPreferences().habitReminders.enabled
  )
  const [testSent, setTestSent] = useState(false)

  const isSupported = nativeApp || typeof Notification !== 'undefined'

  useEffect(() => {
    if (!nativeApp) return
    getNotificationPermissionStatus()
      .then(setPermission)
      .catch(() => setPermission('unsupported'))
  }, [nativeApp])

  useEffect(() => {
    if (!nativeApp || !enabled) return
    const [hour, minute] = reminderTime.split(':').map((part) => Number(part))
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return
    scheduleHabitReminder({
      id: 410001,
      title: 'Habit reminder',
      body: "Log today's habits while the day is still fresh.",
      hour,
      minute,
    }).then((ok) => setPermission(ok ? 'granted' : 'denied'))
      .catch(() => setPermission('denied'))
  }, [nativeApp, enabled, reminderTime])

  async function requestPermission() {
    if (!isSupported) return
    if (nativeApp) {
      const allowed = await requestNotificationPermission()
      setPermission(allowed ? 'granted' : 'denied')
      if (allowed && !enabled) {
        setEnabled(true)
        localStorage.setItem('habits-reminder-enabled', 'true')
      }
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && !enabled) {
      setEnabled(true)
      localStorage.setItem('habits-reminder-enabled', 'true')
    }
  }

  function toggleEnabled(val) {
    setEnabled(val)
    updateNotificationPreference(localStorage, 'habitReminders', { enabled: val })
    if (!val && nativeApp) {
      cancelNotifications([410001, 410002]).catch(() => {})
      return
    }
    if (val && permission !== 'granted') {
      requestPermission()
    }
  }

  function updateTime(time) {
    setReminderTime(time)
    updateNotificationPreference(localStorage, 'habitReminders', { time })
  }

  async function sendTestNotification() {
    if (permission !== 'granted') return
    if (nativeApp) {
      const ok = await deliverCustomNotification({
        id: 410002,
        nativeId: 410002,
        title: 'Record',
        body: 'Notifications are working.',
        actionUrl: '/habits/settings?tab=reminders',
      }).catch(() => false)
      if (!ok) return
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
      return
    }
    new Notification('Habit Reminder', {
      body: "Don't forget to log your habits today!",
      icon: '/icon-192.png',
    })
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Permission status */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Icon name="bell" size={18} style={{ color: HABITS_COLOR }} />
          Notification Permission
        </h4>

        {!isSupported ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Notifications are not available in this environment.
          </div>
        ) : permission === 'granted' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <Icon name="check-circle" size={16} style={{ color: 'var(--color-success)' }} />
            <span style={{ color: 'var(--color-success)' }}>Notifications allowed</span>
          </div>
        ) : permission === 'denied' ? (
          <div style={{ fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>
              <Icon name="x-circle" size={16} />
              Notifications blocked
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Please enable notifications in Android app settings or browser settings.
            </div>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={requestPermission} style={{ background: HABITS_COLOR }}>
            <Icon name="bell" size={16} /> Enable Notifications
          </button>
        )}
      </div>

      {/* Reminder settings */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Icon name="clock" size={18} style={{ color: HABITS_COLOR }} />
          Daily Reminder
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              aria-label="Enable daily habit reminder"
              checked={enabled}
              onChange={e => toggleEnabled(e.target.checked)}
              style={{ width: 44, height: 44, accentColor: HABITS_COLOR }}
            />
            Enable daily reminder
          </label>
        </div>

        {enabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>Reminder time</label>
              <input
                type="time"
                className="input"
                aria-label="Habit reminder time"
                value={reminderTime}
                onChange={e => updateTime(e.target.value)}
                style={{ width: 140 }}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '1.25rem' }}>
              You'll be reminded daily at {reminderTime} to log your habits.
            </div>
          </div>
        )}
      </div>

      {/* Test notification */}
      {permission === 'granted' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Icon name="send" size={18} style={{ color: HABITS_COLOR }} />
            Test
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={sendTestNotification}>
              <Icon name="bell-ring" size={16} /> Send Test Notification
            </button>
            {testSent && (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}>Sent!</span>
            )}
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0 0.25rem' }}>
        {nativeApp
          ? 'Android reminders are scheduled locally on this phone and keep working when the app is closed.'
          : 'Browser reminders require this site to be allowed to send notifications.'}
      </div>
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function HabitsSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'habits'

  function setTab(tab) {
    setSearchParams({ tab })
  }

  return (
    <>
      <PageHeader title="Habits Settings" />

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--glass-border)',
        marginBottom: '1.5rem',
        gap: '0.5rem',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${HABITS_COLOR}` : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontWeight: activeTab === tab.key ? 700 : 400,
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'habits' && <HabitsTab />}
      {activeTab === 'reminders' && <RemindersTab />}
      {activeTab === 'import' && <ImportTab />}
    </>
  )
}
