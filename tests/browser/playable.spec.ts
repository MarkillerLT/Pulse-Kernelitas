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
  // Convert logical world coordinates to the current integer display scale.
  const scale = await canvas.evaluate((element) => element.getBoundingClientRect().width / 480)
  expect(scale).toBe(2)
  // Work locations settle at x307,319,331. Click Elena's original pixel sprite.
  await canvas.click({ position: { x: 307 * scale, y: 208 * scale } })
  await expect(page.getByRole('heading', { name: 'Elena Vasquez' })).toBeVisible()
  await page.getByRole('button', { name: /Idris Okafor/ }).click()
  // The quarters hotspot queues rest, without moving the simulation clock.
  await canvas.click({ position: { x: 230 * scale, y: 165 * scale } })
  await expect(page.getByRole('button', { name: 'Descansar 1 OP', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Avanzar un día' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Informe diario guardado en este dispositivo',
  )
  await expect(page.locator('.mission-clock')).toContainText('002')
  await expect(page.locator('.location-line')).toContainText('Dormitorios')
  await expect(page.locator('.metric').nth(1)).toContainText('48')
  await page.waitForTimeout(8500)
  await page.screenshot({ path: '.cache/resting.png', fullPage: true })
  await page.reload()
  await page.getByRole('button', { name: 'Cargar', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Misión local restaurada')
  await expect(page.locator('.mission-clock')).toContainText('002')
  await page.getByRole('link', { name: 'Misión', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Operaciones de vuelo / Diario de misión' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('mobile preserves integer canvas with horizontal scrolling, not page overflow', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      page: document.documentElement.scrollWidth,
      canvas: document.querySelector('canvas')!.getBoundingClientRect().width,
    }))
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport)
    expect(dimensions.canvas).toBe(480)
    await page.screenshot({ path: `.cache/mobile-${width}.png`, fullPage: true })
  }
})
