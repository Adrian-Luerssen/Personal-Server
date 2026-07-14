import { test, expect } from '../fixtures/auth'

test.describe('Assistant workspace', () => {
  test('should present the assistant as a full page workspace', async ({ authenticatedPage: page }) => {
    await page.goto('/chat')
    await expect(page.getByRole('heading', { name: 'Assistant', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /ask a question grounded in your life/i })).toBeVisible()
    await expect(page.locator('.chat-panel--inline')).toBeVisible()
  })

  test('should expose record context before a conversation starts', async ({ authenticatedPage: page }) => {
    await page.goto('/chat')
    await expect(page.getByLabel('Assistant transport state')).toContainText(/saved/i)
    await expect(page.getByText(/context on/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /summarise today/i })).toBeVisible()
  })

  test('should create a conversation and focus the message composer', async ({ authenticatedPage: page }) => {
    await page.goto('/chat')
    await page.getByRole('button', { name: /new conversation/i }).click()
    await expect(page.getByLabel('Conversation')).toBeVisible()
    await expect(page.getByLabel('Message Assistant')).toBeVisible()
  })
})
