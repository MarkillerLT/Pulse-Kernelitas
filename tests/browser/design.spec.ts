import { test, expect } from '@playwright/test'

test('all existing activities, costs and mission controls remain functional after redesign', async ({
  page,
}) => {
  await page.goto('/')
  for (const [action, activity, location] of [
    ['Ejercitar 2 OP', 'Ejercicio', 'Zona de ejercicio'],
    ['Evaluar 2 OP', 'Evaluación', 'Enfermería'],
    ['Tratar 1 OP + 2 MED', 'Tratamiento', 'Enfermería'],
    ['Convivir 1 OP', 'Convivencia', 'Sala común'],
    ['Trabajar 0 OP', 'Trabajo', 'Control de misión'],
  ]) {
    await page.getByRole('button', { name: action, exact: true }).click()
    await expect(page.locator('.turn-preview')).toContainText('1 orden pendiente')
    await expect(page.getByRole('button', { name: action, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Avanzar un día' }).click()
    await expect(page.getByRole('status')).toContainText('Informe diario guardado')
    await expect(page.locator('.location-line')).toContainText(activity)
    await expect(page.locator('.location-line')).toContainText(location)
  }
  await expect(page.locator('.resource').nth(1)).toContainText('10')
  await expect(page.locator('.mission-clock')).toContainText('006')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Misión guardada en este dispositivo')
  await page.getByRole('link', { name: 'Misión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Resultados de la evaluación' })).toBeVisible()
  await page.screenshot({ path: '.cache/mission-redesign.png', fullPage: true })
})

test('research attribution, responsive grid, keyboard focus and reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await expect(page.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Descansar 1 OP', exact: true }).click()
  await page.getByRole('button', { name: 'Avanzar un día' }).click()
  await expect(page.getByRole('status')).toContainText('Informe diario guardado')
  await expect(page.locator('.location-line')).toContainText('Dormitorios')
  await page.waitForTimeout(150)
  const stillFrame = await page.locator('canvas').screenshot()
  await page.waitForTimeout(400)
  expect(await page.locator('canvas').screenshot()).toEqual(stillFrame)
  for (const width of [768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1080 })
    await page.waitForTimeout(100)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const canvasWidth = await page
      .locator('canvas')
      .evaluate((element) => element.getBoundingClientRect().width)
    expect(canvasWidth % 480).toBe(0)
  }
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.getByRole('link', { name: /Investigación/ }).click()
  await expect(
    page.getByRole('complementary', { name: 'Independencia y atribución' }),
  ).toContainText('No es un producto oficial de la NASA ni implica su respaldo')
  await expect(
    page.getByRole('link', { name: 'Consultar las pautas de marca de la NASA ↗' }),
  ).toHaveAttribute('href', 'https://www.nasa.gov/nasa-brand-center/')
  await page.screenshot({ path: '.cache/research-redesign.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '.cache/research-mobile.png', fullPage: true })
})
