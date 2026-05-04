import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { MAX_PHOTOS } from "@/lib/profile";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function extFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".bin";
  }
}

export const POST = withAuth(async (req, payload) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_SIZE_BYTES / 1024 / 1024} MB limit` },
      { status: 400 }
    );
  }

  // Enforce max photos per user atomically-ish (tx for read+write)
  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.userPhoto.count({ where: { userId: payload.sub } });
    if (count >= MAX_PHOTOS) {
      return { tooMany: true as const };
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomBytes(16).toString("hex")}${extFor(file.type)}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buf);

    const url = `/uploads/${filename}`;
    const photo = await tx.userPhoto.create({
      data: { userId: payload.sub, url, position: count },
    });
    return { tooMany: false as const, photo };
  });

  if (result.tooMany) {
    return NextResponse.json(
      { error: `You can upload at most ${MAX_PHOTOS} photos` },
      { status: 400 }
    );
  }

  return NextResponse.json({ photo: result.photo }, { status: 201 });
});
