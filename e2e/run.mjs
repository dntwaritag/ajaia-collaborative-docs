// Browser end-to-end check. Usage: BASE_URL=http://localhost:3000 CHROME_PATH=/usr/bin/google-chrome node e2e/run.mjs
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = "AjaiaDemo#2025";
const SHOTS = "docs/screenshots";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let step = 0;
const ok = (m) => console.log(`✔ ${++step}. ${m}`);

async function newUser(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button:has-text('Sign in')");
  await page.waitForURL(`${BASE}/`);
  return { ctx, page };
}
const saved = (page) => page.waitForFunction(() => document.querySelector("[data-testid=save-status]")?.textContent === "Saved", null, { timeout: 15000 });

// 1. Wrong password shows an error
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill("#email", "denys@example.com");
  await p.fill("#password", "nope");
  await p.click("button:has-text('Sign in')");
  await p.waitForSelector("[role=alert]:has-text('Incorrect email or password')");
  await p.screenshot({ path: `${SHOTS}/01-login.png` });
  await ctx.close();
  ok("login rejects a wrong password with a friendly message");
}

// 2. Denys creates and formats a document
const denys = await newUser("denys@example.com");
let p = denys.page;
await p.screenshot({ path: `${SHOTS}/02-dashboard.png` });
await p.click("button:has-text('New document')");
await p.waitForURL(/\/docs\//);
const docUrl = p.url();
const title = `E2E Plan ${Date.now()}`;
await p.fill("[aria-label='Document title']", title);
await p.press("[aria-label='Document title']", "Enter");
await saved(p);
ok("created a document and renamed it");

const ed = p.locator("[data-testid=editor]");
await ed.click();
await p.selectOption("[aria-label='Text style']", "1");
await p.keyboard.type("Quarterly Plan");
await p.keyboard.press("Enter");
await p.selectOption("[aria-label='Text style']", "0");
await p.keyboard.press("Control+b"); await p.keyboard.type("Bold text"); await p.keyboard.press("Control+b");
await p.keyboard.type(" ");
await p.keyboard.press("Control+i"); await p.keyboard.type("italic text"); await p.keyboard.press("Control+i");
await p.keyboard.type(" ");
await p.click("[aria-label='Underline']"); await p.keyboard.type("underlined"); await p.click("[aria-label='Underline']");
await p.keyboard.press("Enter");
await p.click("[aria-label='Bulleted list']"); await p.keyboard.type("first bullet"); await p.keyboard.press("Enter"); await p.keyboard.type("second bullet"); await p.keyboard.press("Enter"); await p.keyboard.press("Enter");
await p.click("[aria-label='Numbered list']"); await p.keyboard.type("step one"); await p.keyboard.press("Enter"); await p.keyboard.type("step two");
await saved(p);
await p.screenshot({ path: `${SHOTS}/03-editor.png` });
ok("typed text with H1, bold, italic, underline, bulleted and numbered lists; autosave shows 'Saved'");

await p.reload();
await p.waitForSelector("[data-testid=editor] h1");
const html = await p.locator("[data-testid=editor]").innerHTML();
for (const tag of ["<h1", "<strong>", "<em>", "<u>", "<ul>", "<ol>"]) assert.ok(html.includes(tag), `missing ${tag} after reload`);
assert.equal(await p.inputValue("[aria-label='Document title']"), title);
ok("formatting and title survive a browser refresh");

// 3. Share with Sarah (Editor)
await p.click("button:has-text('Share')");
await p.fill("[aria-label='Email to share with']", "not-an-email");
await p.click("[role=dialog] button:has-text('Share')");
// native validation blocks it; now try an unknown but well-formed address
await p.fill("[aria-label='Email to share with']", "nobody@example.com");
await p.click("[role=dialog] button:has-text('Share')");
await p.waitForSelector("[role=dialog] [role=alert]:has-text('No user with that email')");
ok("sharing with an unknown email shows an error");
await p.fill("[aria-label='Email to share with']", "sarah@example.com");
await p.click("[role=dialog] button:has-text('Share')");
await p.waitForSelector("[data-testid=access-list]:has-text('sarah@example.com')");
await p.screenshot({ path: `${SHOTS}/04-share.png` });
ok("granted Sarah edit access; she appears in the access list");
await p.keyboard.press("Escape");

// 4. Sarah sees it under Shared With Me and edits
const sarah = await newUser("sarah@example.com");
const sp = sarah.page;
await sp.click("nav >> text=Shared With Me");
await sp.waitForSelector(`[data-testid=doc-row]:has-text('${title}')`);
const row = await sp.locator(`[data-testid=doc-row]:has-text('${title}')`).innerText();
assert.ok(/Shared by Denys/.test(row) && /Can edit/.test(row));
await sp.screenshot({ path: `${SHOTS}/05-shared-with-me.png` });
ok("Sarah sees the document in Shared With Me with a 'Shared by Denys · Can edit' badge");
await sp.click(`text=${title}`);
await sp.waitForSelector("[data-testid=editor]");
assert.equal(await sp.locator("button:has-text('Share')").count(), 0, "editor must not see Share button");
await sp.locator("[data-testid=editor]").click();
await sp.keyboard.press("Control+End");
await sp.keyboard.press("Enter");
await sp.keyboard.type("Edited by Sarah");
await saved(sp);
ok("Sarah edited the shared document; no Share button for non-owners");
await sarah.ctx.close();

// 5. Denys sees Sarah's edit persisted
await p.reload();
await p.waitForSelector("[data-testid=editor]:has-text('Edited by Sarah')");
ok("Sarah's change is visible to Denys after refresh");

// 6. Alex cannot access it
const alex = await newUser("alex@example.com");
await alex.page.goto(docUrl);
await alex.page.waitForSelector("text=Document not found");
await alex.page.screenshot({ path: `${SHOTS}/06-no-access.png` });
const apiRes = await alex.page.evaluate(async (u) => (await fetch(`/api/documents/${u.split("/").pop()}`)).status, docUrl);
assert.equal(apiRes, 404);
await alex.ctx.close();
ok("Alex (no access) is blocked in the UI and by the API (404)");

// 7. Import .md and an unsupported file
writeFileSync("/tmp/e2e-import.md", "# Imported Heading\n\nHello **world**\n\n- a\n- b\n");
writeFileSync("/tmp/e2e-bad.exe", "MZ");
await p.goto(`${BASE}/`);
await p.setInputFiles("input[type=file]", "/tmp/e2e-bad.exe");
await p.waitForSelector("text=Unsupported file type");
ok("importing an unsupported file shows a clear error");
await p.setInputFiles("input[type=file]", "/tmp/e2e-import.md");
await p.waitForURL(/\/docs\//);
await p.waitForSelector("[data-testid=editor] h1:has-text('Imported Heading')");
assert.ok((await p.locator("[data-testid=editor] strong").innerText()) === "world");
await p.screenshot({ path: `${SHOTS}/07-imported.png` });
await p.locator("[data-testid=editor]").click();
await p.keyboard.press("Control+End"); await p.keyboard.type(" (edited)");
await saved(p);
await p.reload();
await p.waitForSelector("[data-testid=editor]:has-text('(edited)')");
ok("imported .md became an editable document, saved and reopened");

// 8. Revoke Sarah, then confirm she lost access
await p.goto(docUrl);
await p.click("button:has-text('Share')");
await p.click("[data-testid=access-list] button:has-text('Revoke')");
await p.waitForSelector("text=Not shared with anyone yet");
const sarah2 = await newUser("sarah@example.com");
await sarah2.page.goto(docUrl);
await sarah2.page.waitForSelector("text=Document not found");
await sarah2.ctx.close();
ok("revoking access immediately blocks Sarah");

// 9. Delete with confirmation
await p.goto(`${BASE}/`);
await p.click(`[aria-label='Delete ${title}']`);
await p.waitForSelector("[role=dialog]:has-text('cannot be undone')");
await p.screenshot({ path: `${SHOTS}/08-delete-confirm.png` });
await p.click("[role=dialog] button:has-text('Cancel')");
assert.equal(await p.locator(`text=${title}`).count(), 1);
await p.click(`[aria-label='Delete ${title}']`);
await p.click("[role=dialog] button:has-text('Delete')");
await p.waitForFunction((t) => !document.body.innerText.includes(t), title);
ok("delete asks for confirmation; cancel keeps it, confirm removes it");

// 10. Mobile layout sanity
const m = await browser.newContext({ viewport: { width: 390, height: 800 } });
const mp = await m.newPage();
await mp.goto(`${BASE}/login`); await mp.fill("#email", "denys@example.com"); await mp.fill("#password", PASSWORD); await mp.click("button:has-text('Sign in')");
await mp.waitForURL(`${BASE}/`);
await mp.screenshot({ path: `${SHOTS}/09-mobile.png` });
assert.ok(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no horizontal overflow on mobile");
ok("mobile layout has no horizontal overflow");

await browser.close();
console.log(`\nAll ${step} browser checks passed.`);
