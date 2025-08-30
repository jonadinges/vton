import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const base = path.join(process.cwd(), "public", "bogotto");
  if (!fs.existsSync(base)) return NextResponse.json({ products: [] });
  const ids = fs.readdirSync(base).filter((d) => fs.statSync(path.join(base, d)).isDirectory());
  const products = ids.map((id) => {
    const metaPath = path.join(base, id, "meta.json");
    let meta: any = { id, title: id, url: "", priceText: "", images: [] };
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    return meta;
  });
  return NextResponse.json({ products });
}


