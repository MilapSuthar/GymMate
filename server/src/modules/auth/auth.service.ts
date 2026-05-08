import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { RegisterInput, LoginInput, GoogleOAuthInput } from "./auth.schemas";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function signAccessToken(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

function signRefreshToken() {
  return uuidv4();
}

async function storeRefreshToken(userId: string, rawToken: string) {
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return rawToken;
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("Email already in use");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, displayName: input.displayName },
  });

  const accessToken = signAccessToken(user.id, user.role);
  const rawRefresh = signRefreshToken();
  await storeRefreshToken(user.id, rawRefresh);

  return { accessToken, refreshToken: rawRefresh, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash) throw new UnauthorizedError("Invalid credentials");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid credentials");

  const accessToken = signAccessToken(user.id, user.role);
  const rawRefresh = signRefreshToken();
  await storeRefreshToken(user.id, rawRefresh);

  return { accessToken, refreshToken: rawRefresh, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } };
}

export async function refresh(rawToken: string) {
  const tokens = await prisma.refreshToken.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  for (const token of tokens) {
    const match = await bcrypt.compare(rawToken, token.tokenHash);
    if (match) {
      await prisma.refreshToken.delete({ where: { id: token.id } });
      const newAccess = signAccessToken(token.user.id, token.user.role);
      const newRawRefresh = signRefreshToken();
      await storeRefreshToken(token.user.id, newRawRefresh);
      return { accessToken: newAccess, refreshToken: newRawRefresh };
    }
  }

  throw new UnauthorizedError("Invalid or expired refresh token");
}

export async function logout(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function googleOAuth(input: GoogleOAuthInput) {
  if (!env.GOOGLE_CLIENT_ID) throw new UnauthorizedError("Google auth not configured");

  const ticket = await googleClient.verifyIdToken({
    idToken: input.idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new UnauthorizedError("Invalid Google token");

  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        displayName: payload.name ?? payload.email.split("@")[0],
        avatarUrl: payload.picture ?? null,
        isVerified: true,
      },
    });
  }

  const accessToken = signAccessToken(user.id, user.role);
  const rawRefresh = signRefreshToken();
  await storeRefreshToken(user.id, rawRefresh);

  return { accessToken, refreshToken: rawRefresh, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } };
}
