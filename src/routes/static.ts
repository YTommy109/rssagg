import { Hono } from 'hono'
import htmx from 'htmx.org/dist/htmx.min.js'

import type { AppEnv } from '../env'

import lism from 'lism-css/main.css'

// ADR-0013: 実行時の取得先を持たず、npm の依存をそのまま Worker から返す。
// 版は package.json で固定されるので、URL に版は入れない。
const body = (text: string, type: string) =>
  new Response(text, {
    headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' },
  })

export const staticRoute = new Hono<AppEnv>()
  .get('/htmx.js', () => body(htmx, 'text/javascript; charset=utf-8'))
  .get('/lism.css', () => body(lism, 'text/css; charset=utf-8'))
