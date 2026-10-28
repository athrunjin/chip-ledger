# 0002. 前端技术栈：React + Vite + TanStack Router + Tailwind

- 状态：已采纳
- 日期：2026-10-28

## 背景

优先考虑长期扩展性：以后要加玩家端、原生 App、更多数据记录功能。

## 考虑过的选项

- **框架**：React（生态最大，可平滑过渡到 React Native）/ Vue 3（上手快，中文移动组件库成熟）/ Svelte 5（代码少但生态小）
- **构建**：Vite 单页应用 / Next.js（核心卖点是服务端渲染，离线 PWA 用不上）/ TanStack Start（API 仍在频繁变化）
- **界面**：Tailwind + shadcn/ui（源码自有，无运行时）/ Ionic（原生风格但难定制）/ Ant Design Mobile / MUI
- **状态**：Zustand / Redux Toolkit / Jotai

## 决定

- React 19 + TypeScript（严格模式）
- Vite 单页应用 + TanStack Router（类型安全的文件路由，按路由自动拆包）
- Tailwind CSS v4；组件按 shadcn/ui 方式放在项目内自行维护
- Zustand 管理界面状态，TanStack Query 管理云端数据（缓存、重试、乐观更新）
- vite-plugin-pwa 生成 Service Worker 与清单
- 字体本地打包（@fontsource），不依赖 Google Fonts，以便国内访问

## 后果

- 不需要服务端渲染，前端可部署到任何静态托管。
- 界面组件自有，需要自己保证移动端触控尺寸（不小于 44px）和无障碍。
