import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { s3 } from "../../config/s3";
import { env } from "../../config/env";
import { prisma } from "../../config/db";
import { BadRequestError, NotFoundError } from "../../lib/errors";

const MAX_PHOTOS = 6;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPhoto(userId: string, file: Express.Multer.File) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new BadRequestError("Only JPEG, PNG and WebP images are allowed");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { photos: true } });
  if (!user) throw new NotFoundError("User not found");
  if (user.photos.length >= MAX_PHOTOS) throw new BadRequestError(`Maximum ${MAX_PHOTOS} photos allowed`);

  const key = `photos/${userId}/${uuidv4()}-${file.originalname}`;
  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  const url = `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
  const photos = [...user.photos, url];
  await prisma.user.update({ where: { id: userId }, data: { photos, avatarUrl: photos[0] } });

  return { url, photos };
}

export async function getPresignedUploadUrl(userId: string, filename: string, contentType: string) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new BadRequestError("Only JPEG, PNG and WebP images are allowed");
  }

  const key = `photos/${userId}/${uuidv4()}-${filename}`;
  const command = new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });

  return { uploadUrl: url, key };
}
