import { RelayRoom } from "../worker/relay_room";

// 模拟 Durable Object 的状态管理，使用全局变量（在单个实例内持久）
// 注意：EdgeOne Pages Functions 可能会在不同请求间重用实例，但也可能销毁
let relayRoomInstance = null;

export const onRequest = async (context) => {
  const { request, env } = context;
  
  // 自动设置全局环境变量，让 logger 能够读取
  if (typeof globalThis !== "undefined") {
    globalThis.env = env;
  }

  // 初始化或获取 RelayRoom 实例
  if (!relayRoomInstance) {
    const mockState = {
      storage: {
        get: async (key) => {
          if (env.KV) {
            try {
              return await env.KV.get(key, { type: "json" });
            } catch (e) {
              console.error("KV Get Error:", e);
              return null;
            }
          }
          return null;
        },
        put: async (key, value) => {
          if (env.KV) {
            try {
              await env.KV.put(key, JSON.stringify(value));
            } catch (e) {
              console.error("KV Put Error:", e);
            }
          }
        },
        delete: async (key) => {
          if (env.KV) {
            try {
              await env.KV.delete(key);
            } catch (e) {
              console.error("KV Delete Error:", e);
            }
          }
        },
        setAlarm: async () => {},
      }
    };
    relayRoomInstance = new RelayRoom(mockState, env);
    await relayRoomInstance.init();
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // 统一处理路径匹配，支持直接访问和 /api/ 前缀访问
  const wsPath = env.WS_PATH || "vnt";
  
  // 检查是否是 WebSocket 升级请求
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
    if (pathname === `/${wsPath}` || pathname === `/${wsPath}/` || 
        pathname === `/api/${wsPath}` || pathname === `/api/${wsPath}/`) {
      return relayRoomInstance.fetch(request);
    }
  }

  // 健康检查
  if (pathname === "/test" || pathname === "/api/test") {
    return relayRoomInstance.fetch(request);
  }

  // 设备列表查询
  if (pathname === "/room" || pathname === "/api/room") {
    return relayRoomInstance.fetch(request);
  }

  // 日志端点
  if (pathname === "/log" || pathname === "/api/log" || 
      pathname === "/log/clear" || pathname === "/api/log/clear") {
    if (!env.LOG_PASSWORD || env.LOG_PASSWORD.trim() === "") {
      return new Response("Not found", { status: 404 });
    }
    return relayRoomInstance.fetch(request);
  }

  // 默认响应，用于验证函数是否正常运行
  return new Response(`VNTS EdgeOne Relay is running.\nPath: ${pathname}\nTime: ${new Date().toISOString()}`, { 
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
