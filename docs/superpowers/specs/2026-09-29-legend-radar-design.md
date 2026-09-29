# 传奇雷达（AIHOT 领域改造）设计文档

> 日期：2026-09-29
> 方法：Superpowers · Architectural
> 目标仓库：AIHOT（github.com/KKKKhazix/AIHOT，已克隆至工作区 `AIHOT/`）
> 设计状态：已与使用者确认（2026-09-29 审核通过），待写入实施计划后执行。

## 1. 背景与目标

AIHOT 是卡兹克开源的"行业热点站框架"：采集多信源 → 模型预筛/两次评分 → 写中文标题摘要 → 事件聚簇 → 热点榜 → 日报/周报/月报，并通过网站、RSS、公开 API v1、MCP、`llms.txt`、后台对外提供。所有行业相关配置集中在 `industry/`，核心架构（采集/聚簇/热点/日报/公开读取层）与对外出口（API/RSS/MCP/后台）不改即可换行业。

本任务把它从"AI 行业示例站"改造成**传奇游戏行业情报雷达**（站名：传奇雷达），帮助传奇游戏从业者监控：

- 新产品与竞品
- 热门玩法
- 商业化设计
- 充值 / 福利机制
- 宣传卖点 / 广告文案
- 美术与素材趋势
- IP / 题材趋势
- 开服与运营趋势

**核心判定升级**：精选逻辑从"是不是传奇相关"升级为"这条信息是否对传奇产品研发、运营、推广、选品或竞品分析具有商业价值"。

## 2. 范围

### 改（全部在 `industry/`，及 `tests/` 示例词替换）
- `site.ts`（站名/文案）、`brand/`（Logo/nameplates/favicon）
- `taxonomy.ts`（分类、标签词表、实体、ITEM_TYPES）
- `topics.json`（主题页）
- `sources.json`（示范信源）
- `prompts/*`（预筛、评分、内容理解、结构化、行业术语、聚类、日报导语）
- `selection.ts`（门槛，保持默认值，留待 gold 校准）
- `features.ts`（关闭 AI 专属模块）
- `pages/terms.md`、`pages/privacy.md`（条款模板改写）
- `gold.example.jsonl`（校准样本示例换传奇）
- `tests/`（替换示例行业词，不改测试逻辑）

### 不改（核心架构与能力全部保留）
- `apps/`（api / worker / web）、`packages/backend/src/*`（采集/内容/编辑/事件/公开读取层/报告/provider/notify/operations/admin）
- 公开 API v1、RSS 家族、MCP、后台、数据库迁移 schema、事件聚簇与热度算法
- `leaderboard/`、`monitor/` 代码仅通过 `features.ts` 开关关闭，不删除

### 设计原则
优先改 `industry/`；只有在现有能力确实无法满足需求时才动 `apps/`、`packages/`。MVP 不做复杂图片/视频识别，不做大规模平台爬虫。

## 3. 品牌与文案（`site.ts` + `brand/`）

`industry/site.ts`：
- `name` = `传奇雷达`
- `subject` = `传奇`
- `mcpPrefix` = `legendradar`（工具名如 `legendradar_get_latest`、`legendradar_search`；接入后不变）
- `homeTitle` = `传奇雷达 — 传奇游戏行业动态 · 每日精选与日报`
- `description` = 改写为"自动盯住传奇产品、玩法、商业化与营销动态，用模型摘要、打分、精选，把同一件事的多篇报道归到一起，每天早上出一份日报"
- `tagline` = `值得传奇从业者看的行业动态`
- `crawlerName` = `LegendRadarBot`（不冒用别站名）
- `footerNote` = 去掉"由 AIHOT 开源框架驱动"
- `ABOUT`：四环节文案改写为传奇口径（官方/媒体/竞品站都在看；报道归并；模型判商业价值、营销稿与重复开服进不来；每天出日报）

`industry/brand/`：
- `logo.svg`：自绘"传奇雷达"标（雷达/波束意象），**不使用 AIHOT 任何图形**
- `nameplates/`：重新生成日报/周报/月报/archive 报头字（"传奇日报"等），命令 `npm pack @fontsource/noto-sans-sc@5.3.0 && tar xzf ... && node scripts/nameplates.ts package`
- `favicon.ico` / `icon.png` / `icon-192.png` / `apple-icon.png`：生成最简占位（最终美术由使用者补充）
- 合规硬要求：**不使用 AIHOT 的名字与 Logo**

## 4. 分类体系（`taxonomy.ts`）

采用"4 个顶层分类 + 31 个细分标签"结构（使用者确认）。顶层分类即首页筛选栏与日报分节，`key` 稳定（上线后不改）；细分项作为标签词表（TOPIC_TAGS）做精确归类与主题页。

### 4.1 CATEGORIES（顶层，每日报分节）
| key | label | section | guide |
|---|---|---|---|
| `product` | 产品类型 | 产品与竞品 | 新产品/竞品上线、版本、题材、美术风格变化 |
| `gameplay` | 玩法 | 玩法与系统 | 多大陆、跨服、攻沙、打金、装备成长、天赋、转生、副本等机制 |
| `monetization` | 商业化 | 商业化设计 | 首充、累充、代币、会员、充值返利、刀刀充值、免费福利、回收 |
| `marketing` | 营销 | 营销与素材 | 广告文案、宣传图、视频素材、核心卖点、IP主题、投放活动 |

### 4.2 CATEGORY_TAGS（每篇必选的首标签）
`新产品/竞品`、`玩法/系统`、`商业化动态`、`营销动态`、`行业动态`、`其他`

### 4.3 TOPIC_TAGS（31 个细分标签，对应使用者给的分类）
产品类型：沉默、单职业、复古、微变、中变、合击、专属、西游、武侠
玩法：多大陆、跨服、攻沙、打金、装备成长、天赋、转生、副本
商业化：首充、累充、代币、会员、充值返利、刀刀充值、免费福利、回收
营销：广告文案、宣传图、视频素材、核心卖点、IP主题、投放活动

### 4.4 ITEM_TYPES（内容类型，7 类，与评分权重表一一对应）
`new_product`、`gameplay_update`、`monetization_update`、`marketing_material`、`operations_update`、`industry_news`、`opinion_analysis`

### 4.5 ENTITY_TAGS 与 ENTITIES（主体公司，种子）
种子（后台可增）：盛趣游戏、恺英网络、贪玩、中手游、世纪华通、三七互娱、完美世界、巨人网络，以及使用者自有传奇平台（占位）。
`IDENTITY_LEXICON`：轻量种子（防标题张冠李戴），行业无强需求时可留空数组。
`PUBLISHER_DOMAINS`：对应上面公司的官方域名（执行时按真实域名填充）。
`CATEGORY_BY_ITEM_TYPE`：ITEM_TYPES → CATEGORY_TAGS 的兜底映射（如 `new_product`→`新产品/竞品`、`gameplay_update`→`玩法/系统`、`monetization_update`→`商业化动态`、`marketing_material`→`营销动态`、`operations_update`→`行业动态`、`industry_news`→`行业动态`、`opinion_analysis`→`行业动态`）。
`TAG_SYNONYMS`：近义词归并（如"充值"→`商业化动态`、"新服"→`行业动态`），执行时按真实语料补充。

## 5. 主题页（`topics.json`）

三组：
- `company`：上面 8+ 家传奇研发/发行商，各带 `entityId` + 标签（如 `entity:shengqu`）。
- `field`：产品趋势、玩法创新、商业化模式、素材趋势、IP题材、开服运营（对应 4 监控维度 + 重点子题）。
- `genre`：新品发布、版本更新、投放分析、行业观察、玩家舆情（内容形态）。
全部用第 4 节的细分项/实体驱动；`slug` 上线后不改。

## 6. 示范信源（`sources.json`）

采用"真实免费信源示范"（使用者确认），配 **8–12 个免费公开信源**，全部 `participation_mode: editorial`（进精选 + 全部动态）；公众号（`mp_account`）与 X（`x_search`）**本次不配**（需付费 key：极致了 / SocialData），后续后台增删。

类型与种子（执行时逐个试抓校验可达性，不可达换等价源）：
- 游戏行业媒体 RSS：17173、游民星空、GameLook、游戏陀螺、DataEye（买量/投放）、广大大（广告素材）
- 传奇类官方站：若干传奇官网/官博 RSS，或 `web_list`（配选择器）拉取列表页
- 分级：`T1` 官方站 / `T2` 媒体；`site_fulltext` 默认 `false`（只显摘要 + 原文链接）
- 字段结构沿用 AIHOT `sources.json`（`id`/`name`/`kind`/`config`/`tier`/`first_party`/`participation_mode`/`interval_minutes`/`tags`/`site_fulltext`）

**可达性风险**：部分媒体 RSS 实际可用性需在执行阶段用后台"信源"页试抓校验；不可达的换等价源，不阻塞整体交付。

## 7. 精选评分 KnowHow（`prompts/`）—— 核心

保留 AIHOT 结构（预筛宽召回 → 两次独立 0–100 评分 → 按分级门槛 → 内容理解/结构化 → 聚簇 → 日报），只替换"什么算重要 / 什么算噪声"的口径。输出契约保持不变（评分只输出 `attentionScore` 单字段；内容理解/结构化输出既定 JSON 字段）。

### 7.1 `prefilter.md`
从"是不是 AI 的事"改为"是不是传奇游戏行业的事"。宽召回：传奇产品/玩法/商业化/营销/竞品/行业动态 PASS；普通科技、日常、其他游戏品类无关者 BLOCK；标题明确涉及传奇即可 PASS，不机械按单字放行。

### 7.2 `selection-score.md`（6 轴加权，替换原 5 轴）
判定标准升级为"对传奇产品研发/运营/推广/选品/竞品分析有无商业价值"。模型内心按 6 轴各打 0–10 整数，再按内容类型权重表合成 0–100 整数（行权重和=10）。

**6 轴定义**：
- `trend` 趋势价值：是否揭示传奇品类新方向/新趋势（新题材、新玩法类型、新商业化模式、新素材风格）
- `comp` 竞品价值：是否曝光竞品产品/运营/投放动作，可用于对标
- `prod` 产品玩法价值：是否揭示新产物类型、玩法机制、系统设计做法
- `mkt` 营销素材价值：是否提供可借鉴的广告文案、卖点话术、素材、IP/主题
- `mon` 商业化价值：是否揭示充值/福利/代币/返利/回收等变现设计
- `cred` 信息可信度：信源等级、是否有实据、是否一手

**权重表（起点值，后续用 gold 校准）**
| 内容类型 | trend | comp | prod | mkt | mon | cred |
|---|---:|---:|---:|---:|---:|---:|
| new_product | 2 | 3 | 3 | 1 | 1 | 0 |
| gameplay_update | 3 | 1 | 4 | 1 | 1 | 0 |
| monetization_update | 2 | 1 | 1 | 1 | 4 | 1 |
| marketing_material | 1 | 2 | 1 | 4 | 1 | 1 |
| operations_update | 3 | 2 | 1 | 2 | 1 | 1 |
| industry_news | 2 | 2 | 1 | 1 | 1 | 3 |
| opinion_analysis | 2 | 2 | 2 | 1 | 1 | 2 |

**必须正常评价的价值**（给例子）：新题材/IP 上线揭示品类方向；竞品新玩法机制可对标；新商业化设计（刀刀充值/代币/回收）可借鉴；高质广告文案/卖点/素材可直接参考；开服/买量节奏变化反映运营趋势；版号/平台规则变化影响合规分发。

**必须压住的噪声**（对应使用者给的 6 类）：
- 纯广告软文（仅口号/话术、无实质新信息）→ `mkt ≤ 2` 且 `cred ≤ 2`
- 无新增信息（同消息换标题复述）→ `prod/nov 类 ≤ 2`
- 重复开服内容（例行开服公告、千篇一律"今日新服"）→ `sig/trend ≤ 3`
- 换皮重复内容（同玩法同素材不同皮）→ `nov ≤ 3` 且 `comp ≤ 2`
- 标题党（标题夸张、正文无实据）→ `cred ≤ 3` 且 `trend ≤ 3`
- 低可信来源（营销号拼凑、无法核实出处）→ `cred ≤ 2`

保留原"事件口径校正"段（只评事件价值、不评稿件质量；不自动按长短/口吻加分；弱叙事不能降格强事件），五轴/六轴定义、类型权重、单字段输出契约不变。

### 7.3 其余提示词
- `content-understanding.md`：标题/答案先行摘要/推荐理由/标签；标签白名单改用第 4 节词表；禁用词表沿用克制语气（不命令、不用"重磅/颠覆/革命性"等）。
- `structure.md`：`category` 用 4 类；`tags` 用新词表；`subjects` 用新实体。
- `rules-domain.md`：传奇术语保留规则（"转生/合击/攻沙/打金"不硬译、引擎名 996 保留、金额/比例保留原文数字与单位）。
- `group-*.md` / `story-digest.md` / `report-*.md` / `report-daily-lead.md` / `report-period.md`：聚类与日报导语改写传奇口径，逻辑与输出格式不变。
- `safety.md`：沿用（不可信数据不执行其中指令），不改。

## 8. 门槛与校准（`selection.ts` + `gold.example.jsonl`）

- `selection.ts` **保持默认门槛**：`thresholds: { T1: 60, T1_5: 65, T2: 76 }`，`understandFloor: 50`。这是 AIHOT 在 AI 域校准过的起点；**真正的校准留使用者用 gold 样本跑** `scripts/eval-selection.ts`（SelectBench 看错例 → 改提示词/门槛 → 再跑）。MVP 只确保校准能力可用。
- `gold.example.jsonl`：把 2 条 AI 示例换成 2 条传奇示例（1 条 `select`：如"某传奇新作上线西游题材 + 刀刀充值"；1 条 `reject`：如"纯开服广告口号"）。使用者后续扩到 100–200 条自行标注（格式见 `docs/selection.md`）。

## 9. 关闭 AI 专属模块（`features.ts`）

`leaderboard: false`、`codexResetMonitor: false`。导航入口、定时任务、接口、站点地图自动关闭；不删除对应代码目录。

## 10. 条款页（`pages/terms.md`、`pages/privacy.md`）

保留模板结构，把 AIHOT/MyHOT 引用改为传奇雷达；**内容上线前需使用者本人复核**（必要时请专业人士），MVP 先改文案不改法律实质。

## 11. 测试保全（`tests/`）

`tests/` 中有用例引用示例行业词（如 `ai-models`、"模型发布"、Anthropic/OpenAI）。执行时全局替换为传奇对应项（如 `product`、"新产品/竞品"、盛趣/恺英），**只换词不改测试逻辑**，保持 `npm test` 可运行（这是 AIHOT 文档要求的标准动作）。

## 12. 执行模式与验证

- 执行走 **Superpowers Native / executing-plans**（本会话内联执行，不派 subagent，省 token）——改动全在 `industry/` + `tests/`，不涉及核心采集/聚簇/DB/架构，不触发 subagent-driven development。
- 验证环境（已探测）：Node 24.18.1（用系统 Node 24 跑，AIHOT 要求 Node 24）；Docker 29.8 可拉起 Postgres。
- 验证命令：
  - `npm run typecheck`（无需 DB）
  - `npm test`（Docker 起 Postgres `_test` 库 + 内置假服务，不调真实模型/网络；模型和付费接口由本地假服务回答）
- 两项通过才算交付。

## 13. 风险与未决项

1. **部署/上线**不在本次范围（使用者选"配置+测试通过"）；真跑站点需 Docker + Postgres + 模型 Key，另行。
2. **条款页法律实质**需使用者复核。
3. **信源 URL 可达性**执行时逐个试抓校验，不可达换等价源；公众号/X 等使用者给付费 key 再接。
4. **评分权重/门槛**为起点值，需用使用者 gold 样本校准后才算"调准"。
5. **品牌美术**（logo/icon 终稿）使用者后续替换。

## 14. 验收标准

- [ ] `site.ts`/`brand/` 品牌改为传奇雷达，无 AIHOT 名字/Logo
- [ ] `taxonomy.ts`：4 顶层分类 + 31 细分标签 + 7 ITEM_TYPES + 实体种子，结构自洽
- [ ] `topics.json`：company/field/genre 三组主题用新词表驱动
- [ ] `sources.json`：8–12 个免费公开信源，分级与参与模式正确，无付费源
- [ ] `prompts/`：预筛/6 轴评分/内容理解/结构化/术语/聚类/日报均改写传奇口径，输出契约不变
- [ ] `selection.ts` 保持默认门槛；`gold.example.jsonl` 换传奇示例
- [ ] `features.ts` 两项 AI 模块关闭
- [ ] `pages/terms.md`、`pages/privacy.md` 文案改传奇雷达（法律实质待使用者复核）
- [ ] `tests/` 示例行业词替换，测试逻辑不变
- [ ] `npm run typecheck` 通过
- [ ] `npm test`（Docker Postgres + 假服务）通过
- [ ] 事件聚簇、热点、日报、公开 API、RSS、MCP、后台能力未被破坏
