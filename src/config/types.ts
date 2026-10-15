/**
 * 配置相关的类型定义。
 *
 * 只在 `src/config/` 内部使用；对外统一由 `src/config/index.ts` 再导出，
 * 组件请从 `'../../config'` 引入，不要直接引用本文件。
 */

/** 一个搜索引擎的完整配置。 */
export interface SearchEngineConfig {
  /** 唯一标识，同时是设置面板里的键。 */
  id: string
  name: string
  /** 图标地址；为空时回退成名称首字母。 */
  icon: string
  /** 触发前缀正则，例如 `!g ` 命中 Google。 */
  pattern: RegExp
  /** 搜索地址模板，`{query}` 会被替换成编码后的关键词。 */
  url: string
}

/** 便签小窗配置。 */
export interface StickyNoteConfig {
  /** 窗口标题。 */
  title: string
  /** 便签正文，Markdown 任务列表语法（`- [ ]` / `- [x]`）；默认为空。 */
  content: string
  /** 窗口宽度（px）。 */
  width: number
  /** 初始位置：距视口右边缘 / 上边缘的距离（px）。 */
  offset: {
    right: number
    top: number
  }
  /** 是否默认展开显示。 */
  open: boolean
}

/** 站点全部配置。 */
export interface SiteConfig {
  /** 站点背景图地址，帖子封面临时复用。 */
  backgroundImageUrl: string
  /** 默认搜索引擎的 id，必须在 searchEngines 中存在。 */
  defaultSearchEngineId: string
  searchEngines: SearchEngineConfig[]
  /**
   * 后端 API 的 base url。
   *
   * 站内所有自有后端接口都以此为前缀；由通信层 `src/api/http.ts` 通过
   * `normalizeApiBaseUrl()` 统一读取拼接，业务模块不要自己拼。
   * **留空或格式错误都表示「无有效指定」**，此时回落到与站点同源的相对路径。
   */
  apiBaseUrl: string
  stickyNote: StickyNoteConfig
}

/**
 * 会被持久化到 cookie 的部分。
 *
 * 只包含用户可编辑的内容：背景图地址、搜索引擎、默认引擎、API base url，
 * 以及便签正文。便签的标题 / 尺寸 / 初始位置 / 默认开合都是纯代码默认值，
 * 不落盘，这样以后改默认值能直接对所有人生效。
 */
export type PersistedConfig = Pick<
  SiteConfig,
  'backgroundImageUrl' | 'defaultSearchEngineId' | 'searchEngines' | 'apiBaseUrl'
> & {
  /**
   * 便签正文（Markdown 任务列表）。
   *
   * 单独拎成扁平字段而不是持久化整个 `stickyNote`：只存内容，
   * 其余便签字段仍以代码默认值为准。空串是合法值（用户可能把便签清空）。
   */
  stickyNoteContent: string
}
