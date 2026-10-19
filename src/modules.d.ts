// wrangler.jsonc の rules で Text として取り込むファイル。中身は文字列。
declare module 'htmx.org/dist/htmx.min.js' {
  const text: string
  export default text
}
declare module 'lism-css/main.css' {
  const text: string
  export default text
}
