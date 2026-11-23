# GoCasting 微信小程序

钓鱼记录与工具类小程序 — 基于微信云开发，面向**个人主体**提审。

---

## 功能范围

| 功能 | 页面 | 形态 |
|---|---|---|
| 潮汐 / 海况 / 天气 / 出钓评分 | weather、go-score | 数据查询，仅供参考 |
| 鱼种图鉴 | species | 纯静态资料 |
| 装备参考库 | gear、gear-detail | 纯静态资料，展示品牌官方报价范围，无购买入口 |
| 渔获记录 / 统计 / 成就 | index、catch-log、catch-detail、profile | **仅本人可见** |
| 钓点地图 | spot-map | 精选钓点（管理员整理，仅供参考）+ 本人私有钓点 |
| 钓鱼榜单 | competition、competition-detail | 管理员录入，用户只读 |

> 不包含：用户公开钓点、公开渔获动态、评论/私信、赛事报名、奖品、支付、商城。
> 这些功能个人主体无法过审或不符合类目要求。

---

## 快速启动

### 1. 云开发环境

`miniprogram/app.js` 已配置环境 ID：

```js
env: 'cloud1-d4gkci99i21e9bfe9',
```

### 2. 高德 API Key

`cloudfunctions/getWeather` 与 `cloudfunctions/searchPlace` 优先读取环境变量：

```bash
AMAP_KEY=你的高德Web服务Key
```

未配置时会回退到仓库内的测试 Key，**上线前请配置环境变量并轮换 Key**。

申请：[高德开放平台](https://console.amap.com/dev/key/app) → Web 服务 Key。

### 2.1 和风天气（潮汐 + 天文/指数/预警）

需要配置凭据的云函数有 **两个**，环境变量互相独立，必须分别配置：

| 云函数 | 用途 |
|---|---|
| `getMarineData` | 验潮站潮汐，覆盖 Open-Meteo 模型潮位 |
| `getWeatherExtra` | 日出日落、月升月落、钓鱼指数、天气预警、分钟级降水 |

未配置或请求失败时自动降级：潮汐回退模型数据，天光回退本地推算，预警/指数/降水隐藏，不影响功能。

在**每个**上述云函数的环境变量中配置（二选一）：

```bash
# 方式 A：JWT（Ed25519，推荐）
QWEATHER_API_HOST=你的专属APIHost（如 abcdefg.re.qweatherapi.com，不要带 https://）
QWEATHER_PROJECT_ID=项目ID
QWEATHER_KEY_ID=凭据ID
QWEATHER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# 方式 B：API KEY
QWEATHER_API_KEY=你的APIKey
```

- 控制台：[和风天气开发服务](https://dev.qweather.com/)，创建项目 → 创建凭据（Ed25519）→ 上传公钥。
- 验潮站列表已内置为 `tide-stations.json`（728 个站点，源自 [qwd/LocationList](https://github.com/qwd/LocationList) 的 `POI-Tide-Station-List-latest.csv`），按坐标本地就近匹配，不产生任何接口请求。
- 仅当列表未覆盖（150~400km 范围）时才回退 GeoAPI `POI lookup (type=TSTA)`：站点结果按 0.5° 网格缓存 30 天，无结果负缓存 7 天；GeoAPI 每月前 5 万次免费，超出 0.0007 元/次。
- 如需完全禁用 GeoAPI（只用内置列表），设置 `QWEATHER_GEO_FALLBACK=off`。
- 每个坐标匹配最近的验潮站（上限 150km），逐日潮汐缓存写入 `api_cache`（6 小时）。
- 潮汐文档过期后不删除，保留 **30 天**作为历史存档；超出保留期的文档按站每天自动清理一次。过去 7 天优先读取验潮站存档，缺失时回退模型值。
- `allDays[]` 每天带 `tideSource`：`qweather`（验潮站预报）/ `qweather-archive`（验潮站存档）/ `model`（模型推算），页面逐日标注来源。
- 潮汐按 0.003 元/次计费，一次页面请求最多取 10 天；务必保留 `api_cache` 集合以免重复计费。

### 3. 创建数据库集合

| 集合名 | 数据权限 | 用途 |
|---|---|---|
| `catch_logs` | **仅创建者读写** | 私有渔获记录 |
| `fishing_spots` | **仅创建者读写** | 本人私有钓点 |
| `official_spots` | 所有用户可读，仅云函数可写 | 精选钓点（管理员整理，仅供参考） |
| `spot_reports` | 仅云函数可写，仅管理员可读 | 钓点纠错反馈 |
| `gear_series` | 所有用户可读，仅管理员写 | 装备系列 |
| `gear_models` | 所有用户可读，仅管理员写 | 装备型号 |
| `api_cache` | 仅管理员/云函数 | 第三方接口缓存 |
| `api_usage_logs` | 仅管理员/云函数 | 接口调用日志 |

现有榜单相关集合保持原配置：`competitions`、`competition_entries`、`admin_config`、`permission_requests`、`users`。

> `catch_logs` 与 `fishing_spots` 必须设为「仅创建者读写」，否则私有记录可能被其他用户读取。
> `official_spots` 需设为「所有用户可读」，否则普通用户看不到精选钓点；其写入统一走 `addOfficialSpot` 云函数并校验管理员身份。榜单与地图详情均不展示精选钓点的精确坐标（仅管理员可见），避免泄露钓位。

### 4. 部署云函数

在开发者工具中右键 `cloudfunctions` 下目录 → 上传并部署（云端安装依赖）：

- `getMarineData`（Open-Meteo 海况 + 和风天气潮汐）
- `getWeather`（高德实况 + 预报）
- `getWeatherForecast`（Open-Meteo，气压/风速/降水）
- `getWeatherExtra`（和风天文/钓鱼指数/预警/分钟降水，新增；需单独配置和风凭据）
- `searchPlace`（高德 POI / 城市搜索）
- `seedGearData`（装备参考数据，仅超级管理员可执行）
- `checkImage`、`checkText`（内容安全）
- `addOfficialSpot`（精选钓点录入/编辑/删除 + 钓点纠错，需部署）
- 榜单相关：`checkPermission`、`submissionService`、`reviewPermission` 等

### 5. 初始化装备数据

用超级管理员账号进入「装备」Tab，点击「初始化装备数据」；或直接在云开发控制台调用 `seedGearData`。非管理员调用会被拒绝。

---

## 提审要点（个人主体）

1. **服务类目**：已确定为「工具 > 信息查询」；页面文案与功能保持信息查询/记录工具定位，不出现赛事报名、交易、社区等表述。
2. **定位权限**：`app.json` 已声明 `getLocation`、`chooseLocation`。需在公众平台「开发-接口设置」申请位置接口，并在「用户隐私保护指引」中同步声明。
3. **隐私指引**：小程序内已内置 `pages/privacy/privacy` 隐私政策页与首次使用弹窗（`components/privacy-popup`，随 5 个 Tab 页加载）；`app.json` 已开启 `__usePrivacyCheck__`。公众平台后台需填写同名《小程序用户隐私保护指引》，并声明位置、相册、摄像头、头像昵称等实际调用的信息类型，否则对应接口会被禁用。仓库根目录 [隐私保护指引.md](../隐私保护指引.md) 为后台填写底稿，提交前补全联系邮箱与运营主体。
4. **内容安全**：所有上传图片先过 `checkImage`；公开榜单文字过 `checkText`。
5. **免责声明**：潮汐/天气/评分数据仅供参考，不构成出钓或安全保证；页面保留数据来源说明。小程序内已内置 `pages/disclaimer/disclaimer` 免责声明页（入口：我的 → 免责声明，钓点页首次进入弹层），覆盖数据误差、钓点合法性、禁渔区/保护区、人身财产风险、禁止电毒炸锚鱼与多杆多钩、第三方数据来源及责任限制。钓点统一表述为「精选钓点（管理员整理，仅供参考）」，不使用「官方钓点」。
6. **不做公开 UGC**：个人渔获、钓点默认仅本人可见；不要新增公开动态、评论区、钓点共享。
7. **第三方数据**：Open-Meteo 免费额度面向非商业用途，且服务位于境外，查询时会传输经纬度坐标；如审核问询需说明用途，后续商业化建议改用境内数据源或购买商业授权。高德数据需保留来源标识。

---

## 注意事项

- 装备库只做参数与官方报价范围参考，不提供价格建议、购买链接或跳转电商；价格注明来自禧玛诺/达亿瓦官方网站，以官方页面为准。
- 分享菜单在渔获记录相关页面已关闭，仅管理员可分享榜单。
- 小程序名称与文案避免使用「赛事」「比赛报名」「奖品」等表述，统一使用「榜单」「记录」。
