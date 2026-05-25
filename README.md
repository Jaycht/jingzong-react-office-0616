# 经侦大队工作记录管理系统

县级经侦大队全岗位工作记录系统，支持 Electron 桌面端和网页版。

## 技术栈

React 19 + TypeScript + Vite 8 + Ant Design 6 + Zustand + ECharts + Electron

## 快速开始

```bash
npm install
npm run dev          # 开发模式
npm run build:web    # 构建网页版（产出 dist/ + standalone.html）
```

## 两种运行方式

### 1. 网页版（依赖 Node.js + 浏览器）

```bash
npm run build:web
# 然后双击 start.vbs
```

或直接打开 `dist/index.html`（注意：部分浏览器需通过 HTTP 服务打开）。

### 2. Electron 桌面版（独立 .exe，无需任何依赖）

由 GitHub Actions 自动构建，在 Releases 页面下载：
- `经侦大队工作记录管理系统 Setup x.x.x.exe` — 安装包
- `经侦大队工作记录管理系统-便携版-x.x.x.exe` — 免安装版

## 构建自动递增版本号

每次 `npm run build` 自动补丁位 +1，同步更新软件内的版本号和更新日志。

## 项目结构

```
src/
├── components/    # UI 组件
├── pages/         # 页面
├── store/         # Zustand 状态管理
├── moduleConfig.ts # 部门/模块定义
└── version.ts     # 版本号 + 变更日志
electron/          # Electron 主进程
.github/workflows/ # GitHub Actions 自动构建
```

## License

MIT
