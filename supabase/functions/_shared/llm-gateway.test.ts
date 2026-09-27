import { afterEach, describe, expect, it, vi } from 'vitest';
import { callLovableGateway } from './llm-gateway';

describe('callLovableGateway', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the Lovable AI Gateway with a bearer auth header and JSON body', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLovableGateway('test-key', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ai.gateway.lovable.dev/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toBe(mockResponse);
  });

  it('passes arbitrary extra fields through untouched (e.g. tools, tool_choice)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await callLovableGateway('k', {
      model: 'x',
      messages: [],
      tools: [{ type: 'function', function: { name: 'f' } }],
      tool_choice: { type: 'function', function: { name: 'f' } },
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.tools[0].function.name).toBe('f');
    expect(body.tool_choice.function.name).toBe('f');
  });

  it('does not swallow a rejected fetch — errors propagate to the caller', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(callLovableGateway('k', { model: 'x', messages: [] })).rejects.toThrow('network down');
  });
});
