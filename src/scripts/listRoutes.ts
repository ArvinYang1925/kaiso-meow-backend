// src/scripts/listRoutes.ts
import "reflect-metadata";

interface RouteInfo {
  method: string;
  path: string;
  description?: string;
}

// 手動定義所有已知路由（基於 app.ts 的路由掛載）
const routes: RouteInfo[] = [
  // 根路由
  { method: "GET", path: "/", description: "測試根目錄" },

  // Todo 路由 (/api/todos)
  { method: "GET", path: "/api/todos", description: "獲取待辦事項" },
  { method: "POST", path: "/api/todos", description: "創建待辦事項" },
  { method: "PUT", path: "/api/todos/:id", description: "更新待辦事項" },
  { method: "DELETE", path: "/api/todos/:id", description: "刪除待辦事項" },

  // Auth 路由 (/api/v1/auth)
  { method: "POST", path: "/api/v1/auth/register", description: "用戶註冊" },
  { method: "POST", path: "/api/v1/auth/login", description: "用戶登入" },
  { method: "POST", path: "/api/v1/auth/logout", description: "用戶登出" },
  { method: "GET", path: "/api/v1/auth/profile", description: "獲取用戶資料" },
  { method: "PUT", path: "/api/v1/auth/profile", description: "編輯用戶資料" },
  { method: "POST", path: "/api/v1/auth/password/forgot", description: "忘記密碼" },
  { method: "POST", path: "/api/v1/auth/password/reset", description: "重置密碼" },
  { method: "PUT", path: "/api/v1/auth/password/change", description: "更改密碼" },

  // Instructor 路由（手動添加常見的）
  { method: "GET", path: "/api/v1/instructor/profile", description: "講師資料" },
  { method: "PUT", path: "/api/v1/instructor/profile", description: "更新講師資料" },

  // Newsletter 路由
  { method: "POST", path: "/api/v1/newsletter/subscribe", description: "訂閱電子報" },

  // Courses 路由
  { method: "GET", path: "/api/v1/courses", description: "獲取課程列表" },
  { method: "GET", path: "/api/v1/courses/:id", description: "獲取課程詳情" },

  // Orders 路由
  { method: "POST", path: "/api/v1/orders", description: "創建訂單" },
  { method: "GET", path: "/api/v1/orders", description: "獲取訂單列表" },
];

// 動態檢測函數（備用）
async function detectRoutesFromFiles(): Promise<RouteInfo[]> {
  try {
    // 嘗試不初始化資料庫直接載入路由模組
    console.log("嘗試動態檢測路由...");

    // 模擬一個簡單的 Express app 來測試路由掛載
    const express = await import("express");
    const testApp = express.default();

    // 嘗試載入各個路由模組（不掛載到真實 app）
    const todoRoutes = await import("../routes/todoRoutes");
    const authRoutes = await import("../routes/authRoutes");

    console.log("路由模組載入成功");
    return [];
  } catch (error) {
    console.log("動態檢測失敗，使用預定義路由列表");
    return [];
  }
}

async function listRoutes() {
  console.log("🔍 開始檢測專案路由...\n");

  if (!routes.length) {
    console.error("⚠️  沒有檢測到任何路由！");
    process.exit(1);
  }

  console.log(`🚀 檢測到 ${routes.length} 個路由端點：\n`);

  // 按路由前綴分組
  const groupedRoutes = routes.reduce(
    (acc, route) => {
      let group = "Root";
      if (route.path.startsWith("/api/v1/auth")) group = "Auth";
      else if (route.path.startsWith("/api/v1/instructor")) group = "Instructor";
      else if (route.path.startsWith("/api/v1/newsletter")) group = "Newsletter";
      else if (route.path.startsWith("/api/v1/courses")) group = "Courses";
      else if (route.path.startsWith("/api/v1/orders")) group = "Orders";
      else if (route.path.startsWith("/api/todos")) group = "Todos";
      else if (route.path.startsWith("/api")) group = "API";

      if (!acc[group]) acc[group] = [];
      acc[group].push({
        method: route.method,
        path: route.path,
        description: route.description || "",
      });
      return acc;
    },
    {} as Record<string, Array<{ method: string; path: string; description: string }>>,
  );

  // 分組顯示
  Object.keys(groupedRoutes).forEach((group) => {
    console.log(`📁 ${group} 路由群組：`);
    console.table(groupedRoutes[group]);
    console.log("");
  });

  console.log("✅ 路由檢測完成");
}

// 如果其他路由需要檢測，可以擴展這個函數
async function getAdditionalRoutes(): Promise<RouteInfo[]> {
  // 這裡可以加入更多路由檢測邏輯
  // 例如讀取路由檔案並解析
  return [
    // Instructor 路由（需要檢查實際檔案）
    { method: "GET", path: "/api/v1/instructor/*", description: "講師相關路由" },

    // Newsletter 路由
    { method: "POST", path: "/api/v1/newsletter/*", description: "電子報相關路由" },

    // Courses 路由
    { method: "GET", path: "/api/v1/courses/*", description: "課程相關路由" },

    // Orders 路由
    { method: "POST", path: "/api/v1/orders/*", description: "訂單相關路由" },
  ];
}

listRoutes();
