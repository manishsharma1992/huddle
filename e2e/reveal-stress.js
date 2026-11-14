const helpers = require(`${process.env.PW_SKILL_DIR}/lib/helpers`);
const TARGET = process.env.TARGET_URL || 'http://localhost:8090';
// Huddle now asks who you are before anything else; tests sign in by seeding the browser's account
// (and mark the tours as seen so they don't cover the table).
const signIn = async (page, name) => {
  await page.evaluate((n) => {
    const a = { email: `${n.toLowerCase().replace(/\W+/g, '.')}@bnpparibas.com`, firstName: n, lastName: 'E2E', team: 'E2E Team' };
    localStorage.setItem('huddle.account', JSON.stringify(a));
    localStorage.setItem('huddle.tours', JSON.stringify({ [`${a.email}:lobby`]: true, [`${a.email}:table`]: true }));
  }, name);
  await page.reload();
};
(async () => {
  const browser = await helpers.launchBrowser('chromium');
  try {
    const mk = async () => (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    const card = (p, l) => p.getByRole('button', { name: `Card ${l}`, exact: true });
    const host = await mk();
    await host.goto(TARGET);
    await signIn(host, 'Host');
    await host.getByRole('button', { name: 'Open table' }).click();
    await host.waitForURL('**/t/*');
    const code = host.url().split('/t/')[1];
    await host.getByPlaceholder(/Add a story/).fill(Array.from({ length: 8 }, (_, i) => `Story ${i + 1}`).join('\n'));
    await host.getByRole('button', { name: /Add 8 stories/ }).click();
    const guests = [];
    for (const n of ['A', 'B', 'C', 'D']) {
      const g = await mk();
      await g.goto(`${TARGET}/t/${code}`);
      await signIn(g, n);
      await g.getByRole('button', { name: 'Take a seat' }).click();
      await g.locator('.poker-table').waitFor();
      guests.push(g);
    }
    const labels = ['3', '5', '8'];
    for (let round = 1; round <= 8; round++) {
      await host.bringToFront();
      await host.getByRole('button', { name: /Deal the cards/ }).click();
      await host.getByText(/0\/5 voted/).waitFor();
      await host.waitForTimeout(700);
      for (const [i, g] of [host, ...guests].entries()) await card(g, labels[(i + round) % 3]).click();
      await host.bringToFront();
      await host.getByText(/5\/5 voted/).waitFor();
      const t0 = Date.now();
      await host.getByRole('button', { name: 'Reveal cards' }).click();
      let ms = null;
      try { await host.locator('.results').waitFor({ timeout: 10000 }); ms = Date.now() - t0; } catch {}
      const dom = await host.evaluate(() => ({
        countdown: [...document.querySelectorAll('.countdown-number')].map((e) => e.textContent),
        stages: document.querySelectorAll('.center-stage').length,
        stageText: document.querySelector('.center-stage')?.textContent.slice(0, 60),
      }));
      // guests too: did each one get the results?
      const guestOk = [];
      for (const g of guests) guestOk.push(await g.locator('.results').isVisible() || await g.locator('.results').waitFor({ timeout: 4000 }).then(() => true, () => false));
      console.log(`round ${round}: host results after ${ms ?? 'TIMEOUT'} ms; guests ok ${guestOk.filter(Boolean).length}/4` + (ms === null ? ` DOM=${JSON.stringify(dom)}` : ''));
      if (ms === null) await host.screenshot({ path: `${process.env.PW_ARTIFACT_DIR}/stuck-reveal-${round}.png` });
      await host.locator('.settle-chip').filter({ hasText: /^5$/ }).click().catch(() => {});
      await host.getByRole('button', { name: /Deal the cards/ }).waitFor({ timeout: 5000 }).catch(() => {});
    }
  } finally { await browser.close(); }
})();
