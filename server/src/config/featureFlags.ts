import { env } from "./env";

export const featureFlags = {
  appleAuth: env.FEATURE_APPLE_AUTH,
  otp: env.FEATURE_OTP,
};
