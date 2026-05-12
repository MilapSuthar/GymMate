import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { MAX_PHOTOS } from "@/lib/profile";
import {
  uploadFile,
  generateKey,
  ALLOWED_IMAGE_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  StorageValidationError,
} from "@/lib/storage";

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

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Allowed: jpg, jpeg, png, webp` },
      { status: 400 }
    );
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024} MB limit` },
      { status: 400 }
    );
  }

  const count = await prisma.userPhoto.count({ where: { userId: payload.sub } });
  if (count >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `You can upload at most ${MAX_PHOTOS} photos` },
      { status: 400 }
    );
  }

  let uploaded;
  try {
    const key = generateKey(`users/${payload.sub}/photos`, file.type);
    uploaded = await uploadFile(file, key);
  } catch (err) {
    if (err instanceof StorageValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("R2 upload failed", err);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 502 }
    );
  }

  const photo = await prisma.userPhoto.create({
    data: { userId: payload.sub, url: uploaded.url, position: count },
  });

  return NextResponse.json({ photo }, { status: 201 });
});
