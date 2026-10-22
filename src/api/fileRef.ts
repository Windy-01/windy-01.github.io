/**
 * 后端返回的「文件」引用解析。
 *
 * 同一个「文件」字段，后端可能给三种形态，前端都要能吃下来：
 *
 * | 形态   | 例子                                                        | 怎么用                     |
 * | ---- | --------------------------------------------------------- | ----------------------- |
 * | 内联   | `"# 标题\n\n正文"`                                            | 直接就是内容                  |
 * | 地址   | `"https://cdn.example.com/avatar.png"`                     | 直接交给 `<img src>` / fetch |
 * | 签名链接 | `"http://127.0.0.1:9000/test/readme.txt?X-Amz-Signature=…"` | 同上，但**有效期有限**，且不能带鉴权头 |
 *
 * 后两种都是「地址」，区别只在签名链接带了一串时效性查询参数
 * （`X-Amz-Signature` / `X-Amz-Credential` / `X-Goog-Signature` / `Signature` 等），
 * 过一段时间就失效，所以不能长期缓存、也不能在链接后面乱加参数。
 *
 * ## 为什么这里要绕开 `http.ts`
 *
 * `http.ts` 是「站内接口」的唯一出口，它会拼 base url、附带 `Authorization`。
 * 签名链接是**第三方存储**给的临时地址，两条规则都不适用：
 * - 拼 base url 会把绝对地址拼坏；
 * - 带 `Authorization` 会触发 CORS 预检，而对象存储（MinIO / OSS / S3）的
 *   CORS 配置未必放行这个头 —— 请求会直接被浏览器拦掉。
 *
 * 所以这里用**裸 `fetch`**，不带任何自定义头、不带 cookie（`credentials: 'omit'`）。
 * 这是本文件唯一允许直接调 `fetch` 的地方。
 *
 * ## 展示 vs 下载
 *
 * 同一份文件，两种取用方式不一样：
 * - **展示**（`<img src>`）：直接用地址，让浏览器自己去取，省内存、能走缓存。
 * - **下载**（交给用户保存）：必须 `fetch` 成 Blob 再触发保存 —— 跨域地址上的
 *   `<a download>` 会被浏览器忽略（变成导航打开），只有 Blob URL 才认 `download`。
 */

import { ApiError } from './http'

/** 后端给的一个「文件」。 */
export type FileRef =
  /** 内容直接在响应体里。 */
  | { readonly kind: 'inline', readonly text: string }
  /** 普通地址（绝对 URL 或站内相对路径）。 */
  | { readonly kind: 'url', readonly url: string }
  /** 带签名的临时地址，有效期有限。 */
  | { readonly kind: 'signed', readonly url: string }

/** 绝对 http(s) 地址。 */
const absoluteUrlPattern = /^https?:\/\//i

/**
 * 出现这些查询参数就当作签名链接（统一小写比较）。
 *
 * 覆盖 S3 / MinIO（`X-Amz-*`）、Google Cloud Storage（`X-Goog-*`）、
 * 阿里云 OSS（`OSSAccessKeyId`）、腾讯云 COS（`q-sign-algorithm`），
 * 以及一些自研网关用的裸 `signature` / `expires`。
 */
const signedQueryKeys = [
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-security-token',
  'x-goog-signature',
  'x-goog-credential',
  'googleaccessid',
  'ossaccesskeyid',
  'q-sign-algorithm',
  'q-ak',
  'signature',
  'awsaccesskeyid',
]

/** 后端可能用来放地址的字段名。 */
const urlKeys = [
  'url',
  'fileUrl',
  'file_url',
  'downloadUrl',
  'download_url',
  'signedUrl',
  'signed_url',
  'presignedUrl',
  'presigned_url',
  'objectUrl',
  'object_url',
  'href',
  'link',
]

/** 后端可能用来放正文的字段名。 */
const textKeys = ['content', 'text', 'markdown', 'md', 'readme', 'detail', 'body', 'data']

/** 是不是绝对 http(s) 地址。 */
export function isAbsoluteHttpUrl(value: string): boolean {
  return absoluteUrlPattern.test(value.trim())
}

/**
 * 判断一个地址是不是「带签名的临时链接」。
 *
 * 只看查询参数，不看域名 —— 自研网关和对象存储的地址形态差别太大，
 * 唯一共同点是那串时效性参数。
 */
export function isSignedUrl(url: string): boolean {
  const queryStart = url.indexOf('?')

  if (queryStart < 0) {
    return false
  }

  // 手动切出查询串：相对路径（`/api/x?a=1`）用 `new URL()` 会直接抛错。
  const query = url.slice(queryStart + 1).split('#')[0] ?? ''

  for (const key of new URLSearchParams(query).keys()) {
    if (signedQueryKeys.includes(key.toLowerCase())) {
      return true
    }
  }

  return false
}

/**
 * 一个字符串「看起来是不是地址」。
 *
 * 判据保守一点：绝对 URL、`data:` / `blob:`、或者单行且以 `/` 开头的相对路径。
 * 正文（尤其 Markdown）几乎不会长成这个样子，误判概率很低 —— 真要误判了，
 * 后果也只是把一行正文当地址去请求一次。
 */
function looksLikeUrl(value: string): boolean {
  const text = value.trim()

  if (text === '') {
    return false
  }

  if (absoluteUrlPattern.test(text) || text.startsWith('data:') || text.startsWith('blob:')) {
    return true
  }

  // 含空白（空格 / 换行）的多半是正文，不是路径。
  return text.startsWith('/') && !/\s/.test(text)
}

function urlRefOf(url: string): FileRef {
  return isSignedUrl(url) ? { kind: 'signed', url } : { kind: 'url', url }
}

/**
 * 把后端返回的任意值解析成 `FileRef`。
 *
 * 认得的输入：
 * - 字符串：地址 → `url` / `signed`，其余 → `inline`；
 * - 对象：先找地址字段（`url` / `downloadUrl` / `signedUrl` / `href` …），
 *   再找正文字段（`content` / `readme` / `detail` …）。
 *
 * @returns 解析不出来（空串、空对象、类型不对）时返回 `null`。
 */
export function parseFileRef(raw: unknown): FileRef | null {
  if (typeof raw === 'string') {
    if (raw.trim() === '') {
      return null
    }

    return looksLikeUrl(raw) ? urlRefOf(raw.trim()) : { kind: 'inline', text: raw }
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null
  }

  const record = raw as Record<string, unknown>

  for (const key of urlKeys) {
    const value = record[key]

    if (typeof value === 'string' && looksLikeUrl(value)) {
      return urlRefOf(value.trim())
    }
  }

  for (const key of textKeys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim() !== '') {
      // 正文字段里也可能塞的是地址（后端把 `data` 当通用字段用），同样要认。
      return looksLikeUrl(value) ? urlRefOf(value.trim()) : { kind: 'inline', text: value }
    }
  }

  return null
}

/**
 * **展示用**：把文件引用变成可以直接喂给 `<img src>` 的地址。
 *
 * 同步函数 —— 图片没必要先下载成 Blob（那样反而丢掉浏览器缓存、多占内存）。
 * 相对路径会拼上 `baseUrl`，绝对地址（含签名链接）原样返回。
 *
 * @returns 拿不到地址（内联文本 / 解析失败）时返回空串。
 */
export function resolveImageSrc(raw: unknown, baseUrl = ''): string {
  const ref = parseFileRef(raw)

  if (ref === null || ref.kind === 'inline') {
    return ''
  }

  const url = ref.url

  if (isAbsoluteHttpUrl(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
}

export interface FileRefRequestOptions {
  /** 用于取消请求；被取消时原样抛出 `AbortError`。 */
  signal?: AbortSignal
}

/**
 * **取内容 / 下载用**：把文件引用读成 Blob。
 *
 * 内联文本会包成 `text/markdown`；地址与签名链接走裸 `fetch`（见文件头说明）。
 *
 * @throws 请求发不出去（断网 / CORS 被拦）或非 2xx 时抛 `ApiError`，
 *         `message` 可直接展示给用户。
 */
export async function fetchFileRefBlob(
  ref: FileRef,
  options: FileRefRequestOptions = {},
): Promise<Blob> {
  if (ref.kind === 'inline') {
    return new Blob([ref.text], { type: 'text/markdown;charset=utf-8' })
  }

  let response: Response

  try {
    response = await fetch(ref.url, {
      method: 'GET',
      signal: options.signal,
      // 签名链接自带授权信息，带上 cookie 既没用也可能让签名校验失败。
      credentials: 'omit',
      // 有效期很短，缓存下来只会拿到过期内容。
      cache: 'no-store',
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiError(
      0,
      ref.kind === 'signed'
        ? '这个临时链接读不到：可能已过期，或存储不允许跨域访问。'
        : '无法读取这个文件地址，请检查网络。',
      null,
    )
  }

  if (!response.ok) {
    // 签名链接最常见的失败是 403（签名过期 / 被改过参数）。
    const message = ref.kind === 'signed' && response.status === 403
      ? '这个临时链接已失效，请刷新页面重新获取。'
      : `读取文件失败（HTTP ${response.status}）。`

    throw new ApiError(response.status, message, null)
  }

  return response.blob()
}

/**
 * **取内容用**：把文件引用读成文本（Markdown 正文、配置、日志等）。
 *
 * 内联直接返回原文；地址与签名链接会先把内容取下来再按 UTF-8 解码。
 */
export async function fetchFileRefText(
  ref: FileRef,
  options: FileRefRequestOptions = {},
): Promise<string> {
  if (ref.kind === 'inline') {
    return ref.text
  }

  const blob = await fetchFileRefBlob(ref, options)

  return blob.text()
}

/**
 * **下载用**：把文件引用存到用户本地。
 *
 * ⚠️ 必须绕这么一圈（fetch → Blob URL → `<a download>`）：跨域地址上的
 * `<a download>` 会被浏览器忽略，点下去只是导航打开文件，不会保存。
 *
 * @param fileName 保存时的文件名，后端响应里的名字通常不可靠，由调用方给。
 */
export async function saveFileRefAs(
  ref: FileRef,
  fileName: string,
  options: FileRefRequestOptions = {},
): Promise<void> {
  const blob = await fetchFileRefBlob(ref, options)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()

  // 立刻 revoke 会让下载中断，等浏览器接手后再释放。
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
