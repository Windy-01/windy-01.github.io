/**
 * 文档数据源。
 *
 * `document` 栏目的正文后续会由**后端接口**提供，所以对外只暴露 Promise 化的
 * `fetchDocument(id)` —— 组件不关心数据从哪来。接入真实接口时只改本文件的函数体
 * （请求走通信层 `./http.ts`，不要自己拼 base url），调用方一行都不用动。
 *
 * 目前数据来自下面的本地注册表，正文是 `tmp/` 下的静态 markdown。
 * 注意：`about` 栏目不走这里，它读的是仓库里的 README，纯静态资源。
 */

import markdownTestSource from '../../tmp/markdown-test.md?raw'

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

/** 接入后端前的本地文档注册表，key 就是路由里的 id。 */
const localDocuments: Record<string, { title: string, source: string }> = {
  'markdown-test': {
    title: 'Markdown 渲染测试',
    source: markdownTestSource,
  },
}

/**
 * 按 id 拉取文档正文。
 *
 * @param id 路由参数里的文档 id。
 * @throws 文档不存在时抛错，由调用方渲染错误态。
 */
export async function fetchDocument(id: string): Promise<DocumentDetail> {
  // 预留：接入后端后改为 `getJson<DocumentDetail>(`/documents/${encodeURIComponent(id)}`)`。
  const document = localDocuments[id]

  if (document === undefined) {
    throw new Error(`没有找到文档「${id}」。`)
  }

  return {
    id,
    title: document.title,
    source: document.source,
  }
}
