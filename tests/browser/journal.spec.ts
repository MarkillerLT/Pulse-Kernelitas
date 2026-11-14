import { expect, test } from '@playwright/test'

test('journal uses correct crisp sprites for individual warnings on desktop and mobile', async ({
  page,
}) => {
  await page.goto('/mission')
  const briefing = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Una advertencia silenciosa' }) })
  const portrait = briefing.locator('[data-astronaut-id="okafor"]')
  await expect(portrait).toBeVisible()
  const styles = await portrait.locator('div').evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      url: style.backgroundImage,
      size: style.backgroundSize,
      position: style.backgroundPosition,
      rendering: style.imageRendering,
      width: style.width,
      height: style.height,
    }
  })
  expect(styles.url).toContain('/crew-1.png')
  expect(styles.size).toBe('576px 72px')
  expect(styles.position).toBe('0px 0px')
  expect(styles.rendering).toBe('pixelated')
  expect([styles.width, styles.height]).toEqual(['48px', '72px'])
  for (let shift = 0; shift < 5; shift++) {
    const advance = page.getByRole('button', { name: 'Avanzar un día' })
    if (!(await advance.isEnabled())) break
    await advance.click()
    await expect(page.getByRole('status')).toContainText('Informe diario guardado')
  }
  await expect(page.locator('.journal [data-astronaut-id="vasquez"]').first()).toBeVisible()
  await expect(page.locator('.journal [data-astronaut-id="park"]').first()).toBeVisible()
  await page.screenshot({ path: '.cache/journal-sprites-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 320, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(briefing.locator('[data-astronaut-id="okafor"]')).toBeVisible()
  const layout = await briefing.evaluate((element) => {
    const sprite = element.querySelector('.portrait')!.getBoundingClientRect()
    const text = element.querySelector('.journal-entry-text')!.getBoundingClientRect()
    return { spriteRight: sprite.right, textLeft: text.left }
  })
  expect(layout.spriteRight).toBeLessThan(layout.textLeft)
  await page.screenshot({ path: '.cache/journal-sprites-mobile.png', fullPage: true })
})
