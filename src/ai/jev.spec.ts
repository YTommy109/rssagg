import { afterEach, describe, expect, it, vi } from 'vitest'

import { askJev, JevError, type JevRequest } from './jev'

/** fetch に渡した JSON 本体。文字列以外は送っていないはずなので、それ以外は失敗にする。 */
const sentBody = (init?: RequestInit): unknown =>
  JSON.parse(typeof init?.body === 'string' ? init.body : 'null')

const OK = {
  model: 'jev-1.13.0',
  answers: { q: { type: 'noul', noul: 0.9 } },
  usage: { input_tokens: 10, output_tokens: 1 },
}
const REQ: JevRequest = {
  state: { text: 'x' },
  questions: { q: { type: 'noul', instructions: 'y' } },
}
const FAST = { baseDelayMs: 0 }

/* Response の本体は 1 度しか読めないので、呼び出しごとに作る。 */
const json =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }))

describe('askJev', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('API キーと問いを送り、答えとトークン使用量を返す', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(json(OK))
    const res = await askJev('key', REQ, FAST)
    expect(res.answers['q']).toStrictEqual({ type: 'noul', noul: 0.9 })
    expect(res.usage).toStrictEqual({ input_tokens: 10, output_tokens: 1 })

    const [url, init] = spy.mock.calls[0] ?? []
    expect(url).toBe('https://api.typesafe.ai/v1/systemone')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer key')
    expect(sentBody(init)).toStrictEqual({ model: 'jev-latest', ...REQ })
  })

  it('429 と 529 は待って再試行し、通ったら返す', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(json({}, 429))
      .mockImplementationOnce(json({}, 529))
      .mockImplementation(json(OK))
    await expect(askJev('key', REQ, FAST)).resolves.toMatchObject({ model: 'jev-1.13.0' })
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('再試行しても通らなければ JevError を投げる', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(json({}, 529))
    const result = askJev('key', REQ, { retries: 2, baseDelayMs: 0 })
    await expect(result).rejects.toBeInstanceOf(JevError)
    await expect(result).rejects.toMatchObject({ status: 529 })
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('401 のような再試行しても無駄な失敗は、すぐに投げる', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(json({}, 401))
    await expect(askJev('key', REQ, FAST)).rejects.toMatchObject({ status: 401 })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('形の違う応答は失敗にする', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(json({ answers: {} }))
    await expect(askJev('key', REQ, FAST)).rejects.toThrow(/usage/u)
  })
})
