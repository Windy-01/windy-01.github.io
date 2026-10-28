/**
 * 全部配置的默认值，集中在这一个文件里。
 *
 * 只在 `src/config/` 内部使用；组件请通过 `src/config/index.ts` 的
 * `useConfig()` 读取运行时配置，不要直接引用本文件。
 */

import type {
  ChatLayoutConfig,
  ChatStorageConfig,
  SearchEngineConfig,
  SiteConfig,
  StickyNoteConfig,
} from './types'

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

/**
 * Agent 后端的默认地址：**空串**，表示「没有单独配置」。
 *
 * 此时 Agent 界面回落到上面的 `apiBaseUrl`；那边也为空时走本地演示回复。
 * 用户可在 Agent 界面右上角的设置里填 `ip:port`（允许不写协议，自动补 `http://`）。
 */
export const defaultAgentApiBaseUrl = ''

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

/**
 * 聊天界面默认分栏比例。
 *
 * 取值必须落在 `./chatLayout.ts` 的区间内（第二栏 12–65、展示区 25–75），
 * 否则拖拽时的边界会和初始值打架。
 */
export const defaultChatLayout: ChatLayoutConfig = {
  /** 图标导航 5% / 会话列表 25% / 消息区 70%。 */
  columnWidths: [5, 25, 70],
  /** 展示区占 60%，下方合并区占 40%。 */
  displayHeight: 60,
}

/** 聊天搜索栏的默认搜索记录：默认为空，由用户搜索时逐条累积。 */
export const defaultSearchHistory: string[] = []

/**
 * 聊天记录存储的默认配置。
 *
 * 默认**只做少量缓存**（不写磁盘）；`directory` 先把默认位置占住。
 *
 * 路径用 Windows 的 `%USERPROFILE%`（当前用户配置目录）而不是写死盘符：换机器 / 换用户都成立，
 * 而且整串可以直接粘进「运行」（Win+R）或资源管理器地址栏打开。
 * ⚠️ 别再用 `:user` 那种冒号占位符 —— 那是 Web 路由（`/user/:id`）的写法，而且 `:` 在
 * Windows 路径里是**非法字符**（NTFS 保留），只能当占位符，最容易让人误以为是路径的一部分。
 * 另外 `%USERPROFILE%` 本身已经按用户隔离，不需要再套一层用户名。
 * ⚠️ 若用户的「文档」目录被移动到了别的盘（很常见），需要自己改成实际位置 —— Windows 没有
 * 指向文档目录的环境变量，网页端也读不到重定向（只能靠系统 API / 注册表）。
 * ⚠️ 目前是占位，聊天页尚未按它落盘。
 */
export const defaultChatStorage: ChatStorageConfig = {
  mode: 'cache',
  directory: '%USERPROFILE%\\Documents\\windyfront',
}

/** 生成一份全新的默认配置（每次都是新对象，避免调用方改到默认值本身）。 */
export function createDefaultConfig(): SiteConfig {
  return {
    backgroundImageUrl: defaultBackgroundImageUrl,
    defaultSearchEngineId,
    searchEngines: defaultSearchEngines.map((engine) => ({ ...engine })),
    apiBaseUrl: defaultApiBaseUrl,
    agentApiBaseUrl: defaultAgentApiBaseUrl,
    stickyNote: {
      ...defaultStickyNote,
      offset: { ...defaultStickyNote.offset },
    },
    chatLayout: {
      columnWidths: [...defaultChatLayout.columnWidths],
      displayHeight: defaultChatLayout.displayHeight,
    },
    searchHistory: [...defaultSearchHistory],
    chatStorage: { ...defaultChatStorage },
  }
}
