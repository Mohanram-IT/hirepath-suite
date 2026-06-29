import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendMyHrDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runHrDigest } = await import("./hr-digest-core.server");
    return runHrDigest({ onlyUserId: context.userId });
  });
