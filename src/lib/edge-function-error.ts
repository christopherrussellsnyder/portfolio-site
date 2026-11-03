/**
 * supabase.functions.invoke() surfaces a non-2xx response as a generic
 * FunctionsHttpError ("Edge Function returned a non-2xx status code") and
 * discards the JSON body the function actually sent. This re-reads that
 * body (attached as error.context, a Response) to recover the real message.
 */
export const getFunctionErrorMessage = async (error: any, fallback: string) => {
  const context = error?.context;
  if (context && typeof context.json === 'function') {
    try {
      const payload = await context.clone().json();
      return payload?.error || payload?.message || fallback;
    } catch (_) {
      // Fall through to the SDK message below.
    }
  }
  return error?.message || fallback;
};
