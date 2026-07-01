import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(120).optional(),
  signupAs: z.enum(["candidate", "recruiter"]).optional(),
  purpose: z.enum(["signup", "reverify"]).optional(),
  password: z.string().min(8).max(128).optional(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

const reverifyCheckSchema = z.object({ email: z.string().email() });

export const requestEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { requestOtp } = await import("./otp-core.server");
    return requestOtp(data);
  });

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { verifyOtp } = await import("./otp-core.server");
    return verifyOtp(data);
  });

export const checkNeedsReverify = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reverifyCheckSchema.parse(d))
  .handler(async ({ data }) => {
    const { needsReverify } = await import("./otp-core.server");
    return { needsReverify: await needsReverify(data.email) };
  });
