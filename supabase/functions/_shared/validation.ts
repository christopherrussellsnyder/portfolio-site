// Lightweight validation helpers. Uses Zod when a schema is passed, but also
// exposes tiny primitives so functions can adopt validation incrementally
// without changing their existing request/response shape.

import { z, ZodError, ZodSchema } from "npm:zod@3.23.8";
import { jsonResponse } from "./cors.ts";

export { z };

export async function parseJsonBody<T>(req: Request, schema: ZodSchema<T>): Promise<
  { ok: true; data: T } | { ok: false; response: Response }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: jsonResponse({ error: "Invalid JSON body" }, 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "Validation failed", details: (parsed.error as ZodError).flatten().fieldErrors },
        400,
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

// Common reusable primitives.
export const NonEmptyString = z.string().trim().min(1).max(10_000);
export const UUID = z.string().uuid();
export const ShortText = z.string().trim().max(500);
export const LongText = z.string().trim().max(20_000);
