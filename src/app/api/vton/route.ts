import { NextResponse } from "next/server";
import { env } from "~/env";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await request.formData();
    const person = form.get("person") as File | null;
    const productUrl = form.get("productUrl") as string | null;

    if (!person || !productUrl) {
      return NextResponse.json({ error: "Missing person image or productUrl" }, { status: 400 });
    }

    // Support local files or remote URLs
    let productArrayBuffer: ArrayBuffer;
    let productMime = "image/jpeg";
    if (productUrl.startsWith("/")) {
      const filePath = new URL("../../../../public" + productUrl, import.meta.url).pathname;
      const data = await (await import("node:fs/promises")).readFile(filePath);
      productArrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const ext = productUrl.toLowerCase();
      if (ext.endsWith(".png")) productMime = "image/png";
      if (ext.endsWith(".webp")) productMime = "image/webp";
    } else {
      const productRes = await fetch(productUrl);
      if (!productRes.ok) {
        return NextResponse.json({ error: `Failed to fetch product image: ${productRes.status}` }, { status: 400 });
      }
      productArrayBuffer = await productRes.arrayBuffer();
      productMime = productRes.headers.get("content-type") || productMime;
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const prompt =
      "Compose a realistic virtual try-on: put the garment from the second image onto the person in the first image. " +
      "Maintain natural body shape, lighting, and pose. Seamlessly align edges, avoid artifacts, and keep background intact. " +
      "Return only the final composited photo.";

    const personArrayBuffer = await person.arrayBuffer();

    // Downscale both images to reduce tokenization, limit to 1024px
    const downscale = async (buf: ArrayBuffer, fallbackType: string) => {
      const input = Buffer.from(buf);
      const resized = await sharp(input).resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 90 }).toBuffer();
      return {
        mimeType: fallbackType,
        data: resized.toString("base64"),
      } as const;
    };

    const personInline = await downscale(personArrayBuffer, person.type || "image/jpeg");
    const productInline = await downscale(productArrayBuffer, productMime || "image/jpeg");

    const doGenerate = async () =>
      ai.models.generateContent({
        model: env.GEMINI_IMAGE_MODEL,
        contents: [
          { text: prompt },
          { inlineData: personInline },
          { inlineData: productInline },
        ],
      });

    let response = await doGenerate();
    const error = (response as any)?.error as any | undefined;
    if (error?.code === 429) {
      // Respect server-advised retry delay if present
      const retryInfo = error?.details?.find((d: any) => d?.["@type"]?.includes("RetryInfo"));
      const delay = retryInfo?.retryDelay ? parseInt(retryInfo.retryDelay) * 1000 : 20000;
      await new Promise((r) => setTimeout(r, isNaN(delay) ? 20000 : delay));
      response = await doGenerate();
    }

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData);
    const base64 = imagePart?.inlineData?.data as string | undefined;
    if (!base64) {
      const text = parts.map((p: any) => p.text).filter(Boolean).join(" ") || "No image returned";
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const bytes = Buffer.from(base64, "base64");
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}


