import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/jwt";
import { parseJson, logoutSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, logoutSchema);
  if (parsed.error) return parsed.error;
  const { refreshToken } = parsed.data;

  await revokeRefreshToken(refreshToken);
  return NextResponse.json({ success: true });
}
