import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  // GFM 提供表格、任务列表、删除线等扩展语法。
  gfm: true,
  // 单个换行不强制成 <br>，与常见 Markdown 阅读器保持一致。
  breaks: false,
})

/** 允许被嵌入的第三方播放器域名，避免任意站点通过 iframe 被引入。 */
const allowedIframeHosts = new Set([
  'player.bilibili.com',
  'www.youtube.com',
  'www.youtube-nocookie.com',
])

/** iframe 用到的属性都不在 DOMPurify 的默认属性白名单里，必须显式放开。 */
const iframeAttributes = [
  'allow',
  'allowfullscreen',
  'border',
  'frameborder',
  'framespacing',
  'referrerpolicy',
  'sandbox',
  'scrolling',
]

// iframe 默认会被 DOMPurify 整个删掉（既不在 ALLOWED_TAGS，又被列入
// FORBID_CONTENTS）。这里放开标签本身，再用 hook 校验来源域名做兜底。
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName !== 'iframe' || !(node instanceof Element)) {
    return
  }

  let host = ''

  try {
    // 协议相对地址（//host/path）需要一个基准地址才能解析出 host。
    host = new URL(node.getAttribute('src') ?? '', 'https://placeholder.invalid').host
  } catch {
    host = ''
  }

  if (!allowedIframeHosts.has(host)) {
    node.remove()
  }
})

/**
 * 把 Markdown 源码渲染成可直接用 v-html 输出的安全 HTML。
 *
 * marked 自身不做转义，Markdown 中内嵌的原始 HTML 会原样保留，因此这里统一
 * 用 DOMPurify 清洗一遍；即使将来内容来自远端或用户输入也不会引入 XSS。
 */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false })

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: iframeAttributes,
  })
}
