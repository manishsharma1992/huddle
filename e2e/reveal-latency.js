const helpers = require(`${process.env.PW_SKILL_DIR}/lib/helpers`);
const TARGET = process.env.TARGET_URL || 'http://localhost:8090';
(async () => {
  const browser = await helpers.launchBrowser('chromium');
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(TARGET);
    await page.getByPlaceholder('Alex').fill('Solo');
    await page.getByRole('button', { name: 'Open table' }).click();
    await page.waitForURL('**/t/*');
    await page.getByPlaceholder(/Add a story/).fill('A\nB\nC');
    await page.getByRole('button', { name: /Add 3 stories/ }).click();
    for (let r = 1; r <= 3; r++) {
      await page.getByRole('button', { name: /Deal the cards/ }).click();
      await page.waitForTimeout(700);
      await page.getByRole('button', { name: 'Card 5', exact: true }).click();
      await page.getByText(/1\/1 voted/).waitFor();
      await page.evaluate(() => {
        window.__marks = {};
        const mark = (k) => { if (!(k in window.__marks)) window.__marks[k] = Math.round(performance.now()); };
        document.querySelector('.stage-actions .btn-primary').addEventListener('pointerdown', () => mark('press'), { once: true });
        const origFetch = window.__origFetch ??= window.fetch;
        window.fetch = (...a) => origFetch(...a).then((r) => { if (String(a[0]).endsWith('/reveal')) mark('revealResponse'); return r; });
        const poll = () => { if (document.querySelector('.countdown-number')) mark('countdown'); if (document.querySelector('.results')) { mark('results'); return; } requestAnimationFrame(poll); };
        poll();
      });
      await page.waitForTimeout(50);
      await page.getByRole('button', { name: 'Reveal cards' }).click();
      await page.locator('.results').waitFor();
      const m = await page.evaluate(() => window.__marks);
      console.log(`round ${r}: press→server ${m.revealResponse - m.press}ms, press→countdown ${m.countdown - m.press}ms, countdown→results ${m.results - m.countdown}ms, total ${m.results - m.press}ms`);
      await page.locator('.settle-chip').filter({ hasText: /^5$/ }).click();
    }
  } finally { await browser.close(); }
})();
