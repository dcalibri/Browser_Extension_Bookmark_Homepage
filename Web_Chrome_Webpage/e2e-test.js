// e2e-test.js — End-to-end test for the MV3 extension
// How to run (PowerShell):
//   cd C:\xampp\htdocs\Web_Chrome_Webpage
//   npm init -y && npm i puppeteer
//   (optional) set "type":"module" in package.json
//   node e2e-test.js

import puppeteer from 'puppeteer';

// Absolute path to your extension root
const pathToExtension = 'C:\\xampp\\htdocs\\Web_Chrome_Webpage';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Launch Chrome with the extension loaded
const browser = await puppeteer.launch({
	headless: false,
	ignoreDefaultArgs: ['--disable-extensions'],
	args: [
		`--disable-extensions-except=${pathToExtension}`,
		`--load-extension=${pathToExtension}`,
	],
});

// Wait for MV3 service worker and get extension id
const swTarget = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'));
const extensionId = new URL(swTarget.url()).host;
const extUrl = (file) => `chrome-extension://${extensionId}/${file}`;
console.log('Extension ID:', extensionId);

// Open a couple of YouTube tabs to the LEFT of the board
const yt1 = await browser.newPage();
await yt1.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
const yt2 = await browser.newPage();
await yt2.goto('https://www.youtube.com/@YouTube', { waitUntil: 'domcontentloaded' });

// Open the board (newtab.html)
const board = await browser.newPage();
board.on('dialog', async d => {
	// Auto-accept alerts/prompts during tests
	if (d.type() === 'prompt') await d.accept('Test Subfolder');
	else await d.accept();
});
await board.goto(extUrl('newtab.html'), { waitUntil: 'domcontentloaded' });

// Seed a folder + bookmark via Bookmarks API in the board context
const folderId = await board.evaluate(async () => {
	const getTree = () => new Promise(r => chrome.bookmarks.getTree(r));
	const create = (opts) => new Promise(r => chrome.bookmarks.create(opts, r));
	const tree = await getTree();
	const bar = tree[0].children.find(c => c.id === '1') || tree[0].children[0];
	const folder = await create({ parentId: bar.id, title: 'E2E Folder' });
	await create({ parentId: folder.id, title: 'Example', url: 'https://example.com' });
	return folder.id;
});

// Wait for the new column to appear
await board.waitForSelector(`.kanban-column[data-folder-id="${folderId}"]`);

// Create a subfolder using the + button
await board.click(`.kanban-column[data-folder-id="${folderId}"] .add-subfolder-btn`);
await board.waitForSelector(`.kanban-column[data-folder-id="${folderId}"] .subfolder-group .subfolder-title`);

// Click the first bookmark and verify a page opens
const [target] = await Promise.all([
	browser.waitForTarget(t => t.type() === 'page' && /https?:\/\/(www\.)?example\.com/.test(t.url())),
	board.click(`.kanban-column[data-folder-id="${folderId}"] .bookmark-item`)
]);
console.log('Bookmark opened:', (await target.page()).url());

// Open popup and toggle settings
const popup = await browser.newPage();
await popup.goto(extUrl('popup.html'), { waitUntil: 'domcontentloaded' });
await popup.select('#theme-selector', 'dark');
await popup.select('#display-mode-selector', 'single');
await popup.click('#refresh-bookmarks');

// Back to board and run YT Clean (close YouTube tabs to the left)
await board.bringToFront();
await board.click('#yt-clean-button');
await sleep(1200);
const ytRemaining = (await browser.pages()).filter(p => p.url().includes('youtube.com')).length;
console.log('YouTube tabs remaining after clean:', ytRemaining);

await sleep(1500);
await browser.close();


