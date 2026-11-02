/**
 * 后端响应信封与字段读取工具。
 *
 * windsharebase 用 Go 的 `response.Build{Message, Data}` 包一层，**结构体没写 json tag**，
 * 序列化出来是**大写 `Message` / `Data`**。这里的函数同时认大写小写，
 * 也认 `{ data: { ... } }` 再包一层的形态 —— 后端哪天补了 tag 也不用改前端。
 *
 * ⚠️ 取值一律**跳过空串**：后端常把未填的列序列化成 `""`，
 * 若让 `""` 占住第一个候选键，后面真有值的键就永远取不到（`userinfo.ts` 踩过）。
 */

/** 把任意值收窄成普通对象；数组与 `null` 都返回 `null`。 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

/**
 * 剥掉 `{ Message, Data }` 信封，返回真正的数据。
 *
 * 没有信封（直接返回对象 / 数组 / 纯文本）时原样返回。
 */
export function unwrapEnvelope(raw: unknown): unknown {
  const record = asRecord(raw)

  if (record === null) {
    return raw
  }

  if ('Data' in record) {
    return record.Data
  }

  if ('data' in record) {
    return record.data
  }

  return raw
}

/** 按多个候选键取值：命中第一个非 `undefined` / `null` / 空串的。 */
export function pickValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key]

    if (value === undefined || value === null) {
      continue
    }

    if (typeof value === 'string' && value.trim() === '') {
      continue
    }

    return value
  }

  return undefined
}

/** 取字符串；数字会转成字符串。 */
export function pickString(record: Record<string, unknown>, keys: string[]): string {
  const value = pickValue(record, keys)

  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return ''
}

/** 取数字；数字字符串会转，非法值返回 0。 */
export function pickNumber(record: Record<string, unknown>, keys: string[]): number {
  const value = pickValue(record, keys)

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

/** 取布尔；认 `true/false`、`1/0`、`"true"/"false"`，其余回落 `fallback`。 */
export function pickBoolean(
  record: Record<string, unknown>,
  keys: string[],
  fallback: boolean,
): boolean {
  const value = pickValue(record, keys)

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true' || normalized === '1') {
      return true
    }

    if (normalized === 'false' || normalized === '0') {
      return false
    }
  }

  return fallback
}

/**
 * 取数组。
 *
 * 先看 `record[keys[0]]` 这类直接命中的键，再退一步找常见的「列表包裹」形态
 * （`{ list: [...] }` / `{ items: [...] }` / `{ records: [...] }`），
 * 都没有就返回空数组 —— 调用方按「没有数据」渲染空态，不用处理 `undefined`。
 */
export function pickList(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key]

    if (Array.isArray(value)) {
      return value
    }
  }

  for (const key of ['list', 'items', 'records', 'rows', 'data', 'comments', 'replies', 'thread']) {
    const value = record[key]

    if (Array.isArray(value)) {
      return value
    }
  }

  return []
}
