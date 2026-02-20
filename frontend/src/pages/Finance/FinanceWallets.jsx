import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import { SkeletonCard } from '../../components/shared'

const FINANCE_COLOR = '#fbbf24'

function formatCurrency(amount, currency = '€') {
  const formatted = Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`
}

export default function FinanceWallets() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState([])

  useEffect(() => {
    loadWallets()
  }, [])

  async function loadWallets() {
    setLoading(true)
    try {
      const data = await api.get('/finance/wallets')
      setWallets(data || [])
    } catch (e) {
      console.error('Failed to load wallets:', e)
    } finally {
      setLoading(false)
    }
  }

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)

  return (
    <>
      <h2>
        <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8, color: FINANCE_COLOR }}>
          account_balance
        </span>
        {t('finance.wallets')}
      </h2>

      {/* Total Balance Card */}
      <div className="card" style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        background: `linear-gradient(135deg, ${FINANCE_COLOR}22, ${FINANCE_COLOR}08)`,
        border: `1px solid ${FINANCE_COLOR}40`,
      }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          {t('finance.totalBalance')}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: FINANCE_COLOR }}>
          {formatCurrency(totalBalance)}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          {t('finance.across')} {wallets.length} {wallets.length !== 1 ? t('finance.walletsCountPlural') : t('finance.walletsCount')}
        </div>
      </div>

      {/* Wallets Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: 48, color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }}>
            account_balance_wallet
          </span>
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            {t('finance.noWallets')}
          </div>
          <button className="btn" onClick={() => navigate('/finance/import')}>
            <span className="material-icons" style={{ fontSize: 18 }}>file_download</span>
            {t('finance.importData')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {wallets.map(wallet => (
            <div
              key={wallet.id}
              className="card"
              style={{ padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: `${wallet.color || FINANCE_COLOR}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span className="material-icons" style={{
                    fontSize: 24,
                    color: wallet.color || FINANCE_COLOR,
                  }}>
                    {wallet.icon || 'account_balance_wallet'}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{wallet.name}</div>
                  {wallet.description && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {wallet.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: wallet.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)',
              }}>
                {formatCurrency(wallet.balance || 0)}
              </div>

              {wallet.transactionCount > 0 && (
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.5rem',
                }}>
                  {wallet.transactionCount} {wallet.transactionCount !== 1 ? t('finance.transactionsCountPlural') : t('finance.transactionsCount')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
