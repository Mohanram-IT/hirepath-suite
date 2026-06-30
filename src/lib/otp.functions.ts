import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(120).optional(),
  signupAs: z.enum(["candidate", "recruiter"]).optional(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

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
