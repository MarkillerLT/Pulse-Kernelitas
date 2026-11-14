import { expect, test } from '@playwright/test'

test('decision loop runs in real time, survives a reload and can be reset', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.locator('.clock-time')).toHaveText('Día 1 · 08:00')
  await expect(page.getByRole('img', { name: /Plano de la nave Elysium/ })).toBeVisible()
  await expect(page.locator('.walker')).toHaveCount(5)

  // Decide: send Lyra to the air filters.
  await page.getByRole('button', { name: 'Reemplazar filtros' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Asignar a Lyra Kess' }).click()
  await expect(dialog.getByText('95%')).toBeVisible()
  await dialog.getByRole('button', { name: 'Enviar ahora' }).click()
  await expect(page.getByText('En curso')).toBeVisible()

  // Let time run until the task resolves.
  await page.getByRole('button', { name: '4×' }).click()
  await expect(page.locator('.recent-log')).toContainText(
    /(Completada|Fallida): Filtros de aire saturados/,
    { timeout: 10_000 },
  )
  await page.getByRole('button', { name: /Pausa/ }).click()
  const clock = await page.locator('.clock-time').textContent()

  // Reload: same clock, same history, paused.
  await page.reload()
  await expect(page.locator('.clock-time')).toHaveText(clock!)
  await expect(page.locator('.recent-log')).toContainText(/Filtros de aire saturados/)
  await expect(page.getByRole('button', { name: /Pausa/ })).toHaveAttribute('aria-pressed', 'true')

  // Reset.
  await page.goto('/system')
  await page.getByRole('button', { name: /Reiniciar partida/ }).click()
  await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
  await page.goto('/')
  await expect(page.locator('.clock-time')).toHaveText('Día 1 · 08:00')

  expect(errors).toEqual([])
})
