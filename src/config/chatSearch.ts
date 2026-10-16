/**
 * 聊天搜索栏的约束与纯函数。
 *
 * 搜索记录是**用户可见的状态**，跟着 `config` 一起落进 cookie（见 `./index.ts`），
 * 所以读取时的清洗也放在这里 —— 和 `./chatLayout.ts` 的分工保持一致：
 * 约束常量 + 纯函数，组件只管调用。
 */

/** 搜索记录最多保留多少条。 */
export const chatSearchHistoryMax = 8

/** 单条搜索词的最大长度（字符）。超长直接截断，避免一条长文本把 cookie 撑爆。 */
export const chatSearchTermMax = 40

/** 规整一个搜索词：去首尾空白 + 截断。返回空串表示这个词不可用。 */
export function normalizeSearchTerm(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, chatSearchTermMax)
}

/**
 * 把 cookie 里的原始值清洗成一份可用的搜索记录。
 *
 * 逐项校验：只留非空字符串，去掉重复（**忽略大小写**，避免 `Vue` / `vue` 并存），
 * 超出上限的截掉。整份数据不是数组时直接返回空数组。
 */
export function parseSearchHistory(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const result: string[] = []

  for (const item of raw) {
    const term = normalizeSearchTerm(item)

    if (term === '') {
      continue
    }

    if (result.some((existing) => existing.toLowerCase() === term.toLowerCase())) {
      continue
    }

    result.push(term)

    if (result.length >= chatSearchHistoryMax) {
      break
    }
  }

  return result
}

/**
 * 把一个新搜索词插到最前面，返回**新数组**（不改原数组，方便直接写进配置）。
 *
 * 已经存在同样的词（忽略大小写）时只把它挪到最前，不会产生重复项。
 */
export function pushSearchHistory(history: readonly string[], value: string): string[] {
  const term = normalizeSearchTerm(value)

  if (term === '') {
    return [...history]
  }

  const rest = history.filter((item) => item.toLowerCase() !== term.toLowerCase())

  return [term, ...rest].slice(0, chatSearchHistoryMax)
}
