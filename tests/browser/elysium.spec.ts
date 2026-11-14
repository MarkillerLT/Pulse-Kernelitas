import { expect, test } from '@playwright/test'

test('full mission loop survives a reload and can be reset', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('N0VA-7 en línea')

  await page.getByRole('link', { name: /Preparar misión/ }).click()
  await expect(page).toHaveURL(/\/missions\/ghost-satellite$/)
  for (const name of ['Orion Vega', 'Lyra Kess', 'Zara Void'])
    await page.getByRole('button', { name: `Asignar a ${name}` }).click()
  await expect(page.getByRole('button', { name: 'Asignar a Kai Verdant' })).toBeDisabled()

  await page.getByRole('button', { name: /Lanzar misión/ }).click()
  await page.getByRole('button', { name: 'Confirmar lanzamiento' }).click()
  await expect(page).toHaveURL(/\/log\/t1-ghost-satellite$/)
  await page.getByRole('button', { name: 'Saltar secuencia' }).click()
  await expect(page.getByText('Se obtiene toda la información.')).toBeVisible()

  await page.getByRole('link', { name: 'Volver al puente' }).click()
  await page.reload()
  await page.goto('/crew/zara')
  await expect(page.getByRole('meter', { name: 'Salud' })).toHaveAttribute('aria-valuenow', '85')
  await page.goto('/missions')
  await expect(page.getByRole('link', { name: /Ver informe/ })).toBeVisible()

  await page.goto('/system')
  await page.getByRole('button', { name: /Reiniciar partida/ }).click()
  await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
  await page.reload()
  await page.goto('/crew/zara')
  await expect(page.getByRole('meter', { name: 'Salud' })).toHaveAttribute('aria-valuenow', '100')

  expect(errors).toEqual([])
})
