import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: "Provide ?url" }, { status: 400 });
    }

    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) return NextResponse.json({ error: `Fetch failed ${res.status}` }, { status: 400 });
    const html = await res.text();
    const $ = cheerio.load(html);

    const images = new Set<string>();
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
      if (!src) return;
      const abs = new URL(src, url).toString();
      if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(abs)) images.add(abs);
    });

    return NextResponse.json({ images: Array.from(images).slice(0, 48) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}


