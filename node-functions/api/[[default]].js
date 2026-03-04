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
    // 模拟 Cloudflare Durable Object 的 state 对象
    const mockState = {
      storage: {
        get: async (key) => {
          if (env.KV) {
            return await env.KV.get(key, { type: "json" });
          }
          return null;
        },
        put: async (key, value) => {
          if (env.KV) {
            await env.KV.put(key, JSON.stringify(value));
          }
        },
        delete: async (key) => {
          if (env.KV) {
            await env.KV.delete(key);
          }
        },
        // EdgeOne Pages 目前没有 Alarm 机制，这里留空
        setAlarm: async () => {},
      }
    };
    relayRoomInstance = new RelayRoom(mockState, env);
    await relayRoomInstance.init();
  }

  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  
  // 适配路径：EdgeOne Pages 的路径通常包含 /api/
  // 我们需要根据实际部署情况调整路径匹配逻辑
  const wsPath = env.WS_PATH || "vnt";
  
  // 检查是否是 WebSocket 升级请求
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
    if (pathname.endsWith(`/${wsPath}`) || pathname.endsWith(`/${wsPath}/`)) {
      return relayRoomInstance.fetch(request);
    }
  }

  // 健康检查
  if (pathname.endsWith("/test")) {
    return relayRoomInstance.fetch(request);
  }

  // 设备列表查询
  if (pathname.endsWith("/room")) {
    return relayRoomInstance.fetch(request);
  }

  // 日志端点
  if (pathname.endsWith("/log") || pathname.endsWith("/log/clear")) {
    if (!env.LOG_PASSWORD || env.LOG_PASSWORD.trim() === "") {
      return new Response("Not found", { status: 404 });
    }
    return relayRoomInstance.fetch(request);
  }

  return new Response("VNTS EdgeOne Relay is running. Path: " + pathname, { status: 200 });
};
