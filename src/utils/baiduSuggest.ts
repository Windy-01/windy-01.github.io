interface BaiduSugPayload {
  q?: string
  p?: boolean
  s?: string[]
}

const suggestionEndpoint = 'https://suggestion.baidu.com/su'
const requestTimeoutMs = 5000

let callbackSequence = 0

/**
 * 通过 JSONP 请求百度搜索建议。
 *
 * 该接口不支持 CORS，且响应是 `cb({q, p, s})` 形式的脚本，因此只能用动态
 * `<script>` 注入；同时响应声明为 GBK，需显式指定 charset，否则中文建议词会乱码。
 * 请求失败或超时统一返回空数组。
 */
export function fetchBaiduSuggestions(query: string): Promise<string[]> {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return Promise.resolve([])
  }

  return new Promise((resolve) => {
    const callbackName = `__windySug${callbackSequence++}`
    const globalScope = window as unknown as Record<string, unknown>
    const script = document.createElement('script')

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      script.remove()
      delete globalScope[callbackName]
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      resolve([])
    }, requestTimeoutMs)

    globalScope[callbackName] = (payload?: BaiduSugPayload) => {
      cleanup()
      resolve(payload && Array.isArray(payload.s) ? payload.s : [])
    }

    script.async = true
    script.charset = 'gbk'
    script.onerror = () => {
      cleanup()
      resolve([])
    }
    script.src = `${suggestionEndpoint}?wd=${encodeURIComponent(normalizedQuery)}&cb=${callbackName}`

    document.head.appendChild(script)
  })
}
