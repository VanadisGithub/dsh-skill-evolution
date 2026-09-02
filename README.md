# dsh-skill-evolution

[![CI](https://github.com/VanadisGithub/dsh-skill-evolution/actions/workflows/ci.yml/badge.svg)](https://github.com/VanadisGithub/dsh-skill-evolution/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [中文](./README.zh-CN.md)

A **skill self-evolution plugin** for DeepSeek Harness (DSH): it watches agent execution traces and, at the end of every successful turn, fires an LLM review when signals trip — distilling workflows worth reusing into **crystallized skills** registered in the skill catalog. Later runs of the same workflow fold fresh lessons into the existing skill — skills are alive and get better with use.

## Highlights

- **Event-driven crystallization** — review fires at turn end, not on pure frequency counting; any of three signals (complex / recovered / repeated) sends the turn to review
- **Strict review gate** — LLM reviewer plus a hard do-not-capture list keeps junk out; `NOTHING_TO_SAVE` is a first-class outcome
- **Skills keep evolving** — new evidence is merged into existing skills (version bump); semantic dedup (`FOLD_INTO`) blocks near-duplicates reached through different tool sequences
- **Full management UI in Settings** — tabbed skills/settings views, master switch, skill cards with value/version/invocation chips, a tuning pipeline diagram with controls embedded in-place, and editable review prompts
- **Persistent & self-contained** — skills persist under `generated/` and re-register on restart; host half depends only on `node:` builtins

## Screenshots

**Skills tab** — skill cards with value (high/medium/low), version, invocation count and update-time chips; expand for crystallization signals, tool sequence and the full SKILL.md:

![Skills tab](assets/skills-tab.png)

**Settings tab** — status overview, review model, generation language and the configuration panels:

![Settings tab](assets/settings-tab.png)

**Thresholds & controls** — every parameter embedded in the pipeline diagram, editable exactly where it takes effect:

![Tuning pipeline with embedded controls](assets/tuning-panel.png)

## How it works

### Signal detection

At every turn end (`turn/end`), successful traces meeting a minimum step count are checked against three signals:

| Signal | Condition | Meaning |
|---|---|---|
| `complex` | successful turn with ≥ `minToolCalls` tool calls (default 5) | completed a complex task |
| `recovered` | had failed steps but the turn still succeeded | hit dead ends and found a working path around them |
| `repeated` | same tool sequence recurred ≥ `minPatternOccurrences` times with success rate ≥ `minSuccessRate` | a recurring, proven workflow |

**Corroboration gate** (`complexRequiresCorroboration`, on by default): a lone `complex` signal is weak evidence (any long turn qualifies), so by default it must be corroborated by `recovered` or `repeated` before review; withheld turns are logged and re-submitted once the sequence later earns a corroborating signal.

### Review gate

The reviewer LLM receives full evidence (signals, user intent, tool sequence, per-step outcomes and summaries) plus the **existing evolved-skill list**, and answers one of: `SAVE` (crystallize a new skill), `FOLD_INTO` (merge into an existing skill), or `NOTHING_TO_SAVE`.

Hard do-not-capture list — the following is **never crystallized**:

- environment-dependent failures (missing binaries, unconfigured credentials, uninstalled packages)
- negative claims about tools ("tool X is broken" would freeze into a long-lived refusal)
- transient errors cured by a retry (the lesson is the retry pattern, not the original error)
- one-off task narratives, unresolved failures

### Continuous evolution

- **Progressive improvement** — when new evidence lands on an existing skill's sequence (especially error-recovery experience), the reviewer merges the new lessons into the skill body and bumps the version instead of creating a duplicate
- **Semantic dedup (`FOLD_INTO`)** — the same class of experience can reappear via a **different tool sequence**, which pure sequence matching cannot catch. The crystallization reviewer sees the existing skill list (name + description) and may answer `VERDICT: FOLD_INTO: <existing-skill-name>`; the host then runs the improvement pipeline against that skill

### Output format

Class-level, kebab-case skills with the standard SKILL.md shape (`# Title / ## When to Use / ## Procedure / ## Pitfalls / ## Verification`). NAME and section headings are always English; body language follows `skillLanguage`.

## Install

### Option 1: official CLI (once published to npm)

```bash
dsh plugin --profile web add dsh-skill-evolution
```

The bundled `dsh.bundle.patch` mounts automatically — no profile edits needed.

### Option 2: git clone + link

```bash
git clone https://github.com/VanadisGithub/dsh-skill-evolution.git ~/Code/dsh-skill-evolution
```

Add to `dependencies` in `~/.dsh/profiles/web/package.json`:

```json
"dsh-skill-evolution": "link:/Users/<you>/Code/dsh-skill-evolution"
```

Then run `pnpm install` in `~/.dsh/profiles/web` and hard-refresh the browser.

### Option 3: file:// manual mount (prototype debugging)

Place the repo anywhere (e.g. `~/.dsh/plugins/skill-evolution/`) and append to `~/.dsh/cordis.patch.yml`:

```yaml
- insert:
  - id: 'skill-evolution'
    name: file:///Users/<you>/.dsh/plugins/skill-evolution/plugin.mjs?v=1
    config:
      minToolCalls: 5
      minPatternOccurrences: 3
      autoRegister: true
      llmProvider: deepseek      # adjust to a provider available in your deployment
      llmModel: deepseek-chat
```

`?v=N` busts the Node module cache; bump it whenever `plugin.mjs` changes. Host-half changes need a loader patch replay; browser-half changes just need a hard refresh.

> ⚠️ Pick exactly one option — duplicate mounts cause a dual instance.

## Configuration

Every key below works **both via mount config and directly in the Settings panel** (panel edits persist to `runtime-config.json` in the plugin directory, overriding mount config across restarts):

| Key | Default | Description |
|---|---|---|
| `enabled` | `true` | master switch: `false` stops turn observation and review (existing skills stay registered) |
| `minTraceSteps` | `3` | minimum trace steps (noise floor) |
| `minToolCalls` | `5` | `complex` signal threshold |
| `minPatternOccurrences` | `3` | `repeated` signal threshold |
| `minSuccessRate` | `0.7` | `repeated` signal success-rate floor |
| `signals` | all on | `{complex, recovered, repeated}` individual toggles |
| `complexRequiresCorroboration` | `true` | a lone `complex` signal needs corroboration before review |
| `autoRegister` | `true` | auto-register crystallized skills into the catalog |
| `llmProvider` / `llmModel` | `deepseek` / `deepseek-chat` | review model (the picker cascades to the provider's model catalog) |
| `skillLanguage` | `en` | generated-skill language: `zh` / `en` |
| `maxEvolvedSkills` | `20` | evolved-skill capacity |
| `improvementEvery` | `3` | trigger an improvement review every N same-sequence reruns |
| `maxImprovementsPerSkill` | `5` | max improvements per skill |
| `maxEvidenceSteps` | `30` | max evidence steps sent to review (truncation guard) |
| `maxTracesPerSession` | `200` | per-session trace cache cap (memory guard) |
| `maxStepTextLength` | `200` | per-step summary truncation length |
| `reviewSystemPrompt` | built-in | override the crystallization review system prompt |
| `improveSystemPrompt` | built-in | override the improvement review system prompt |

## Management panel

The "Skill Evolution" section in Settings, a two-tab layout with a **master switch** in the top-right corner:

- **Skills tab** — skill cards: name, description, value chip (high/medium/low, rated from crystallization and improvement counts), version, invocation count (skill-tool calls + user-explicit injection), update time; expand for crystallization signals, tool sequence and the full SKILL.md; delete/clear use two-step confirmation
- **Settings tab** — status overview, review model (provider-cascaded picker), generation language, and four panels:
  - **Thresholds & controls** — all thresholds drawn as one pipeline (turn end → observation filter → signal detection → corroboration gate → LLM review → crystallization → continuous improvement), each parameter embedded in the step where it takes effect
  - **Review prompts** — edit the crystallization/improvement system prompts in place (draft–save workflow), resettable to built-ins at any time
  - **Live pattern stats** — observed tool-sequence patterns and trigger counts
  - **Danger zone** — clear all evolved skills (two-step confirmation)

## Data & privacy

- Trace evidence lives in memory only (bounded cache), never on disk
- On disk: crystallization artifacts (`generated/*.json`: SKILL.md body, signals, sequences, stats) and `runtime-config.json`
- Review LLM calls go through providers already configured in the deployment — no external endpoints introduced
- Uninstalling the plugin removes all data (`generated/` goes with the directory)

## Layout & development

Two-sided plugin package (host + web client):

| File | Role |
|---|---|
| `plugin.mjs` | host half: trace observation, signal detection, LLM review, skill registration, `./generated/` persistence, authenticated `/skill-evolution` RPC channel (`list` / `get` / `remove` / `clear` / `listModels` / `setModel` / `setLanguage` / `setEnabled` / `setTuning` / `setPrompt` …) |
| `client.js` | browser half: the Settings "Skill Evolution" section |
| `cordis.patch.yml` | `dsh.bundle.patch` mount layer |
| `test/smoke.mjs` | host-half smoke test (mock cordis context, 51 assertions covering crystallization/improvement/FOLD_INTO/dedup/RPC/counting) |
| `test/screenshot.mjs` | headless screenshot script (CDP-driven, full-screen mode) |

```bash
node --check plugin.mjs && node --check client.js   # syntax
node test/smoke.mjs                                  # smoke test
node test/screenshot.mjs <output-dir>                # re-capture README screenshots
```

Only `node:` builtins are imported — no `@deepseek-ai` packages — avoiding any dual-instance conflict with the host's own cordis.

## License

[MIT](./LICENSE)
