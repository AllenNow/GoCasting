# GoCasting 开发进度全览

> 最后更新：2026-07-21
> 项目：GoCasting — 远投海钓助手（Flutter iOS/Android + 微信小程序）

---

## 一、Flutter App 进度（iOS + Android）

### ✅ 已完成功能（V1–V8）

| 版本 | 功能模块 | 状态 |
|------|---------|------|
| **V1** | 装备推荐向导、兼容性检查、装备对比、参考数据库浏览 | ✅ |
| **V1** | 装备库存管理、使用日志、维护调度器 + 本地通知 | ✅ |
| **V1** | 潮汐预测（谐波算法）、月相/日出日落/Solunar | ✅ |
| **V1** | 出行规划仪表板、海滩数据库、新手引导 | ✅ |
| **V2** | 保修追踪 + 到期通知、收据/照片存储（image_picker）| ✅ |
| **V2** | 维护费用 + TCO 分析、折旧/估值引擎 | ✅ |
| **V2** | 零件级别追踪、维护教程（6篇）、专业维修状态追踪 | ✅ |
| **V2** | 季前检查清单、保险报告导出 | ✅ |
| **V3** | Go-Score 4因子评分、计算器工具箱（4个）| ✅ |
| **V3** | 绳结/钓组指南（8绳结+5钓组）、出行装载清单（5场景）| ✅ |
| **V3** | 鱼种图鉴（15种）、装备愿望单、远投距离追踪 | ✅ |
| **V4** | 渔获日志（记录+列表+统计）| ✅ |
| **V4** | 条件关联分析引擎（6维度+6洞察）| ✅ |
| **V5** | 高德地图集成（钓点标记+GPS）、实时天气+钓鱼指数 | ✅ |
| **V5** | 附近 POI 搜索（6类）、本地角色系统（5角色）| ✅ |
| **V5** | 暗色模式（跟随系统）| ✅ |
| **V6** | 成就系统（25成就/7等级/XP）、AI 钓况教练（规则引擎）| ✅ |
| **V6** | 社交分享卡片（5种模板，canvas → PNG → share_plus）| ✅ |
| **V7** | 数据统计仪表板、年度报告、个人挑战系统 | ✅ |
| **V8** | 每日运势、钓鱼人格测试（6Q/5类型）| ✅ |
| **V8** | 出钓热力图、个人钓鱼名片、趣味中心 Hub | ✅ |
| **基础设施** | 数据备份/恢复（.gcbak）、国际化（中英~230键）| ✅ |
| **基础设施** | 本地通知、双数据库（reference.db + user.db schema v3）| ✅ |

### ⚠️ Flutter 待完成事项

| 事项 | 优先级 | 说明 |
|------|-------|------|
| iOS 构建 bug | 🔴 高 | `amap_flutter_map` 与 Dart 3.12 不兼容（hashValues 已废弃），需替换地图方案 |
| JSON → reference.db 加载 | 🟡 中 | `ReferenceSeeder` 已实现，但 reference.db 初始数据还未完整种入 |
| 高德 API Key 配置 | 🟡 中 | `amap_service.dart`、`weather_service.dart` 中仍是占位符 |
| 部分页面 i18n 替换 | 🟢 低 | ARB 文件已完整（~230键），约18个页面待机械性替换 |

### 🔴 iOS 构建问题方案选项

`amap_flutter_map 3.0.0` 使用了 Dart 已废弃的 `hashValues`，在 Dart 3.12 中编译报错。
- **方案A（推荐）**：替换为 `flutter_map`（OpenStreetMap，纯 Dart，无兼容问题）
- **方案B**：降级 Flutter/Dart 版本（不推荐）
- **方案C**：等待 `amap_flutter_map` 官方更新

---

## 二、参考数据库

| 数据 | 数量 | 文件 |
|------|------|------|
| 远投渔轮 | **45款** | `assets/data/surf_reels_reference.json` |
| 远投渔竿 | **54款** | `assets/data/surf_rods_reference.json` |

**品牌覆盖：** Shimano（含 Surf Leader 2025、Kisu Special 2022、Activecast）、Daiwa（含 Castizm、Tournament Surf）、Penn、St. Croix

**待补充：**
- 更多 Daiwa 中国市场产品（达亿瓦官网动态渲染，无法直接抓取）
- Daiwa Tournament Surf 45 系列渔轮详细规格

---

## 三、微信小程序进度

### ✅ 已完成（Phase 1–3）

| Phase | 功能 | 状态 |
|-------|------|------|
| **Phase 1** | 渔获列表首页 + 骨架屏 | ✅ |
| **Phase 1** | 渔获记录表单（新建/编辑/删除/照片上传）| ✅ |
| **Phase 1** | 渔获分享卡片（Canvas 绘制 + 保存/分享）| ✅ |
| **Phase 1** | 钓点地图（原生腾讯地图 + 长按添加 + 导航）| ✅ |
| **Phase 1** | 个人中心（统计 + 成就徽章 13个 + 微信分享）| ✅ |
| **Phase 1** | 云函数：getCatchStats（聚合统计）| ✅ |
| **Phase 2** | 装备参考数据库（渔轮/渔竿浏览 + 三重筛选）| ✅ |
| **Phase 2** | 天气仪表板（天气卡片 + 钓鱼指数 + 潮汐条形图）| ✅ |
| **Phase 2** | 3天天气预报 | ✅ |
| **Phase 2** | 云函数：getWeather（高德天气 API，绕域名限制）| ✅ |
| **Phase 2** | 云函数：seedReferenceData（45轮+54竿写入云数据库）| ✅ |
| **Phase 3** | 首页天气快览入口卡片 | ✅ |

### ⚠️ 小程序待配置（用户手动）

| 步骤 | 说明 |
|------|------|
| 1. 高德 Web Key | 在 `cloudfunctions/getWeather/index.js` 第9行替换 `YOUR_AMAP_WEB_KEY_HERE` |
| 2. 创建云数据库集合 | `catch_logs`、`fishing_spots`（仅创建者读写）；`reels_reference`、`rods_reference`（**所有用户可读**）|
| 3. 部署云函数 | 右键上传 `getWeather`、`getCatchStats`、`seedReferenceData` |
| 4. 初始化装备数据 | 进入装备页点击「初始化装备数据」按钮 |

### 📋 小程序 Phase 4 已完成（2026-07-21）

| 功能 | 状态 |
|------|------|
| Go-Score 评分页（4因子+24h趋势+最佳时段+分享）| ✅ |
| 渔获月度趋势图 + 鱼种分布图（个人页，纯CSS）| ✅ |
| 鱼种图鉴（15种，详情弹窗，搜索）| ✅ |
| 公开钓点聚合（钓友钓点合并展示）| ✅ |
| 首页4宫格快捷工具（Go-Score/鱼种/装备/钓点）| ✅ |
| 个人页功能菜单扩展（Go-Score/鱼种图鉴入口）| ✅ |

---

### 📋 小程序 Phase 5-6 待规划（完整版）

**Phase 5 — 核心体验补全（优先）：**

| 功能 | 重要性 | 说明 |
|------|-------|------|
| 渔获详情查看页 | 🔴 高 | 点击列表条目查看完整信息 |
| 钓点关联渔获记录 | 🔴 高 | 查看某个钓点历史渔获 |
| tabBar 加「规划」Tab | 🔴 高 | 整合天气+Go-Score+潮汐 |
| 渔获条件关联分析（简版）| 🟡 中 | 按潮汐/鱼种统计 |
| 出行清单页 | 🟡 中 | 按场景生成装备清单 |

**Phase 6 — 完整版收尾：**

| 功能 | 重要性 |
|------|-------|
| 装备详情页（规格+推荐搭配）| 🟡 中 |
| 个人名片海报分享 | 🟡 中 |
| 渔具推荐向导 | 🟡 中 |
| 订阅消息（出钓时段提醒）| 🟢 低 |
| 每日一钓（运势/技巧）| 🟢 低 |

---

## 四、技术架构快照

### Flutter App

```
框架：Flutter 3.44.8 / Dart 3.12.2
状态管理：GetX
数据库：Drift SQLite（reference.db 只读 + user.db 可写 schema v3）
地图：amap_flutter_map（⚠️ 有兼容问题）/ geolocator（GPS）
天气：高德天气 Web API
通知：flutter_local_notifications
分享：share_plus + RepaintBoundary 截图
```

### 微信小程序

```
平台：微信小程序 + 云开发
云环境 ID：cloud1-d4gkci99i21e9bfe9
AppID：wx97aaa3a8f799b48c
地图：原生 <map> 组件（腾讯地图，无需 Key）
天气：高德天气 Web API（通过 getWeather 云函数调用）
数据库：云开发 CloudBase（JSON 文档型）
云函数：getWeather / getCatchStats / seedReferenceData
```

---

## 五、人生规划文档

路径：`docs/人生规划/自由职业旅居人生规划.md`

核心目标：8年内通过渔具电商副业（关联 GoCasting）过渡到自由职业，实现双人国内旅居。

| 里程碑 | 时间 |
|--------|------|
| 应急金 ¥15,000 建立 | 2026 第3个月 |
| 债务清零（¥130,000 @ 3.2%）| 2028 年中 |
| 购入 Tesla Model Y 长续航 AWD | 2029 年初 |
| 渔具电商月盈利 ≥ ¥8,000 | 2031 年末 |
| 自由职业过渡 | 2033–2034 |
