# Core Finance Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the finance module with category icons, subcategory UI, transaction add/edit forms, dashboard time-period selector, and calendar-month-based transaction views.

**Architecture:** All finance entities are already account-scoped (per-user). Frontend uses React with react-router, CSS variables for theming, and a portal-based Modal system. Backend is NestJS 9 + TypeORM + PostgreSQL. New components follow existing patterns: glass-morphism cards, Lucide icons via the `Icon` component, and the existing API client with SWR caching.

**Tech Stack:** React, NestJS 9, TypeORM, PostgreSQL, Chart.js, Lucide React icons

**Spec:** `docs/superpowers/specs/2026-03-11-core-finance-enhancements-design.md`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/components/finance/CategoryIcon.jsx` | Renders coloured circle + Lucide icon for a category |
| `frontend/src/components/finance/IconPicker.jsx` | Searchable grid of Lucide icons for category create/edit |
| `frontend/src/components/finance/CategoryPicker.jsx` | Hierarchical category dropdown with icons (parent > child grouping) |
| `frontend/src/components/finance/TransactionForm.jsx` | Modal form for adding/editing transactions |
| `frontend/src/components/finance/PeriodSelector.jsx` | Segmented button group: This Week / This Month / This Year / All Time |
| `frontend/src/components/finance/MonthNavigator.jsx` | Left/right arrows + month label for transaction page navigation |
| `frontend/src/pages/Finance/FinanceCategories.jsx` | Category management page with tree view |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/finance/categories/categories.service.ts` | Return subcategories relation, add `findAllTree()` method |
| `backend/src/finance/transactions/transactions.service.ts` | Subcategory-inclusive filtering when parent categoryId provided |
| `frontend/src/pages/Finance/Finance.jsx` | Add PeriodSelector, add transaction button, use CategoryIcon |
| `frontend/src/pages/Finance/FinanceTransactions.jsx` | Add MonthNavigator, add/edit transaction buttons, use CategoryIcon |
| `frontend/src/pages/Finance/FinanceWallets.jsx` | Minor: use CategoryIcon in any category references |
| `frontend/src/styles.css` | New styles for finance components |
| `frontend/src/App.jsx` | Add `/finance/categories` route |

---

## Chunk 1: CategoryIcon, IconPicker, and Category Management

### Task 1: CategoryIcon Component

**Files:**
- Create: `frontend/src/components/finance/CategoryIcon.jsx`

**Context:** Categories have `iconName` (string, nullable) and `colour` (hex string, nullable) fields. The app uses Lucide icons via `frontend/src/components/icons/Icon.jsx` which converts kebab-case names to PascalCase Lucide components. The default icon should be `circle` when no iconName is set.

- [ ] **Step 1: Create CategoryIcon component**

```jsx
// frontend/src/components/finance/CategoryIcon.jsx
import React from 'react'
import Icon from '../icons/Icon'

export default function CategoryIcon({ category, size = 32 }) {
  const colour = category?.colour || '#6b7280'
  const iconName = category?.iconName || 'circle'
  const iconSize = Math.round(size * 0.5)

  return (
    <span
      className="category-icon"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: colour + '22',
        border: `1.5px solid ${colour}55`,
      }}
    >
      <Icon name={iconName} size={iconSize} style={{ color: colour }} />
    </span>
  )
}
```

- [ ] **Step 2: Verify it renders**

Open the browser dev tools, temporarily import and render `<CategoryIcon category={{ colour: '#ef4444', iconName: 'shopping-cart' }} />` in any page. Confirm it shows a red-tinted circle with a cart icon.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/finance/CategoryIcon.jsx
git commit -m "feat(finance): add CategoryIcon component"
```

---

### Task 2: IconPicker Component

**Files:**
- Create: `frontend/src/components/finance/IconPicker.jsx`

**Context:** This is a searchable grid where users pick a Lucide icon for their category. Should include ~60 finance-relevant icons. The grid shows icon + name, with search filtering. Used inside category create/edit forms.

- [ ] **Step 1: Create IconPicker component**

```jsx
// frontend/src/components/finance/IconPicker.jsx
import React, { useState, useMemo } from 'react'
import Icon from '../icons/Icon'

const FINANCE_ICONS = [
  // Shopping & Food
  { name: 'shopping-cart', label: 'Shopping' },
  { name: 'shopping-bag', label: 'Shopping Bag' },
  { name: 'store', label: 'Store' },
  { name: 'utensils', label: 'Dining' },
  { name: 'coffee', label: 'Coffee' },
  { name: 'beer', label: 'Drinks' },
  { name: 'pizza', label: 'Fast Food' },
  { name: 'apple', label: 'Groceries' },
  // Home & Living
  { name: 'home', label: 'Home' },
  { name: 'sofa', label: 'Furniture' },
  { name: 'lamp', label: 'Utilities' },
  { name: 'zap', label: 'Electricity' },
  { name: 'droplets', label: 'Water' },
  { name: 'flame', label: 'Gas' },
  { name: 'wifi', label: 'Internet' },
  { name: 'tv', label: 'TV' },
  // Transport
  { name: 'car', label: 'Car' },
  { name: 'fuel', label: 'Fuel' },
  { name: 'bus', label: 'Bus' },
  { name: 'train-front', label: 'Train' },
  { name: 'plane', label: 'Flight' },
  { name: 'bike', label: 'Bike' },
  { name: 'parking-meter', label: 'Parking' },
  // Health & Fitness
  { name: 'heart-pulse', label: 'Health' },
  { name: 'pill', label: 'Medicine' },
  { name: 'stethoscope', label: 'Doctor' },
  { name: 'dumbbell', label: 'Gym' },
  { name: 'activity', label: 'Fitness' },
  // Entertainment
  { name: 'gamepad-2', label: 'Gaming' },
  { name: 'film', label: 'Movies' },
  { name: 'music', label: 'Music' },
  { name: 'book-open', label: 'Books' },
  { name: 'ticket', label: 'Events' },
  { name: 'palette', label: 'Art' },
  // Work & Education
  { name: 'briefcase', label: 'Work' },
  { name: 'laptop', label: 'Tech' },
  { name: 'smartphone', label: 'Phone' },
  { name: 'graduation-cap', label: 'Education' },
  { name: 'notebook-pen', label: 'Stationery' },
  // Finance
  { name: 'banknote', label: 'Cash' },
  { name: 'credit-card', label: 'Card' },
  { name: 'wallet', label: 'Wallet' },
  { name: 'piggy-bank', label: 'Savings' },
  { name: 'trending-up', label: 'Investment' },
  { name: 'receipt', label: 'Receipt' },
  { name: 'calculator', label: 'Tax' },
  // People & Gifts
  { name: 'gift', label: 'Gift' },
  { name: 'heart', label: 'Donation' },
  { name: 'baby', label: 'Kids' },
  { name: 'dog', label: 'Pets' },
  { name: 'users', label: 'Family' },
  // Travel & Lifestyle
  { name: 'map-pin', label: 'Travel' },
  { name: 'umbrella', label: 'Insurance' },
  { name: 'shirt', label: 'Clothing' },
  { name: 'scissors', label: 'Haircut' },
  { name: 'sparkles', label: 'Beauty' },
  { name: 'cigarette', label: 'Tobacco' },
  // Other
  { name: 'package', label: 'Delivery' },
  { name: 'wrench', label: 'Repairs' },
  { name: 'shield', label: 'Security' },
  { name: 'cloud', label: 'Cloud' },
  { name: 'circle', label: 'Other' },
]

export default function IconPicker({ value, onChange, colour = '#6b7280' }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return FINANCE_ICONS
    const q = search.toLowerCase()
    return FINANCE_ICONS.filter(
      i => i.name.includes(q) || i.label.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="icon-picker">
      <input
        className="input"
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '0.75rem' }}
      />
      <div className="icon-picker-grid">
        {filtered.map(icon => (
          <button
            key={icon.name}
            type="button"
            className={`icon-picker-item${value === icon.name ? ' selected' : ''}`}
            onClick={() => onChange(icon.name)}
            title={icon.label}
          >
            <Icon name={icon.name} size={20} style={{ color: value === icon.name ? '#fff' : colour }} />
          </button>
        ))}
      </div>
    </div>
  )
}

export { FINANCE_ICONS }
```

- [ ] **Step 2: Add CSS styles**

Add to `frontend/src/styles.css` before the media queries section:

```css
/* ===== Icon Picker ===== */
.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.icon-picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: rgba(255,255,255,0.05);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.icon-picker-item:hover {
  background: rgba(255,255,255,0.1);
  border-color: var(--glass-border);
}
.icon-picker-item.selected {
  background: var(--color-accent);
  border-color: var(--color-accent);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/finance/IconPicker.jsx frontend/src/styles.css
git commit -m "feat(finance): add IconPicker component with 60 finance icons"
```

---

### Task 3: Category Management Page

**Files:**
- Create: `frontend/src/pages/Finance/FinanceCategories.jsx`
- Modify: `frontend/src/App.jsx` (add route)
- Modify: `frontend/src/pages/Finance/Finance.jsx` (add nav link)
- Modify: `backend/src/finance/categories/categories.service.ts` (return subcategories)

**Context:** The category entity has `parentCategoryId` for subcategories. The current `findAll` loads `parentCategory` relation but not `subcategories`. The frontend has no categories page. This task creates a full category management page with tree view, create/edit modal with icon picker and colour picker, and subcategory support.

- [ ] **Step 1: Update backend categories service to return tree structure**

Modify `backend/src/finance/categories/categories.service.ts`:
- In `findAll()`, also load the `subcategories` relation (add a self-join or use eager loading)
- Return categories organized as: top-level categories (where parentCategoryId IS NULL) with nested subcategories

```typescript
// backend/src/finance/categories/categories.service.ts
// Update findAll to include subcategories and return tree structure
async findAll(account: Account) {
  const all = await this.repo.find({
    where: { accountId: account.id },
    relations: ["parentCategory"],
    order: { name: "ASC" },
  });
  return all;
}

async findTree(account: Account) {
  const all = await this.findAll(account);
  const parents = all.filter(c => !c.parentCategoryId);
  return parents.map(p => ({
    ...p,
    subcategories: all.filter(c => c.parentCategoryId === p.id),
  }));
}
```

- [ ] **Step 2: Add findTree endpoint to controller**

Add to `backend/src/finance/categories/categories.controller.ts`:

```typescript
@Get("tree")
@ApiOperation({ summary: "Get categories as tree" })
findTree(@ReqUser() account: Account) {
  return this.service.findTree(account);
}
```

Note: place this ABOVE the `@Get(":id")` route so it doesn't get caught by the `:id` param.

- [ ] **Step 3: Create FinanceCategories page**

Create `frontend/src/pages/Finance/FinanceCategories.jsx`:

This page displays:
- A tree of categories: parent categories as cards, subcategories indented below
- Each category shows: CategoryIcon + name + transaction count (if available)
- "Add Category" button opens a modal form
- Click a category to edit it
- Edit modal: name, icon (IconPicker), colour (native color input), isIncome toggle, parent category dropdown
- Delete button in edit modal with confirmation

The page should:
- Fetch categories from `GET /finance/categories` (flat list)
- Build tree client-side: group by parentCategoryId
- Show parents first, subcategories indented under each parent
- Use the `Modal` component from `frontend/src/components/shared/Modal.jsx` for create/edit forms

Key form fields for create/edit modal:
- Name (text input, required)
- Icon (IconPicker component)
- Colour (native `<input type="color">`)
- Type: Income / Expense toggle
- Parent Category (dropdown, optional — only show categories with no parent)

API calls:
- Create: `POST /finance/categories` with `{ name, iconName, colour, isIncome, parentCategoryId }`
- Update: `PATCH /finance/categories/:id` with partial fields
- Delete: `DELETE /finance/categories/:id`

- [ ] **Step 4: Add route to App.jsx**

In `frontend/src/App.jsx`, add:
```jsx
import FinanceCategories from './pages/Finance/FinanceCategories'
// Inside the finance routes:
<Route path="categories" element={<FinanceCategories />} />
```

- [ ] **Step 5: Add Categories link to Finance dashboard**

In `frontend/src/pages/Finance/Finance.jsx`, in the Quick Actions section, add a "Categories" button linking to `/finance/categories`.

- [ ] **Step 6: Verify and commit**

```bash
cd frontend && npx vite build
git add -A
git commit -m "feat(finance): add category management page with tree view, icons, and subcategories"
```

---

### Task 4: CategoryPicker Component (Hierarchical Dropdown)

**Files:**
- Create: `frontend/src/components/finance/CategoryPicker.jsx`

**Context:** Used in transaction forms and filters. Shows categories grouped by parent, with CategoryIcon for each. Subcategories are indented under their parent.

- [ ] **Step 1: Create CategoryPicker**

```jsx
// frontend/src/components/finance/CategoryPicker.jsx
import React from 'react'
import CategoryIcon from './CategoryIcon'

export default function CategoryPicker({ categories, value, onChange, placeholder = 'Select category...' }) {
  // Build tree: parents first, then their children
  const parents = categories.filter(c => !c.parentCategoryId)
  const childrenOf = (parentId) => categories.filter(c => c.parentCategoryId === parentId)

  return (
    <div className="category-picker">
      <select
        className="input"
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">{placeholder}</option>
        {parents.map(parent => {
          const children = childrenOf(parent.id)
          return (
            <React.Fragment key={parent.id}>
              <option value={parent.id}>
                {parent.name}
              </option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  &nbsp;&nbsp;&nbsp;&nbsp;{child.name}
                </option>
              ))}
            </React.Fragment>
          )
        })}
      </select>
    </div>
  )
}
```

Note: A native `<select>` can't render custom icons, but it groups subcategories via indentation. This is practical and accessible. A future enhancement could use a custom dropdown with CategoryIcon rendering, but YAGNI for now.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/finance/CategoryPicker.jsx
git commit -m "feat(finance): add CategoryPicker with parent/child grouping"
```

---

### Task 5: Backend — Subcategory-Inclusive Filtering

**Files:**
- Modify: `backend/src/finance/transactions/transactions.service.ts`

**Context:** When a user filters transactions by a parent category, results should include transactions tagged with any of that parent's subcategories. Currently it only matches the exact categoryId.

- [ ] **Step 1: Update applyFilters in transactions service**

In `backend/src/finance/transactions/transactions.service.ts`, update the `categoryId` filter block (around line 39-41):

```typescript
if (filters.categoryId) {
  // Include subcategories: find all categories where id = categoryId OR parentCategoryId = categoryId
  qb.andWhere(
    "(t.categoryId = :categoryId OR t.categoryId IN " +
    "(SELECT id FROM app_finance_categories WHERE \"parentCategoryId\" = :categoryId))",
    { categoryId: filters.categoryId }
  );
}
```

This uses a subquery to find all child category IDs of the selected parent. If the selected category is a leaf (no children), the subquery returns nothing and only the exact match applies — correct behavior.

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/finance/transactions/transactions.service.ts
git commit -m "feat(finance): include subcategory transactions when filtering by parent category"
```

---

## Chunk 2: Transaction Forms, Period Selector, and Month Navigator

### Task 6: TransactionForm Modal

**Files:**
- Create: `frontend/src/components/finance/TransactionForm.jsx`

**Context:** Modal form for creating and editing transactions. Uses the portal-based `Modal` component. Needs: name, amount, income/expense toggle, date, wallet dropdown, category picker (hierarchical), note. For edit mode, pre-fills from existing transaction. Delete button in edit mode.

- [ ] **Step 1: Create TransactionForm component**

Create `frontend/src/components/finance/TransactionForm.jsx`:

```jsx
// frontend/src/components/finance/TransactionForm.jsx
import React, { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { api } from '../../api'
import CategoryPicker from './CategoryPicker'
import Icon from '../icons/Icon'

export default function TransactionForm({ transaction, wallets, categories, onClose, onSaved }) {
  const isEdit = !!transaction?.id

  const [form, setForm] = useState({
    name: '',
    amount: '',
    isIncome: false,
    transactionDate: new Date().toISOString().slice(0, 10),
    walletId: '',
    categoryId: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (transaction) {
      setForm({
        name: transaction.name || '',
        amount: transaction.amount?.toString() || '',
        isIncome: transaction.isIncome || false,
        transactionDate: transaction.transactionDate
          ? new Date(transaction.transactionDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        walletId: transaction.wallet?.id || transaction.walletId || '',
        categoryId: transaction.category?.id || transaction.categoryId || '',
        note: transaction.note || '',
      })
    }
  }, [transaction])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        isIncome: form.isIncome,
        transactionDate: form.transactionDate,
        walletId: form.walletId || null,
        categoryId: form.categoryId || null,
        note: form.note.trim() || null,
      }
      if (isEdit) {
        await api.patch(`/finance/transactions/${transaction.id}`, payload)
      } else {
        await api.post('/finance/transactions', payload)
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
      await api.delete(`/finance/transactions/${transaction.id}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Income/Expense Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn small ${!form.isIncome ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setField('isIncome', false)}
          >
            <Icon name="arrow-up" size={14} /> Expense
          </button>
          <button
            type="button"
            className={`btn small ${form.isIncome ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setField('isIncome', true)}
          >
            <Icon name="arrow-down" size={14} /> Income
          </button>
        </div>

        {/* Name */}
        <label className="form-label">Description</label>
        <input
          className="input"
          type="text"
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="e.g. Grocery shopping"
          required
          style={{ marginBottom: '0.75rem' }}
        />

        {/* Amount */}
        <label className="form-label">Amount</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={e => setField('amount', e.target.value)}
          placeholder="0.00"
          required
          style={{ marginBottom: '0.75rem' }}
        />

        {/* Date */}
        <label className="form-label">Date</label>
        <input
          className="input"
          type="date"
          value={form.transactionDate}
          onChange={e => setField('transactionDate', e.target.value)}
          required
          style={{ marginBottom: '0.75rem' }}
        />

        {/* Wallet */}
        <label className="form-label">Wallet</label>
        <select
          className="input"
          value={form.walletId}
          onChange={e => setField('walletId', e.target.value)}
          style={{ marginBottom: '0.75rem' }}
        >
          <option value="">Select wallet...</option>
          {wallets.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        {/* Category */}
        <label className="form-label">Category</label>
        <div style={{ marginBottom: '0.75rem' }}>
          <CategoryPicker
            categories={categories.filter(c => c.isIncome === form.isIncome)}
            value={form.categoryId}
            onChange={val => setField('categoryId', val)}
          />
        </div>

        {/* Note */}
        <label className="form-label">Note</label>
        <textarea
          className="input"
          value={form.note}
          onChange={e => setField('note', e.target.value)}
          placeholder="Optional note..."
          rows={2}
          style={{ marginBottom: '1rem', resize: 'vertical' }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {isEdit && !showDeleteConfirm && (
            <button
              type="button"
              className="btn small btn-ghost"
              style={{ color: 'var(--color-danger)', marginRight: 'auto' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Icon name="trash-2" size={14} /> Delete
            </button>
          )}
          {isEdit && showDeleteConfirm && (
            <div style={{ marginRight: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Delete?</span>
              <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDelete} disabled={saving}>
                Yes
              </button>
              <button type="button" className="btn small btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
                No
              </button>
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
```

- [ ] **Step 2: Add form-label style**

Add to `frontend/src/styles.css`:

```css
/* ===== Form Labels ===== */
.form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/finance/TransactionForm.jsx frontend/src/styles.css
git commit -m "feat(finance): add TransactionForm modal for add/edit/delete"
```

---

### Task 7: PeriodSelector Component

**Files:**
- Create: `frontend/src/components/finance/PeriodSelector.jsx`

**Context:** Segmented button group for the finance dashboard. Options: This Week, This Month, This Year, All Time. Returns computed `from` and `to` ISO date strings.

- [ ] **Step 1: Create PeriodSelector**

```jsx
// frontend/src/components/finance/PeriodSelector.jsx
import React from 'react'

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
]

export function getDateRange(period) {
  const now = new Date()
  let from = null, to = null

  if (period === 'week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    from = monday.toISOString().slice(0, 10)
    to = sunday.toISOString().slice(0, 10)
  } else if (period === 'month') {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    to = lastDay.toISOString().slice(0, 10)
  } else if (period === 'year') {
    from = `${now.getFullYear()}-01-01`
    to = `${now.getFullYear()}-12-31`
  }
  // 'all' returns { from: null, to: null }
  return { from, to }
}

export function getPeriodLabel(period) {
  const now = new Date()
  if (period === 'week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = d => d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    return `${fmt(monday)} – ${fmt(sunday)}`
  }
  if (period === 'month') {
    return now.toLocaleDateString('en', { month: 'long', year: 'numeric' })
  }
  if (period === 'year') return now.getFullYear().toString()
  return 'All Time'
}

export default function PeriodSelector({ value, onChange }) {
  return (
    <div className="period-selector">
      {PERIODS.map(p => (
        <button
          key={p.key}
          className={`btn small ${value === p.key ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

Add to `frontend/src/styles.css`:

```css
/* ===== Period Selector ===== */
.period-selector {
  display: flex;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.15);
  padding: 4px;
  border-radius: var(--radius-md);
  width: fit-content;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/finance/PeriodSelector.jsx frontend/src/styles.css
git commit -m "feat(finance): add PeriodSelector with week/month/year/all time"
```

---

### Task 8: MonthNavigator Component

**Files:**
- Create: `frontend/src/components/finance/MonthNavigator.jsx`

**Context:** Arrow-based month navigator for the transactions page. Shows "< March 2026 >" and clicking arrows moves by month. Returns `from`/`to` date strings for the selected calendar month.

- [ ] **Step 1: Create MonthNavigator**

```jsx
// frontend/src/components/finance/MonthNavigator.jsx
import React from 'react'
import Icon from '../icons/Icon'

export function getMonthRange(year, month) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0)
  const to = lastDay.toISOString().slice(0, 10)
  return { from, to }
}

export default function MonthNavigator({ year, month, onChange }) {
  const label = new Date(year, month).toLocaleDateString('en', { month: 'long', year: 'numeric' })

  function prev() {
    const d = new Date(year, month - 1)
    onChange(d.getFullYear(), d.getMonth())
  }

  function next() {
    const d = new Date(year, month + 1)
    onChange(d.getFullYear(), d.getMonth())
  }

  return (
    <div className="month-navigator">
      <button className="btn small btn-ghost" onClick={prev}>
        <Icon name="chevron-left" size={18} />
      </button>
      <span className="month-navigator-label">{label}</span>
      <button className="btn small btn-ghost" onClick={next}>
        <Icon name="chevron-right" size={18} />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

Add to `frontend/src/styles.css`:

```css
/* ===== Month Navigator ===== */
.month-navigator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.month-navigator-label {
  font-size: 1.1rem;
  font-weight: 600;
  min-width: 160px;
  text-align: center;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/finance/MonthNavigator.jsx frontend/src/styles.css
git commit -m "feat(finance): add MonthNavigator for calendar month navigation"
```

---

## Chunk 3: Integrate Everything into Finance Pages

### Task 9: Update Finance Dashboard

**Files:**
- Modify: `frontend/src/pages/Finance/Finance.jsx`

**Context:** The dashboard currently hardcodes "this month" date range. This task adds:
1. PeriodSelector at the top
2. Period label in the header
3. CategoryIcon in the top categories and recent transactions
4. "Add Transaction" button
5. TransactionForm modal
6. "Categories" quick action link

Key changes:
- Import PeriodSelector, getDateRange, getPeriodLabel, CategoryIcon, TransactionForm
- Add `period` state (default: 'month')
- Compute `from`/`to` from period, pass to summary and transactions API calls
- Replace colour dots in pie chart legend and transaction rows with CategoryIcon
- Add "Add Transaction" floating or prominent button
- Add TransactionForm modal state and rendering
- Add "Categories" to Quick Actions section

Implementation details:
- `loadDashboard()` should accept the computed `from`/`to` and pass them as query params
- The summary API already accepts `from` and `to` params
- The transactions API already accepts `from` and `to` params
- The period selector goes between the PageHeader and the stat cards
- The "Add Transaction" button should be prominent — use `btn btn-primary` with a plus icon

- [ ] **Step 1: Implement all dashboard changes**
- [ ] **Step 2: Verify build and test in browser**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Finance/Finance.jsx
git commit -m "feat(finance): add period selector, category icons, and add transaction to dashboard"
```

---

### Task 10: Update Transactions Page

**Files:**
- Modify: `frontend/src/pages/Finance/FinanceTransactions.jsx`

**Context:** This task adds:
1. MonthNavigator replacing the manual date inputs
2. Month summary bar (income/expenses/net for selected month)
3. CategoryIcon in transaction rows
4. CategoryPicker replacing the plain category dropdown filter
5. "Add Transaction" button
6. Click row to edit (TransactionForm modal)

Key changes:
- Import MonthNavigator, getMonthRange, CategoryIcon, CategoryPicker, TransactionForm
- Replace `startDate`/`endDate` filter fields with MonthNavigator state (`year`, `month`)
- Compute `from`/`to` from MonthNavigator using `getMonthRange(year, month)`
- Add inline summary bar above the table: "Income: $X | Expenses: $Y | Net: $Z" for the selected month
- Fetch summary data for the month alongside transactions
- Replace category colour dots in table rows with CategoryIcon
- Replace the category filter `<select>` with CategoryPicker
- Add "Add Transaction" button in the header area
- Make transaction rows clickable — onClick opens TransactionForm with that transaction's data
- After save/delete in TransactionForm, refresh both transactions and summary

- [ ] **Step 1: Implement all transaction page changes**
- [ ] **Step 2: Verify build and test in browser**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Finance/FinanceTransactions.jsx
git commit -m "feat(finance): add month navigator, summary bar, category icons, and transaction editing"
```

---

### Task 11: Wire Up CategoryIcon Across Remaining Pages

**Files:**
- Modify: `frontend/src/pages/Finance/Finance.jsx` (if not already done in Task 9)
- Modify: `frontend/src/pages/Finance/FinanceWallets.jsx`

**Context:** Ensure CategoryIcon is used consistently everywhere categories appear. Wallets page may show category breakdowns in the future but for now just ensure consistent styling.

- [ ] **Step 1: Review all finance pages for remaining colour-dot category references**
- [ ] **Step 2: Replace any remaining plain colour indicators with CategoryIcon**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Finance/
git commit -m "feat(finance): use CategoryIcon consistently across all finance pages"
```

---

### Task 12: Final Polish and Route Registration

**Files:**
- Modify: `frontend/src/App.jsx`
- Verify: all new components render correctly

**Context:** Ensure the `/finance/categories` route is registered, all imports are correct, and the build passes.

- [ ] **Step 1: Add categories route to App.jsx** (if not done in Task 3)
- [ ] **Step 2: Run full frontend build**

```bash
cd frontend && npx vite build
```

- [ ] **Step 3: Run backend TypeScript check**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 4: Manual smoke test**

Verify in browser:
- Finance dashboard: period selector works, category icons show, add transaction works
- Transactions page: month navigator works, summary bar shows, click row opens edit form
- Categories page: tree view shows, create/edit with icon picker works, subcategories work
- Filter by parent category includes subcategory transactions

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(finance): complete core finance enhancements"
```
