# Core Finance Enhancements — Design Spec

## Goal

Upgrade the finance module's foundation: category icons, subcategory UI, transaction add/edit forms, dashboard time-period selector, and calendar-month-based views. This lays the groundwork for future sub-projects (budgets & goals, recurring/subscriptions, analytics).

## Scope

This is sub-project 1 of 4:
1. **Core finance enhancements** (this spec)
2. Budgets & goals
3. Recurring & subscriptions
4. Analytics & charts

---

## 1. Category Icons

### Problem
Categories have `iconName` in the schema but the UI only shows colour dots. Users can't quickly visually identify transaction types.

### Design
- Use Lucide icons (already in the project) for category icons
- Each category displays as: **coloured circle background + white icon** throughout the app
- Icon picker component: searchable grid of ~60 curated finance-relevant Lucide icons (e.g. shopping-cart, utensils, home, car, zap, heart, briefcase, plane, gift, etc.)
- Default icon: `circle` if none selected
- Render everywhere categories appear: transaction lists, pie charts/legends, filter dropdowns, category management page, dashboard summary cards

### Backend Changes
- None — `iconName` column already exists on `app_finance_categories`

### Frontend Changes
- New: `CategoryIcon` component — renders coloured circle + Lucide icon
- New: `IconPicker` component — searchable grid for category create/edit forms
- Update: transaction list rows, summary cards, pie chart legend, filter dropdowns to use `CategoryIcon`

---

## 2. Subcategory UI

### Problem
`parentCategoryId` exists in the schema but the frontend has no UI for creating, viewing, or filtering by subcategories.

### Design
- **Category management page**: tree view showing parent categories with expandable children
- **Transaction form**: category picker groups subcategories under their parent (visual indent or optgroup style)
- **Filtering**: selecting a parent category in filters includes all its subcategories' transactions
- **Inheritance**: subcategories inherit parent's icon and colour by default, can override
- **Creation**: when creating a category, optional "Parent category" dropdown to nest it

### Backend Changes
- Update `categories.service.findAll()` to return categories with populated `parentCategory` and `subcategories` relations
- Update transaction filtering: when `categoryId` is a parent, also match child category IDs

### Frontend Changes
- Update category management page with tree/hierarchy view
- Update category picker in transaction form with grouped display
- Update category filter dropdowns to show hierarchy

---

## 3. Transaction Add/Edit Forms

### Problem
No frontend UI exists for creating or editing transactions. Backend supports full CRUD but frontend only has the list view.

### Design
- **Add transaction**: button on transactions page and finance dashboard opens a modal form
- **Edit transaction**: click a transaction row to open the same form pre-filled
- **Form fields**:
  - Name (text, required)
  - Amount (number, required)
  - Type toggle: Income / Expense
  - Date picker (defaults to today)
  - Wallet dropdown (required)
  - Category picker (with subcategory grouping, uses new IconPicker display)
  - Note (optional textarea)
- **Delete**: confirmation modal from the edit form
- **Validation**: amount > 0, name required, wallet required
- **After save**: close modal, refresh transaction list and summary

### Backend Changes
- None — CRUD endpoints already exist

### Frontend Changes
- New: `TransactionForm` modal component
- Update: transaction list to open edit form on row click
- Update: finance dashboard and transactions page to include "Add Transaction" button

---

## 4. Dashboard Time Period Selector

### Problem
The finance dashboard is locked to "current month" (rolling 30 days for some queries). User wants to choose: this week, this month (calendar), this year, all time.

### Design
- **Selector UI**: segmented button group at the top of the finance dashboard: `This Week | This Month | This Year | All Time`
- **This Week**: Monday to Sunday of the current week
- **This Month**: 1st to last day of the current calendar month
- **This Year**: January 1st to December 31st of the current year
- **All Time**: no date filter
- **Affects**: summary stats (income/expense/net), top categories, recent transactions, sparkline
- **Persisted**: selection stored in React state (resets on page leave — no need for localStorage)
- **Header display**: shows the period label, e.g. "March 2026" or "Week of Mar 10-16" or "2026"

### Backend Changes
- None — the `from`/`to` filters on summary and transactions endpoints already support arbitrary date ranges

### Frontend Changes
- New: `PeriodSelector` component (segmented buttons)
- Update: `Finance.jsx` dashboard to pass computed `from`/`to` dates based on selected period
- Update: dashboard header to display the current period label

---

## 5. Calendar Month Transaction Views

### Problem
Transaction list doesn't clearly indicate which month is being viewed. Should use actual calendar months, not rolling 30-day windows.

### Design
- **Month navigator**: on the transactions page, add a month/year selector (left arrow, "March 2026", right arrow) that sets the date range to the calendar month
- **Default**: current calendar month
- **Interaction**: clicking arrows moves forward/backward by one month
- **Combined with filters**: month navigator sets `from`/`to`, other filters (wallet, category, search, income/expense) work within that month
- **Summary bar**: at the top of the transaction list, show month's income, expenses, and net for the selected month

### Backend Changes
- None — existing `from`/`to` filters handle this

### Frontend Changes
- New: `MonthNavigator` component (arrows + month label)
- Update: `FinanceTransactions.jsx` to use month-based date ranges by default
- New: inline summary bar showing month totals above the transaction table

---

## Technical Notes

- All new components follow the existing glass-morphism design system (CSS variables, card styles, etc.)
- All modals use the portal-based `Modal` component (recently fixed)
- Category icon data is just a string matching Lucide icon names — no new database columns needed
- The `iconName` field already exists on the category entity; we just need UI to set and display it
- Subcategory filtering in the backend uses a simple two-step: fetch parent's child IDs, then use `IN` clause

## Out of Scope (future sub-projects)

- Budgets and spending limits
- Savings goals
- Recurring transactions and subscription tracker
- Historical analytics charts and period comparisons
- Reminders and alerts
