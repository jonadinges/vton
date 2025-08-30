#!/usr/bin/env ts-node
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const PRODUCTS = [
  {
    id: "blaze-air",
    url: "https://bogotto.eu/de/collections/jacken/products/bogotto-blaze-air-motorcycle-textile-jacket",
  },
  {
    id: "covelo",
    url: "https://bogotto.eu/de/collections/jacken/products/bogotto-covelo-waterproof-motorcycle-textile-jacket",
  },
  {
    id: "tampar-tour",
    url: "https://bogotto.eu/de/collections/jacken/products/bogotto-tampar-tour-waterproof-motorcycle-textile-jacket",
  },
  {
    id: "tek-m-ladies",
    url: "https://bogotto.eu/de/products/bogotto-tek-m-waterproof-ladies-motorcycle-leather-textile-jacket",
  },
];

async function fetchHtml(url: string) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return res.text();
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function download(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

async function run() {
  const baseDir = path.join(process.cwd(), "public", "bogotto");
  ensureDir(baseDir);

  for (const p of PRODUCTS) {
    const html = await fetchHtml(p.url);
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim() || p.id;
    const priceText = $("[class*='price'], .price, .product__price").first().text().trim();

    const imgSet = new Set<string>();
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
      if (!src) return;
      const abs = new URL(src, p.url).toString();
      if (/cdn\/shop\/products\/.+\.(jpg|jpeg|png|webp)/i.test(abs)) imgSet.add(abs);
    });

    const dir = path.join(baseDir, p.id);
    ensureDir(dir);
    const images: string[] = [];
    let idx = 1;
    for (const src of imgSet) {
      const ext = path.extname(new URL(src).pathname) || ".jpg";
      const filename = `${String(idx).padStart(2, "0")}${ext}`;
      const out = path.join(dir, filename);
      await download(src.startsWith("//") ? `https:${src}` : src, out);
      images.push(`/bogotto/${p.id}/${filename}`);
      idx += 1;
      if (idx > 12) break; // keep top 12
    }

    const meta = { id: p.id, title, url: p.url, priceText, images };
    fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
    console.log(`Saved ${p.id}: ${images.length} images`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


