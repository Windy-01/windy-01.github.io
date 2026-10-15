/**
 * 全部配置的默认值，集中在这一个文件里。
 *
 * 只在 `src/config/` 内部使用；组件请通过 `src/config/index.ts` 的
 * `useConfig()` 读取运行时配置，不要直接引用本文件。
 */

import type { SearchEngineConfig, SiteConfig, StickyNoteConfig } from './types'

/** 站点背景图默认地址。 */
export const defaultBackgroundImageUrl = 'https://www.loliapi.com/acg/pc/'

/** 内置搜索引擎。 */
export const defaultSearchEngines: SearchEngineConfig[] = [
  {
    id: 'bing',
    name: 'Bing',
    icon: 'https://cn.bing.com/favicon.ico',
    pattern: /^(?:!b|bing)\s+/i,
    url: 'https://www.bing.com/search?q={query}',
  },
  {
    id: 'google',
    name: 'Google',
    icon: '',
    pattern: /^(?:!g|google)\s+/i,
    url: 'https://www.google.com/search?q={query}',
  },
]

/**
 * 默认搜索引擎：取列表首项。
 * 列表非空由定义保证，非空断言用于消掉 `noUncheckedIndexedAccess` 引入的 undefined。
 */
export const defaultSearchEngine: SearchEngineConfig = defaultSearchEngines[0]!

/** 默认搜索引擎 id。 */
export const defaultSearchEngineId = defaultSearchEngine.id

/**
 * 后端 API 的默认 base url。
 *
 * 空串表示「与站点同源」，即接口直接走相对路径；用户可在设置 → 网络里改成
 * 自建后端的地址。目前没有任何接口读取该值，只是先把配置位占住。
 */
export const defaultApiBaseUrl = ''

/** 便签小窗默认配置。 */
export const defaultStickyNote: StickyNoteConfig = {
  title: '便签',
  /** 默认空便签，内容由用户自己写（Markdown 任务列表语法）。 */
  content: '',
  width: 268,
  offset: {
    right: 24,
    top: 104,
  },
  open: false,
}

/** 生成一份全新的默认配置（每次都是新对象，避免调用方改到默认值本身）。 */
export function createDefaultConfig(): SiteConfig {
  return {
    backgroundImageUrl: defaultBackgroundImageUrl,
    defaultSearchEngineId,
    searchEngines: defaultSearchEngines.map((engine) => ({ ...engine })),
    apiBaseUrl: defaultApiBaseUrl,
    stickyNote: {
      ...defaultStickyNote,
      offset: { ...defaultStickyNote.offset },
    },
  }
}
