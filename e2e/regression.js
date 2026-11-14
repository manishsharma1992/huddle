const path = require('node:path');
const helpers = require(`${process.env.PW_SKILL_DIR}/lib/helpers`);
const TARGET = process.env.TARGET_URL || 'http://localhost:8090';
const OUT = process.env.PW_ARTIFACT_DIR;
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

(async () => {
  const browser = await helpers.launchBrowser('chromium');
  const problems = [];
  const mk = async (name, w = 1280, h = 800) => {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`${name} ${m.type()}: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`${name} pageerror: ${e}`));
    return page;
  };
  const card = (p, label) => p.getByRole('button', { name: `Card ${label}`, exact: true });
  try {
    const host = await mk('host', 1440, 900);
    await host.goto(TARGET);
    await host.getByPlaceholder('Alex').fill('Host');
    await host.getByRole('button', { name: 'Open table' }).click();
    await host.waitForURL('**/t/*');
    const code = host.url().split('/t/')[1];
    await host.getByPlaceholder(/Add a story/).fill('Login with SSO\nCSV export');
    await host.getByRole('button', { name: /Add 2 stories/ }).click();
    check('bulk add stories', await host.getByText('CSV export').isVisible());

    const guests = [];
    for (const name of ['Tapper', 'Typer', 'Flicker', 'Thrower']) {
      const g = await mk(name);
      await g.goto(`${TARGET}/t/${code}`);
      await g.getByPlaceholder('Alex').fill(name);
      await g.getByRole('button', { name: 'Take a seat' }).click();
      await g.locator('.poker-table').waitFor();
      guests.push(g);
    }
    await host.getByText('5 here').waitFor({ timeout: 5000 }).catch(() => {});
    check('presence shows 5 online', await host.getByText('5 here').isVisible());

    await host.getByRole('button', { name: /Deal the cards/ }).click();
    const [tapper, typer, flicker, thrower] = guests;
    await tapper.getByText(/0\/5 voted/).waitFor();

    await card(tapper, '5').click();
    await typer.keyboard.press('1');                 // "1" then "3" quickly = 13
    await typer.keyboard.press('3');
    // flick: quick upward drag that is released well below the play threshold distance; momentum must carry it
    const flickReqs = []; flicker.on('response', (r) => r.url().includes('/api/') && r.request().method() !== 'GET' && flickReqs.push(r.request().method() + ' ' + r.url().split('/').pop() + ' ' + r.status()));
    const flickEvents = [];
    flicker.on('websocket', (ws) => ws.on('framereceived', (f) => { const m = String(f.payload).match(/"type":"(\w+)"/g); if (m) flickEvents.push(...m.map((x) => x.slice(8, -1))); }));
    await flicker.evaluate(() => { window.__pe = []; for (const t of ['pointerdown', 'pointerup', 'click']) window.addEventListener(t, (e) => window.__pe.push(t + ':' + (e.target.closest('[aria-label]')?.getAttribute('aria-label') ?? e.target.className)), true); });
    await flicker.bringToFront();
    await flicker.waitForTimeout(900); // let the deal animation settle
    const b = await card(flicker, '8').boundingBox();
    await flicker.mouse.move(b.x + b.width / 2, b.y + b.height - 20);
    await flicker.mouse.down();
    for (let i = 1; i <= 5; i++) { await flicker.mouse.move(b.x + b.width / 2, b.y + b.height - 20 - i * 18); await flicker.waitForTimeout(8); }
    await flicker.mouse.up();
    await thrower.getByRole('button', { name: /^Host, .*Open actions/ }).click();
    await thrower.getByRole('button', { name: 'Throw 🍅' }).click();
    await thrower.keyboard.press('Escape');
    await card(thrower, '5').click();
    await host.waitForTimeout(800);

    check('tap vote registered', (await card(tapper, '5').getAttribute('aria-pressed')) === 'true');
    check('typed "13" vote registered', (await card(typer, '13').getAttribute('aria-pressed')) === 'true');
    const flickOk = (await card(flicker, '8').getAttribute('aria-pressed')) === 'true';
    check('flick vote registered', flickOk);
    if (!flickOk) {
      console.log('  flick requests:', JSON.stringify(flickReqs), 'events:', JSON.stringify(flickEvents));
      console.log('  pointer events:', JSON.stringify(await flicker.evaluate(() => window.__pe)));
      console.log('  host count:', await host.locator('.vote-count').textContent());
      await flicker.screenshot({ path: path.join(OUT, 'flick-fail.png') });
    }
    check('vote after throw registered', (await card(thrower, '5').getAttribute('aria-pressed')) === 'true');
    check('host sees 4/5 voted', await host.getByText(/4\/5 voted/).isVisible());
    const leaked = await host.evaluate(() => [...document.querySelectorAll('.seat .pcard-inner')].filter((el) => getComputedStyle(el).transform !== 'none' && !el.style.transform.includes('rotateY(0')).length);
    const apiFaces = await host.evaluate(async (c) => (await (await fetch('/api/tables/' + c)).json()).stories.flatMap((s) => s.votes).filter((v) => v.card).length, host.url().split('/t/')[1]);
    check('card faces not sent before reveal', apiFaces === 0, `faces in API: ${apiFaces}`);

    // Esc takes a card back
    await card(tapper, '5').waitFor();
    await tapper.bringToFront();
    await tapper.keyboard.press('Escape');
    await host.getByText(/3\/5 voted/).waitFor({ timeout: 3000 }).catch(() => {});
    check('Esc retracts vote', await host.getByText(/3\/5 voted/).isVisible());
    await card(tapper, '5').click();

    await host.bringToFront();
    await card(host, '5').click();
    await host.getByText(/5\/5 voted/).waitFor();
    await host.screenshot({ path: path.join(OUT, 'reg-all-voted.png') });
    await host.getByRole('button', { name: 'Reveal cards' }).click();
    await host.locator('.countdown-number').first().waitFor({ timeout: 2000 }).catch(() => {});
    check('3-2-1 countdown shown', (await host.locator('.countdown-number').count()) > 0);
    await host.locator('.results').waitFor({ timeout: 15000 }); // 5 windows on one laptop is slow; a real reveal takes ~1.8s
    const dist = await host.locator('.dist-label').allTextContents();
    check('results distribution', JSON.stringify(dist) === JSON.stringify(['5', '8', '13']), JSON.stringify(dist));
    check('outlier called out', await host.locator('.seat.is-outlier').count() > 0);
    await host.screenshot({ path: path.join(OUT, 'reg-revealed.png') });
    await host.locator('.settle-chip').filter({ hasText: /^5$/ }).click();
    // Locking in waits out a 5s Undo window before it reaches the server.
    await host.getByText('1/2 estimated').waitFor({ timeout: 9000 }).catch(() => {});
    check('estimate settled in backlog', await host.getByText('1/2 estimated').isVisible());

    // hover lift still looks right
    await host.getByRole('button', { name: /Deal the cards/ }).click();
    await card(host, '13').hover();
    await host.waitForTimeout(500);
    await host.locator('.hand').screenshot({ path: path.join(OUT, 'reg-hand-hover.png') });
  } finally {
    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
    console.log(problems.length ? 'Console problems:\n' + problems.join('\n') : 'No console errors or warnings');
    await browser.close();
  }
})();
