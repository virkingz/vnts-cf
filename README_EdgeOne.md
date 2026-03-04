# VNTS 腾讯云 EdgeOne Pages 部署指南

本项目是基于 [vnts-cf](https://github.com/CMLiussss/vnts-cf) 适配的腾讯云 EdgeOne Pages 版本。

## 部署步骤

### 1. 准备工作
- 拥有腾讯云账号并开通 **EdgeOne** 服务。
- 在 EdgeOne 控制台中创建一个 **Pages** 项目。

### 2. 配置 KV 存储 (可选但推荐)
为了持久化保存网络状态和客户端信息，建议配置 KV 存储：
1. 在 EdgeOne 控制台进入 **KV 存储**。
2. 创建一个命名空间（Namespace），例如 `vnts_cache`。
3. 在 Pages 项目设置中，将该命名空间绑定到环境变量 `KV`。

### 3. 上传代码
1. 将 `node-functions` 目录上传到您的 Pages 项目代码库中。
2. 为了确保路由正确匹配，建议在 `node-functions` 根目录和 `node-functions/api` 目录下都保留 `[[default]].js`。
3. 确保目录结构如下：
   ```
   / (项目根目录)
   └── node-functions/
       ├── [[default]].js      (处理根路径请求)
       ├── api/
       │   └── [[default]].js  (处理 /api/* 路径请求)
       └── worker/
           ├── relay_room.js
           └── ... (其他核心代码)
   ```

### 4. 配置环境变量
在 EdgeOne Pages 项目设置中添加以下环境变量：

| 变量名 | 示例值 | 说明 |
| :--- | :--- | :--- |
| `WS_PATH` | `vnt` | WebSocket 连接路径 (默认为 vnt) |
| `LOG_PASSWORD` | `your_password` | 查看日志的密码 (留空则禁用日志端点) |
| `GATEWAY_NAME` | `EdgeOne-Relay` | 显示在设备列表中的网关名称 |
| `HEARTBEAT_INTERVAL` | `30` | 心跳检查间隔 (秒) |
| `CACHE_SAVE_INTERVAL` | `300` | 缓存保存到 KV 的间隔 (秒) |

### 5. 访问地址
部署完成后，您的 VNTS 服务地址支持以下两种形式：
- **直接访问**:
  - WebSocket: `wss://your-pages-domain.com/vnt`
  - 状态检查: `https://your-pages-domain.com/test`
  - 设备列表: `https://your-pages-domain.com/room`
- **API 前缀访问**:
  - WebSocket: `wss://your-pages-domain.com/api/vnt`
  - 状态检查: `https://your-pages-domain.com/api/test`
  - 设备列表: `https://your-pages-domain.com/api/room`

## 注意事项
- **404 错误修复**: 之前的版本可能因为路径匹配过于严格导致 404。新版本已优化路由逻辑，支持根路径和 `/api/` 路径。
- **WebSocket 限制**: EdgeOne Pages Functions 对 WebSocket 的连接数和持续时间可能有一定限制，请参考腾讯云官方文档。
- **冷启动**: 如果长时间没有请求，函数实例可能会被销毁。配置 KV 存储可以确保实例重启后能恢复之前的网络状态。
- **路径匹配**: 本适配版使用了 `[[default]].js` 贪婪匹配，它会捕获所有未被其他具体文件匹配的请求。
