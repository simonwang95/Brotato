# Brotato Number Lab

土豆兄弟数值实验台第一版。

## 当前范围

- 按角色和模式生成攻略：
  - 推荐武器。
  - 关键道具和解锁方式。
  - 推荐武器和关键道具的属性说明。
  - 属性优先级。
  - 推荐第 20 关目标面板。
  - 支持危险等级、DLC、默认池/解锁池和流派偏好输入。
- 手动输入角色面板属性。
- 手动输入单种武器的基础伤害、属性缩放、冷却、暴击、数量。
- 选择战斗场景，估算穿透、弹射、爆炸、燃烧、诅咒、结构物、护甲、溢出、走位损失和拾取触发道具的收益。
- 手动输入一个候选道具带来的属性变化。
- 对比购买前后：
  - 单次非暴击伤害
  - 单次暴击伤害
  - 单次期望伤害
  - 攻击间隔
  - 总 DPS
- 三个独立页面：
  - 角色攻略页，默认展示；选择角色时同步展示角色图标。
  - 图鉴页，支持分类浏览、搜索和详情跳转。
  - 角色场景模拟器页，支持手动输入和上传截图/照片解析。

## 简化假设

基础公式处理普通命中期望；场景模型额外估算穿透、弹射、爆炸额外目标、拾取触发道具、燃烧覆盖/传播、诅咒倍率、结构物工程学、敌人护甲、溢出伤害、走位命中损失，以及移速和闪避合成的有效规避率。

这些扩展模型目前是可解释近似值，用于比较方向和敏感性；后续还需要继续从本机 `.pck` 资源中解析具体武器、道具、敌人和结构物参数。

核心公式：

```text
缩放后伤害 = 武器基础伤害 + Σ(属性值 × 对应缩放比例)
全局修正后伤害 = max(1, 缩放后伤害 × (1 + 总伤害% / 100))
暴击期望 = 非暴击伤害 × (1 - 暴击率) + 暴击伤害 × 暴击率
攻击间隔 = 武器基础冷却 / max(0.1, 1 + 攻速% / 100)
DPS = 单次期望伤害 × 每次攻击命中数 × 武器数量 / 攻击间隔
```

场景估算公式：

```text
有效武器 DPS = (基础 DPS + 穿透贡献 + 弹射贡献 + 爆炸贡献) × 护甲/溢出/走位交付倍率
特殊道具 DPS = 场景触发频率 × 触发概率 × 单次期望伤害
燃烧 DPS = 每跳伤害 × 覆盖率 × 跳数 × 传播倍率
结构物 DPS = 结构物伤害 × 发射频率 × 目标覆盖 × 有效时间 × 命中率
场景总 DPS = 有效武器 DPS + 特殊道具 DPS + 燃烧 DPS + 结构物 DPS
奖励修正清场评分 = 场景总 DPS × 诅咒奖励倍率 / 诅咒敌人强度倍率
```

当前场景预设：

- Boss / 精英单体：目标少，穿透、弹射和范围收益低。
- 普通清怪：常规波次估算。
- 高密度怪潮 / 无尽：怪多、拾取多，机制收益更容易放大。

## 使用

启动本地服务：

```bash
npm run start
```

然后访问 `http://localhost:5174`。

截图/照片解析使用本地 OpenAI 兼容 API。开发阶段默认读取 `env.local`：

```bash
API_KEY="lm-studio"
API_URL="http://127.0.0.1:1234/v1"
MODEL="qwen3.6-35b-a3b-nvfp4"
MAX_TOKENS="10000"
OCR_TIMEOUT_SECONDS="1200"
USE_RESPONSE_FORMAT_JSON="false"
```

`env.local` 是本机配置文件，不提交；仓库里保留 `env.local.example` 作为模板。LM Studio 对 `response_format` 支持不稳定，默认不要开启 JSON mode；如果换成明确支持 JSON mode 的 OpenAI 兼容服务，再把 `USE_RESPONSE_FORMAT_JSON` 设为 `true`。

截图解析目前只做右侧属性栏 OCR，输出属性名和数字，再由前端映射到角色面板。只看静态页面时仍可用：

```bash
npm run start:static
```

运行公式测试：

```bash
npm test
```

生成 Vercel 静态部署输出：

```bash
npm run build
```

输出目录是 `public/`。Vercel 部署时建议设置 Build Command 为 `npm run build`，Output Directory 为 `public`。

校验当前资料库里的中文名称是否出现在本机安装包：

```bash
npm run verify:names
```

默认读取 `***REMOVED***/Library/Application Support/Steam/steamapps/common/Brotato`。如果安装路径不同，可以设置 `BROTATO_INSTALL_DIR`。

从本机安装包提取官方武器/道具目录：

```bash
npm run extract:catalog
```

生成文件在 `data/official-catalog.json`，包含资源 ID、翻译 key、稀有度、价格、默认解锁状态、DLC 来源、官方 icon 资源路径，以及本地图片资产目标路径。

从本机安装包提取角色解锁挑战映射：

```bash
npm run extract:unlocks
```

生成文件在 `data/official-unlocks.json`。该脚本只读取安装包里的静态 `challenge` / achievement 资源，不读取玩家存档，因此不受本机已解锁进度影响。当前可稳定写入 43 条原版角色精确条件；仍待校验的 2 条原版后补挑战和 9 条 DLC 挑战会保留 `pendingReason` 与 `pendingEvidence`，其中包含 `challengeId`、`nameKey`、`descriptionKey`、`value`、`stat` 和 `additionalArgs`，方便继续解码 translation。`Giant / CHARACTER_GIANT` 仍保留为官方角色目录缺口。

从本机安装包导出图鉴 WebP 图标：

```bash
npm run extract:assets
```

导出的图片保存在 `data/assets/**`，并会回写 `data/official-catalog.json` 的 `imageAssetPath` 字段。线上部署只需要提交后的仓库文件，不需要 Brotato 安装目录。

校验攻略资料中的武器/道具是否能映射到官方目录：

```bash
npm run verify:catalog
```

页面启动时会读取 `data/official-catalog.json` 和 `data/official-localization.json`，在推荐武器和关键道具下方补充官方来源、阶数、价格、解锁、掉落池状态、图片和中文名。攻略推荐会把全量官方武器/道具图鉴作为补充候选池参与评分，手写路线仍优先展示。
Lucky 默认允许 DLC 时会优先显示 `Lute（琉特琴）`；切换到“仅原版”时会隐藏该 DLC 武器。

## 部署和图片资产

本机安装目录只用于开发时提取资料。页面运行和线上部署不读取 Steam 安装目录，也不读取 `.pck` 文件；部署时所有数据都应保存在项目内的 `data/*.json` 和后续导出的 `data/assets/**` 中。

角色、武器、物品配图的资产管线见 [docs/assets-and-deployment.md](docs/assets-and-deployment.md)。

## 后续目标

二期攻略生成器已经接入原版 44 个角色和深海魔怪 DLC 15 个角色。武器/物品图鉴本地化已覆盖当前官方目录；下一步会继续补全角色精确挑战条件，并把更多武器/道具参数接入数值模型。

规格见 [docs/strategy-generator.md](docs/strategy-generator.md)。
推荐规则维护见 [docs/recommendation-logic.md](docs/recommendation-logic.md)。
图片和部署数据约束见 [docs/assets-and-deployment.md](docs/assets-and-deployment.md)。
Vercel 部署清单见 [docs/vercel-deployment.md](docs/vercel-deployment.md)。

## 资料来源状态

当前攻略数据参考 Brotato Wiki 的 Characters、Progress、Weapons、Stats 和 Endless Mode 页面，并在数据里保留了解锁说明。攻略推荐本身是策略化整理，不等同于游戏内唯一最优解；当前已把官方武器数值、解锁/掉落状态、稀有度、价格、套装匹配、部分幸运/拾取触发伤害和拾取频率收益接入可解释评分，后续还会继续校准更多具体效果。

官方简中名称优先以本机安装包里的 `Brotato.pck` 和 `BrotatoAbyssalTerrors.pck` 为准；`npm run verify:names` 会扫描这些包并报告当前数据是否匹配。

当前可从官方目录稳定校验武器/物品/角色的默认解锁状态和掉落池状态：

```bash
npm run verify:unlocks
```

精确挑战条件已开始从安装包静态 Progress / achievement / challenge 资源抽取。`data/official-unlocks.json` 当前记录 54 条角色奖励映射，其中 43 条带有可直接解析的原版中英挑战文本；剩余 `pending-text` 按来源分为 base 2 条、abyssalTerrors 9 条，并保留静态翻译 key、挑战数值、奖励路径和阻塞原因。`npm run verify:unlocks` 还会反向报告已抽到但策略层尚未维护的官方角色解锁记录，当前为 6 条。DLC challenge 资源能稳定映射奖励角色，但描述文本仍需继续解码 `PHashTranslation` 的 key->文本映射，因此继续保守标注为待校验。角色图鉴会展示这些静态证据，但不会把未确认文本当成精确解锁条件。`Giant / CHARACTER_GIANT` 当前不在 base+DLC 官方角色目录中，项目把它记录为策略层待校验候选，而不是凭名称强行映射。

这不依赖当前电脑的存档解锁进度。安装包 `.pck` 是静态游戏数据；本机进度只会影响游戏内或存档里“你已经解锁了什么”，不会改变仓库中由安装包提取出的官方目录字段。除非后续改为读取存档或游戏 UI 截图，否则本机是否已经全解锁不会影响这些脚本的结果。
