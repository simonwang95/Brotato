# Brotato Number Lab

土豆兄弟数值实验台第一版。

## 当前范围

- 按角色和模式生成攻略：
  - 推荐武器。
  - 关键道具和解锁方式。
  - 属性优先级。
  - 推荐第 20 关目标面板。
- 手动输入角色面板属性。
- 手动输入单种武器的基础伤害、属性缩放、冷却、暴击、数量。
- 选择战斗场景，估算穿透、弹射、爆炸额外目标和拾取触发道具的收益。
- 手动输入一个候选道具带来的属性变化。
- 对比购买前后：
  - 单次非暴击伤害
  - 单次暴击伤害
  - 单次期望伤害
  - 攻击间隔
  - 总 DPS

## 简化假设

基础公式处理普通命中期望；场景模型额外估算穿透、弹射、爆炸额外目标和拾取触发道具。当前仍不处理燃烧刷新/传播、诅咒、结构物、敌人护甲、击退导致的命中损失、溢出伤害和真实走位。

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
场景武器 DPS = 基础 DPS + 穿透贡献 + 弹射贡献 + 爆炸贡献
特殊道具 DPS = 场景触发频率 × 触发概率 × 单次期望伤害
场景总 DPS = 场景武器 DPS + 特殊道具 DPS
```

当前场景预设：

- Boss / 精英单体：目标少，穿透、弹射和范围收益低。
- 普通清怪：常规波次估算。
- 高密度怪潮 / 无尽：怪多、拾取多，机制收益更容易放大。

## 使用

直接打开 `index.html`，或启动本地服务：

```bash
npm run start
```

然后访问 `http://localhost:5174`。

运行公式测试：

```bash
npm test
```

校验当前资料库里的中文名称是否出现在本机安装包：

```bash
npm run verify:names
```

默认读取 `***REMOVED***/Library/Application Support/Steam/steamapps/common/Brotato`。如果安装路径不同，可以设置 `BROTATO_INSTALL_DIR`。

从本机安装包提取官方武器/道具目录：

```bash
npm run extract:catalog
```

生成文件在 `data/official-catalog.json`，包含资源 ID、翻译 key、稀有度、价格、默认解锁状态和 DLC 来源。

## 后续目标

二期攻略生成器已经接入第一批数据，当前覆盖默认 5 个角色和 Engineer。下一步会继续补齐全角色、DLC 差异、道具解锁校验和更多武器数据。

规格见 [docs/strategy-generator.md](docs/strategy-generator.md)。

## 资料来源状态

当前攻略数据参考 Brotato Wiki 的 Characters、Progress、Weapons、Stats 和 Endless Mode 页面，并在数据里保留了解锁说明。攻略推荐本身是策略化整理，不等同于游戏内唯一最优解；后续会继续把可量化部分接入 DPS 计算器。

官方简中名称优先以本机安装包里的 `Brotato.pck` 和 `BrotatoAbyssalTerrors.pck` 为准；`npm run verify:names` 会扫描这些包并报告当前数据是否匹配。
