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
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(500);
  });

  it('falls back to claude-haiku-4-5 for the cheap-tier alias and claude-sonnet-5-5 for an unknown model', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(anthropicResponse({ content: [{ type: 'text', text: 'ok' }] })));
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', { model: 'google/gemini-2.5-flash-lite', messages: [] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-haiku-4-5');

    await callLovableGateway('k', { model: 'some-unmapped-model', messages: [] });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe('claude-sonnet-5-5');
  });

  it('translates a JSON-mode request and Anthropic response back into the OpenAI choices[0].message.content shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      anthropicResponse({ content: [{ type: 'text', text: '{"a":1}' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 4 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLovableGateway('k', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'give me json' }],
      response_format: { type: 'json_object' },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.system).toContain('ONLY a single valid JSON object');

    const data = await result.json();
    expect(data.choices[0].message.content).toBe('{"a":1}');
    expect(data.usage.prompt_tokens).toBe(10);
    expect(data.usage.completion_tokens).toBe(4);
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

  it('translates OpenAI-style forced tool_choice into an Anthropic tool_use response with a stringified arguments field', async () => {
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
    expect(sentBody.tool_choice).toEqual({ type: 'tool', name: 'provide_recommendations' });

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
