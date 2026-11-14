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
  const mk = async (w = 1280, h = 800) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.log = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && page.log.push(`${m.type()}: ${m.text()}`));
    page.on('pageerror', (e) => page.log.push(`pageerror: ${e}`));
    page.on('response', async (r) => {
      if (r.url().includes('/api/') && r.request().method() !== 'GET')
        page.log.push(`${r.request().method()} ${new URL(r.url()).pathname} -> ${r.status()}`);
    });
    return page;
  };

  const host = await mk();
  await host.goto(TARGET);
  await signIn(host, 'Host');
  await host.getByRole('button', { name: 'Open table' }).click();
  await host.waitForURL('**/t/*');
  const code = host.url().split('/t/')[1];
  await host.getByPlaceholder(/Add a story/).fill('Story 1\nStory 2\nStory 3\nStory 4');
  await host.getByRole('button', { name: /Add 4 stories/ }).click();

  const kenji = await mk();
  await kenji.goto(`${TARGET}/t/${code}`);
  await signIn(kenji, 'Kenji');
  await kenji.getByRole('button', { name: 'Take a seat' }).click();
  await kenji.locator('.poker-table').waitFor();

  const scenarios = [
    { name: 'plain vote (control)', prep: async () => {} },
    { name: 'throw, Escape, then vote (original e2e)', prep: async () => {
        await kenji.getByRole('button', { name: /^Host E2E, .*Open actions/ }).click();
        await kenji.getByRole('button', { name: 'Throw ✈️' }).click();
        await kenji.keyboard.press('Escape');
      } },
    { name: 'menu still open, then vote', prep: async () => {
        await kenji.getByRole('button', { name: /^Host E2E, .*Open actions/ }).click();
        await kenji.getByRole('button', { name: 'Throw 🍅' }).click();
      } },
    { name: 'throw, then vote immediately while projectile flies', prep: async () => {
        await kenji.getByRole('button', { name: /^Host E2E, .*Open actions/ }).click();
        await kenji.getByRole('button', { name: 'Throw ⭐' }).click();
        await kenji.mouse.click(5, 400);
      } },
  ];

  for (const [i, s] of scenarios.entries()) {
    await host.getByRole('button', { name: /Deal the cards/ }).click();
    await kenji.getByText(/0\/2 voted/).waitFor();
    kenji.log.length = 0;
    await s.prep();
    await kenji.getByRole('button', { name: 'Card 13' }).click();
    await kenji.waitForTimeout(800);
    const voted = await host.getByText(/1\/2 voted/).isVisible();
    const pressed = await kenji.getByRole('button', { name: 'Card 13' }).getAttribute('aria-pressed');
    console.log(`\n[${i + 1}] ${s.name}: host sees vote=${voted}, Kenji card pressed=${pressed}`);
    console.log('   ' + (kenji.log.join('\n   ') || '(no requests/errors)'));
    if (!voted) await kenji.screenshot({ path: `${process.env.PW_ARTIFACT_DIR}/glitch-${i + 1}.png` });
    // finish the round so the next scenario starts clean
    await host.getByRole('button', { name: 'Card 5' }).click();
    await host.getByRole('button', { name: 'Reveal cards' }).click();
    await host.locator('.settle-chip').first().waitFor();
    await host.locator('.settle-chip').filter({ hasText: /^5$/ }).click();
  }
} finally {
  await browser.close();
}
})();
