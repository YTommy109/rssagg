import { z } from 'zod'

/**
 * Cloudflare Access が発行する JWT（`Cf-Access-Jwt-Assertion`）の検証。
 *
 * Access アプリケーションを張っただけでは Worker 自身は無防備なままで、
 * Access を経由しない経路（同一 Worker の別ホスト、Cloudflare 内部からの
 * 到達など）で素通しになる。保護は「Access で止める」と「Worker が JWT を
 * 確かめる」の 2 段で成り立つ（ADR-0005）。
 */

/** 外部入力（JWKS・JWT）は Zod で絞る。型アサーションで通さない。 */
const jwksSchema = z.object({
  keys: z
    .array(
      z.object({
        kid: z.string().optional(),
        kty: z.string(),
        n: z.string().exactOptional(),
        e: z.string().exactOptional(),
        alg: z.string().exactOptional(),
      }),
    )
    .default([]),
})
const headerSchema = z.object({ alg: z.literal('RS256'), kid: z.string() })
const payloadSchema = z.object({
  email: z.string().optional(),
  aud: z.union([z.string(), z.array(z.unknown())]),
  iss: z.string(),
  exp: z.number(),
  nbf: z.number().optional(),
})

/** JWKS の取得結果と、その有効期限（ミリ秒エポック）。 */
type CachedKeys = { keys: Map<string, CryptoKey>; expiresAt: number }

/**
 * 鍵の再取得間隔。Access の鍵は 6 週間ごとに回るため 1 時間で十分に追随する。
 * 未知の kid が来た場合は期限前でも取り直す（下の `keyFor` を参照）。
 */
const KEYS_TTL_MS = 60 * 60 * 1000

/** team domain ごとの鍵キャッシュ。Worker の isolate 内で共有する。 */
const keyCache = new Map<string, CachedKeys>()

/** JWT のペイロードのうち、この検証で見るクレームだけ。 */
export type AccessClaims = {
  /** 認証された利用者のメールアドレス。 */
  email?: string | undefined
  /** アプリケーションの AUD タグ（複数入りうる）。 */
  aud: string[]
  /** 発行者。team domain の URL と一致していなければならない。 */
  iss: string
  /** 有効期限・有効開始（秒エポック）。 */
  exp: number
  nbf?: number | undefined
}

/** base64url をバイト列へ戻す。 */
function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    // atob の出力は 1 文字 = 1 バイト（0〜255）なので charCodeAt が正しい。
    // codePointAt はサロゲートペアを 1 つの値にまとめるため、ここでは使えない。
    // oxlint-disable-next-line unicorn/prefer-code-point
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** base64url の JSON セグメントを復元する。壊れていれば undefined。 */
function decodeJsonSegment(segment: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(segment)))
  } catch {
    return undefined
  }
}

/** JWKS を取得して kid → CryptoKey の対応表にする。 */
async function fetchKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
  if (!response.ok) throw new Error(`failed to fetch Access certs: ${response.status}`)

  const body = jwksSchema.parse(await response.json())
  // 鍵は互いに独立しているので並行して取り込む。JWKS は鍵の回転時に複数本
  // 返るため、順に await すると本数ぶん待ち時間が積み上がる。
  const imported = await Promise.all(
    body.keys
      .flatMap((jwk) => (jwk.kid === undefined ? [] : [{ ...jwk, kid: jwk.kid }]))
      .map(async (jwk) => {
        const key = await crypto.subtle.importKey(
          'jwk',
          jwk,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['verify'],
        )
        return [jwk.kid, key] as const
      }),
  )
  return new Map(imported)
}

/**
 * kid に対応する公開鍵を返す。キャッシュに無い kid は鍵の回転とみなして
 * 1 度だけ取り直す（回転直後に全リクエストが落ちるのを避けるため）。
 */
async function keyFor(
  teamDomain: string,
  kid: string,
  now: number,
): Promise<CryptoKey | undefined> {
  const cached = keyCache.get(teamDomain)
  if (cached !== undefined && cached.expiresAt > now) {
    const key = cached.keys.get(kid)
    if (key !== undefined) return key
  }

  const keys = await fetchKeys(teamDomain)
  keyCache.set(teamDomain, { keys, expiresAt: now + KEYS_TTL_MS })
  return keys.get(kid)
}

/** テスト用に鍵キャッシュを空にする。 */
export function clearAccessKeyCache(): void {
  keyCache.clear()
}

/** payload のクレームを検証する。aud / iss / exp / nbf のどれかが外れれば undefined。 */
function checkClaims(
  payload: z.infer<typeof payloadSchema>,
  options: { teamDomain: string; aud: string },
  nowSeconds: number,
): AccessClaims | undefined {
  const audience = (Array.isArray(payload.aud) ? payload.aud : [payload.aud]).filter(
    (value): value is string => typeof value === 'string',
  )
  const valid =
    audience.includes(options.aud) &&
    payload.iss === `https://${options.teamDomain}` &&
    payload.exp > nowSeconds &&
    (payload.nbf === undefined || payload.nbf <= nowSeconds)
  return valid ? { ...payload, aud: audience } : undefined
}

/**
 * Access JWT を検証し、通ればクレームを返す。通らなければ undefined。
 *
 * 署名（RS256）・`aud`・`iss`・`exp` / `nbf` をすべて見る。1 つでも欠けると
 * 「別のアプリケーション向けに正しく署名された JWT」が通ってしまう。
 */
export async function verifyAccessJwt(
  token: string,
  options: { teamDomain: string; aud: string; now?: number },
): Promise<AccessClaims | undefined> {
  const now = options.now ?? Date.now()
  const [headerSegment, payloadSegment, signatureSegment] = token.split('.')
  if (
    headerSegment === undefined ||
    payloadSegment === undefined ||
    signatureSegment === undefined
  ) {
    return undefined
  }

  const header = headerSchema.safeParse(decodeJsonSegment(headerSegment))
  if (!header.success) return undefined

  const key = await keyFor(options.teamDomain, header.data.kid, now)
  if (key === undefined) return undefined

  const signed = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`)
  const signature = decodeBase64Url(signatureSegment)
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed))) return undefined

  const payload = payloadSchema.safeParse(decodeJsonSegment(payloadSegment))
  if (!payload.success) return undefined
  return checkClaims(payload.data, options, Math.floor(now / 1000))
}
