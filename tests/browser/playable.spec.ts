import { test, expect } from '@playwright/test'

test('station renders, sprite selection and room assignments drive saved mission', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(2000)
  expect(await canvas.getAttribute('width')).toBe('480')
  await page.screenshot({ path: '.cache/desktop.png', fullPage: true })
  // Work locations settle at x307,319,331. Click Elena's original pixel sprite.
  await canvas.click({ position: { x: 307, y: 208 } })
  await expect(page.getByRole('heading', { name: 'Elena Vasquez' })).toBeVisible()
  await page.getByRole('button', { name: /Idris Okafor/ }).click()
  // The quarters hotspot queues rest, without moving the simulation clock.
  await canvas.click({ position: { x: 230, y: 165 } })
  await expect(page.getByRole('button', { name: 'Rest 1 OP', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Execute next day' }).click()
  await expect(page.getByRole('status')).toContainText('Daily report saved locally')
  await expect(page.locator('.mission-clock')).toContainText('002')
  await expect(page.locator('.location-line')).toContainText('Sleeping quarters')
  await expect(page.locator('.metric').nth(1)).toContainText('48')
  await page.waitForTimeout(8500)
  await page.screenshot({ path: '.cache/resting.png', fullPage: true })
  await page.reload()
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Local mission restored')
  await expect(page.locator('.mission-clock')).toContainText('002')
  await page.getByRole('link', { name: 'Mission', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Flight operations / Mission journal' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('mobile preserves integer canvas with horizontal scrolling, not page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    page: document.documentElement.scrollWidth,
    canvas: document.querySelector('canvas')!.getBoundingClientRect().width,
  }))
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport)
  expect(dimensions.canvas).toBe(480)
  await page.screenshot({ path: '.cache/mobile.png', fullPage: true })
})
