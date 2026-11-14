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
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const labels = ['1', '2', '3', '5', '8', '13', '21'];
    let lost = 0, total = 0;
    for (const where of ['lower edge', 'centre']) {
      for (const label of labels) {
        // park the pointer away so the next card isn't pre-hovered, and clear the vote
        await page.mouse.move(640, 300);
        if (await page.getByRole('button', { name: `Card ${label}`, exact: true }).getAttribute('aria-pressed') === 'true') continue;
        await page.waitForTimeout(400);
        const before = await page.evaluate(() => document.querySelector('.hand-card.is-selected')?.getAttribute('aria-label') ?? null);
        const box = await page.getByRole('button', { name: `Card ${label}`, exact: true }).boundingBox();
        const y = where === 'lower edge' ? box.y + box.height - 12 : box.y + box.height / 2;
        await page.mouse.move(box.x + box.width / 2, y);   // a quick user: arrive and press at once
        await page.mouse.down();
        await page.waitForTimeout(110);                       // a normal human press duration
        await page.mouse.up();
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => document.querySelector('.hand-card.is-selected')?.getAttribute('aria-label') ?? null);
        total++;
        const ok = after === `Card ${label}`;
        if (!ok) lost++;
        console.log(`${where.padEnd(10)} card ${label.padStart(2)}: ${ok ? 'voted' : `LOST (selected: ${after}, before: ${before})`}`);
      }
    }
    console.log(`\n${lost}/${total} quick clicks lost`);
  } finally {
    await browser.close();
  }
})();
