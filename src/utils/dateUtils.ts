/**
 * 將日期格式化為 "YYYY-MM-DD HH:mm" 格式 適合呈現於前端
 * @param date - 要格式化的日期
 * @returns 格式化後的日期字串
 * @example
 * formatDate(new Date("2024-01-01T10:00:00"))
 * // 返回: "2024-01-01 10:00"
 */
export function formatDate(date: Date): string {
  return date
    .toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "-");
}
