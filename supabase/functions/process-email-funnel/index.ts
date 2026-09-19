import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Funnel cadence: Day 0, Day 2, Day 4, Day 7, Day 10
const STEP_DELAYS_HOURS = [0, 48, 96, 168, 240]
const STEP_TEMPLATES = [
  'funnel-step-1-welcome',
  'funnel-step-2-features',
  'funnel-step-3-tutorial',
  'funnel-step-4-social-proof',
  'funnel-step-5-upgrade',
]
const TOTAL_STEPS = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // Find subscribers due for their next email
    const { data: due, error } = await supabase
      .from('email_subscribers')
      .select('id, user_id, email, full_name, current_step')
      .eq('status', 'active')
      .lte('next_send_at', new Date().toISOString())
      .lt('current_step', TOTAL_STEPS)
      .limit(50)

    if (error) throw error

    let sent = 0
    for (const sub of due ?? []) {
      const stepIndex = sub.current_step // 0..4 -> next template to send
      const templateName = STEP_TEMPLATES[stepIndex]
      if (!templateName) continue

      // Send via the existing transactional pipeline
      const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName,
          recipientEmail: sub.email,
          idempotencyKey: `funnel-${sub.id}-step-${stepIndex + 1}`,
          templateData: { name: sub.full_name?.split(' ')[0] ?? null },
        },
      })

      if (sendErr) {
        console.error('Funnel send failed', { subscriberId: sub.id, step: stepIndex + 1, error: sendErr })
        continue
      }

      // Log + advance
      await supabase.from('funnel_email_log').insert({
        subscriber_id: sub.id,
        user_id: sub.user_id,
        step: stepIndex + 1,
      })

      const newStep = stepIndex + 1
      const isComplete = newStep >= TOTAL_STEPS
      const nextDelayHours = isComplete ? null : STEP_DELAYS_HOURS[newStep]
      const nextSendAt = nextDelayHours == null
        ? null
        : new Date(Date.now() + nextDelayHours * 3600_000).toISOString()

      await supabase
        .from('email_subscribers')
        .update({
          current_step: newStep,
          next_send_at: nextSendAt,
          status: isComplete ? 'completed' : 'active',
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('id', sub.id)

      sent++
    }

    return new Response(JSON.stringify({ ok: true, processed: due?.length ?? 0, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('process-email-funnel error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
