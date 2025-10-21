import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../../api'
import { LoadingSpinner, ExerciseCard, Modal } from './WorkoutShared'

export default function WorkoutExercises() {
  const { sidebarCollapsed } = useOutletContext() || {}
  
  const [exercises, setExercises] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('exercises') // 'exercises' | 'categories'
  
  // Exercise modal
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [exerciseForm, setExerciseForm] = useState({ id: null, name: '', muscleGroup: '', categoryId: '', notes: '' })
  
  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', description: '', color: '#7dd3fc' })
  
  // Search
  const [searchTerm, setSearchTerm] = useState('')
  
  // Collapsed categories (collapsed by default)
  const [collapsedCategories, setCollapsedCategories] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [ex, cat] = await Promise.all([
        api.get('/workout/exercises'),
        api.get('/workout/categories')
      ])
      setExercises(ex || [])
      setCategories(cat || [])
    } catch (e) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // ========== Exercise CRUD ==========

  function openExerciseModal(exercise = null) {
    if (exercise) {
      setExerciseForm({
        id: exercise.id,
        name: exercise.name || '',
        muscleGroup: exercise.muscleGroup || '',
        categoryId: exercise.categoryId || '',
        notes: exercise.notes || ''
      })
    } else {
      setExerciseForm({ id: null, name: '', muscleGroup: '', categoryId: '', notes: '' })
    }
    setShowExerciseModal(true)
  }

  function closeExerciseModal() {
    setShowExerciseModal(false)
    setExerciseForm({ id: null, name: '', muscleGroup: '', categoryId: '', notes: '' })
  }

  async function saveExercise() {
    if (!exerciseForm.name.trim()) {
      setError('Exercise name is required')
      return
    }
    
    setError('')
    try {
      const payload = {
        name: exerciseForm.name.trim(),
        muscleGroup: exerciseForm.muscleGroup.trim() || null,
        categoryId: exerciseForm.categoryId || null,
        notes: exerciseForm.notes.trim() || null
      }
      
      if (exerciseForm.id) {
        // Update
        const updated = await api.patch(`/workout/exercises/${exerciseForm.id}`, payload)
        setExercises(exercises.map(e => e.id === updated.id ? updated : e))
      } else {
        // Create
        const created = await api.post('/workout/exercises', payload)
        setExercises([...exercises, created])
      }
      
      closeExerciseModal()
    } catch (e) {
      setError(e.message || 'Failed to save exercise')
    }
  }

  async function deleteExercise(exercise) {
    if (!window.confirm(`Delete "${exercise.name}"? This cannot be undone.`)) return
    setError('')
    try {
      await api.delete(`/workout/exercises/${exercise.id}`)
      setExercises(exercises.filter(e => e.id !== exercise.id))
    } catch (e) {
      setError(e.message || 'Failed to delete exercise')
    }
  }

  // ========== Category CRUD ==========

  function openCategoryModal(category = null) {
    if (category) {
      setCategoryForm({
        id: category.id,
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#7dd3fc'
      })
    } else {
      setCategoryForm({ id: null, name: '', description: '', color: '#7dd3fc' })
    }
    setShowCategoryModal(true)
  }

  function closeCategoryModal() {
    setShowCategoryModal(false)
    setCategoryForm({ id: null, name: '', description: '', color: '#7dd3fc' })
  }

  async function saveCategory() {
    if (!categoryForm.name.trim()) {
      setError('Category name is required')
      return
    }
    
    setError('')
    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        color: categoryForm.color || '#7dd3fc'
      }
      
      if (categoryForm.id) {
        // Update
        const updated = await api.patch(`/workout/categories/${categoryForm.id}`, payload)
        setCategories(categories.map(c => c.id === updated.id ? updated : c))
      } else {
        // Create
        const created = await api.post('/workout/categories', payload)
        setCategories([...categories, created])
      }
      
      closeCategoryModal()
    } catch (e) {
      setError(e.message || 'Failed to save category')
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return
    setError('')
    try {
      await api.delete(`/workout/categories/${category.id}`)
      setCategories(categories.filter(c => c.id !== category.id))
    } catch (e) {
      setError(e.message || 'Failed to delete category')
    }
  }

  // ========== Filter ==========

  const filteredExercises = exercises.filter(e => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return e.name.toLowerCase().includes(term) || 
           (e.muscleGroup || '').toLowerCase().includes(term) ||
           (e.notes || '').toLowerCase().includes(term)
  })

  const filteredCategories = categories.filter(c => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return c.name.toLowerCase().includes(term) || 
           (c.description || '').toLowerCase().includes(term)
  })

  function toggleCategory(categoryId) {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1>🗂️ Exercises & Categories</h1>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.5)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          className="btn"
          style={{
            background: tab === 'exercises' ? '#7dd3fc' : 'rgba(125,211,252,0.1)',
            color: tab === 'exercises' ? '#0a1929' : 'rgba(125,211,252,0.7)',
            border: tab === 'exercises' ? '2px solid #7dd3fc' : '1px solid rgba(125,211,252,0.2)',
            fontWeight: tab === 'exercises' ? 700 : 400
          }}
          onClick={() => setTab('exercises')}
        >
          Exercises ({exercises.length})
        </button>
        <button 
          className="btn"
          style={{
            background: tab === 'categories' ? '#7dd3fc' : 'rgba(125,211,252,0.1)',
            color: tab === 'categories' ? '#0a1929' : 'rgba(125,211,252,0.7)',
            border: tab === 'categories' ? '2px solid #7dd3fc' : '1px solid rgba(125,211,252,0.2)',
            fontWeight: tab === 'categories' ? 700 : 400
          }}
          onClick={() => setTab('categories')}
        >
          Categories ({categories.length})
        </button>
      </div>

      {/* Search & Add */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
              Search
            </label>
            <input 
              type="text"
              className="input"
              placeholder={tab === 'exercises' ? 'Search exercises...' : 'Search categories...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="btn"
            onClick={() => tab === 'exercises' ? openExerciseModal() : openCategoryModal()}
          >
            ➕ Add {tab === 'exercises' ? 'Exercise' : 'Category'}
          </button>
        </div>
      </div>

      {loading ? (
        <div>
          {/* Skeletons for current tab */}
          {tab === 'exercises' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 4, height: 40, background: 'rgba(125,211,252,0.4)', borderRadius: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'rgba(125,211,252,0.18)', height: 18, width: '30%', borderRadius: 6, animation: 'pulse 1.2s infinite alternate' }} />
                      <div style={{ background: 'rgba(125,211,252,0.18)', height: 12, width: '20%', borderRadius: 6, marginTop: 6, animation: 'pulse 1.2s infinite alternate' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div key={j} className="card" style={{ padding: '.75rem' }}>
                        <div style={{ background: 'rgba(125,211,252,0.18)', height: 16, width: '60%', borderRadius: 6, animation: 'pulse 1.2s infinite alternate' }} />
                        <div style={{ background: 'rgba(125,211,252,0.18)', height: 12, width: '40%', borderRadius: 6, marginTop: 6, animation: 'pulse 1.2s infinite alternate' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: '.75rem' }}>
                  <div style={{ background: 'rgba(125,211,252,0.18)', height: 16, width: '50%', borderRadius: 6, animation: 'pulse 1.2s infinite alternate' }} />
                  <div style={{ background: 'rgba(125,211,252,0.18)', height: 12, width: '70%', borderRadius: 6, marginTop: 6, animation: 'pulse 1.2s infinite alternate' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {tab === 'exercises' ? (
            filteredExercises.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏋️</div>
                <h3>No exercises found</h3>
                <p style={{ opacity: .7, marginTop: '.5rem' }}>
                  {searchTerm ? 'Try adjusting your search' : 'Add your first exercise to get started'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {(() => {
                  // Group exercises by category
                  const grouped = filteredExercises.reduce((acc, exercise) => {
                    const categoryId = exercise.categoryId || 'uncategorized'
                    if (!acc[categoryId]) {
                      acc[categoryId] = []
                    }
                    acc[categoryId].push(exercise)
                    return acc
                  }, {})

                  // Sort categories: real categories first, then uncategorized
                  const sortedCategories = Object.keys(grouped).sort((a, b) => {
                    if (a === 'uncategorized') return 1
                    if (b === 'uncategorized') return -1
                    const catA = categories.find(c => c.id === a)
                    const catB = categories.find(c => c.id === b)
                    return (catA?.name || '').localeCompare(catB?.name || '')
                  })

                  return sortedCategories.map(categoryId => {
                    const exercisesInCategory = grouped[categoryId]
                    const category = categories.find(c => c.id === categoryId)
                    const categoryName = category?.name || 'Uncategorized'
                    const categoryColor = category?.color || '#7dd3fc'
                    const isCollapsed = collapsedCategories[categoryId] !== false // collapsed by default

                    return (
                      <div key={categoryId} className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                        {/* Category Header */}
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            marginBottom: isCollapsed ? 0 : '1rem',
                            paddingBottom: isCollapsed ? 0 : '1rem',
                            borderBottom: isCollapsed ? 'none' : `2px solid ${categoryColor}40`,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => toggleCategory(categoryId)}
                        >
                          <div 
                            style={{ 
                              width: 4, 
                              height: 40, 
                              background: categoryColor,
                              borderRadius: 2
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '1.2rem', 
                              fontWeight: 700,
                              color: categoryColor
                            }}>
                              {categoryName}
                            </div>
                            <div style={{ fontSize: '.85rem', opacity: .7, marginTop: 2 }}>
                              {exercisesInCategory.length} {exercisesInCategory.length === 1 ? 'exercise' : 'exercises'}
                            </div>
                          </div>
                          <div style={{ 
                            fontSize: '1.5rem', 
                            color: categoryColor,
                            transition: 'transform 0.2s',
                            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)'
                          }}>
                            ▶
                          </div>
                        </div>

                        {/* Exercises Grid */}
                        {!isCollapsed && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                            {exercisesInCategory.map(exercise => (
                            <div 
                              key={exercise.id}
                              className="card" 
                              style={{ 
                                padding: '.75rem',
                                borderLeft: `3px solid ${categoryColor}`,
                                background: `${categoryColor}08`
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{exercise.name}</div>
                                  {exercise.muscleGroup && (
                                    <div style={{ opacity: .7, fontSize: '.85rem', marginTop: 4 }}>
                                      {exercise.muscleGroup}
                                    </div>
                                  )}
                                  {exercise.notes && (
                                    <div style={{ fontSize: '.85rem', opacity: .6, marginTop: 6, fontStyle: 'italic' }}>
                                      {exercise.notes}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '.5rem', marginLeft: '.5rem' }}>
                                  <button className="btn small" onClick={() => openExerciseModal(exercise)}>
                                    ✏️
                                  </button>
                                  <button 
                                    className="btn small" 
                                    onClick={() => deleteExercise(exercise)}
                                    style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )
          ) : (
            filteredCategories.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                <h3>No categories found</h3>
                <p style={{ opacity: .7, marginTop: '.5rem' }}>
                  {searchTerm ? 'Try adjusting your search' : 'Add your first category to organize exercises'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredCategories.map(category => {
                  const categoryColor = category.color || '#7dd3fc'
                  return (
                    <div 
                      key={category.id} 
                      className="card" 
                      style={{ 
                        padding: '.75rem',
                        borderLeft: `3px solid ${categoryColor}`,
                        background: `${categoryColor}08`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: categoryColor }} />
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: categoryColor }}>{category.name}</div>
                          </div>
                          {category.description && (
                            <div style={{ fontSize: '.85rem', opacity: .7, marginTop: 6 }}>
                              {category.description}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '.5rem', marginLeft: '.5rem' }}>
                          <button className="btn small" onClick={() => openCategoryModal(category)}>
                            ✏️
                          </button>
                          <button 
                            className="btn small" 
                            onClick={() => deleteCategory(category)}
                            style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* Exercise Modal */}
      {showExerciseModal && (
        <Modal 
          title={exerciseForm.id ? 'Edit Exercise' : 'Add Exercise'} 
          onClose={closeExerciseModal}
          size="medium"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text"
                className="input"
                placeholder="e.g. Bench Press"
                value={exerciseForm.name}
                onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Muscle Group
              </label>
              <input 
                type="text"
                className="input"
                placeholder="e.g. Chest, Legs, Back..."
                value={exerciseForm.muscleGroup}
                onChange={(e) => setExerciseForm({ ...exerciseForm, muscleGroup: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Category
              </label>
              <select 
                className="input"
                value={exerciseForm.categoryId}
                onChange={(e) => setExerciseForm({ ...exerciseForm, categoryId: e.target.value })}
              >
                <option value="">— None —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Notes
              </label>
              <textarea 
                className="input"
                rows={3}
                placeholder="Any notes about this exercise..."
                value={exerciseForm.notes}
                onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn" onClick={saveExercise}>
                {exerciseForm.id ? 'Save Changes' : 'Add Exercise'}
              </button>
              <button className="btn" onClick={closeExerciseModal} style={{ background: 'rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <Modal 
          title={categoryForm.id ? 'Edit Category' : 'Add Category'} 
          onClose={closeCategoryModal}
          size="medium"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text"
                className="input"
                placeholder="e.g. Strength, Cardio..."
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Color
              </label>
              <input 
                type="color"
                className="input"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                style={{ width: 60, height: 40, padding: 0, border: 'none', background: 'transparent' }}
                title={categoryForm.color}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Description
              </label>
              <textarea 
                className="input"
                rows={3}
                placeholder="Optional description..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn" onClick={saveCategory}>
                {categoryForm.id ? 'Save Changes' : 'Add Category'}
              </button>
              <button className="btn" onClick={closeCategoryModal} style={{ background: 'rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
