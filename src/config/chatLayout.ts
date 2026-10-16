/**
 * 聊天界面布局的取值约束与清洗（纯函数，无依赖）。
 *
 * 分栏比例是用户拖出来的，要落盘（cookie）并在下次打开时还原，所以「哪些值算合法」
 * 只在这里定义一次，三处共用：
 * - `./defaults.ts` 里的默认值必须落在区间内；
 * - `./index.ts` 读 cookie 时用它清洗（脏数据逐字段回落到默认值）；
 * - `ChatMain.vue` 拖拽时用它夹取边界。
 *
 * 三栏宽度之和恒为 100：第一栏固定，第三栏吃掉剩余，所以只需要约束第二栏。
 */

import type { ChatLayoutConfig } from './types'

/** 第一栏（图标导航）固定宽度百分比，不参与拖拽。 */
export const chatRailWidth = 5

/** 第二栏（会话列表）最小宽度百分比。 */
export const chatSideWidthMin = 12

/** 第三栏（消息区）最小宽度百分比。 */
export const chatMainWidthMin = 30

/** 第二栏最大宽度百分比：让第三栏至少还有 `chatMainWidthMin`。 */
export const chatSideWidthMax = 100 - chatRailWidth - chatMainWidthMin

/** 展示区（消息记录）最小高度百分比。 */
export const chatDisplayHeightMin = 25

/** 展示区最大高度百分比：下方合并区要留得下功能列表与输入框。 */
export const chatDisplayHeightMax = 75

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 把第二栏宽度夹到合法区间。 */
export function clampSideWidth(value: number): number {
  return clamp(value, chatSideWidthMin, chatSideWidthMax)
}

/** 把展示区高度夹到合法区间。 */
export function clampDisplayHeight(value: number): number {
  return clamp(value, chatDisplayHeightMin, chatDisplayHeightMax)
}

/** 由第二栏宽度推出完整三栏宽度（第一栏固定，第三栏吃掉剩余）。 */
export function buildColumnWidths(sideWidth: number): number[] {
  const side = clampSideWidth(sideWidth)

  return [chatRailWidth, side, 100 - chatRailWidth - side]
}

/**
 * 清洗 cookie 里的布局数据。
 *
 * **逐字段回落**：整体不是对象、数组长度不对、值不是有限数字，都只让对应字段用默认值。
 * 只读取第二栏宽度（第一、三栏由它推出来），并统一夹到合法区间 ——
 * 所以手改 cookie 塞进 `999` 之类的值也不会把界面撑坏。
 */
export function parseChatLayout(raw: unknown, fallback: ChatLayoutConfig): ChatLayoutConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {
      columnWidths: buildColumnWidths(fallback.columnWidths[1] ?? chatSideWidthMin),
      displayHeight: clampDisplayHeight(fallback.displayHeight),
    }
  }

  const record = raw as Record<string, unknown>
  const widths: unknown[] = Array.isArray(record.columnWidths) ? record.columnWidths : []
  const side = widths[1]

  return {
    columnWidths: buildColumnWidths(
      isFiniteNumber(side) ? side : (fallback.columnWidths[1] ?? chatSideWidthMin),
    ),
    displayHeight: clampDisplayHeight(
      isFiniteNumber(record.displayHeight) ? record.displayHeight : fallback.displayHeight,
    ),
  }
}
