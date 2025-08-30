import fs from "node:fs";
import fsp from "node:fs/promises";
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

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return res.text();
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function download(url, outPath) {
  const absolute = url.startsWith("//") ? `https:${url}` : url;
  const res = await fetch(absolute);
  if (!res.ok) throw new Error(`Download failed ${absolute} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(outPath, buf);
}

async function run() {
  const baseDir = path.join(process.cwd(), "public", "bogotto");
  await ensureDir(baseDir);

  for (const p of PRODUCTS) {
    const html = await fetchHtml(p.url);
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim() || p.id;
    const priceText = $("[class*='price'], .price, .product__price").first().text().trim();

    const imgSet = new Set();
    const normalize = (u) => {
      let abs = u.startsWith("//") ? `https:${u}` : u;
      abs = abs.replace(/_%7Bwidth%7Dx/gi, "");
      abs = abs.replace(/_\{width\}x/gi, "");
      return abs;
    };
    // From <img src/srcset>
    $("img").each((_, el) => {
      const src = $(el).attribs?.src || $(el).attribs?.["data-src"] || $(el).attribs?.["data-original"]; 
      if (src) {
        const abs = normalize(new URL(src, p.url).toString());
        if (/cdn\/shop\/products\/.+\.(jpg|jpeg|png|webp)/i.test(abs)) imgSet.add(abs);
      }
      const srcset = $(el).attr("srcset");
      if (srcset) {
        const parts = srcset.split(",").map((s) => s.trim().split(" ")[0]);
        for (const part of parts) {
          if (!part) continue;
          const abs2 = normalize(new URL(part, p.url).toString());
          if (/cdn\/shop\/products\/.+\.(jpg|jpeg|png|webp)/i.test(abs2)) imgSet.add(abs2);
        }
      }
    });
    // From inline scripts (JSON blobs)
    $("script").each((_, el) => {
      const t = $(el).html() || "";
      const re = /(https?:)?\/\/[^"'\s]+cdn\/shop\/products\/[^"'\s]+\.(?:jpg|jpeg|png|webp)(?:\?v=\d+)?/gi;
      for (const m of t.matchAll(re)) {
        imgSet.add(normalize(m[0].startsWith("//") ? `https:${m[0]}` : m[0]));
      }
    });

    const dir = path.join(baseDir, p.id);
    await ensureDir(dir);
    const images = [];
    let idx = 1;
    for (const src of imgSet) {
      const urlObj = new URL(src);
      const ext = path.extname(urlObj.pathname) || ".jpg";
      const filename = `${String(idx).padStart(2, "0")}${ext}`;
      const out = path.join(dir, filename);
      try {
        await download(src, out);
      } catch {
        // Fallback: remove dimension suffix like _1065x
        const fallback = src.replace(/_(\d+)x(\.(?:jpg|jpeg|png|webp))/i, "$2");
        await download(fallback, out);
      }
      images.push(`/bogotto/${p.id}/${filename}`);
      idx += 1;
      if (idx > 12) break;
    }

    const meta = { id: p.id, title, url: p.url, priceText, images };
    await fsp.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
    console.log(`Saved ${p.id}: ${images.length} images`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


