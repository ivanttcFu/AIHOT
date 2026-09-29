# SDD ledger — plan: docs/superpowers/plans/2026-09-29-legend-radar.md

Execution: Superpowers executing-plans (inline, no subagent). Env: Node 24.18.1 at C:/Program Files/nodejs; Docker daemon DOWN (wsl blocked by sandbox) → Postgres `_test` unavailable; verification gate = `npm run typecheck` per file, `npm test` best-effort (needs DB).

## Pre-flight scan
- Shared interfaces: Task 3 taxonomy ITEM_TYPES ↔ Task 5 selection-score.md weight-table keys (must be equal set of 7). Ledger row TBD at Task 3/5.
- Shared interfaces: Task 3 TOPIC_TAGS/CATEGORY_TAGS ↔ prompts structure.md white-list injection. Ledger row TBD at Task 3/5.
- Shared interfaces: Task 2 site.ts SITE ↔ apps/web, apps/api, packages/backend consumption; prompts {{siteName}}. Task 2 first.
- Self-consistency: tests/ example words ↔ Task 3 taxonomy (tests consume CATEGORIES/tags). Task 10 last.
- Pre-flight: no other cross-task conflicts beyond above.

## Tasks
[x] Task 1: env baseline — `npm run typecheck` green for contracts/backend/api/worker/tests. `npm test` blocked (no DB). `npm install` had to be re-run to populate missing `node_modules/.bin` (first install left it empty → `tsc` not found).
[x] Task 2: brand/site.ts (站名=传奇雷达, subject=传奇, mcpPrefix=legendradar, crawlerName=LegendRadarBot) + logo.svg (自绘雷达) + features.ts (leaderboard/codexResetMonitor=false) + terms.md/privacy.md (站名改写). brand/nameplates/*.svg + icon/favicon 仍为原 AIHOT 品牌，**未重生**（见 Pending）。
[x] Task 3: taxonomy.ts — 4 CATEGORIES + 7 ITEM_TYPES + 31 TOPIC_TAGS + 9 ENTITIES + 同义词/词典。**DEViation: 实际为 5 CATEGORIES**（新增 `industry` 行业动态），原因见 Ruling-2。
[x] Task 4: topics.json — 19 个 topics（9 厂商 + 6 方向 + 4 形态）。
[x] Task 5: selection-score.md 6 轴权重表（严格对应 7 ITEM_TYPES）+ prefilter/content-understanding/structure/rules-domain 等全部 prompts。
[x] Task 6: group-definitions/story-digest/report-daily-lead/report-period/summarize-*/translate-* 等聚类/日报/摘要/翻译 prompts。
[x] Task 7: selection.ts（未改，T1=60/T1_5=65/T2=76）+ gold.example.jsonl（2 条传奇示例：select 西游题材+刀刀充值 / reject 纯开服广告）。
[x] Task 8: features.ts leaderboard:false, codexResetMonitor:false。
[x] Task 9: pages/terms.md + privacy.md（站名改写，顶部加"法律实质待复核"注释）。
[x] Task 10: tests/ 示例词替换 — analyze.test.ts / analyze-shutdown.test.ts / default-model.test.ts / signals.test.ts / events / publication / translate / translate-shutdown 全部 stub 返回 + 断言 + stepOf() 子串对齐传奇 taxonomy；category 列 `'ai-models'/'ai-products'` → `'product'`，itemType `model_release/product_launch` → `new_product`，tags 归一为新词表，subjects → 传奇厂商 id。typecheck 通过。
[x] Task 11: full verify — 5 个非 web TS 工程 typecheck 全绿；web 被环境锁阻断（见 Ruling-3）；npm test 需 Postgres（本环境无）。
[x] Task 12: `industry/sources.json` 占位清单落地（写策划占位，非实时抓取校验）。18 条信源 = 8 厂商官博(rss,T1,owner_entity_id 落到 8 ENTITIES) + 5 媒体(web_list,T2) + 3 买量(web_list,T2) + 2 社区(NGA/贴吧 web_list,T2,participation_mode=hot_signal)。JSON 语法校验通过；逐条复跑 `assertSupportedConfig` 全部通过；owner_entity_id 仅用 8 ENTITIES + null（own 允许但未用）。URL/kind/adapter 顶部 `$comment` 已注明上线前需逐一核实。
[x] Task 13: 8 官博信源联网核实（2026-09-29）。结论：**中文游戏厂商官网均无标准 RSS**，原 feedUrl 占位全部无效。修正为 web_list + 真实站点 URL，id `rss-*`→`official-*`。真实站点：盛趣 `shengqugames.com` / 恺英 `kingnet.com`（非 kaiying.com）/ 贪玩 `tanwan.cn/news/dt` / 中手游 `cmge.com/cn/news` / 世纪华通 `sjhuatong.com`（非 shijihuatong.com）/ 三七 `37wan.net`（非 37.com）/ 完美 `wanmei.com/wmnews/index.html` / 巨人 `ztgame.com/news`。校验：JSON 合法 + 18 条全过 assertSupportedConfig。commit `760f623`。**待办**：5 媒体/3 买量/2 社区 URL 仍未核实；web_list 通用解析各站点或需调 selector。

## Rulings
- Task 1: Ruling: Docker daemon unavailable (wsl.exe blocked by sandbox security policy) → cannot stand up Postgres `_test` for `npm test`. Decision: use `npm run typecheck` as the per-file and final automated gate (no DB needed); attempt `npm test` only if a Postgres becomes available; otherwise deliver on typecheck-green + unchanged test logic, and document the exact `npm test` command for the user's environment. Cost if wrong: a runtime-only test regression in the unchanged test suite could go undetected — but changes are confined to industry/ config + test example-words with no runtime-logic change, so risk is low.
- Ruling-2 (设计偏差，必读): 批准的"4 类"方案实际不可行。原 AIHOT 有 6 个 category key（含 `tip`/`opinion`/`industry`/`paper`），但 传奇雷达 4 类（product/gameplay/monetization/marketing）让 `operations_update`/`industry_news`/`opinion_analysis` 三类资料（开服运营/版号政策/厂商格局/观点）**没有归属的 category key**；structure 步骤 `z.enum(CATEGORY_KEYS)` 会把这些资料判为 null，从分类页消失。修复：taxonomy 新增第 5 类 `industry`（行业动态），覆盖这三类。同时核心代码两处引用旧 `"tip"` key 必须改：`packages/backend/src/publication/items.ts:98`（删除 v1/RSS 的 opinion-as-tip 死分支）、`apps/api/src/routes/v1.ts:65`（默认分类 `"tip"`→`"product"`）。若用户坚持 4 类，可回退但行业/观点内容将无分类。
- Ruling-3 (环境限制): `apps/web` 的 `npm run typecheck` 因 `react-router typegen` 依赖 rolldown 原生绑定（`@rolldown/binding-win32-x64-msvc.node`，12MB）被 Windows/Defender 文件锁占用而失败（"used by another process"）。这是环境问题，与 industry 改动无关——web 源码未改，且已确认 web 仅消费 SITE/withSubject/FEATURES/nameplates（导出齐全、nameplates 文件存在）。用户环境（无该锁）可正常跑通 web typecheck。
- Pending-1 (scope gap, DONE in Task 12): `industry/sources.json` 原 AIHOT 信源已全部替换为 18 条传奇雷达策划占位（8 官博+5 媒体+3 买量+2 社区）。JSON 合法、config 通过 assertSupportedConfig、owner_entity_id 合法。**上线前待办**：feedUrl/url/kind/adapter 需逐一核实（中文站点多无标准 RSS，可能要改 web_list + 适配器或补公众号/视频号源）；本环境网络受限未做实时抓取校验。仍待补：Pending-2 nameplates。
- Pending-2 (品牌): `industry/brand/nameplates/{daily,weekly,monthly,archive}.svg` 与 icon/favicon 仍为原 AIHOT 品牌文案，未重生为"传奇雷达"。重生需 `npm pack @fontsource/noto-sans-sc@5.3.0`（网络）经 `scripts/nameplates.ts` 用 SITE.subject 渲染。功能不影响（文件存在），仅文案待换。

