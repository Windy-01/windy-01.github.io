/**
 * 聊天界面的时间格式化纯函数。
 *
 * 会话列表和消息记录对时间的粒度要求不同，所以拆成三个函数：
 * - 列表里只给「几点 / 昨天 / 周几 / 月日」这种最省地方的写法；
 * - 消息气泡旁边给具体的 `HH:mm`；
 * - 消息之间插入的分隔条给「今天 / 昨天 / 月日」。
 *
 * 全部对非法日期做了兜底（返回空串），避免演示数据或后端返回坏值时渲染出 `NaN:NaN`。
 */

const dayMs = 24 * 60 * 60 * 1000

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function parse(iso: string): Date | null {
  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? null : date
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  )
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** `HH:mm`。 */
export function formatClock(iso: string): string {
  const date = parse(iso)

  if (date === null) {
    return ''
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `M月D日`。 */
export function formatDate(iso: string): string {
  const date = parse(iso)

  if (date === null) {
    return ''
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 会话列表里的时间：今天给 `HH:mm`，昨天给「昨天」，一周内给「周几」，更早给「M月D日」。
 */
export function formatConversationTime(iso: string): string {
  const date = parse(iso)

  if (date === null) {
    return ''
  }

  const now = new Date()

  if (isSameDay(date, now)) {
    return formatClock(iso)
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(date, yesterday)) {
    return '昨天'
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / dayMs)

  if (diffDays >= 0 && diffDays < 7) {
    return weekDays[date.getDay()] ?? ''
  }

  return formatDate(iso)
}

/** 消息记录里两条消息之间插入的日期分隔：今天 / 昨天 / M月D日。 */
export function formatDayDivider(iso: string): string {
  const date = parse(iso)

  if (date === null) {
    return ''
  }

  const now = new Date()

  if (isSameDay(date, now)) {
    return '今天'
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(date, yesterday)) {
    return '昨天'
  }

  return formatDate(iso)
}

/** 两条消息是否属于同一天（决定要不要插入日期分隔条）。 */
export function isSameDayIso(left: string, right: string): boolean {
  const a = parse(left)
  const b = parse(right)

  if (a === null || b === null) {
    return false
  }

  return isSameDay(a, b)
}
