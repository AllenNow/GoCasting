# GoCasting 微信小程序

远投海钓助手小程序端 — 基于微信云开发

---

## 项目结构

```
wechat/
├── miniprogram/
│   ├── app.js / app.json / app.wxss   # 入口、路由、全局样式
│   └── pages/
│       ├── index/      # 渔获列表首页
│       ├── catch-log/  # 渔获记录表单（新建/编辑/分享卡片）
│       ├── spot-map/   # 钓点地图
│       ├── gear/       # 装备参考数据库
│       ├── weather/    # 天气+潮汐仪表板
│       └── profile/    # 个人中心+成就徽章
└── cloudfunctions/
    ├── getWeather/         # 调用高德天气 API
    ├── getCatchStats/      # 聚合渔获统计
    └── seedReferenceData/  # 一次性写入装备参考数据
```

---

## 快速启动

### 1. 填写云开发环境 ID

编辑 `miniprogram/app.js` 第 9 行：

```js
env: 'cloud1-d4gkci99i21e9bfe9',   // ← 已配置
```

### 2. 配置高德天气 API Key

编辑 `cloudfunctions/getWeather/index.js` 第 9 行：

```js
const AMAP_KEY = 'YOUR_AMAP_WEB_KEY_HERE';  // ← 替换这里
```

**申请步骤：**
1. 访问 [高德开放平台](https://console.amap.com/dev/key/app)
2. 登录 → 创建应用 → 添加 Key
3. 服务平台选 **「Web 服务」**（不是 Android/iOS）
4. 复制 Key 填入上方位置

**用到的 API：**
- 逆地理编码：`/v3/geocode/regeo`（将坐标转城市名）
- 天气查询：`/v3/weather/weatherInfo`（实况 + 预报）

### 3. 云开发控制台 — 创建数据库集合

在微信开发者工具 → 云开发 → 数据库，创建以下集合：

| 集合名 | 数据权限 | 用途 |
|--------|---------|------|
| `catch_logs` | 仅创建者读写 | 渔获记录 |
| `fishing_spots` | 创建者可写，所有用户可读 | 钓点数据 |
| `reels_reference` | **所有用户可读**，仅管理员写 | 渔轮参考 |
| `rods_reference` | **所有用户可读**，仅管理员写 | 渔竿参考 |

> ⚠️ `reels_reference` 和 `rods_reference` 必须设为「所有用户可读」，否则装备页无法加载数据。

**设置方法：** 点击集合 → 数据权限 Tab → 选择「所有用户可读，仅创建者可写」

### 4. 部署云函数

在微信开发者工具的 cloudfunctions 目录，分别右键每个云函数文件夹 → **上传并部署（云端安装依赖）**：

- `getWeather`（需先填好 API Key）
- `getCatchStats`
- `seedReferenceData`

### 5. 初始化装备参考数据

小程序运行后，进入「装备」Tab，如果显示「数据库为空」，点击**「初始化装备数据」**按钮，将自动调用 `seedReferenceData` 云函数写入 45 款渔轮 + 54 款渔竿数据。

---

## 功能清单

| 功能 | 页面 | 状态 |
|------|------|------|
| 渔获列表 + 骨架屏 | index | ✅ |
| 渔获记录（新建/编辑/删除） | catch-log | ✅ |
| 渔获照片上传到云存储 | catch-log | ✅ |
| 渔获分享卡片（Canvas） | catch-log | ✅ |
| 钓点地图（长按添加/点击详情/导航） | spot-map | ✅ |
| GPS 定位 | spot-map | ✅ |
| 渔轮/渔竿参考数据库浏览 + 筛选 | gear | ✅ |
| 天气仪表板 + 钓鱼指数 | weather | ✅ |
| 潮汐预测（谐波算法，离线可用） | weather | ✅ |
| 3天天气预报 | weather | ✅ |
| 个人统计 + 成就徽章（13个） | profile | ✅ |
| 微信分享 | profile | ✅ |
| 聚合统计云函数 | getCatchStats | ✅ |

---

## 注意事项

- **小程序类目**：需在微信公众平台将服务类目设置为「工具 > 记账」或「运动健康」类，否则某些功能（如地图、定位）审核时可能需要额外说明。
- **渔具商城**：微信小程序不允许跳转淘宝/抖音等第三方电商 App。如需商城功能，请开通**微信小商店**。
- **隐私权限**：使用了定位权限（`scope.userLocation`），已在 `app.json` 声明，审核时需说明用途（地图和天气功能）。
