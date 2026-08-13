import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const { image, filename } = await request.json();
    if (!image || !filename) {
      return NextResponse.json({ success: false, error: "Missing image or filename" }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Save to the public/nexttalent-logo directory
    const filePath = path.join(process.cwd(), "public", "nexttalent-logo", filename);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, path: `/nexttalent-logo/${filename}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
