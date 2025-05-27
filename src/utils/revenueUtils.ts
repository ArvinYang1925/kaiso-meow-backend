import { Order } from "../entities/Order";

export interface GroupedRevenueData {
  orders: Order[];
  totalRevenue: number;
}

export interface RevenueDataPoint {
  intervalStart: string;
  intervalEnd: string;
  orderCount: number;
  totalRevenue: number;
}

export interface RevenueSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

/**
 * 計算週一為週開始的日期
 */
function getWeekStart(date: Date): Date {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = dateOnly.getDay(); // 0=週日, 1=週一, ..., 6=週六

  let daysToMonday;
  if (dayOfWeek === 0) {
    daysToMonday = -6; // 週日往前推6天到週一
  } else {
    daysToMonday = 1 - dayOfWeek; // 其他天往前推到週一
  }

  const weekStart = new Date(dateOnly);
  weekStart.setDate(dateOnly.getDate() + daysToMonday);
  return weekStart;
}

/**
 * 將日期轉換為本地時間的 YYYY-MM-DD 格式
 */
function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 根據時間間隔生成 periodKey
 */
function generatePeriodKey(date: Date, interval: "day" | "week" | "month"): string {
  switch (interval) {
    case "day":
      return formatDateToLocal(date); // 使用本地時間格式
    case "week": {
      const weekStart = getWeekStart(date);
      return formatDateToLocal(weekStart); // 使用本地時間格式
    }
    case "month":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    default:
      return formatDateToLocal(date); // 使用本地時間格式
  }
}

/**
 * 將訂單按時間間隔分組
 */
export function groupOrdersByInterval(orders: Order[], interval: "day" | "week" | "month"): Map<string, GroupedRevenueData> {
  const groupedData = new Map<string, GroupedRevenueData>();

  orders.forEach((order) => {
    const paidDate = new Date(order.paidAt!);
    const periodKey = generatePeriodKey(paidDate, interval);

    if (!groupedData.has(periodKey)) {
      groupedData.set(periodKey, { orders: [], totalRevenue: 0 });
    }

    const group = groupedData.get(periodKey)!;
    group.orders.push(order);
    group.totalRevenue += parseFloat(order.orderPrice.toString());
  });

  return groupedData;
}

/**
 * 格式化分組資料為回傳格式
 */
export function formatRevenueData(groupedData: Map<string, GroupedRevenueData>, interval: "day" | "week" | "month"): RevenueDataPoint[] {
  return Array.from(groupedData.entries())
    .map(([period, data]) => {
      let intervalStart: string;
      let intervalEnd: string;

      switch (interval) {
        case "day":
          intervalStart = period; // 已經是 YYYY-MM-DD 格式
          intervalEnd = period; // 已經是 YYYY-MM-DD 格式
          break;
        case "week": {
          // period 已經是週一的日期 (YYYY-MM-DD 格式)，直接使用
          intervalStart = period;
          const weekEnd = new Date(period);
          weekEnd.setDate(weekEnd.getDate() + 6); // 週一 + 6 天 = 週日
          intervalEnd = formatDateToLocal(weekEnd); // 使用本地時間格式
          break;
        }
        case "month": {
          const [year, month] = period.split("-");
          const monthStartDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          const monthEndDate = new Date(parseInt(year), parseInt(month), 0);
          intervalStart = formatDateToLocal(monthStartDate); // 使用本地時間格式
          intervalEnd = formatDateToLocal(monthEndDate); // 使用本地時間格式
          break;
        }
        default:
          intervalStart = period;
          intervalEnd = period;
      }

      return {
        intervalStart,
        intervalEnd,
        orderCount: data.orders.length,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
      };
    })
    .sort((a, b) => a.intervalStart.localeCompare(b.intervalStart));
}

/**
 * 計算收益總計
 */
export function calculateRevenueSummary(orders: Order[]): RevenueSummary {
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.orderPrice.toString()), 0);

  return {
    totalOrders: orders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
  };
}
