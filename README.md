# dsh-skill-evolution

[![CI](https://github.com/VanadisGithub/dsh-skill-evolution/actions/workflows/ci.yml/badge.svg)](https://github.com/VanadisGithub/dsh-skill-evolution/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English](#english) | 中文

DeepSeek Harness（DSH）的**技能自进化插件**：观察 agent 执行轨迹，在每个成功回合结束时按信号触发 LLM 评审，把值得复用的工作流**结晶为技能**并注册进技能目录；后续同类执行还会把新经验合并进已有技能——技能是活的，越用越好。

## 特性亮点

- **事件驱动结晶**：回合结束即评审，而非纯频率统计；三信号（复杂 / 恢复 / 重复）任一触发即送审
- **严格的评审门禁**：LLM 评审 + 硬性负面清单，垃圾经验绝不入库；`NOTHING_TO_SAVE` 是一等结果
- **技能持续进化**：同类新经验自动合并进已有技能（版本递增），语义去重（FOLD_INTO）拦截近重复
- **全套设置页管理**：技能/设置双 tab、总开关、技能卡片（价值/版本/调用次数标签）、参数流程图内嵌调参、评审提示词就地编辑
- **持久化与自治**：技能落盘 `generated/`、重启自动重注册；宿主半零第三方依赖（仅 `node:` 内建模块）

## 截图

**技能** tab——技能卡片带价值（高/中/低）、版本、调用次数与更新时间标签，展开查看结晶信号、工具序列与完整 SKILL.md：

![Skills tab](assets/skills-tab.png)

**设置** tab——状态一览、评审模型、生成语言与各配置面板：

![Settings tab](assets/settings-tab.png)

**阈值与控制**——参数直接嵌在流程图里，在哪一步起作用就在哪一步改：

![Tuning pipeline with embedded controls](assets/tuning-panel.png)

## 工作原理

### 信号检测

每个回合结束（`turn/end`）时，对满足最小步数的成功轨迹检测三个信号：

| 信号 | 条件 | 含义 |
|---|---|---|
| `complex` | 成功回合且工具调用 ≥ `minToolCalls`（默认 5） | 完成了一件复杂任务 |
| `recovered` | 有失败步骤但回合最终成功 | 踩坑后找到了可行的绕行路径 |
| `repeated` | 同一工具序列出现 ≥ `minPatternOccurrences` 次且成功率 ≥ `minSuccessRate` | 同一套操作反复出现且成熟可靠 |

**佐证闸门**（`complexRequiresCorroboration`，默认开）：单独的 `complex` 是弱证据（任何长回合都满足），默认必须叠加 `recovered` 或 `repeated` 才送评审；被拦下的回合记一条 withheld 日志，等序列后续出现佐证信号时再补送。

### 评审门禁

评审 LLM 收到完整证据（信号、用户意图、工具序列、每步成败与摘要）与**已有进化技能清单**，输出三种结论之一：`SAVE`（结晶新技能）、`FOLD_INTO`（并入已有技能）、`NOTHING_TO_SAVE`（放弃）。

硬性负面清单——以下内容**绝不结晶**：

- 环境性失败（缺二进制、未配置凭证、未装包）
- 对工具的负面断言（"X 工具坏了"会固化成长期拒绝）
- 重试即愈的瞬时错误（教训是重试模式，不是原错误）
- 一次性任务叙事、未解决的失败

### 持续进化

- **渐进改进**：新证据落在已有技能的序列上（尤其是错误恢复经验）时，评审把新教训合并进技能正文并版本 +1，而不是新建重复技能
- **语义去重（FOLD_INTO）**：同一类经验可能经由**不同的工具序列**再次出现——纯序列匹配拦不住。结晶评审会看到已有技能清单（名字+描述），判定同属一个工作流类别时输出 `VERDICT: FOLD_INTO: <已有技能名>`，宿主随即走改进管道并入该技能

### 产出格式

类级命名的 kebab-case 技能，标准 SKILL.md 结构（`# Title / ## When to Use / ## Procedure / ## Pitfalls / ## Verification`）。NAME 与章节标题恒为英文，正文语言由 `skillLanguage` 决定。

## 安装

### 方式一：官方 CLI（发布到 npm 后）

```bash
dsh plugin --profile web add dsh-skill-evolution
```

包内 `dsh.bundle.patch` 会自动挂载，无需手改 profile 文件。

### 方式二：git clone + link

```bash
git clone https://github.com/VanadisGithub/dsh-skill-evolution.git ~/Code/dsh-skill-evolution
```

在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 中加入：

```json
"dsh-skill-evolution": "link:/Users/<you>/Code/dsh-skill-evolution"
```

然后在 `~/.dsh/profiles/web` 执行 `pnpm install`，硬刷新浏览器。

### 方式三：file:// 手动挂载（原型调试）

把仓库放到任意目录（如 `~/.dsh/plugins/skill-evolution/`），在 `~/.dsh/cordis.patch.yml` 追加：

```yaml
- insert:
  - id: 'skill-evolution'
    name: file:///Users/<you>/.dsh/plugins/skill-evolution/plugin.mjs?v=1
    config:
      minToolCalls: 5
      minPatternOccurrences: 3
      autoRegister: true
      llmProvider: deepseek      # 按你的部署可用的 provider 修改
      llmModel: deepseek-chat
```

`?v=N` 用于绕过 Node 模块缓存；改了 `plugin.mjs` 就 +1。宿主半改动需 loader 重放补丁，浏览器半改动硬刷新即可。

> ⚠️ 三种方式只能选一种，重复挂载会导致双实例。

## 配置

下表所有键都**既走挂载配置，也可在设置面板里直接修改**（面板改动持久化到插件目录 `runtime-config.json`，优先于挂载配置，重启后仍生效）：

| 键 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 总开关：`false` 时不观察回合、不评审结晶（已有技能保持注册） |
| `minTraceSteps` | `3` | 轨迹最小步数（噪音地板） |
| `minToolCalls` | `5` | `complex` 信号阈值 |
| `minPatternOccurrences` | `3` | `repeated` 信号阈值 |
| `minSuccessRate` | `0.7` | `repeated` 信号成功率下限 |
| `signals` | 全开 | `{complex, recovered, repeated}` 分别开关 |
| `complexRequiresCorroboration` | `true` | 单独 `complex` 信号需叠加佐证才送评审 |
| `autoRegister` | `true` | 结晶后自动注册进技能目录 |
| `llmProvider` / `llmModel` | `deepseek` / `deepseek-chat` | 评审模型（provider 级联该 provider 的模型目录） |
| `skillLanguage` | `en` | 生成技能的语言：`zh` / `en` |
| `maxEvolvedSkills` | `20` | 进化技能容量上限 |
| `improvementEvery` | `3` | 每 N 次同序列重跑触发一次改进评审 |
| `maxImprovementsPerSkill` | `5` | 单个技能最大改进次数 |
| `maxEvidenceSteps` | `30` | 送审证据最大步数（截断保护） |
| `maxTracesPerSession` | `200` | 每会话轨迹缓存上限（内存保护） |
| `maxStepTextLength` | `200` | 每步摘要截断长度 |
| `reviewSystemPrompt` | 内建 | 结晶评审 system prompt 覆盖 |
| `improveSystemPrompt` | 内建 | 改进评审 system prompt 覆盖 |

## 管理面板

设置页「技能进化」分区（`设置 → 技能进化`），双 tab 布局，右上角**总开关**随时停用/启用：

- **技能 tab**：技能卡片列表——名称、描述、价值标签（高/中/低，按结晶次数与改进次数评估）、版本、调用次数（skill 工具调用 + 用户显式触发注入）、更新时间；展开看结晶信号、工具序列与完整 SKILL.md；删除/清空均两步确认
- **设置 tab**：状态一览、评审模型（provider 级联选择）、生成语言，以及四个配置面板：
  - **阈值与控制**：把全部阈值画成一条流水线（回合结束 → 观察过滤 → 信号检测 → 佐证闸门 → LLM 评审 → 结晶入库 → 持续改进），每个参数嵌在它起作用的那一步里，所见即所调
  - **评审提示词**：结晶/改进两段 system prompt 就地编辑（草稿-保存工作流），可随时重置回内建版本
  - **实时模式统计**：观察到的工具序列模式与触发计数
  - **危险操作**：清空全部进化技能（两步确认）

## 数据与隐私

- 轨迹证据只存在于内存（有界缓存），不落盘
- 落盘的只有结晶产物（`generated/*.json`：SKILL.md 正文、信号、序列、统计）与 `runtime-config.json`
- 评审 LLM 调用走部署内已配置的 provider，不引入外部端点
- 卸载插件即删除全部数据（`generated/` 随目录移除）

## 组成与开发

双面插件包（host + web client）：

| 文件 | 角色 |
|---|---|
| `plugin.mjs` | 宿主半：轨迹观察、信号检测、LLM 评审、技能注册、`./generated/` 持久化、`/skill-evolution` 认证 RPC 通道（`list` / `get` / `remove` / `clear` / `listModels` / `setModel` / `setLanguage` / `setEnabled` / `setTuning` / `setPrompt` …） |
| `client.js` | 浏览器半：设置页「技能进化」分区 |
| `cordis.patch.yml` | `dsh.bundle.patch` 挂载层 |
| `test/smoke.mjs` | 宿主半冒烟测试（mock cordis context，51 断言覆盖结晶/改进/FOLD_INTO/去重/RPC/计数） |
| `test/screenshot.mjs` | 无头截图脚本（CDP 驱动，全屏模式） |

```bash
node --check plugin.mjs && node --check client.js   # 语法
node test/smoke.mjs                                  # 冒烟测试
node test/screenshot.mjs <输出目录>                  # 重截 README 截图
```

仅依赖 `node:` 内建模块，不引入任何 `@deepseek-ai` 包，避免与宿主 cordis 双实例冲突。

## English

Event-driven skill self-evolution plugin for DeepSeek Harness (DSH). It watches agent execution traces and, at the end of every successful turn, fires an LLM review when any signal trips — a **complex** turn (≥5 tool calls), a **recovered** turn (failed steps but a working path found), or a **repeated** tool sequence. By default a lone `complex` signal must be corroborated by `recovered` or `repeated` before review (`complexRequiresCorroboration`, configurable). The reviewer either crystallizes a class-level reusable skill (registered into the skill catalog and persisted under `generated/`), folds near-duplicate evidence into an existing skill (`FOLD_INTO`), or answers `NOTHING_TO_SAVE`, following a hard do-not-capture list (environment failures, negative tool claims, transient errors, one-off narratives, unresolved failures). Existing evolved skills are progressively improved with fresh evidence instead of duplicated. Ships a Settings-section management UI (tabbed skills/settings views, master switch, skill cards with value/version/invocation chips, a tuning pipeline diagram with embedded controls, and in-place review-prompt editing) backed by an authenticated `/skill-evolution` RPC channel. Host half uses `node:` builtins only.

Install: `dsh plugin --profile web add dsh-skill-evolution` (npm), or `link:` / `file://` mounts — see the Chinese section above for details.

## License

[MIT](./LICENSE)
