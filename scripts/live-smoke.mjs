import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const outDir = "scripts/screenshots";
mkdirSync(outDir, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

async function shot(name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`screenshot: ${name}`);
}

// Login with real Supabase credentials
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.waitForSelector('button[type="submit"]');
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', "akshits055@gmail.com");
await page.fill('input[type="password"]', "Akshit1103");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin/products", { timeout: 15000 });
await page.waitForTimeout(1000);
await shot("01-products-empty");

// --- Brands: create ---
await page.click('a:has-text("Brands")');
await page.waitForSelector("text=Add brand");
await page.click('button:has-text("Add brand")');
await page.waitForSelector('label:has-text("Brand name")');
await page.fill('label:has-text("Brand name") input', "Smoke Test Brand");
await page.fill('label:has-text("Network") input', "Smoke Network");
await page.click('form button[type="submit"]');
await page.waitForTimeout(2000);
await shot("02b-after-brand-submit");
console.log("page text after submit:", (await page.locator("form").innerText().catch(() => "NO FORM (modal closed)")).slice(0, 300));
await page.waitForSelector("text=Smoke Test Brand", { timeout: 10000 });
await shot("02-brand-created");

// --- Stores: create ---
await page.click('a:has-text("Stores")');
await page.waitForSelector("text=Add store");
await page.click('button:has-text("Add store")');
await page.waitForSelector('label:has-text("Store name")');
await page.fill('label:has-text("Store name") input', "Smoke Test Store");
await page.fill('label:has-text("Slug") input', "smoke-test-store");
await page.fill('label:has-text("Domain") input', "smoketest.example.com");
await page.fill('label:has-text("Campaign") input', "smoke-campaign");
await page.fill('label:has-text("Store ID") input', "ST-SMOKE");
await page.click('form button[type="submit"]');
await page.waitForSelector("text=Smoke Test Store", { timeout: 10000 });
await shot("03-store-created");

// --- Products: Add should now be enabled ---
await page.click('a:has-text("Products")');
await page.waitForSelector('button:has-text("Add product")');
const disabled = await page.locator('button:has-text("Add product")').isDisabled();
console.log("Add product disabled after brand exists:", disabled);

await page.click('button:has-text("Add product")');
await page.waitForSelector('label:has-text("Product name")');
await page.fill('label:has-text("Product name") input', "Smoke Test Sneaker");
await page.fill('label:has-text("Subcategory") input', "Sneakers");
await page.fill('label:has-text("Description") textarea', "A smoke test product.");
await page.fill('label:has-text("Main image URL") input', "https://picsum.photos/seed/smoke/600");

const offerRow = page.locator(".rounded-sm.border.p-3").first();
await offerRow.locator("select").first().selectOption({ label: "smoke-test-store" });
await offerRow.locator('input[placeholder="Price"]').fill("50");
await offerRow.locator('input[placeholder="Original price"]').fill("75");
await offerRow.locator('input[placeholder="Product URL"]').fill("https://smoketest.example.com/product");

await page.click('form button[type="submit"]');
await page.waitForSelector("text=Smoke Test Sneaker", { timeout: 10000 });
await shot("04-product-created");

// --- Deals: create ---
await page.click('a:has-text("Deals")');
await page.waitForSelector('button:has-text("+ Add deal")');
await page.click('button:has-text("+ Add deal")');
await page.waitForSelector('label:has-text("Deal title")');
await page.fill('label:has-text("Deal title") input', "Smoke Test Deal");
await page.fill('label:has-text("Product name") input', "Smoke Test Sneaker");
await page.fill('label:has-text("Subcategory (optional)") input', "Sneakers");
await page.fill('label:has-text("Price") input', "40");
await page.fill('label:has-text("Original price") input', "80");
await page.fill('label:has-text("Description") textarea', "Smoke test deal description.");
await page.fill('label:has-text("Image URL") input', "https://picsum.photos/seed/smoke-deal/600");
await page.fill('label:has-text("Merchant URL") input', "https://smoketest.example.com/deal");
await page.fill('label:has-text("Campaign") input', "smoke-campaign");
await page.fill('label:has-text("Sub-ID") input', "web_smoke");
await page.fill('label:has-text("Tracking ID") input', "TRK-SMOKE-1");
await page.click('form button[type="submit"]');
await page.waitForSelector("text=Smoke Test Sneaker", { timeout: 10000 });
await shot("05-deal-created");

// pause / expire / delete deal
const dealRow = page.locator("tr", { hasText: "Smoke Test Sneaker" });
await dealRow.locator('button:has-text("Pause")').click();
await page.waitForTimeout(500);
await shot("06-deal-paused");
await dealRow.locator('button:has-text("Delete")').click();
await page.waitForSelector('[role="alertdialog"]');
await page.click('[role="alertdialog"] button:has-text("Delete")');
await page.waitForSelector("text=Smoke Test Sneaker >> nth=0", { state: "detached", timeout: 10000 }).catch(() => {});
await shot("07-deal-deleted");

// --- Sales: create + delete ---
await page.click('a:has-text("Sales")');
await page.waitForSelector('button:has-text("+ Add sale")');
await page.click('button:has-text("+ Add sale")');
await page.waitForSelector('label:has-text("Title")');
await page.fill('label:has-text("Title") input', "Smoke Test Sale");
await page.fill('label:has-text("Discount label") input', "50% off");
await page.fill('label:has-text("Detail") textarea', "Smoke test sale detail.");
await page.click('form button[type="submit"]');
await page.waitForSelector("text=Smoke Test Sale", { timeout: 10000 });
await shot("08-sale-created");

const saleCard = page.locator(".rounded-lg.border.bg-card.p-5", { hasText: "Smoke Test Sale" });
await saleCard.locator('button:has-text("Delete")').click();
await page.waitForSelector('[role="alertdialog"]');
await page.click('[role="alertdialog"] button:has-text("Delete")');
await page.waitForSelector("text=Smoke Test Sale", { state: "detached", timeout: 10000 }).catch(() => {});
await shot("09-sale-deleted");

// --- Networks / Analytics sanity ---
await page.click('a:has-text("Analytics")');
await page.waitForSelector("text=Top brands by clicks");
await shot("10-analytics");
await page.click('a:has-text("Networks")');
await page.waitForSelector("text=Affiliate network");
await shot("11-networks");

// --- Cleanup: delete the test product and store and brand ---
await page.click('a:has-text("Products")');
const prodRow = page.locator("tr", { hasText: "Smoke Test Sneaker" });
await prodRow.locator('button[aria-label^="Delete"]').click();
await page.waitForSelector('[role="alertdialog"]');
await page.click('[role="alertdialog"] button:has-text("Delete")');
await page.waitForSelector("text=Smoke Test Sneaker", { state: "detached", timeout: 10000 }).catch(() => {});
await shot("12-product-deleted");

await page.click('a:has-text("Stores")');
const storeRow = page.locator("tr", { hasText: "Smoke Test Store" });
await storeRow.locator('button[aria-label^="Delete"]').click();
await page.waitForSelector('[role="alertdialog"]');
await page.click('[role="alertdialog"] button:has-text("Delete")');
await page.waitForSelector("text=Smoke Test Store", { state: "detached", timeout: 10000 }).catch(() => {});

await page.click('a:has-text("Brands")');
const brandRow = page.locator("tr", { hasText: "Smoke Test Brand" });
await brandRow.locator('button[aria-label^="Delete"]').click();
await page.waitForSelector('[role="alertdialog"]');
await page.click('[role="alertdialog"] button:has-text("Delete")');
await page.waitForSelector("text=Smoke Test Brand", { state: "detached", timeout: 10000 }).catch(() => {});
await shot("13-cleanup-done");

await browser.close();
console.log("\n--- console/page errors ---");
console.log(errors.length ? errors.join("\n") : "none");
