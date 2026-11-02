/**
 * 文档数据源（本地静态文档）。
 *
 * 「文档」栏目有两条完全不同的入口，别混：
 * - `/document` 与 `/document/:id` —— **本地静态文档**，正文是 `tmp/` 下的 markdown，
 *   走本文件（`views/document-reader.vue`）；
 * - `/document/:userid/:postid` —— **后端帖子**，走 `src/api/posts.ts`（`views/document.vue`）。
 *
 * 这里对外只暴露 Promise 化的 `fetchDocument(id)` —— 组件不关心数据从哪来。
 * 将来若要改成后端提供，只改本文件的函数体（请求走通信层 `./http.ts`，
 * 不要自己拼 base url），`views/document-reader.vue` 一行都不用动。
 *
 * 注意：`about` 栏目不走这里，它读的是仓库里的 README，纯静态资源。
 */

/** 一篇文档。 */
export interface DocumentDetail {
  /** 文档 id，与路由参数一致。 */
  id: string
  /** 文档标题。 */
  title: string
  /** Markdown 正文。 */
  source: string
}

/** 访问 `/document`（不带 id）时默认打开的文档。 */
export const defaultDocumentId = 'markdown-test'

/**
 * 本地文档注册表，key 就是路由里的 id。
 *
 * ⚠️ 正文用**动态 `import()`** 取，不要改成顶部 `import markdownTestSource from '…?raw'`：
 * 静态导入会把整篇 markdown 一起塞进**首屏** chunk —— 实测首屏会从 41.2 kB 涨到
 * 44.0 kB（正好是那份 md 的 2912 字节）。现在正文是独立 chunk，只有真的打开
 * 文档页才下载。
 *
 * 新增一篇文档：在 `tmp/` 放 md，然后在这里加一条，`title` 就是页面上的无障碍标签。
 */
const documentSources: Record<string, { title: string, load: () => Promise<string> }> = {
  'markdown-test': {
    title: 'Markdown 渲染测试',
    load: async () => (await import('../../tmp/markdown-test.md?raw')).default,
  },
}

/**
 * 按 id 拉取文档正文。
 *
 * @param id 路由参数里的文档 id；`/document` 不带参数时传 `defaultDocumentId`。
 * @throws 文档不存在时抛错，由调用方渲染错误态。
 */
export async function fetchDocument(id: string): Promise<DocumentDetail> {
  // 预留：接入后端后改为 `getJson<DocumentDetail>(`/documents/${encodeURIComponent(id)}`)`。
  const entry = documentSources[id]

  if (entry === undefined) {
    throw new Error(`没有找到文档「${id}」。`)
  }

  return {
    id,
    title: entry.title,
    source: await entry.load(),
  }
}
