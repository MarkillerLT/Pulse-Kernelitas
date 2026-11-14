import { test, expect } from '@playwright/test'

test('Spanish UI covers mission reports, research, status notices and reset confirmation', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page).toHaveTitle('PULSE — Control de misión')
  await expect(page.getByRole('heading', { name: 'Lejos de casa.' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('A la espera de tus órdenes.')
  await expect(page.getByRole('heading', { name: 'Una advertencia silenciosa' })).toBeVisible()
  await page.getByRole('button', { name: 'Cargar', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('No hay ninguna misión guardada')
  for (let shift = 0; shift < 2; shift++) {
    await page.getByRole('button', { name: 'Avanzar un día' }).click()
    await expect(page.getByRole('status')).toContainText('Informe diario guardado')
  }
  await page.getByRole('link', { name: 'Misión', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Sobrecarga diferida', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.journal')).not.toContainText('Delayed strain')
  await expect(page.locator('.journal')).not.toContainText('finished an exhausting shift')
  await expect(page.locator('.journal')).toContainText('la sobrecarga de ayer ha pasado factura')
  await page.getByRole('link', { name: /Investigación/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Investigación / Transparencia del modelo' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Repositorio de Datos de Ciencia Abierta de la NASA ↗' }),
  ).toHaveAttribute('href', 'https://osdr.nasa.gov/')
  await page.getByRole('button', { name: 'Nueva', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '¿Iniciar una nueva misión?' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
