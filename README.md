# 落朵大脑 · AI军团 桌面客户端

兴华 AI 军团·落朵大脑 的原生桌面客户端。基于 Electron + React 构建，连接到 AI 军团大脑服务器使用。

## 界面预览

- **智能体面板** — 查看全部 20 个 Agent，点击进入对话
- **对话** — 与任意 Agent 对话（调用 `/api/agent/{id}/execute`）
- **知识库** — 搜索浏览大脑知识
- **技能库** — 搜索浏览技能目录
- **设置** — 服务器地址、暗色模式、关于信息
- **系统托盘** — 关闭窗口时最小化到托盘，右键退出

## 快速开始

### 前提条件

- Node.js 18+（推荐 20+）
- 一个可访问的 AI 军团大脑服务器（默认 `https://tyb.ap100168.com`）

### 运行

```bash
# 1. 进入项目目录
cd luoduo-desktop

# 2. 安装依赖（仅首次）
pnpm install

# 3. 构建
pnpm run build

# 4. 启动
pnpm run start
```

### Windows/Mac 用户

如果不想装 Node.js，可以从项目构建出安装包：

```bash
# 构建安装包（在对应系统上执行）
pnpm run dist
```

产物位于 `release/` 目录：
- Windows: `release/落朵大脑·AI军团 Setup x.x.x.exe`
- macOS: `release/落朵大脑·AI军团 x.x.x.dmg`
- Linux: `release/落朵大脑·AI军团 x.x.x.AppImage`

## 默认服务器配置

| 项 | 值 |
|---|---|
| 默认地址 | `https://tyb.ap100168.com` |
| API 根路径 | `/api/` |
| 端口 | 8008（大脑） |

可在设置页面修改服务器地址。

## 目录结构

```
luoduo-desktop/
├── electron/          # Electron 主进程
│   ├── main.ts        # 窗口管理、系统托盘
│   └── preload.ts     # 安全桥接
├── src/               # React 前端
│   ├── main.tsx       # 入口
│   ├── App.tsx        # 路由布局
│   ├── api/           # API 客户端
│   ├── pages/         # 页面
│   ├── components/    # 组件
│   └── hooks/         # Hooks
├── resources/         # 图标资源
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Electron 28 |
| 前端框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3（暗色模式） |
| HTTP | Axios |
| 图标 | Lucide React |
| 打包 | electron-builder |

---

> 惠州市兴华科技有限公司 · 2026
