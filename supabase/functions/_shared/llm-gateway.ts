// Single source of truth for calling the LLM. Every generation function
// builds an OpenAI-chat-completions-shaped request (model, messages,
// temperature, max_tokens, response_format, tools/tool_choice, stream) and
// reads an OpenAI-shaped response (choices[0].message.content, tool_calls,
// or an OpenAI-style SSE delta stream) -- that contract predates this file
// and touches 15 functions, so instead of changing every call site this
// layer translates to/from Anthropic's Messages API underneath it. Callers
// are unaware the underlying provider changed.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Every model string already in use across the app, mapped to a Claude tier.
// Two tiers, matching the app's existing creative-vs-structured/cheap split:
// gemini-3-flash-preview and gpt-5-mini were the "reasoning/creative" tier,
// gemini-2.5-flash-lite was the cheap/structured tier. Unknown model strings
// (or ones added later without updating this map) fall back to Sonnet rather
// than silently erroring.
const MODEL_MAP: Record<string, string> = {
  "google/gemini-3-flash-preview": "claude-sonnet-5-5",
  "google/gemini-2.5-flash": "claude-sonnet-5-5",
  "google/gemini-2.5-flash-lite": "claude-haiku-4-5",
  "openai/gpt-5-mini": "claude-sonnet-5-5",
};

function mapModel(model: unknown): string {
  if (typeof model === "string") {
    if (MODEL_MAP[model]) return MODEL_MAP[model];
    // A handful of call sites read a *_MODEL_OVERRIDE env var for this field --
    // let those be pointed directly at a real Claude model id too, not just
    // the legacy Gemini/OpenAI aliases above.
    if (model.startsWith("claude-")) return model;
  }
  return "claude-sonnet-5-5";
}

interface OAIContentPart {
  type: string;
  text?: string;
  image_url?: { url: string };
}
type OAIContent = string | OAIContentPart[];
interface OAIMessage {
  role: string;
  content: OAIContent;
}
interface OAIToolDef {
  type: string;
  function: { name: string; description?: string; parameters?: unknown };
}
interface OAIToolChoice {
  type: string;
  function?: { name: string };
}

// image_url entries carry a data: URI for every current caller (base64
// screenshots/photos, or PDFs -- Gemini accepted PDFs through the same
// image_url field, Anthropic wants a separate `document` block for them).
// A bare remote URL is also handled since nothing rules it out structurally.
function translateContent(content: OAIContent): unknown {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text ?? "" };
    if (part.type === "image_url" && part.image_url?.url) {
      const url = part.image_url.url;
      const dataMatch = /^data:([^;]+);base64,([\s\S]+)$/.exec(url);
      if (dataMatch) {
        const [, mediaType, data] = dataMatch;
        if (mediaType === "application/pdf") {
          return { type: "document", source: { type: "base64", media_type: mediaType, data } };
        }
        return { type: "image", source: { type: "base64", media_type: mediaType, data } };
      }
      return { type: "image", source: { type: "url", url } };
    }
    return { type: "text", text: "" };
  });
}

function translateTools(tools: OAIToolDef[]): unknown[] {
  return tools
    .filter((t) => t.type === "function" && t.function?.name)
    .map((t) => ({
      name: t.function.name,
      description: t.function.description ?? "",
      input_schema: t.function.parameters ?? { type: "object", properties: {} },
    }));
}

function translateToolChoice(choice: OAIToolChoice): unknown {
  if (choice.type === "function" && choice.function?.name) {
    return { type: "tool", name: choice.function.name };
  }
  if (choice.type === "none") return { type: "none" };
  return { type: "auto" };
}

// response_format: json_object callers (generate-ad-script, generate-
// caption-variants, generate-client-report) route through a synthetic tool
// call instead of a text-prompt instruction. Anthropic has no schema-less
// "just give me valid JSON" mode -- a prompt instruction only asks nicely,
// and for long content (ad scripts, report narratives) the model sometimes
// writes a raw control character or an unescaped quote inside a string
// value, which breaks a strict JSON.parse even though the content is fine
// (two real bugs from this). Anthropic DOES guarantee structurally valid
// arguments for a tool call -- its own decoder enforces that, not the
// model's instruction-following -- so a tool call sidesteps the whole bug
// class rather than patching each new way text can be malformed.
//
// The call is NOT forced, though: `tool_choice: {type: "tool"|"any"}` is a
// hard 400 ("... are not supported for this model") on claude-sonnet-5-5 and
// claude-opus-5-5, the only models this gateway ever maps to (confirmed
// against a real ad-script failure -- the first version of this forced the
// call and broke every JSON-mode caller outright). Anthropic's own fix for
// this is `tool_choice: {type: "auto"}` plus an explicit instruction naming
// the tool, so that's what both this and the explicit-tools path below do.
const JSON_MODE_TOOL_NAME = "emit_json";

function forceToolInstruction(toolName: string): string {
  return `You must call the "${toolName}" tool exactly once with your complete response as its input, and write no other text. (Forced tool_choice is not supported by this model, so this instruction is the only enforcement -- follow it exactly.)`;
}

function appendSystem(result: Record<string, unknown>, text: string): void {
  const existing = typeof result.system === "string" ? result.system : "";
  result.system = existing ? `${existing}\n\n${text}` : text;
}

function buildAnthropicBody(body: Record<string, unknown>): Record<string, unknown> {
  const messages = (body.messages as OAIMessage[]) ?? [];
  const systemTexts = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .filter(Boolean);

  const responseFormat = body.response_format as { type?: string } | undefined;
  const hasExplicitTools = Array.isArray(body.tools) && body.tools.length > 0;
  const useJsonModeTool = responseFormat?.type === "json_object" && !hasExplicitTools;

  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: translateContent(m.content),
    }));

  const result: Record<string, unknown> = {
    model: mapModel(body.model),
    // 16000 (not 4096) when a caller doesn't set its own value -- six of the
    // 15 callers never do (ab-test-optimization, generate-ad-script,
    // generate-caption-variants, generate-client-report, research-analysis,
    // research-personalize), and 4096 silently truncated generate-ad-script's
    // output before its "variants" array ever closed: a real run returned a
    // 200 with no error, JSON.parse (or its regex-extraction fallback) found
    // no usable "variants" key, and the caller's empty-result branch has no
    // logging -- so the truncation looked indistinguishable from the model
    // just returning nothing. This matches Anthropic's own current
    // guidance (~16000 default for non-streaming requests).
    max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 16000,
    messages: anthropicMessages,
    // Low effort (rather than the adaptive-thinking default) for every call:
    // these are marketing-copy/structured-JSON generation tasks, not deep
    // multi-step reasoning, so the quality tradeoff is small -- but the
    // latency difference is not. generate-strategy chains up to ~6
    // sequential/parallel calls in one request (grounding, overview
    // candidates with retries, two content batches, a critic pass); at
    // default effort that chain took ~150s end to end and was hitting
    // Supabase's function execution limit outright (an abrupt non-2xx kill,
    // not a clean error response). Low effort keeps every one of the 15
    // callers comfortably inside the window.
    output_config: { effort: "low" },
  };
  if (systemTexts.length) result.system = systemTexts.join("\n\n");
  // Deliberately NOT forwarding `temperature`: claude-sonnet-5-5 (and every
  // model this gateway maps to) runs adaptive thinking by default, and a
  // non-default temperature is rejected with a 400 while thinking is active
  // ("`temperature` is deprecated for this model"). Every one of the 15
  // callers sets some temperature value (0.3-0.75) to steer creativity, so
  // silently dropping it here -- rather than erroring on every request --
  // is the correct default; adaptive thinking doesn't need it tuned.
  if (useJsonModeTool) {
    result.tools = [
      {
        name: JSON_MODE_TOOL_NAME,
        description: "Return the requested output as a single JSON object matching the structure described above.",
        input_schema: { type: "object" },
      },
    ];
    result.tool_choice = { type: "auto" };
    appendSystem(result, forceToolInstruction(JSON_MODE_TOOL_NAME));
  } else if (hasExplicitTools) {
    result.tools = translateTools(body.tools as OAIToolDef[]);
    if (body.tool_choice) {
      const choice = translateToolChoice(body.tool_choice as OAIToolChoice) as { type: string; name?: string };
      if (choice.type === "tool" && choice.name) {
        // Same hard 400 as the json_object path above: Anthropic rejects a
        // forced tool_choice outright on this gateway's models. Downgrade to
        // auto + an explicit instruction naming the tool instead.
        result.tool_choice = { type: "auto" };
        appendSystem(result, forceToolInstruction(choice.name));
      } else {
        result.tool_choice = choice;
      }
    }
  }
  if (body.stream === true) result.stream = true;
  return result;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

// response_format: json_object isn't a hard server-enforced guarantee here
// the way it is on OpenAI -- buildAnthropicBody only turns it into a prompt
// instruction (Anthropic's real structured-output mode needs a JSON schema
// per call, which none of these callers define). For long, multi-line
// content (ad scripts, report narratives) Claude sometimes writes a literal
// newline/tab/CR inside a JSON string value instead of the escaped form,
// which breaks a strict JSON.parse downstream even though the content
// itself is fine. Escape raw control characters that fall *inside* a
// string literal; structural whitespace between tokens is untouched.
function escapeControlCharsInJsonStrings(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
      } else if (ch === "\\") {
        result += ch;
        escaped = true;
      } else if (ch === '"') {
        result += ch;
        inString = false;
      } else if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "\t") {
        result += "\\t";
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') inString = true;
      result += ch;
    }
  }
  return result;
}

// Anthropic's non-streaming response -> the OpenAI chat-completions shape
// every caller already reads (choices[0].message.content /
// choices[0].message.tool_calls[0].function.arguments as a JSON string).
function translateJsonResponse(
  data: {
    content?: AnthropicContentBlock[];
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  },
  isJsonMode: boolean,
): Record<string, unknown> {
  const blocks = data.content ?? [];
  const usage = {
    prompt_tokens: data.usage?.input_tokens,
    completion_tokens: data.usage?.output_tokens,
  };
  const toolUse = blocks.find((b) => b.type === "tool_use");

  // json_object mode was routed through the synthetic emit_json tool call
  // (see buildAnthropicBody) -- its `input` is already a parsed object that
  // Anthropic itself guarantees is structurally valid, so stringifying it
  // can never produce malformed JSON the way free text occasionally can.
  if (isJsonMode && toolUse?.name === JSON_MODE_TOOL_NAME) {
    return {
      choices: [{ message: { role: "assistant", content: JSON.stringify(toolUse.input ?? {}) }, finish_reason: data.stop_reason }],
      usage,
    };
  }

  let text = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  // Fallback path: tool_choice can only be "auto" here (Anthropic rejects a
  // forced choice outright -- see buildAnthropicBody), so an instruction-only
  // nudge to call emit_json isn't a 100% guarantee the way a forced call
  // would be. If the model answers in free text instead, it can still hit
  // the same raw-control-character issue the tool-call routing exists to
  // avoid, so sanitize this path too rather than treating it as unreachable.
  if (isJsonMode) text = escapeControlCharsInJsonStrings(text);

  const message: Record<string, unknown> = { role: "assistant", content: text };
  if (toolUse) {
    message.tool_calls = [
      {
        id: toolUse.id ?? "tool_0",
        type: "function",
        function: { name: toolUse.name, arguments: JSON.stringify(toolUse.input ?? {}) },
      },
    ];
  }

  return {
    choices: [{ message, finish_reason: data.stop_reason }],
    usage,
  };
}

// Anthropic's SSE event stream -> the OpenAI-style `data: {choices:[{delta:
// {content}}]}` chunks the one streaming caller (ai-chat, and its
// ChatArea.tsx frontend reader) already parses, ending in `data: [DONE]`.
function translateStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = source.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let evt: { type?: string; delta?: { type?: string; text?: string } };
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              const chunk = { choices: [{ delta: { content: evt.delta.text ?? "" } }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            } else if (evt.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          }
        }
      } catch (e) {
        controller.error(e);
        return;
      } finally {
        controller.close();
      }
    },
  });
}

export async function callLovableGateway(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const isStream = body.stream === true;
  const isJsonMode = (body.response_format as { type?: string } | undefined)?.type === "json_object";
  const anthropicBody = buildAnthropicBody(body);

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(anthropicBody),
  });

  if (!res.ok) {
    // Preserve the real status (429/etc.) so callers' existing status-code
    // branches still fire; re-wrap the body so `.text()`/`.json()` on it works.
    const errText = await res.text();
    return new Response(errText, { status: res.status, headers: { "Content-Type": "application/json" } });
  }

  if (isStream) {
    return new Response(translateStream(res.body!), {
      status: res.status,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const data = await res.json();
  return new Response(JSON.stringify(translateJsonResponse(data, isJsonMode)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
