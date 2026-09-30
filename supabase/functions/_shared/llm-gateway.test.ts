import { afterEach, describe, expect, it, vi } from 'vitest';
import { callLovableGateway } from './llm-gateway';

function anthropicResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe('callLovableGateway', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the Anthropic Messages API with the right auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      anthropicResponse({ content: [{ type: 'text', text: 'hi there' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 3 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('test-key', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe('test-key');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('maps known model aliases to a Claude model and extracts the system message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse({ content: [{ type: 'text', text: 'ok' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You are terse.' },
        { role: 'user', content: 'hi' },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.model).toBe('claude-sonnet-5-5');
    expect(body.system).toBe('You are terse.');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.max_tokens).toBe(500);
  });

  it('never forwards temperature -- claude-sonnet-5-5 rejects a non-default value while adaptive thinking is on', async () => {
    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse({ content: [{ type: 'text', text: 'ok' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', {
      model: 'google/gemini-3-flash-preview',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.7,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).not.toHaveProperty('temperature');
  });

  it('always requests low effort to keep multi-call chains (e.g. generate-strategy) inside the function timeout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse({ content: [{ type: 'text', text: 'ok' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', { model: 'google/gemini-3-flash-preview', messages: [{ role: 'user', content: 'hi' }] });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.output_config).toEqual({ effort: 'low' });
  });

  it('falls back to claude-haiku-4-5 for the cheap-tier alias and claude-sonnet-5-5 for an unknown model', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(anthropicResponse({ content: [{ type: 'text', text: 'ok' }] })));
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', { model: 'google/gemini-2.5-flash-lite', messages: [] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-haiku-4-5');

    await callLovableGateway('k', { model: 'some-unmapped-model', messages: [] });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe('claude-sonnet-5-5');
  });

  it('routes a JSON-mode request through an auto-choice emit_json tool call (forced tool_choice 400s on this gateway\'s models) and returns its input as choices[0].message.content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      anthropicResponse({
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'emit_json', input: { a: 1 } }],
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 4 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'give me json' }],
      response_format: { type: 'json_object' },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.tools).toEqual([
      {
        name: 'emit_json',
        description: 'Return the requested output as a single JSON object matching the structure described above.',
        input_schema: { type: 'object' },
      },
    ]);
    // NOT { type: 'tool', name: 'emit_json' } -- claude-sonnet-5-5 and
    // claude-opus-5-5 both reject a forced tool_choice with a 400, so this
    // has to stay "auto" with the tool steered from a system instruction.
    expect(sentBody.tool_choice).toEqual({ type: 'auto' });
    expect(sentBody.system).toContain('You must call the "emit_json" tool');

    const data = await result.json();
    expect(data.choices[0].message.content).toBe('{"a":1}');
    expect(data.usage.prompt_tokens).toBe(10);
    expect(data.usage.completion_tokens).toBe(4);
  });

  it('does not route json_object mode through the emit_json tool when the caller already passed explicit tools', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      anthropicResponse({ content: [{ type: 'tool_use', id: 'toolu_1', name: 'provide_recommendations', input: { x: 1 } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'go' }],
      response_format: { type: 'json_object' },
      tools: [{ type: 'function', function: { name: 'provide_recommendations', parameters: { type: 'object' } } }],
      tool_choice: { type: 'function', function: { name: 'provide_recommendations' } },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.tools).toEqual([
      { name: 'provide_recommendations', description: '', input_schema: { type: 'object' } },
    ]);
    // Same forced-tool_choice downgrade applies to explicit-tools callers.
    expect(sentBody.tool_choice).toEqual({ type: 'auto' });
    expect(sentBody.system).toContain('You must call the "provide_recommendations" tool');
  });

  it('falls back to escaping raw control characters in free text if json_object mode returns text instead of a tool_use block', async () => {
    // tool_choice can only be "auto" here (see above), so the model
    // ignoring the steering instruction and answering in free text is a
    // real path, not just a max_tokens edge case -- sanitize it too.
    const brokenJson = '{"variants":[{"script":"Line one\nLine two"}]}';
    expect(() => JSON.parse(brokenJson)).toThrow();

    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse({ content: [{ type: 'text', text: brokenJson }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'write a script' }],
      response_format: { type: 'json_object' },
    });

    const data = await result.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    expect(parsed.variants[0].script).toBe('Line one\nLine two');
  });

  it('does NOT touch raw newlines outside json_object mode (e.g. plain chat content)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse({ content: [{ type: 'text', text: 'Line one\nLine two' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'hi' }],
    });

    const data = await result.json();
    expect(data.choices[0].message.content).toBe('Line one\nLine two');
  });

  it('translates image_url content parts (base64 image and PDF) into Anthropic image/document blocks', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(anthropicResponse({ content: [{ type: 'text', text: 'ok' }] })));
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'describe' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } },
          ],
        },
      ],
    });
    const imgBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(imgBody.messages[0].content[1]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'QUJD' },
    });

    await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: 'data:application/pdf;base64,WFla' } }],
        },
      ],
    });
    const pdfBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(pdfBody.messages[0].content[0]).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'WFla' },
    });
  });

  it('downgrades an OpenAI-style forced tool_choice to auto + a steering instruction, and still translates the resulting tool_use into a stringified arguments field', async () => {
    // Anthropic returns a 400 for a forced tool_choice on claude-sonnet-5-5 /
    // claude-opus-5-5 ("tool_choice: type \"tool\" and \"any\" are not
    // supported for this model") -- this reproduces the real
    // ab-test-optimization failure. The gateway has to send "auto" and
    // steer via the system prompt instead of forwarding the forced choice.
    const fetchMock = vi.fn().mockResolvedValue(
      anthropicResponse({
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'provide_recommendations', input: { x: 1 } }],
        stop_reason: 'tool_use',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'go' }],
      tools: [{ type: 'function', function: { name: 'provide_recommendations', parameters: { type: 'object' } } }],
      tool_choice: { type: 'function', function: { name: 'provide_recommendations' } },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.tools).toEqual([
      { name: 'provide_recommendations', description: '', input_schema: { type: 'object' } },
    ]);
    expect(sentBody.tool_choice).toEqual({ type: 'auto' });
    expect(sentBody.system).toContain('You must call the "provide_recommendations" tool');

    const data = await result.json();
    const toolCall = data.choices[0].message.tool_calls[0];
    expect(toolCall.function.name).toBe('provide_recommendations');
    expect(JSON.parse(toolCall.function.arguments)).toEqual({ x: 1 });
  });

  it('preserves a non-2xx status (e.g. 429) so callers status-code branches still fire', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"rate limited"}', { status: 429 })));
    const result = await callLovableGateway('k', { model: 'x', messages: [] });
    expect(result.status).toBe(429);
    expect(result.ok).toBe(false);
  });

  it('does not swallow a rejected fetch — errors propagate to the caller', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(callLovableGateway('k', { model: 'x', messages: [] })).rejects.toThrow('network down');
  });

  it('translates a streaming Anthropic SSE response into OpenAI-style delta chunks ending in [DONE]', async () => {
    const anthropicSse =
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}}\n\n' +
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}\n\n' +
      'event: message_stop\ndata: {"type":"message_stop"}\n\n';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(anthropicSse));
        controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(stream, { status: 200 })),
    );

    const result = await callLovableGateway('k', {
      model: 'google/gemini-3-flash-preview',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    });

    expect(result.headers.get('Content-Type')).toBe('text/event-stream');
    const text = await result.text();
    expect(text).toContain('"content":"Hel"');
    expect(text).toContain('"content":"lo"');
    expect(text.trim().endsWith('data: [DONE]')).toBe(true);
  });
});
