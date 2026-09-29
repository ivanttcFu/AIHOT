// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉模型怎么归类。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 */
export const CATEGORIES = [
  { key: "product", label: "产品类型", section: "产品与竞品", guide: "新产品、竞品上线、版本、题材、美术风格变化" },
  { key: "gameplay", label: "玩法", section: "玩法与系统", guide: "多大陆、跨服、攻沙、打金、装备成长、天赋、转生、副本等机制" },
  { key: "monetization", label: "商业化", section: "商业化设计", guide: "首充、累充、代币、会员、充值返利、刀刀充值、免费福利、回收" },
  { key: "marketing", label: "营销", section: "营销与素材", guide: "广告文案、宣传图、视频素材、核心卖点、IP 主题、投放活动" },
  { key: "industry", label: "行业动态", section: "行业与运营", guide: "开服/合服、买量节奏、活动运营、渠道动作、版号、政策合规、平台规则、厂商格局、人事资本、观点复盘" },
] as const;

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给六个维度不同的权重。
 */
export const ITEM_TYPES = ["new_product", "gameplay_update", "monetization_update", "marketing_material", "operations_update", "industry_news", "opinion_analysis"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = [
  "新产品/竞品", "玩法/系统", "商业化动态", "营销动态", "行业动态", "其他",
] as const;

/** 可选的主题标签（31 个细分标签：产品类型 9 + 玩法 8 + 商业化 8 + 营销 6）。 */
export const TOPIC_TAGS = [
  // 产品类型
  "沉默", "单职业", "复古", "微变", "中变", "合击", "专属", "西游", "武侠",
  // 玩法
  "多大陆", "跨服", "攻沙", "打金", "装备成长", "天赋", "转生", "副本",
  // 商业化
  "首充", "累充", "代币", "会员", "充值返利", "刀刀充值", "免费福利", "回收",
  // 营销
  "广告文案", "宣传图", "视频素材", "核心卖点", "IP主题", "投放活动",
] as const;

/** 可选的实体标签（公司、机构、平台）。 */
export const ENTITY_TAGS = [
  "盛趣游戏", "恺英网络", "贪玩", "中手游", "世纪华通", "三七互娱", "完美世界", "巨人网络", "本平台",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  首冲: "首充", 首充礼包: "首充",
  返利: "充值返利", 返利活动: "充值返利",
  充值: "商业化动态", 充值福利: "免费福利",
  打金搬砖: "打金", 搬砖: "打金",
  沙巴克: "攻沙", 攻城: "攻沙", 沙城: "攻沙",
  转生系统: "转生", 天赋系统: "天赋", 装备: "装备成长", 装备体系: "装备成长",
  新服: "行业动态", 开服: "行业动态", 合服: "行业动态", 开服公告: "行业动态",
  版本: "新产品/竞品", 版本更新: "新产品/竞品", 新版本: "新产品/竞品",
  新版: "新产品/竞品", 上线: "新产品/竞品", 新游: "新产品/竞品",
  竞品: "新产品/竞品", 友商: "新产品/竞品",
  IP: "IP主题", 题材: "西游",
  素材: "视频素材", 短视频素材: "视频素材", 海报: "宣传图",
  脚本: "玩法/系统", 辅助: "玩法/系统",
  皮: "专属", 换皮: "专属", 私服: "其他", 怀旧: "复古",
};

/** 模型漏了分类标签时，按内容类型补一个。 */
export const CATEGORY_BY_ITEM_TYPE: Readonly<Record<string, string>> = {
  new_product: "新产品/竞品",
  gameplay_update: "玩法/系统",
  monetization_update: "商业化动态",
  marketing_material: "营销动态",
  operations_update: "行业动态",
  industry_news: "行业动态",
  opinion_analysis: "行业动态",
};

// ── 公司与主体 ──────────────────────────────────────────────────────────────────────────

/** 公司主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[] }> = {
  shengqu: { name: "盛趣游戏", displayTag: "盛趣游戏", aliases: ["盛趣", "盛趣游戏", "Shanda"] },
  kaiying: { name: "恺英网络", displayTag: "恺英网络", aliases: ["恺英", "恺英网络", "Kaiying"] },
  tanwan: { name: "贪玩", displayTag: "贪玩", aliases: ["贪玩", "贪玩游戏", "Tanwan"] },
  zhongshouyou: { name: "中手游", displayTag: "中手游", aliases: ["中手游", "CMGE"] },
  shiji: { name: "世纪华通", displayTag: "世纪华通", aliases: ["世纪华通", "华通"] },
  sanqi: { name: "三七互娱", displayTag: "三七互娱", aliases: ["三七", "三七互娱", "37", "三七游戏"] },
  wanmei: { name: "完美世界", displayTag: "完美世界", aliases: ["完美世界", "完美", "Perfect World"] },
  juren: { name: "巨人网络", displayTag: "巨人网络", aliases: ["巨人", "巨人网络", "Giant"] },
  own: { name: "本平台", displayTag: "本平台", aliases: ["本平台", "自有平台", "我们的平台"] },
};

/**
 * 身份词典：摘要和标题里出现的公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 传奇行业公司名冲突少，这里给轻量种子；引擎名 996 也列入，避免被模型改成通用说法。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "shengqu", name: "盛趣游戏", patterns: [/盛趣|shanda/i] },
  { id: "kaiying", name: "恺英网络", patterns: [/恺英|kaiying/i] },
  { id: "tanwan", name: "贪玩", patterns: [/贪玩|tanwan/i] },
  { id: "zhongshouyou", name: "中手游", patterns: [/中手游|cmge/i] },
  { id: "shiji", name: "世纪华通", patterns: [/世纪华通|华通/i] },
  { id: "sanqi", name: "三七互娱", patterns: [/三七|37互娱|三七游戏/i] },
  { id: "wanmei", name: "完美世界", patterns: [/完美世界|完美|perfect\s?world/i] },
  { id: "juren", name: "巨人网络", patterns: [/巨人网络|巨人/i] },
  { id: "engine-996", name: "996 引擎", patterns: [/\b996\b|九六|传奇引擎/i] },
];

/** 这些域名上的文章，发布方就是对应的公司（托管平台如 GitHub、arXiv 不算）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "shengqu", domains: ["shengqu.com"] },
  { entityId: "kaiying", domains: ["kaiying.com"] },
  { entityId: "tanwan", domains: ["tanwan.com"] },
  { entityId: "zhongshouyou", domains: ["cmge.com"] },
  { entityId: "shiji", domains: ["shijihuatong.com"] },
  { entityId: "sanqi", domains: ["37.com"] },
  { entityId: "wanmei", domains: ["perfectworld.com"] },
  { entityId: "juren", domains: ["giant.com"] },
];

/** 原文里的这些写法也算提到了对应公司。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "sanqi", pattern: /三七互娱/i },
];
