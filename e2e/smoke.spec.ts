import { expect, test } from '@playwright/test'

test('smoke: hydrates the local editor and accepts keyboard input', async ({ page }) => {
  const marker = `E2E smoke marker ${test.info().testId}`

  await page.goto('/smoke-test')

  await expect(
    page.getByRole('heading', { name: 'Welcome to Notion-like template' }),
    'the seeded editor title should render after hydration',
  ).toBeVisible()

  const editor = page.locator('.notion-like-editor[contenteditable="true"]')
  await expect(editor, 'the ProseMirror editing surface should be available').toBeVisible()

  await editor.click()
  await editor.press('Control+End')
  await page.keyboard.type(marker)

  await expect(editor, 'typed content should remain rendered in the editor').toContainText(marker)
})
