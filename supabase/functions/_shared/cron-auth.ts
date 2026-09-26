// Shared gate for edge functions that are meant to run on a schedule (via
// pg_cron + net.http_post) rather than be called by end users. Restricts to
// the cron job itself or an admin/owner triggering a manual run, so nobody
// holding only the public anon key can invoke it directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseServiceClient = any;

export async function assertCronOrAdmin(
  supabase: SupabaseServiceClient,
  req: Request,
  serviceKey: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = req.headers.get("Lovable-Context") === "cron" || authHeader === `Bearer ${serviceKey}`;
  if (isCron) return null;

  const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  const uid = userData?.user?.id;
  let isAdmin = false;
  if (uid) {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "owner");
  }
  if (isAdmin) return null;

  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
