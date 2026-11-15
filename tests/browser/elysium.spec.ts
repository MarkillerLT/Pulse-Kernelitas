import { expect, test } from '@playwright/test'

test('decision loop runs in real time, survives a reload and can be reset', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/juego/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  // First launch: the pause menu opens on the express guide; pick the difficulty.
  const menu = page.getByRole('dialog')
  await expect(menu.getByText('Eres N0VA-7')).toBeVisible()
  await menu.getByRole('button', { name: /Elegir dificultad/ }).click()
  await menu.getByRole('radio', { name: /Fácil/ }).click()
  await menu.getByRole('button', { name: /Comenzar en modo Fácil/ }).click()
  await expect(page.locator('.level-value')).toHaveText('Nivel 1')
  // Time runs on its own from the start.
  await expect(page.locator('.clock-state')).toHaveText(/En curso/)
  await expect(page.getByRole('img', { name: /Plano de la nave Elysium/ })).toBeVisible()
  await expect(page.locator('.walker')).toHaveCount(5)

  // Decide: send Lyra to the air filters.
  await page.getByRole('button', { name: 'Reemplazar filtros' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Asignar a Lyra Kess' }).click()
  await expect(dialog.getByText('95%')).toBeVisible()
  await dialog.getByRole('button', { name: 'Enviar ahora' }).click()
  await expect(page.locator('.task-card.is-active')).toBeVisible()

  // Let time run until the task resolves.
  await page.getByRole('button', { name: '4×' }).click()
  await expect(page.locator('.recent-log')).toContainText(
    /(Completada|Fallida): Filtros de aire saturados/,
    { timeout: 10_000 },
  )
  // Only the pause menu stops the clock.
  await page.getByRole('button', { name: 'Pausa' }).click()
  await expect(page.locator('.clock-state')).toHaveText(/En pausa/)
  const clock = await page.locator('.clock-time').textContent()
  await page.waitForTimeout(2500)
  await expect(page.locator('.clock-time')).toHaveText(clock!)

  // Reload: same history; the game opens on the pause menu and resumes from it.
  await page.reload()
  await expect(page.locator('.clock-state')).toHaveText(/En pausa/)
  await page.getByRole('button', { name: /Reanudar/ }).click()
  await expect(page.locator('.recent-log')).toContainText(/Filtros de aire saturados/)
  await expect(page.locator('.clock-state')).toHaveText(/En curso/)

  // Floating crew card and side tabs.
  await page.getByRole('button', { name: 'Seleccionar a Kai Verdant' }).click()
  await expect(page.getByRole('group', { name: 'Ficha de Kai Verdant' })).toBeVisible()
  await page.getByRole('tab', { name: 'Misiones' }).click()
  await expect(page.getByText('El Corazón de la Tormenta')).toBeVisible()

  // Reset from the pause menu (Esc opens it).
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Dificultad' }).click()
  await page.getByRole('radio', { name: /Difícil/ }).click()
  await page.getByRole('button', { name: /Comenzar en modo Difícil/ }).click()
  await expect(page.locator('.level-value')).toHaveText('Nivel 10')

  expect(errors).toEqual([])
})
