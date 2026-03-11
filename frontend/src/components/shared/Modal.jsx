import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api'
import { LoadingLine } from './LoadingLine'
import { HistoryItem } from './HistoryItem'
import Icon from '../icons/Icon'
import '../../custom-scrollbar.css'

function ModalPortal({ children }) {
  return createPortal(children, document.body)
}

export function Modal({ title, onClose, children, size = 'medium' }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className={`modal-content custom-scrollbar ${size}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button className="btn small btn-ghost" onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  )
}

export function HistoryModal({ onClose }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [preloaded, setPreloaded] = useState([])
  const [preloading, setPreloading] = useState(false)
  const containerRef = useRef(null)

  async function fetchPage(pageNum) {
    const data = await api.get(`/streams/history?page=${pageNum}&pageSize=20`)
    return Array.isArray(data.items) ? data.items : data
  }

  useEffect(() => {
    if (!hasMore || preloading) return
    setPreloading(true)
    fetchPage(page + 1).then(nextItems => {
      setPreloaded(nextItems)
      setPreloading(false)
    }).catch(() => setPreloading(false))
  }, [page, hasMore])

  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setLoading(true)
    fetchPage(1).then(firstItems => {
      setItems(firstItems)
      setLoading(false)
      setHasMore(firstItems.length === 20)
    })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current
      if (!el || loading || !hasMore) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        if (preloaded.length > 0) {
          setItems(prev => [...prev, ...preloaded])
          setPage(p => p + 1)
          setHasMore(preloaded.length === 20)
          setPreloaded([])
        } else {
          setLoading(true)
          fetchPage(page + 1).then(newItems => {
            setItems(prev => [...prev, ...newItems])
            setPage(p => p + 1)
            setLoading(false)
            setHasMore(newItems.length === 20)
          })
        }
      }
    }
    const el = containerRef.current
    if (el) el.addEventListener('scroll', handleScroll)
    return () => { if (el) el.removeEventListener('scroll', handleScroll) }
  }, [page, loading, hasMore, preloaded])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content medium" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>All Recent Streams</h3>
            <button className="btn small btn-ghost" onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
          <div ref={containerRef} style={{ overflowY: 'auto', maxHeight: '60vh', paddingRight: 8 }} className="custom-scrollbar">
            {items.length === 0 && loading ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {Array.from({ length: 8 }).map((_, i) => (<li key={i}><LoadingLine width={220} /></li>))}
              </ul>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map((h, i) => (
                  <HistoryItem key={h.id || i} stream={h} />
                ))}
              </ul>
            )}
            {loading && items.length > 0 && <LoadingLine width={180} />}
            {!hasMore && <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', margin: '1rem 0' }}>End of history</div>}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
