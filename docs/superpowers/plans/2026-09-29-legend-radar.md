# 传奇雷达领域改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把开源 AIHOT 框架改造成"传奇游戏行业情报雷达"（站名：传奇雷达），保留全部核心能力（采集/聚簇/热点/日报/API/RSS/MCP/后台），只替换 `industry/` 行业配置与 `tests/` 示例词。

**Architecture:** 不修改 `apps/`、`packages/`。所有改动限定在 `industry/`（站点身份、分类、主题、信源、提示词、门槛、品牌、条款、gold 样本）与 `tests/`（示例行业词替换）。精选判定从"是否传奇相关"升级为"有无商业价值"，评分由 5 轴改为 6 轴（趋势/竞品/产品玩法/营销素材/商业化/可信度）。

**Tech Stack:** Node.js 24（≥24.11，用系统 Node 24.18.1）、TypeScript、npm workspaces、PostgreSQL 17（Docker，仅 `_test` 库）、AIHOT 内置假服务（测试不调真实模型/网络）。

**Spec:** `docs/superpowers/specs/2026-09-29-legend-radar-design.md`

**执行方式（已与使用者确认）：** Superpowers Native / executing-plans —— 本会话内联执行，不派 subagent。因为改动全在 `industry/` + `tests/`，不涉及核心采集/聚簇/DB/架构，不触发 subagent-driven development。

## Global Constraints

- 不改 `apps/` 与 `packages/` 核心架构；只改 `industry/` 与 `tests/` 示例词。
- 评分 6 轴权重为**起点值**，最终需用使用者 gold 样本（`scripts/eval-selection.ts`）校准，不在本计划内。
- **不使用 AIHOT 名字与 Logo**（合规硬要求）：`site.ts`/`brand/`/`footerNote`/nameplates 不得含 AIHOT/MyHOT。
- 信源仅免费公开源（RSS / `web_list`）；公众号 `mp_account` 与 X `x_search` **不配**（需付费 key）。
- 运行用 Node 24.18.1；验证 = `npm run typecheck` + `npm test`（Docker Postgres `_test` + 内置假服务，不调真实模型/网络）。
- 每改完一个文件，`npm run typecheck` 必须仍通过（部分 tsc 工程会编译 `industry/`）。

## Review Focus

1. **标签词表不一致**：`taxonomy.ts` 的 `TOPIC_TAGS`/`CATEGORY_TAGS` 与 `prompts/` 里引用的白名单不符 → 模型打出词表外标签。测试：Task 2/5 后 grep `prompts/` 中引用的标签集合 ⊆ `taxonomy.ts` 导出。
2. **ITEM_TYPES 与评分权重 key 不一致**：`selection-score.md` 权重表 key 集合 ≠ `taxonomy.ts` 的 `ITEM_TYPES` → 评分权重查不到。测试：Task 2/5 后断言两者集合相等（小脚本或人工比对）。
3. **AIHOT 品牌残留**：`site.ts`/`brand/`/`footerNote`/nameplates 仍含 AIHOT/MyHOT → 合规风险。测试：Task 1 后 `grep -rin "aihot\|myhot" industry/site.ts industry/brand` 仅命中许可/说明性文字（如有）。
4. **测试示例词未替换**：`tests/` 仍引用 `ai-models`/"模型发布"/Anthropic/OpenAI → `npm test` 失败。测试：Task 10 后 `grep -rln "ai-models\|模型发布\|Anthropic" tests/` 为空。
5. **AI 专属模块未真正关闭**：`features.ts` 设 false 后导航/接口仍暴露 → 应 404。测试：Task 8 + Task 11 后 `npm run typecheck` 通过且现有相关测试仍绿（关闭逻辑由现有测试/类型覆盖）。

---

### Task 1: 环境与依赖基线

**Files:**
- 无新建；运行 `npm install`、起 Postgres、跑 migrate
- Verify: `tests/*.test.ts` 基线

**Interfaces:**
- 产出：可运行 `npm run typecheck` 与 `npm test` 的环境

- [ ] **Step 1: 确认 Node 版本**
  ```bash
  node -v   # 必须 >= 24.11；本机系统 Node 24.18.1
  ```
  Expected: 输出 v24.18.1

- [ ] **Step 2: 安装依赖**
  ```bash
  cd AIHOT && npm install
  ```
  Expected: 完成，生成 `node_modules/`

- [ ] **Step 3: 起 Postgres（Docker）并建 _test 库 + 迁移**
  ```bash
  docker run -d --name legendradar_pg -e POSTGRES_PASSWORD=pgpass -p 5432:5432 postgres:17
  # 等就绪后
  createdb -h 127.0.0.1 -p 5432 -U postgres legendradar_test   # 库名以 _test 结尾
  DATABASE_URL=postgres://postgres:pgpass@127.0.0.1:5432/legendradar_test node scripts/migrate.ts
  ```
  Expected: 迁移完成，无报错

- [ ] **Step 4: 跑 typecheck 建立绿基线**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误（编辑前基线必须绿）

- [ ] **Step 5: 跑基线测试（确认假服务可用）**
  ```bash
  DATABASE_URL=postgres://postgres:pgpass@127.0.0.1:5432/legendradar_test npm test
  ```
  Expected: 通过（此时仍是 AIHOT 默认行业，仅验证环境）

- [ ] **Step 6: 提交基线**
  ```bash
  git commit -m "chore: lock green typecheck/test baseline before domain swap"
  ```

### Task 2: 品牌与文案（site.ts + brand/）

**Files:**
- Modify: `industry/site.ts`
- Modify: `industry/brand/logo.svg`、`industry/brand/nameplates/*`（重新生成）、`industry/brand/favicon.ico`/`icon.png`/`icon-192.png`/`apple-icon.png`（最简占位）

**Interfaces:**
- 产出：`SITE` 常量被 `apps/web`、`apps/api`、`packages/backend` 读取；`name`/`subject`/`mcpPrefix` 全站使用
- 被 Task 5/6 提示词通过 `{{siteName}}` 引用

- [ ] **Step 1: 改写 `industry/site.ts`**
  按 spec §3：`name=传奇雷达`、`subject=传奇`、`mcpPrefix=legendradar`、`homeTitle`/`description`/`tagline`/`crawlerName=LegendRadarBot`/`footerNote` 去"AIHOT"、`ABOUT` 四环节改写传奇口径。
  Expected: 文件无 AIHOT/MyHOT 品牌残留

- [ ] **Step 2: 替换 `brand/logo.svg`**
  自绘"传奇雷达"SVG 标（雷达/波束意象），不使用 AIHOT 图形。
  Expected: SVG 有效，无 AIHOT 元素

- [ ] **Step 3: 重新生成 nameplates**
  ```bash
  npm pack @fontsource/noto-sans-sc@5.3.0 && tar xzf fontsource-noto-sans-sc-5.3.0.tgz
  node scripts/nameplates.ts package
  ```
  报头字改为"传奇日报/传奇周报/传奇月报/传奇归档"。
  Expected: `brand/nameplates/*.svg` 与 `index.json` 更新，文字为传奇雷达

- [ ] **Step 4: 生成最简 favicon/icon 占位**
  用脚本或工具生成 `favicon.ico`/`icon.png`/`icon-192.png`/`apple-icon.png` 最简占位（最终美术使用者补）。
  Expected: 四个文件存在且非 AIHOT 图

- [ ] **Step 5: 审计品牌残留 + typecheck**
  ```bash
  grep -rin "aihot\|myhot" industry/site.ts industry/brand || echo "CLEAN"
  npm run typecheck
  ```
  Expected: CLEAN；typecheck 0 错误

- [ ] **Step 6: 提交**
  ```bash
  git add -A industry/site.ts industry/brand && git commit -m "feat(brand): rename to 传奇雷达, drop AIHOT branding"
  ```

### Task 3: 分类体系（taxonomy.ts）

**Files:**
- Modify: `industry/taxonomy.ts`

**Interfaces:**
- 产出：`CATEGORIES`/`CATEGORY_TAGS`/`TOPIC_TAGS`/`ITEM_TYPES`/`ENTITIES`/`IDENTITY_LEXICON`/`PUBLISHER_DOMAINS`/`CATEGORY_BY_ITEM_TYPE`/`TAG_SYNONYMS` 被 `packages/backend/src/editorial`（标签、结构化）、`apps/web`（筛选栏/分节）、`prompts/structure.md`（白名单注入）消费
- 被 Task 5 评分权重表 key 必须 == `ITEM_TYPES`

- [ ] **Step 1: 写 CATEGORIES（4 顶层）**
  按 spec §4.1：`product`/`gameplay`/`monetization`/`marketing`，含 `key`/`label`/`section`/`guide`。
  Expected: 4 项，key 稳定

- [ ] **Step 2: 写 CATEGORY_TAGS / TOPIC_TAGS / ITEM_TYPES**
  按 spec §4.2–§4.4：`CATEGORY_TAGS`（6）、`TOPIC_TAGS`（31 项，见 §4.3）、`ITEM_TYPES`（7：`new_product`/`gameplay_update`/`monetization_update`/`marketing_material`/`operations_update`/`industry_news`/`opinion_analysis`）。
  Expected: TOPIC_TAGS 恰好 31 项；ITEM_TYPES 7 项

- [ ] **Step 3: 写实体与兜底映射**
  按 spec §4.5：`ENTITIES` 种子（盛趣/恺英/贪玩/中手游/世纪华通/三七互娱/完美世界/巨人网络 + 自有平台占位）、`IDENTITY_LEXICON`（轻量）、`PUBLISHER_DOMAINS`（按真实域名填）、`CATEGORY_BY_ITEM_TYPE`（ITEM_TYPES→CATEGORY_TAGS）、`TAG_SYNONYMS`（近义归并）。
  Expected: 映射自洽，无悬空 key

- [ ] **Step 4: 一致性断言**
  小脚本/人工比对：`ITEM_TYPES` 集合 == Task 5 权重表 key 集合；`TOPIC_TAGS` 内容与 spec §4.3 一致。
  Expected: 一致

- [ ] **Step 5: typecheck**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误

- [ ] **Step 6: 提交**
  ```bash
  git add industry/taxonomy.ts && git commit -m "feat(taxonomy): 传奇 4 类 + 31 细分标签 + 7 内容类型"
  ```

### Task 4: 主题页（topics.json）

**Files:**
- Modify: `industry/topics.json`

**Interfaces:**
- 产出：`/topics` 页与主题归类，按 `tags`/`entityId` 收内容；依赖 Task 3 的 `ENTITIES`/`TOPIC_TAGS`

- [ ] **Step 1: 写三组主题**
  按 spec §5：`company`（8+ 家传奇厂商，带 `entityId` + `entity:<id>` 标签）、`field`（产品趋势/玩法创新/商业化模式/素材趋势/IP题材/开服运营）、`genre`（新品发布/版本更新/投放分析/行业观察/玩家舆情）。`slug` 上线后不改。
  Expected: 三组 groups 齐全，topic 标签来自 Task 3 词表

- [ ] **Step 2: typecheck（若 topics 有类型校验）**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误

- [ ] **Step 3: 提交**
  ```bash
  git add industry/topics.json && git commit -m "feat(topics): 传奇公司/方向/形态主题页"
  ```

### Task 5: 精选评分核心提示词（prompts/）

**Files:**
- Modify: `industry/prompts/selection-score.md`、`prefilter.md`、`content-understanding.md`、`structure.md`、`rules-domain.md`

**Interfaces:**
- 产出：`selection-score.md` 的 6 轴权重表 key 必须 == `taxonomy.ts` 的 `ITEM_TYPES`（Task 3）
- 被 `packages/backend/src/editorial/analyze.ts` 读取打分；被 `structure.md` 注入 `{{categoryTags}}`/`{{topicTags}}`/`{{entities}}`

- [ ] **Step 1: 写 `prefilter.md`**
  按 spec §7.1：宽召回"是不是传奇游戏行业的事"，只拦明显无关。
  Expected: 输出契约 `{"label":"PASS|BLOCK|UNKNOWN","reason":...}` 不变

- [ ] **Step 2: 写 `selection-score.md`（6 轴）**
  按 spec §7.2：读者=传奇从业者；6 轴定义（trend/comp/prod/mkt/mon/cred）；**权重表**：
  | 类型 | trend | comp | prod | mkt | mon | cred |
  |---|---:|---:|---:|---:|---:|---:|
  | new_product | 2 | 3 | 3 | 1 | 1 | 0 |
  | gameplay_update | 3 | 1 | 4 | 1 | 1 | 0 |
  | monetization_update | 2 | 1 | 1 | 1 | 4 | 1 |
  | marketing_material | 1 | 2 | 1 | 4 | 1 | 1 |
  | operations_update | 3 | 2 | 1 | 2 | 1 | 1 |
  | industry_news | 2 | 2 | 1 | 1 | 1 | 3 |
  | opinion_analysis | 2 | 2 | 2 | 1 | 1 | 2 |
  "必须正常评价的价值"与"必须压住的噪声"（对应 6 类噪声）给传奇例子；保留"事件口径校正"段；输出仍仅 `attentionScore`。
  Expected: 权重表 key == ITEM_TYPES（7 项齐全）

- [ ] **Step 3: 写 `content-understanding.md`**
  按 spec §7.3：标题/摘要/推荐理由/标签；标签白名单改用 Task 3 词表；禁用词表沿用克制语气。
  Expected: `itemType` 七选一 == ITEM_TYPES；首标签 ∈ CATEGORY_TAGS

- [ ] **Step 4: 写 `structure.md`**
  按 spec §7.3：`category` 用 4 类；`tags` 用新词表；`subjects` 用新实体；输出字段不变。
  Expected: 引用 `{{categoryTags}}`/`{{topicTags}}`/`{{entities}}` 与 taxonomy 一致

- [ ] **Step 5: 写 `rules-domain.md`**
  按 spec §7.3：传奇术语保留（转生/合击/攻沙/打金不硬译、引擎名 996 保留、金额/比例保留原文数字单位）。
  Expected: 无 AI 术语残留

- [ ] **Step 6: 一致性审计 + typecheck**
  ```bash
  grep -rin "aihot\|myhot\|LLM\|Anthropic" industry/prompts || echo "CLEAN"
  npm run typecheck
  ```
  Expected: CLEAN（术语残留除外说明）；typecheck 0 错误

- [ ] **Step 7: 提交**
  ```bash
  git add industry/prompts/selection-score.md industry/prompts/prefilter.md industry/prompts/content-understanding.md industry/prompts/structure.md industry/prompts/rules-domain.md && git commit -m "feat(prompts): 传奇 6 轴商业价值评分 + 预筛/理解/结构化/术语"
  ```

### Task 6: 聚类与日报提示词（prompts/ 其余）

**Files:**
- Modify: `industry/prompts/group-definitions.md`、`group-method.md`、`group-pair.md`、`group-batch.md`、`group-signal.md`、`story-digest.md`、`report-daily-lead.md`、`report-period.md`、`summarize-*.md`、`translate-*.md`
- Keep: `safety.md`（不变）、`identity-context.md`（按需）

**Interfaces:**
- 产出：被 `packages/backend/src/events`（聚簇/综述）与 `packages/backend/src/reports`（日报/周报/月报）读取；逻辑与输出格式不变

- [ ] **Step 1: 改写聚类提示词**
  按 spec §7.3：把"同一件事"的口径与例子换成传奇语境（同一产品/版本/活动的多次报道、同一次开服/合服、同一条商业化改动的多方转述）；保留 SAME_OCCURRENCE/SAME_STORY/UNRELATED/ROUNDUP 定义。
  Expected: 聚类逻辑不变，仅例子传奇化

- [ ] **Step 2: 改写日报/综述提示词**
  按 spec §7.3：`report-daily-lead.md`/`report-period.md`/`story-digest.md` 导语与综述改写传奇口径（按 4 分类分节）；`summarize-*.md`/`translate-*.md` 术语同步。
  Expected: 输出格式不变

- [ ] **Step 3: typecheck + 审计**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误；无 AIHOT 残留

- [ ] **Step 4: 提交**
  ```bash
  git add industry/prompts/group-*.md industry/prompts/story-digest.md industry/prompts/report-*.md industry/prompts/summarize-*.md industry/prompts/translate-*.md && git commit -m "feat(prompts): 传奇聚类/综述/日报导语口径"
  ```

### Task 7: 门槛与校准样本（selection.ts + gold.example.jsonl）

**Files:**
- Keep: `industry/selection.ts`（默认门槛不变）
- Modify: `industry/gold.example.jsonl`

**Interfaces:**
- 产出：`SELECTION` 被 `packages/backend/src/editorial` 用于门槛判定；`gold.example.jsonl` 是校准样本格式示范

- [ ] **Step 1: 确认 `selection.ts` 保持默认**
  `thresholds: { T1: 60, T1_5: 65, T2: 76 }`，`understandFloor: 50`。不改数字（待 gold 校准）。
  Expected: 与 AIHOT 默认一致

- [ ] **Step 2: 替换 `gold.example.jsonl` 为传奇示例**
  两条：1 条 `select`（如"某传奇新作上线西游题材 + 刀刀充值，公布首充与代币回收机制"）；1 条 `reject`（如"纯开服广告口号，无实质新信息"）。字段格式按 `docs/selection.md`。
  Expected: 2 行合法 JSON，decision 各一

- [ ] **Step 3: typecheck**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误

- [ ] **Step 4: 提交**
  ```bash
  git add industry/selection.ts industry/gold.example.jsonl && git commit -m "feat(calibration): keep thresholds, legend gold example"
  ```

### Task 8: 关闭 AI 专属模块（features.ts）

**Files:**
- Modify: `industry/features.ts`

**Interfaces:**
- 产出：`FEATURES` 被 `apps/web` 路由、`apps/api` 路由、`apps/worker` 定时任务读取；false → 导航/接口/任务/站点地图关闭

- [ ] **Step 1: 关闭两项**
  `leaderboard: false`、`codexResetMonitor: false`。
  Expected: 两字段 false

- [ ] **Step 2: typecheck**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误（路由关闭由现有类型/测试覆盖）

- [ ] **Step 3: 提交**
  ```bash
  git add industry/features.ts && git commit -m "feat(features): disable leaderboard & codexResetMonitor for non-AI"
  ```

### Task 9: 条款页（pages/）

**Files:**
- Modify: `industry/pages/terms.md`、`industry/pages/privacy.md`

**Interfaces:**
- 产出：被 `apps/web` 渲染为使用规则/隐私页；**法律实质需使用者复核**

- [ ] **Step 1: 改写模板文案**
  按 spec §10：把 AIHOT/MyHOT 引用改为传奇雷达；保留模板结构。
  Expected: 无 AIHOT/MyHOT 引用（除许可说明）

- [ ] **Step 2: 标注待复核**
  在文件顶部注释标"法律实质待使用者复核"。
  Expected: 注释存在

- [ ] **Step 3: typecheck（若有校验）**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误

- [ ] **Step 4: 提交**
  ```bash
  git add industry/pages/terms.md industry/pages/privacy.md && git commit -m "feat(pages): 传奇雷达使用规则/隐私模板（实质待复核）"
  ```

### Task 10: 测试保全（tests/）

**Files:**
- Modify: `tests/*.test.ts` 中示例行业词（不改测试逻辑）

**Interfaces:**
- 产出：保证 `npm test` 在传奇行业配置下仍通过；消费 Task 3 的 CATEGORIES/标签与 Task 2 实体

- [ ] **Step 1: 定位并替换 AI 示例词**
  按 spec §11，把 `tests/` 中示例行业引用替换为传奇对应项：
  - `ai-models` → `product`；`模型发布` → `新产品/竞品`；`Anthropic`/`OpenAI` → `盛趣游戏`/`恺英网络`（或 ENTITIES 种子）
  - 其他 AI 专属术语（如 `Claude`/`GPT`/论文相关）按上下文换传奇等价物
  先 `grep -rln "ai-models\|模型发布\|Anthropic\|OpenAI\|MyHOT" tests/` 列出文件，逐个替换。
  Expected: 测试逻辑不变，仅示例词变

- [ ] **Step 2: 审计残留**
  ```bash
  grep -rln "ai-models\|模型发布\|Anthropic" tests/ || echo "CLEAN"
  ```
  Expected: CLEAN

- [ ] **Step 3: 提交**
  ```bash
  git add tests/ && git commit -m "test: swap example-industry terms to 传奇 in tests"
  ```

### Task 11: 全量验证（typecheck + npm test）

**Files:**
- 无新建；验证整体

**Interfaces:**
- 产出：交付闸门；失败则回退对应 Task 修复

- [ ] **Step 1: typecheck 全量**
  ```bash
  npm run typecheck
  ```
  Expected: 0 错误

- [ ] **Step 2: 跑测试（Docker Postgres _test + 假服务）**
  ```bash
  DATABASE_URL=postgres://postgres:pgpass@127.0.0.1:5432/legendradar_test npm test
  ```
  Expected: 全部通过，无外部调用

- [ ] **Step 3: 品牌/标签最终审计**
  ```bash
  grep -rin "aihot\|myhot" industry/ || echo "BRAND CLEAN"
  ```
  Expected: BRAND CLEAN（许可/说明性文字除外）

- [ ] **Step 4: 提交验证结果**
  ```bash
  git commit --allow-empty -m "verify: 传奇雷达 domain swap — typecheck + npm test green"
  ```

---

## 执行后说明（非本计划范围）
- 部署/上线、条款法律复核、信源 URL 试抓校验、gold 样本校准（100–200 条）、品牌美术终稿，均由使用者另行处理（见 spec §13）。
- 校准命令：`node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl`（需真实模型 Key，不在本次）。
