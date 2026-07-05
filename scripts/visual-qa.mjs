// Visual QA harness: screenshots the app at seeded states for agent review.
//
// Fixtures: tests/visual/states/*.json, each shaped as
//   { "name": "empty-finances", "state": { ... } | null, "viewport"?: { "width": n, "height": n } }
// A null state loads the app with no URL hash (fresh-visit default).
// State objects are encoded exactly as the app does: base64url(JSON.stringify(state)).
//
// Usage: node scripts/visual-qa.mjs [fixture-name ...]
// Output: .visual-qa/<name>.png

import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const PORT = 4199;
const BASE = `http://localhost:${PORT}`;
const FIXTURES_DIR = new URL('../tests/visual/states/', import.meta.url);
const OUT_DIR = new URL('../.visual-qa/', import.meta.url);

function encodeState(state) {
	return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

async function waitForServer(url, timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(url);
			if (res.ok) return;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(`Dev server did not respond at ${url} within ${timeoutMs}ms`);
}

async function loadFixtures(only) {
	const files = (await readdir(FIXTURES_DIR)).filter((f) => f.endsWith('.json'));
	const fixtures = [];
	for (const file of files) {
		const fixture = JSON.parse(await readFile(new URL(file, FIXTURES_DIR), 'utf8'));
		if (!fixture.name) throw new Error(`${file}: fixture is missing "name"`);
		if (only.length === 0 || only.includes(fixture.name)) fixtures.push(fixture);
	}
	return fixtures;
}

const only = process.argv.slice(2);
const fixtures = await loadFixtures(only);
if (fixtures.length === 0) {
	console.error(only.length ? `No fixtures matched: ${only.join(', ')}` : 'No fixtures found.');
	process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
	stdio: 'ignore',
	detached: false
});
const stopServer = () => {
	if (!server.killed) server.kill('SIGTERM');
};
process.on('exit', stopServer);

try {
	await waitForServer(BASE);
	const browser = await chromium.launch();
	try {
		for (const fixture of fixtures) {
			const page = await browser.newPage({
				viewport: fixture.viewport ?? { width: 1440, height: 900 }
			});
			const url = fixture.state == null ? BASE : `${BASE}/#${encodeState(fixture.state)}`;
			await page.goto(url, { waitUntil: 'networkidle' });
			// Let load animations settle before capturing.
			await page.waitForTimeout(1000);
			const out = new URL(`${fixture.name}.png`, OUT_DIR);
			await page.screenshot({ path: out.pathname, fullPage: true });
			console.log(`✓ ${fixture.name} → .visual-qa/${fixture.name}.png`);
			await page.close();
		}
	} finally {
		await browser.close();
	}
} finally {
	stopServer();
}
