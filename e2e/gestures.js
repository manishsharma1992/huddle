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
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(TARGET);
    await signIn(page, 'Solo');
    await page.getByRole('button', { name: 'Open table' }).click();
    await page.waitForURL('**/t/*');
    await page.getByPlaceholder(/Add a story/).fill('S1');
    await page.getByRole('button', { name: /^Add/ }).click();
    await page.getByRole('button', { name: /Deal the cards/ }).click();
    await page.getByText(/0\/1 voted/).waitFor();
    await page.waitForTimeout(800);
    const rate = Number(process.env.CPU_RATE || 1);
    if (rate > 1) await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate });
    console.log('CPU throttling x' + rate);
    const gestures = [
      { label: '5', steps: 3, dy: 30, pause: 0, desc: 'very fast flick, no pauses (90px)', expect: true },
      { label: '2', steps: 4, dy: -15, pause: 5, desc: 'quick swipe DOWN (should NOT vote)', expect: false, dx: 0 },
      { label: '21', steps: 4, dy: 0, pause: 5, desc: 'quick swipe SIDEWAYS (should NOT vote)', expect: false, dx: 20 },
      { label: '8', steps: 5, dy: 18, pause: 8, desc: 'short fast flick (90px)', expect: true },
      { label: '13', steps: 10, dy: 25, pause: 16, desc: 'long drag (250px)', expect: true },
      { label: '3', steps: 4, dy: 10, pause: 30, desc: 'tiny slow nudge (40px, should NOT vote)', expect: false },
    ];
    for (const g of gestures) {
      const sel = () => page.evaluate(() => document.querySelector('.hand-card.is-selected')?.getAttribute('aria-label') ?? null);
      const before = await sel();
      const b = await page.getByRole('button', { name: `Card ${g.label}`, exact: true }).boundingBox();
      const x = b.x + b.width / 2, y = b.y + b.height - 20;
      await page.mouse.move(x, y);
      await page.waitForTimeout(400);
      await page.mouse.down();
      for (let i = 1; i <= g.steps; i++) {
        await page.mouse.move(x + i * (g.dx || 0), y - i * g.dy);
        await page.waitForTimeout(g.pause);
      }
      await page.mouse.up();
      await page.waitForTimeout(700);
      const after = await sel();
      const voted = after === `Card ${g.label}` && before !== after;
      console.log(`${voted === g.expect ? 'PASS' : 'FAIL'}  ${g.desc}: before=${before}, after=${after}`);
    }
  } finally { await browser.close(); }
})();
