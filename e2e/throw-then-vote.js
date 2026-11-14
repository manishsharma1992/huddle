const helpers = require(`${process.env.PW_SKILL_DIR}/lib/helpers`);
const TARGET = process.env.TARGET_URL || 'http://localhost:8090';

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
  await host.getByPlaceholder('Alex').fill('Host');
  await host.getByRole('button', { name: 'Open table' }).click();
  await host.waitForURL('**/t/*');
  const code = host.url().split('/t/')[1];
  await host.getByPlaceholder(/Add a story/).fill('Story 1\nStory 2\nStory 3\nStory 4');
  await host.getByRole('button', { name: /Add 4 stories/ }).click();

  const kenji = await mk();
  await kenji.goto(`${TARGET}/t/${code}`);
  await kenji.getByPlaceholder('Alex').fill('Kenji');
  await kenji.getByRole('button', { name: 'Take a seat' }).click();
  await kenji.locator('.poker-table').waitFor();

  const scenarios = [
    { name: 'plain vote (control)', prep: async () => {} },
    { name: 'throw, Escape, then vote (original e2e)', prep: async () => {
        await kenji.getByRole('button', { name: /^Host, .*Open actions/ }).click();
        await kenji.getByRole('button', { name: 'Throw ✈️' }).click();
        await kenji.keyboard.press('Escape');
      } },
    { name: 'menu still open, then vote', prep: async () => {
        await kenji.getByRole('button', { name: /^Host, .*Open actions/ }).click();
        await kenji.getByRole('button', { name: 'Throw 🍅' }).click();
      } },
    { name: 'throw, then vote immediately while projectile flies', prep: async () => {
        await kenji.getByRole('button', { name: /^Host, .*Open actions/ }).click();
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
