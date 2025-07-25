# GIS 应用开发项目

这是一个基于 Vue 3 + Vite 构建的现代化 GIS 应用开发项目，集成了 Cesium 三维地图引擎和 ECharts 数据可视化库。

## 技术栈

- **前端框架**：Vue 3 (使用 `<script setup>` 语法)
- **构建工具**：Vite 6
- **地图引擎**：Cesium 1.129.0
- **数据可视化**：ECharts 5.6.0
- **路由管理**：Vue Router 4
- **HTTP 客户端**：Axios
- **AI 集成**：OpenAI API
- **包管理器**：pnpm
- **后端服务**：Express.js

## 项目结构

```
├── public/          # 静态资源目录
│   ├── data/       # 数据文件目录
│   └── map/        # 导出的地图图片存储目录
├── src/             # 源代码目录
│   ├── api/         # API 接口定义
│   ├── assets/      # 项目资源文件
│   ├── components/  # 公共组件
│   │   └── house_details/      # 房源详情相关组件
│   ├── router/      # 路由配置
│   ├── utils/       # 工具函数
│   ├── views/       # 页面视图组件
│   ├── App.vue      # 根组件
│   └── main.js      # 入口文件
├── server.js        # Express 后端服务器
└── vite.config.js   # Vite 配置文件
```

## 功能特性

- 基于 Cesium 的三维地图展示
- 使用 ECharts 的数据可视化
- 集成 OpenAI API 的智能分析功能
- 基于 Leaflet 的地图展示
- 房源信息展示和筛选
- 收藏夹功能
- 地图导出功能
- 行政区划和小区筛选
- 响应式设计，支持多种设备
- 模块化的项目结构
- 现代化的开发体验

## 开发环境要求

- Node.js (推荐 v16.0.0 或更高版本)
- pnpm 包管理器

## 安装和运行

1. 安装依赖

```bash
pnpm install
```

2. 启动开发服务器（同时启动前端和后端）
```bash
node server.js
pnpm run dev
```

## 开发指南

- 使用 `<script setup>` 语法编写组件
- 遵循 Vue 3 组合式 API 的最佳实践
- 组件和视图文件使用 PascalCase 命名
- 工具函数和 API 接口使用 camelCase 命名

## 相关文档

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Cesium 文档](https://cesium.com/docs/)
- [Leaflet 文档](https://leafletjs.com/)
- [ECharts 文档](https://echarts.apache.org/zh/index.html)
- [Vue Router 文档](https://router.vuejs.org/)
- [Express.js 文档](https://expressjs.com/)

## IDE 支持

推荐使用 Visual Studio Code 进行开发，并安装以下插件：
- Volar (Vue 3 支持)
- ESLint
- Prettier

## 注意事项

1. 确保使用 pnpm 作为包管理器
2. 确保 public/data 目录下存在必要的数据文件
3. 访问 http://localhost:5173 查看应用

## 许可证

[待定]
