/**
 * Hermes-style skill self-evolution plugin (self-contained).
 *
 * Crystallization model — adapted from Nous Research's Hermes Agent
 * (https://hermes-agent.nousresearch.com/docs/user-guide/features/skills and
 * NousResearch/hermes-agent `agent/background_review.py`):
 *
 *  - EVENT-DRIVEN, evaluated when each turn completes — not pure frequency
 *    counting. Any ONE fired signal sends the turn to an LLM review:
 *      • complex   — a successful turn with >= minToolCalls tool calls
 *                    ("completed a complex task (5+ tool calls) successfully")
 *      • recovered — the turn hit tool failures but still completed: the
 *                    agent found the working path around a dead end
 *      • repeated  — the same tool sequence recurred >= minPatternOccurrences
 *                    times with success rate >= minSuccessRate (the offline
 *                    GEPA-style "learn from repeated traces" signal)
 *    A lone `complex` signal is weak evidence on its own (any long turn
 *    qualifies), so by default it must be corroborated by `recovered` or
 *    `repeated` before a review is triggered; the gate is configurable via
 *    `complexRequiresCorroboration`.
 *  - The LLM reviewer decides what is worth keeping. "NOTHING_TO_SAVE" is a
 *    first-class outcome, and a hard DO-NOT-capture list filters noise:
 *    environment-dependent failures, negative tool claims, transient errors
 *    that a retry cured, one-off task narratives, unresolved failures.
 *  - Skills are class-level (no session-artifact names) and follow the
 *    When-to-Use / Procedure / Pitfalls / Verification shape.
 *  - Skills are ALIVE: when new evidence lands on an existing evolved skill's
 *    sequence (especially recovered errors), the reviewer merges it into the
 *    existing body and bumps the version instead of creating a duplicate.
 *  - Semantic dedup: the crystallization reviewer also sees the existing skill
 *    list and may answer "VERDICT: FOLD_INTO: <name>" for a near-duplicate
 *    workflow reached through a DIFFERENT tool sequence; the host then runs
 *    the improvement pipeline against that skill instead of saving a copy.
 *
 * Management surface: evolved skills persist in `./generated/` beside this
 * file and are exposed over the authenticated `/skill-evolution` RPC channel
 * (list / get / remove / clear), consumed by this package's client half,
 * which renders a dedicated Settings section.
 *
 * This file imports ONLY node: builtins — no @deepseek-ai packages — so
 * there is no dual-instance conflict with the host's own cordis.
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DEFAULT_MIN_TRACE_STEPS = 3
const DEFAULT_MIN_TOOL_CALLS = 5
const DEFAULT_MIN_PATTERN_OCCURRENCES = 3
const DEFAULT_MIN_SUCCESS_RATE = 0.7
const DEFAULT_MAX_TRACES_PER_SESSION = 50
const DEFAULT_MAX_STEP_TEXT_LENGTH = 200
const DEFAULT_MAX_EVOLVED_SKILLS = 20
const DEFAULT_MAX_EVIDENCE_STEPS = 30
const DEFAULT_IMPROVEMENT_EVERY = 3
const DEFAULT_MAX_IMPROVEMENTS_PER_PROCESS = 5
const DEFAULT_COMPLEX_REQUIRES_CORROBORATION = true
const DEFAULT_SKILL_LANGUAGE = 'en'
const SKILL_LANGUAGES = ['zh', 'en']

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))
const GENERATED_DIR = join(PLUGIN_DIR, 'generated')
const RUNTIME_CONFIG_FILE = join(PLUGIN_DIR, 'runtime-config.json')
const RPC_CHANNEL = '/skill-evolution'
const MAX_PROMPT_LENGTH = 8000

/** Tunables the Settings UI may change at runtime: key -> inclusive bounds. */
const INT_TUNABLES = {
  minTraceSteps: [1, 50],
  minToolCalls: [1, 100],
  minPatternOccurrences: [1, 100],
  maxTracesPerSession: [1, 500],
  maxStepTextLength: [20, 5000],
  maxEvolvedSkills: [1, 200],
  maxEvidenceSteps: [1, 200],
  improvementEvery: [1, 100],
  maxImprovementsPerProcess: [0, 100],
}
const RATE_TUNABLES = { minSuccessRate: [0, 1] }
const BOOL_TUNABLES = ['autoRegister', 'complexRequiresCorroboration']
const SIGNAL_KEYS = ['complex', 'recovered', 'repeated']

export const name = 'skill-evolution'
export const inject = ['skills', 'llm', 'connection']

function safeRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined
}

function ok(value) {
  return { ok: true, value }
}

function fail(code, message) {
  return { ok: false, error: { code, message, details: {} } }
}

/**
 * Plugin entry point. Receives the host Cordis context and config.
 * @param {object} ctx - Cordis context with skills, llm, connection, on(), logger.
 * @param {object} [config] - optional configuration overrides.
 */
export function apply(ctx, config = {}) {
  // Mount-config baseline for every tunable. The Settings UI may override
  // each one at runtime (persisted in runtime-config.json, reloaded on the
  // next apply), so the live values below are mutable.
  const signalsConfig = safeRecord(config.signals) ?? {}
  const tuningDefaults = {
    minTraceSteps: config.minTraceSteps ?? DEFAULT_MIN_TRACE_STEPS,
    minToolCalls: config.minToolCalls ?? DEFAULT_MIN_TOOL_CALLS,
    minPatternOccurrences: config.minPatternOccurrences ?? DEFAULT_MIN_PATTERN_OCCURRENCES,
    minSuccessRate: config.minSuccessRate ?? DEFAULT_MIN_SUCCESS_RATE,
    maxTracesPerSession: config.maxTracesPerSession ?? DEFAULT_MAX_TRACES_PER_SESSION,
    maxStepTextLength: config.maxStepTextLength ?? DEFAULT_MAX_STEP_TEXT_LENGTH,
    maxEvolvedSkills: config.maxEvolvedSkills ?? DEFAULT_MAX_EVOLVED_SKILLS,
    maxEvidenceSteps: config.maxEvidenceSteps ?? DEFAULT_MAX_EVIDENCE_STEPS,
    improvementEvery: config.improvementEvery ?? DEFAULT_IMPROVEMENT_EVERY,
    maxImprovementsPerProcess: config.maxImprovementsPerProcess ?? DEFAULT_MAX_IMPROVEMENTS_PER_PROCESS,
    complexRequiresCorroboration: config.complexRequiresCorroboration ?? DEFAULT_COMPLEX_REQUIRES_CORROBORATION,
    autoRegister: config.autoRegister ?? true,
    signals: {
      complex: signalsConfig.complex ?? true,
      recovered: signalsConfig.recovered ?? true,
      repeated: signalsConfig.repeated ?? true,
    },
  }
  let minTraceSteps = tuningDefaults.minTraceSteps
  let minToolCalls = tuningDefaults.minToolCalls
  let minPatternOccurrences = tuningDefaults.minPatternOccurrences
  let minSuccessRate = tuningDefaults.minSuccessRate
  let maxTracesPerSession = tuningDefaults.maxTracesPerSession
  let maxStepTextLength = tuningDefaults.maxStepTextLength
  let maxEvolvedSkills = tuningDefaults.maxEvolvedSkills
  let maxEvidenceSteps = tuningDefaults.maxEvidenceSteps
  let improvementEvery = tuningDefaults.improvementEvery
  let maxImprovementsPerProcess = tuningDefaults.maxImprovementsPerProcess
  let complexRequiresCorroboration = tuningDefaults.complexRequiresCorroboration
  let autoRegister = tuningDefaults.autoRegister
  const signalEnabled = { ...tuningDefaults.signals }
  /** normalized runtime tuning overrides (persisted verbatim) */
  const tuningOverrides = {}
  // Reviewer model: patch-config baseline, overridable at runtime from the
  // Settings UI (persisted in runtime-config.json, reloaded on next apply).
  let llmProvider = config.llmProvider ?? 'deepseek'
  let llmModel = config.llmModel ?? 'deepseek-chat'
  let modelSource = 'config'
  // Generated-skill language: 'zh' or 'en'. Same runtime-override lifecycle
  // as the reviewer model.
  const configSkillLanguage = SKILL_LANGUAGES.includes(config.skillLanguage) ? config.skillLanguage : DEFAULT_SKILL_LANGUAGE
  let skillLanguage = configSkillLanguage
  // Review-prompt overrides: undefined means "use the built-in default".
  const promptOverrides = { review: undefined, improve: undefined }
  // Master switch from the Settings UI: when off, turns are not observed and
  // nothing is reviewed. Already-crystallized skills stay registered.
  const configEnabled = config.enabled !== false
  let enabled = configEnabled

  /** @type {Map<string, {sessionId: string, startedAt: string, steps: Array, callIdToTool: Map, intent: string}>} */
  const activeTraces = new Map()
  /** @type {Map<string, Array>} */
  const traces = new Map()
  /** @type {Map<string, object>} */
  const patterns = new Map()
  /**
   * Evolved skill records keyed by skill name.
   * @type {Map<string, {record: object, dispose?: () => void}>}
   */
  const evolvedSkills = new Map()
  /** sequenceKey -> skill name, for the progressive-improvement path */
  const sequenceToSkill = new Map()
  /** sequenceKey -> {verdict, occurrencesAtReview}, the anti-spam review ledger */
  const reviewedSequences = new Map()
  /** sequenceKeys with a review currently in flight */
  const reviewsInFlight = new Set()
  /** skillName -> improvements performed this process lifetime */
  const improvementsPerSkill = new Map()
  let nextTraceId = 1
  let nextPatternId = 1

  // ------------------------------------------------------------------
  // Persistence
  // ------------------------------------------------------------------

  function ensureGeneratedDir() {
    if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true })
  }

  function fileOf(skillName) {
    return join(GENERATED_DIR, `${skillName}.json`)
  }

  function persist(record) {
    try {
      ensureGeneratedDir()
      const target = fileOf(record.name)
      const tmp = `${target}.tmp`
      writeFileSync(tmp, JSON.stringify(record, null, 2))
      renameSync(tmp, target)
    } catch (error) {
      ctx.logger.warn(`skill-evolution: failed to persist "${record.name}": ${String(error)}`)
    }
  }

  function unpersist(skillName) {
    try {
      if (existsSync(fileOf(skillName))) unlinkSync(fileOf(skillName))
    } catch (error) {
      ctx.logger.warn(`skill-evolution: failed to delete file for "${skillName}": ${String(error)}`)
    }
  }

  // ------------------------------------------------------------------
  // Runtime config (Settings-UI editable, survives restarts)
  // ------------------------------------------------------------------

  /** Validate a tuning patch; @returns normalized `{values, signals}`. */
  function validateTuningPatch(patch) {
    const rec = safeRecord(patch)
    if (!rec || Object.keys(rec).length === 0) throw new Error('tuning must be a non-empty object')
    const values = {}
    const signals = {}
    for (const [key, value] of Object.entries(rec)) {
      if (key === 'signals') {
        const signalsRec = safeRecord(value)
        if (!signalsRec) throw new Error('signals must be an object')
        for (const [signalKey, enabled] of Object.entries(signalsRec)) {
          if (!SIGNAL_KEYS.includes(signalKey)) throw new Error(`unknown signal ${JSON.stringify(signalKey)}`)
          if (typeof enabled !== 'boolean') throw new Error(`signals.${signalKey} must be a boolean`)
          signals[signalKey] = enabled
        }
        continue
      }
      if (Object.hasOwn(INT_TUNABLES, key)) {
        if (!Number.isSafeInteger(value)) throw new Error(`${key} must be an integer`)
        const [low, high] = INT_TUNABLES[key]
        if (value < low || value > high) throw new Error(`${key} must be between ${low} and ${high}`)
        values[key] = value
        continue
      }
      if (Object.hasOwn(RATE_TUNABLES, key)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be a number`)
        const [low, high] = RATE_TUNABLES[key]
        if (value < low || value > high) throw new Error(`${key} must be between ${low} and ${high}`)
        values[key] = value
        continue
      }
      if (BOOL_TUNABLES.includes(key)) {
        if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean`)
        values[key] = value
        continue
      }
      throw new Error(`unknown tuning key ${JSON.stringify(key)}`)
    }
    return { values, signals }
  }

  /** Apply a validated tuning patch to the live values and the override ledger. */
  function applyTuningPatch(patch) {
    const { values, signals } = validateTuningPatch(patch)
    for (const [key, value] of Object.entries(values)) {
      switch (key) {
        case 'minTraceSteps': minTraceSteps = value; break
        case 'minToolCalls': minToolCalls = value; break
        case 'minPatternOccurrences': minPatternOccurrences = value; break
        case 'minSuccessRate': minSuccessRate = value; break
        case 'maxTracesPerSession': maxTracesPerSession = value; break
        case 'maxStepTextLength': maxStepTextLength = value; break
        case 'maxEvolvedSkills': maxEvolvedSkills = value; break
        case 'maxEvidenceSteps': maxEvidenceSteps = value; break
        case 'improvementEvery': improvementEvery = value; break
        case 'maxImprovementsPerProcess': maxImprovementsPerProcess = value; break
        case 'complexRequiresCorroboration': complexRequiresCorroboration = value; break
        case 'autoRegister': autoRegister = value; break
      }
      tuningOverrides[key] = value
    }
    for (const [signalKey, enabled] of Object.entries(signals)) {
      signalEnabled[signalKey] = enabled
      tuningOverrides.signals = { ...(tuningOverrides.signals ?? {}), [signalKey]: enabled }
    }
  }

  /** Drop every runtime tuning override and restore the mount-config baseline. */
  function resetTuning() {
    for (const key of Object.keys(tuningOverrides)) delete tuningOverrides[key]
    minTraceSteps = tuningDefaults.minTraceSteps
    minToolCalls = tuningDefaults.minToolCalls
    minPatternOccurrences = tuningDefaults.minPatternOccurrences
    minSuccessRate = tuningDefaults.minSuccessRate
    maxTracesPerSession = tuningDefaults.maxTracesPerSession
    maxStepTextLength = tuningDefaults.maxStepTextLength
    maxEvolvedSkills = tuningDefaults.maxEvolvedSkills
    maxEvidenceSteps = tuningDefaults.maxEvidenceSteps
    improvementEvery = tuningDefaults.improvementEvery
    maxImprovementsPerProcess = tuningDefaults.maxImprovementsPerProcess
    complexRequiresCorroboration = tuningDefaults.complexRequiresCorroboration
    autoRegister = tuningDefaults.autoRegister
    signalEnabled.complex = tuningDefaults.signals.complex
    signalEnabled.recovered = tuningDefaults.signals.recovered
    signalEnabled.repeated = tuningDefaults.signals.repeated
  }

  function loadRuntimeConfig() {
    try {
      if (!existsSync(RUNTIME_CONFIG_FILE)) return
      const rec = safeRecord(JSON.parse(readFileSync(RUNTIME_CONFIG_FILE, 'utf8')))
      if (!rec) return
      let modelFromRuntime = false
      if (typeof rec.llmProvider === 'string' && rec.llmProvider.trim()) {
        llmProvider = rec.llmProvider.trim()
        modelFromRuntime = true
      }
      if (typeof rec.llmModel === 'string' && rec.llmModel.trim()) {
        llmModel = rec.llmModel.trim()
        modelFromRuntime = true
      }
      if (modelFromRuntime) modelSource = 'runtime'
      if (SKILL_LANGUAGES.includes(rec.skillLanguage)) skillLanguage = rec.skillLanguage
      if (typeof rec.enabled === 'boolean') enabled = rec.enabled
      if (safeRecord(rec.tuning)) {
        try {
          applyTuningPatch(rec.tuning)
        } catch (error) {
          ctx.logger.warn(`skill-evolution: ignoring invalid persisted tuning: ${String(error)}`)
        }
      }
      const prompts = safeRecord(rec.prompts)
      if (prompts) {
        if (typeof prompts.review === 'string' && prompts.review.trim()) promptOverrides.review = prompts.review.slice(0, MAX_PROMPT_LENGTH)
        if (typeof prompts.improve === 'string' && prompts.improve.trim()) promptOverrides.improve = prompts.improve.slice(0, MAX_PROMPT_LENGTH)
      }
    } catch (error) {
      ctx.logger.warn(`skill-evolution: ignoring unreadable runtime-config.json: ${String(error)}`)
    }
  }

  /** Snapshot every runtime override that differs from the mount-config baseline. */
  function runtimeOverridesRecord() {
    const rec = {}
    if (modelSource === 'runtime') {
      rec.llmProvider = llmProvider
      rec.llmModel = llmModel
    }
    if (skillLanguage !== configSkillLanguage) rec.skillLanguage = skillLanguage
    if (enabled !== configEnabled) rec.enabled = enabled
    if (Object.keys(tuningOverrides).length > 0) rec.tuning = JSON.parse(JSON.stringify(tuningOverrides))
    const prompts = {}
    if (promptOverrides.review !== undefined) prompts.review = promptOverrides.review
    if (promptOverrides.improve !== undefined) prompts.improve = promptOverrides.improve
    if (Object.keys(prompts).length > 0) rec.prompts = prompts
    return rec
  }

  /**
   * Rewrite runtime-config.json from the live override state. A single writer
   * keeps partial resets honest: whatever is still overridden stays, and an
   * empty override set removes the file entirely.
   */
  function persistRuntimeConfig() {
    try {
      const rec = runtimeOverridesRecord()
      if (Object.keys(rec).length === 0) {
        if (existsSync(RUNTIME_CONFIG_FILE)) unlinkSync(RUNTIME_CONFIG_FILE)
        return
      }
      const tmp = `${RUNTIME_CONFIG_FILE}.tmp`
      writeFileSync(tmp, JSON.stringify(rec, null, 2))
      renameSync(tmp, RUNTIME_CONFIG_FILE)
    } catch (error) {
      ctx.logger.warn(`skill-evolution: failed to persist runtime config: ${String(error)}`)
    }
  }

  function normalizeRecord(rec) {
    return {
      name: rec.name,
      description: typeof rec.description === 'string' ? rec.description : '',
      content: rec.content,
      version: Number.isSafeInteger(rec.version) ? rec.version : 1,
      sourcePatternId: typeof rec.sourcePatternId === 'string' ? rec.sourcePatternId : '',
      toolSequence: Array.isArray(rec.toolSequence) ? rec.toolSequence.filter(t => typeof t === 'string') : [],
      occurrences: Number.isSafeInteger(rec.occurrences) ? rec.occurrences : 1,
      successRate: typeof rec.successRate === 'number' ? rec.successRate : 1,
      signals: Array.isArray(rec.signals) ? rec.signals.filter(s => typeof s === 'string') : [],
      improvements: Number.isSafeInteger(rec.improvements) ? rec.improvements : 0,
      invocations: Number.isSafeInteger(rec.invocations) ? rec.invocations : 0,
      intents: Array.isArray(rec.intents) ? rec.intents.filter(i => typeof i === 'string') : [],
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString(),
      updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : new Date().toISOString(),
    }
  }

  function loadPersisted() {
    try {
      ensureGeneratedDir()
      for (const entry of readdirSync(GENERATED_DIR)) {
        if (!entry.endsWith('.json')) continue
        try {
          const rec = safeRecord(JSON.parse(readFileSync(join(GENERATED_DIR, entry), 'utf8')))
          if (!rec || typeof rec.name !== 'string' || !SKILL_NAME_RE.test(rec.name)) continue
          if (typeof rec.content !== 'string' || rec.content.length === 0) continue
          const record = normalizeRecord(rec)
          evolvedSkills.set(record.name, { record })
          sequenceToSkill.set(record.toolSequence.join('→'), record.name)
        } catch (error) {
          ctx.logger.warn(`skill-evolution: skipping unreadable persisted skill ${entry}: ${String(error)}`)
        }
      }
    } catch (error) {
      ctx.logger.warn(`skill-evolution: failed to scan persisted skills: ${String(error)}`)
    }
  }

  function registerSkill(record) {
    if (!autoRegister) return
    if (evolvedSkills.get(record.name)?.dispose) return
    try {
      const dispose = ctx.skills.register({
        name: record.name,
        description: record.description,
        source: 'custom',
        content: record.content,
      })
      const entry = evolvedSkills.get(record.name) ?? { record }
      entry.dispose = dispose
      evolvedSkills.set(record.name, entry)
    } catch (error) {
      ctx.logger.warn(`skill-evolution: failed to register "${record.name}": ${String(error)}`)
    }
  }

  function reregisterUpdated(record) {
    const entry = evolvedSkills.get(record.name)
    if (!entry) return
    try {
      entry.dispose?.()
    } catch (error) {
      ctx.logger.warn(`skill-evolution: unregistering "${record.name}" for update threw: ${String(error)}`)
    }
    entry.dispose = undefined
    persist(record)
    registerSkill(record)
  }

  // ------------------------------------------------------------------
  // Trace observation
  // ------------------------------------------------------------------

  function truncate(text, maxLength) {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`
  }

  function ensureActiveTrace(sessionId) {
    let trace = activeTraces.get(sessionId)
    if (!trace) {
      trace = { sessionId, startedAt: new Date().toISOString(), steps: [], callIdToTool: new Map(), intent: '' }
      activeTraces.set(sessionId, trace)
    }
    return trace
  }

  function recordUserIntent(sessionId, text) {
    const trace = ensureActiveTrace(sessionId)
    if (!trace.intent && text) trace.intent = truncate(text, maxStepTextLength)
  }

  function recordToolCall(sessionId, callId, tool, args) {
    const trace = ensureActiveTrace(sessionId)
    trace.callIdToTool.set(callId, tool)
    trace.steps.push({ tool, args: truncate(args, maxStepTextLength), success: true, resultSummary: '' })
  }

  function recordToolResult(sessionId, callId, success, resultSummary) {
    const trace = activeTraces.get(sessionId)
    if (!trace) return
    const tool = trace.callIdToTool.get(callId)
    if (!tool) return
    for (let i = trace.steps.length - 1; i >= 0; i--) {
      const step = trace.steps[i]
      if (step && step.tool === tool && step.resultSummary === '') {
        step.success = success
        step.resultSummary = truncate(resultSummary, maxStepTextLength)
        break
      }
    }
  }

  function finalizeTrace(sessionId, success) {
    const active = activeTraces.get(sessionId)
    activeTraces.delete(sessionId)
    if (!active || active.steps.length < minTraceSteps) return undefined

    const trace = {
      id: nextTraceId++,
      sessionId,
      startedAt: active.startedAt,
      steps: [...active.steps],
      success,
      intent: active.intent,
    }

    const sessionTraces = traces.get(sessionId) ?? []
    sessionTraces.push(trace)
    if (sessionTraces.length > maxTracesPerSession) sessionTraces.shift()
    traces.set(sessionId, sessionTraces)

    return trace
  }

  // ------------------------------------------------------------------
  // Hermes-style signal detection
  // ------------------------------------------------------------------

  function updatePattern(trace) {
    const toolSequence = trace.steps.map(s => s.tool)
    const sequenceKey = toolSequence.join('→')
    let pattern = patterns.get(sequenceKey)
    if (!pattern) {
      pattern = {
        id: `pattern-${nextPatternId++}`,
        toolSequence,
        occurrences: 1,
        traceIds: [trace.id],
        intents: trace.intent ? [trace.intent] : [],
        successRate: trace.success ? 1 : 0,
        crystallized: false,
      }
      patterns.set(sequenceKey, pattern)
    } else {
      pattern.occurrences += 1
      pattern.successRate = (pattern.successRate * (pattern.occurrences - 1) + (trace.success ? 1 : 0)) / pattern.occurrences
      pattern.traceIds.push(trace.id)
      if (trace.intent && !pattern.intents.includes(trace.intent)) pattern.intents.push(trace.intent)
    }
    return pattern
  }

  /**
   * Hermes trigger conditions, adapted to host-side trace evidence. Any one
   * fired signal warrants an LLM review of the turn — except a lone `complex`
   * signal when the corroboration gate is on: it must be accompanied by
   * `recovered` or `repeated` to reach the reviewer.
   * @returns {{signals: string[], pattern: object}} detected signals
   */
  function detectSignals(trace, pattern) {
    const signals = []
    const failedSteps = trace.steps.filter(s => !s.success).length

    if (signalEnabled.complex && trace.success && trace.steps.length >= minToolCalls) {
      signals.push(`complex (${trace.steps.length} tool calls, completed successfully)`)
    }
    if (signalEnabled.recovered && trace.success && failedSteps > 0) {
      signals.push(`recovered (${failedSteps} failed step(s), working path found)`)
    }
    if (
      signalEnabled.repeated
      && pattern.occurrences >= minPatternOccurrences
      && pattern.successRate >= minSuccessRate
    ) {
      signals.push(`repeated (sequence seen ${pattern.occurrences}x, ${Math.round(pattern.successRate * 100)}% success)`)
    }
    if (
      complexRequiresCorroboration
      && signals.some(s => s.startsWith('complex'))
      && !signals.some(s => s.startsWith('recovered') || s.startsWith('repeated'))
    ) {
      ctx.logger.info(`skill-evolution: lone complex signal withheld pending corroboration (occurrence ${pattern.occurrences}): ${pattern.toolSequence.join('→')}`)
      return { signals: [], pattern }
    }
    return { signals, pattern }
  }

  // ------------------------------------------------------------------
  // LLM review (Hermes background-review style)
  // ------------------------------------------------------------------

  async function callLlm(system, userContent) {
    const messages = [{
      id: randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: userContent }],
      source: { kind: 'user' },
    }]
    try {
      const chunks = []
      for await (const chunk of ctx.llm.stream({ provider: llmProvider, model: llmModel, messages, system })) {
        if (chunk.type === 'text-delta') {
          chunks.push(chunk.text)
        } else if (chunk.type === 'finish' && chunk.reason.kind === 'error') {
          ctx.logger.warn(`skill-evolution: LLM call failed: ${chunk.reason.failure.message}`)
          return undefined
        }
      }
      const result = chunks.join('')
      return result.length > 0 ? result : undefined
    } catch (error) {
      ctx.logger.warn(`skill-evolution: LLM call threw: ${String(error)}`)
      return undefined
    }
  }

  const REVIEW_SYSTEM_PROMPT = [
    'You are the skill-crystallization reviewer for an AI agent harness, following the Hermes self-evolution model.',
    'You receive ONE completed agent turn as evidence: fired signals, the user intent, the tool sequence, and per-step outcomes.',
    'Decide whether this workflow deserves to become a reusable skill.',
    '',
    'Be ACTIVE about real reusable workflows, but conservative about noise.',
    '',
    'Do NOT capture any of these (they become persistent self-imposed constraints or clutter):',
    '- Environment-dependent failures: missing binaries, unconfigured credentials, uninstalled packages.',
    '- Negative claims about tools ("X tool is broken") — they harden into long-lived refusals.',
    '- Session-specific transient errors that a retry cured; if retrying worked, the lesson is the retry pattern, not the original failure.',
    '- One-off task narratives that are not a reusable class of work.',
    '- Unresolved failures — never present an untested sequence as validated guidance.',
    '',
    'Naming: class-level kebab-case, 2-5 words. NOT a session artifact: no PR numbers, error strings, codenames, or fix-X/debug-Y names.',
    'If the name would only make sense for today\'s task, answer NOTHING_TO_SAVE.',
    '',
    'You also receive the list of existing evolved skills. If this evidence teaches the SAME class of workflow an existing skill already covers — even through a different tool sequence — do NOT save a near-duplicate: answer VERDICT: FOLD_INTO: <existing-skill-name> and the fresh evidence will be merged into that skill instead.',
    '',
    'Output EXACTLY one of these three forms, nothing else:',
    '',
    'NOTHING_TO_SAVE',
    '',
    'or:',
    '',
    'VERDICT: FOLD_INTO: <existing-skill-name>',
    '',
    'or:',
    '',
    'VERDICT: SAVE',
    'NAME: <kebab-case-name>',
    'DESCRIPTION: <one line, <= 60 chars>',
    '---',
    '<SKILL.md body with exactly these sections: # Title / ## When to Use / ## Procedure / ## Pitfalls / ## Verification>',
  ].join('\n')

  /**
   * Output-language directive appended to both review prompts. NAME and the
   * section headings stay English (structural conventions); prose follows
   * the user-selected language.
   */
  function languageDirective() {
    return skillLanguage === 'zh'
      ? 'Language: write DESCRIPTION and the entire SKILL.md body in Chinese (简体中文). NAME stays English kebab-case. Keep the section headings (# Title / ## When to Use / ## Procedure / ## Pitfalls / ## Verification) exactly as specified, in English.'
      : 'Language: write DESCRIPTION and the entire SKILL.md body in English.'
  }

  const IMPROVE_SYSTEM_PROMPT = [
    'You are improving an EXISTING evolved skill of an AI agent harness with fresh execution evidence (Hermes-style progressive improvement).',
    'Fold genuinely new lessons into the existing body — especially pitfalls recovered from in the new evidence.',
    'Keep what works; do not rewrite for style. Preserve the # Title / ## When to Use / ## Procedure / ## Pitfalls / ## Verification structure.',
    'If the evidence teaches nothing new, answer NOTHING_TO_SAVE.',
    '',
    'Output EXACTLY one of these two forms, nothing else:',
    '',
    'NOTHING_TO_SAVE',
    '',
    'or:',
    '',
    'VERDICT: UPDATE',
    '---',
    '<the full updated SKILL.md body>',
  ].join('\n')

  function effectiveReviewPrompt() {
    return promptOverrides.review ?? REVIEW_SYSTEM_PROMPT
  }

  function effectiveImprovePrompt() {
    return promptOverrides.improve ?? IMPROVE_SYSTEM_PROMPT
  }

  function evidenceBlock(trace, pattern, signals) {
    const lines = []
    lines.push(`Fired signals: ${signals.join('; ')}`)
    lines.push(`Tool sequence: ${trace.steps.map(s => s.tool).join(' → ')}`)
    lines.push(`Sequence occurrences so far: ${pattern.occurrences} (success rate ${Math.round(pattern.successRate * 100)}%)`)
    if (trace.intent) lines.push(`User intent: ${trace.intent}`)
    lines.push('Steps:')
    const steps = trace.steps.slice(-maxEvidenceSteps)
    steps.forEach((step, index) => {
      const mark = step.success ? '✓' : '✗'
      const detail = step.resultSummary ? ` → ${step.resultSummary}` : ''
      lines.push(`${index + 1}. ${step.tool} ${mark} ${step.args}${detail}`)
    })
    return lines.join('\n')
  }

  function parseReview(response) {
    if (typeof response !== 'string') return { verdict: 'nothing' }
    const trimmed = response.trim()
    if (/^NOTHING_TO_SAVE\b/i.test(trimmed)) return { verdict: 'nothing' }
    // Semantic dedup: the reviewer routes a near-duplicate workflow into an
    // existing skill instead of crystallizing a second one.
    const foldMatch = trimmed.match(/^VERDICT:\s*FOLD_INTO:\s*(\S+)\s*$/im)
    if (foldMatch) {
      const target = foldMatch[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
      return { verdict: 'fold', target }
    }
    const saveMatch = trimmed.match(/^VERDICT:\s*SAVE\b/i)
    const updateMatch = trimmed.match(/^VERDICT:\s*UPDATE\b/i)
    if (!saveMatch && !updateMatch) return { verdict: 'nothing' }
    const lines = trimmed.split('\n')
    let skillName = ''
    let description = ''
    let bodyStart = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      const nameMatch = line.match(/^NAME:\s*(.+)$/i)
      if (nameMatch && !skillName) skillName = nameMatch[1].trim()
      const descMatch = line.match(/^DESCRIPTION:\s*(.+)$/i)
      if (descMatch && !description) description = descMatch[1].trim()
      if (line.trim() === '---') {
        bodyStart = i + 1
        break
      }
    }
    const content = bodyStart >= 0 ? lines.slice(bodyStart).join('\n').trim() : ''
    return {
      verdict: saveMatch ? 'save' : 'update',
      name: skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48),
      description: truncate(description, 120),
      content,
    }
  }

  function fallbackName(trace) {
    const tools = trace.steps.map(s => s.tool)
    const primary = tools[0] ?? 'task'
    const secondary = tools.length > 1 ? tools[1] : undefined
    const base = secondary ? `${primary}-${secondary}` : primary
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'evolved-workflow'
  }

  async function reviewTraceForCrystallization(trace, pattern, signals, sequenceKey) {
    if (evolvedSkills.size >= maxEvolvedSkills) return
    // The reviewer sees every existing evolved skill so it can route a
    // near-duplicate workflow into FOLD_INTO instead of saving a second copy.
    const skillList = [...evolvedSkills.values()]
      .map(entry => `- ${entry.record.name}: ${entry.record.description}`)
      .join('\n')
    const baseEvidence = evidenceBlock(trace, pattern, signals)
    const evidence = skillList ? `Existing evolved skills:\n${skillList}\n\n${baseEvidence}` : baseEvidence
    const response = await callLlm(`${effectiveReviewPrompt()}\n\n${languageDirective()}`, evidence)
    const review = parseReview(response)
    if (review.verdict === 'fold') {
      if (!evolvedSkills.has(review.target)) {
        reviewedSequences.set(sequenceKey, { verdict: 'nothing', occurrencesAtReview: pattern.occurrences })
        ctx.logger.warn(`skill-evolution: reviewer folded into unknown skill "${review.target}"; nothing saved`)
        return
      }
      sequenceToSkill.set(sequenceKey, review.target)
      reviewedSequences.set(sequenceKey, { verdict: 'folded', occurrencesAtReview: pattern.occurrences })
      ctx.logger.info(`skill-evolution: reviewer folded ${sequenceKey || 'trace'} into "${review.target}"`)
      await reviewTraceForImprovement(trace, pattern, signals, sequenceKey, review.target)
      return
    }
    if (review.verdict !== 'save' || !review.content) {
      reviewedSequences.set(sequenceKey, { verdict: 'nothing', occurrencesAtReview: pattern.occurrences })
      ctx.logger.info(`skill-evolution: reviewer declined to crystallize ${sequenceKey || 'trace'}`)
      return
    }
    let skillName = review.name && SKILL_NAME_RE.test(review.name) ? review.name : fallbackName(trace)
    if (evolvedSkills.has(skillName)) skillName = `${skillName}-${pattern.id}`
    if (!SKILL_NAME_RE.test(skillName) || evolvedSkills.has(skillName)) return

    const now = new Date().toISOString()
    const record = normalizeRecord({
      name: skillName,
      description: review.description || `Workflow: ${trace.steps.map(s => s.tool).slice(0, 3).join(' → ')}`,
      content: review.content,
      version: 1,
      sourcePatternId: pattern.id,
      toolSequence: trace.steps.map(s => s.tool),
      occurrences: pattern.occurrences,
      successRate: pattern.successRate,
      signals,
      intents: trace.intent ? [trace.intent] : [],
      createdAt: now,
      updatedAt: now,
    })
    evolvedSkills.set(skillName, { record })
    sequenceToSkill.set(sequenceKey, skillName)
    reviewedSequences.set(sequenceKey, { verdict: 'saved', occurrencesAtReview: pattern.occurrences })
    pattern.crystallized = true
    persist(record)
    registerSkill(record)
    ctx.logger.info(`skill-evolution: crystallized "${skillName}" (${signals.join(', ')})`)
  }

  async function reviewTraceForImprovement(trace, pattern, signals, sequenceKey, skillName) {
    const entry = evolvedSkills.get(skillName)
    if (!entry) return
    const done = improvementsPerSkill.get(skillName) ?? 0
    if (done >= maxImprovementsPerProcess) return

    const evidence = [
      evidenceBlock(trace, pattern, signals),
      '',
      'Existing skill content:',
      entry.record.content,
    ].join('\n')
    const response = await callLlm(`${effectiveImprovePrompt()}\n\n${languageDirective()}`, evidence)
    const review = parseReview(response)
    if (review.verdict !== 'update' || !review.content) {
      ctx.logger.info(`skill-evolution: no new learning folded into "${skillName}"`)
      return
    }
    entry.record = {
      ...entry.record,
      content: review.content,
      version: entry.record.version + 1,
      improvements: entry.record.improvements + 1,
      occurrences: pattern.occurrences,
      successRate: pattern.successRate,
      updatedAt: new Date().toISOString(),
    }
    improvementsPerSkill.set(skillName, done + 1)
    reregisterUpdated(entry.record)
    ctx.logger.info(`skill-evolution: improved "${skillName}" to v${entry.record.version}`)
  }

  /**
   * Turn-end entry point: Hermes-style event-driven evaluation.
   * Unresolved failures are never crystallized; noisy repeats of
   * already-declined sequences are skipped.
   */
  function evaluateTurn(trace) {
    if (!trace.success) return
    const pattern = updatePattern(trace)
    const sequenceKey = pattern.toolSequence.join('→')
    const { signals } = detectSignals(trace, pattern)
    if (signals.length === 0) return

    const existingSkill = sequenceToSkill.get(sequenceKey)
    if (existingSkill && evolvedSkills.has(existingSkill)) {
      const worthImproving = signals.some(s => s.startsWith('recovered'))
        || pattern.occurrences % improvementEvery === 0
      if (!worthImproving) return
      if (reviewsInFlight.has(sequenceKey)) return
      reviewsInFlight.add(sequenceKey)
      reviewTraceForImprovement(trace, pattern, signals, sequenceKey, existingSkill)
        .catch(error => ctx.logger.warn(`skill-evolution: improvement review failed: ${String(error)}`))
        .finally(() => reviewsInFlight.delete(sequenceKey))
      return
    }

    if (evolvedSkills.size >= maxEvolvedSkills) return
    const prior = reviewedSequences.get(sequenceKey)
    if (prior && prior.verdict === 'nothing' && pattern.occurrences < prior.occurrencesAtReview * 2) return
    if (reviewsInFlight.has(sequenceKey)) return

    reviewsInFlight.add(sequenceKey)
    reviewTraceForCrystallization(trace, pattern, signals, sequenceKey)
      .catch(error => ctx.logger.warn(`skill-evolution: crystallization review failed: ${String(error)}`))
      .finally(() => reviewsInFlight.delete(sequenceKey))
  }

  // ------------------------------------------------------------------
  // Management RPC (authenticated channel served by the connection service)
  // ------------------------------------------------------------------

  function summaryOf(entry) {
    const record = entry.record
    return {
      name: record.name,
      description: record.description,
      version: record.version,
      sourcePatternId: record.sourcePatternId,
      toolSequence: record.toolSequence,
      occurrences: record.occurrences,
      successRate: record.successRate,
      signals: record.signals,
      improvements: record.improvements,
      invocations: record.invocations,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      registered: typeof entry.dispose === 'function',
    }
  }

  function statsSnapshot() {
    let totalTraces = 0
    for (const sessionTraces of traces.values()) totalTraces += sessionTraces.length
    return {
      activeSessions: activeTraces.size,
      totalTraces,
      patterns: [...patterns.values()].map(p => ({
        id: p.id,
        toolSequence: [...p.toolSequence],
        occurrences: p.occurrences,
        successRate: p.successRate,
        crystallized: p.crystallized,
      })),
    }
  }

  function configSnapshot() {
    return {
      autoRegister,
      minTraceSteps,
      minToolCalls,
      minPatternOccurrences,
      minSuccessRate,
      maxTracesPerSession,
      maxStepTextLength,
      maxEvolvedSkills,
      maxEvidenceSteps,
      improvementEvery,
      maxImprovementsPerProcess,
      signals: { ...signalEnabled },
      complexRequiresCorroboration,
      llmProvider,
      llmModel,
      modelSource,
      skillLanguage,
      enabled,
      tuningOverrides: JSON.parse(JSON.stringify(tuningOverrides)),
      tuningBounds: { ints: { ...INT_TUNABLES }, rates: { ...RATE_TUNABLES } },
      prompts: {
        review: effectiveReviewPrompt(),
        improve: effectiveImprovePrompt(),
        reviewDefault: REVIEW_SYSTEM_PROMPT,
        improveDefault: IMPROVE_SYSTEM_PROMPT,
        reviewOverridden: promptOverrides.review !== undefined,
        improveOverridden: promptOverrides.improve !== undefined,
        maxLength: MAX_PROMPT_LENGTH,
      },
      defaults: {
        ...JSON.parse(JSON.stringify(tuningDefaults)),
        llmProvider: config.llmProvider ?? 'deepseek',
        llmModel: config.llmModel ?? 'deepseek-chat',
        skillLanguage: configSkillLanguage,
        enabled: configEnabled,
      },
    }
  }

  async function handleRpc(endpoint, payload, signal) {
    const args = safeRecord(payload?.args) ?? {}
    switch (endpoint) {
      case 'list':
        return ok({
          skills: [...evolvedSkills.values()].map(summaryOf).sort((a, b) => a.name.localeCompare(b.name)),
          config: configSnapshot(),
          stats: statsSnapshot(),
        })
      case 'listModels': {
        let providers = []
        try {
          providers = typeof ctx.llm.listProviders === 'function' ? ctx.llm.listProviders() : []
        } catch (error) {
          ctx.logger.warn(`skill-evolution: listProviders threw: ${String(error)}`)
        }
        const modelsByProvider = {}
        await Promise.all(providers.map(async (p) => {
          if (typeof p?.id !== 'string') return
          try {
            const models = typeof ctx.llm.listModels === 'function' ? await ctx.llm.listModels(p.id, signal) : []
            modelsByProvider[p.id] = Array.isArray(models) ? models.filter(m => typeof m?.id === 'string').map(m => ({ id: m.id, name: m.name ?? m.id })) : []
          } catch (error) {
            ctx.logger.warn(`skill-evolution: listModels(${p.id}) threw: ${String(error)}`)
            modelsByProvider[p.id] = []
          }
        }))
        return ok({ providers: providers.filter(p => typeof p?.id === 'string').map(p => ({ id: p.id, name: p.name ?? p.id })), modelsByProvider })
      }
      case 'setModel': {
        const provider = typeof args.provider === 'string' ? args.provider.trim() : ''
        const model = typeof args.model === 'string' ? args.model.trim() : ''
        if (!provider) return fail('skill-evolution/bad-provider', 'provider must be a non-empty string')
        if (!model) return fail('skill-evolution/bad-model', 'model must be a non-empty string')
        let known = null
        try {
          known = typeof ctx.llm.listProviders === 'function' ? ctx.llm.listProviders() : null
        } catch {
          known = null
        }
        if (Array.isArray(known) && known.length > 0 && !known.some(p => p?.id === provider)) {
          return fail('skill-evolution/unknown-provider', `provider ${JSON.stringify(provider)} is not registered in this deployment`)
        }
        llmProvider = provider
        llmModel = model
        modelSource = 'runtime'
        persistRuntimeConfig()
        ctx.logger.info(`skill-evolution: reviewer model set to ${llmProvider}/${llmModel} (persisted)`)
        return ok({ llmProvider, llmModel, modelSource })
      }
      case 'resetModel': {
        llmProvider = config.llmProvider ?? 'deepseek'
        llmModel = config.llmModel ?? 'deepseek-chat'
        modelSource = 'config'
        persistRuntimeConfig()
        return ok({ llmProvider, llmModel, modelSource })
      }
      case 'setLanguage': {
        const language = typeof args.language === 'string' ? args.language.trim() : ''
        if (!SKILL_LANGUAGES.includes(language)) return fail('skill-evolution/bad-language', `language must be one of ${SKILL_LANGUAGES.join(', ')}`)
        skillLanguage = language
        persistRuntimeConfig()
        ctx.logger.info(`skill-evolution: generated-skill language set to ${skillLanguage} (persisted)`)
        return ok({ skillLanguage })
      }
      case 'setEnabled': {
        if (typeof args.enabled !== 'boolean') return fail('skill-evolution/bad-enabled', 'enabled must be a boolean')
        enabled = args.enabled
        persistRuntimeConfig()
        ctx.logger.info(`skill-evolution: observation ${enabled ? 'resumed' : 'paused'} from the Settings UI (persisted)`)
        return ok({ enabled })
      }
      case 'setTuning': {
        try {
          applyTuningPatch(args.tuning)
        } catch (error) {
          return fail('skill-evolution/bad-tuning', String(error instanceof Error ? error.message : error))
        }
        persistRuntimeConfig()
        ctx.logger.info(`skill-evolution: tuning updated from the Settings UI (persisted): ${Object.keys(args.tuning).join(', ')}`)
        return ok({ config: configSnapshot() })
      }
      case 'resetTuning': {
        resetTuning()
        persistRuntimeConfig()
        ctx.logger.info('skill-evolution: tuning reset to the mount-config baseline')
        return ok({ config: configSnapshot() })
      }
      case 'setPrompt': {
        const role = args.role === 'review' || args.role === 'improve' ? args.role : ''
        if (!role) return fail('skill-evolution/bad-role', 'role must be "review" or "improve"')
        if (typeof args.text !== 'string') return fail('skill-evolution/bad-prompt', 'text must be a string')
        const text = args.text.trim()
        if (text.length > MAX_PROMPT_LENGTH) return fail('skill-evolution/bad-prompt', `prompt must be at most ${MAX_PROMPT_LENGTH} characters`)
        promptOverrides[role] = text.length > 0 ? text : undefined
        persistRuntimeConfig()
        ctx.logger.info(`skill-evolution: ${role} prompt ${text.length > 0 ? 'customized' : 'reset to default'} (persisted)`)
        return ok({ config: configSnapshot() })
      }
      case 'get': {
        if (typeof args.name !== 'string' || !SKILL_NAME_RE.test(args.name)) return fail('skill-evolution/bad-name', 'invalid skill name')
        const entry = evolvedSkills.get(args.name)
        if (!entry) return fail('skill-evolution/not-found', `no evolved skill named ${JSON.stringify(args.name)}`)
        return ok({ ...summaryOf(entry), content: entry.record.content, intents: entry.record.intents })
      }
      case 'remove': {
        if (typeof args.name !== 'string' || !SKILL_NAME_RE.test(args.name)) return fail('skill-evolution/bad-name', 'invalid skill name')
        const entry = evolvedSkills.get(args.name)
        if (!entry) return fail('skill-evolution/not-found', `no evolved skill named ${JSON.stringify(args.name)}`)
        try {
          entry.dispose?.()
        } catch (error) {
          ctx.logger.warn(`skill-evolution: unregistering "${args.name}" threw: ${String(error)}`)
        }
        sequenceToSkill.delete(entry.record.toolSequence.join('→'))
        evolvedSkills.delete(args.name)
        unpersist(args.name)
        ctx.logger.info(`skill-evolution: removed evolved skill "${args.name}"`)
        return ok({ removed: args.name })
      }
      case 'clear': {
        const removed = []
        for (const [skillName, entry] of [...evolvedSkills]) {
          try {
            entry.dispose?.()
          } catch (error) {
            ctx.logger.warn(`skill-evolution: unregistering "${skillName}" threw: ${String(error)}`)
          }
          sequenceToSkill.delete(entry.record.toolSequence.join('→'))
          evolvedSkills.delete(skillName)
          unpersist(skillName)
          removed.push(skillName)
        }
        if (removed.length > 0) ctx.logger.info(`skill-evolution: cleared ${removed.length} evolved skill(s)`)
        return ok({ removed })
      }
      default:
        return fail('skill-evolution/unknown-endpoint', `unknown endpoint ${JSON.stringify(endpoint)}`)
    }
  }

  // ------------------------------------------------------------------
  // Activation
  // ------------------------------------------------------------------

  /**
   * Count a load of one evolved skill through the host `skill` tool, so the
   * Settings UI can show real usage instead of only crystallization counts.
   * @param {string} tool - tool name from the tool/call event
   * @param {string} args - raw arguments JSON for that call
   */
  function noteSkillInvocation(tool, args) {
    if (tool !== 'skill' || typeof args !== 'string') return
    let name = ''
    try {
      const parsed = safeRecord(JSON.parse(args))
      if (parsed && typeof parsed.name === 'string') name = parsed.name
    } catch {
      return
    }
    countSkillInvocation(name)
  }

  /**
   * Increment and persist one evolved skill's invocation count. Shared by both
   * load paths: the model-facing `skill` tool call and the host-injected
   * user-explicit invocation (a user/message carrying a `skill-invocation`
   * source instead of a tool/call).
   * @param {string} name - invoked skill name
   */
  function countSkillInvocation(name) {
    if (typeof name !== 'string' || !SKILL_NAME_RE.test(name)) return
    const entry = evolvedSkills.get(name)
    if (!entry) return
    entry.record = { ...entry.record, invocations: entry.record.invocations + 1 }
    persist(entry.record)
  }

  loadRuntimeConfig()
  if (modelSource === 'runtime') {
    ctx.logger.info(`skill-evolution: reviewer model from runtime-config.json: ${llmProvider}/${llmModel}`)
  }

  loadPersisted()
  for (const entry of evolvedSkills.values()) registerSkill(entry.record)
  if (evolvedSkills.size > 0) {
    ctx.logger.info(`skill-evolution: restored ${evolvedSkills.size} persisted evolved skill(s)`)
  }

  ctx.connection.rpc.handle(RPC_CHANNEL, (endpoint, payload, signal) => {
    try {
      return handleRpc(endpoint, payload, signal)
    } catch (error) {
      ctx.logger.warn(`skill-evolution: RPC ${endpoint} threw: ${String(error)}`)
      return fail('skill-evolution/internal', String(error))
    }
  })

  ctx.on('session/event', (session, event) => {
    if (!enabled) return
    const sessionId = String(session.id)

    if (event.type === 'user/message') {
      // User-explicit skill invocation: the harness injects the rendered skill
      // body as a user message tagged with a `skill-invocation` source (no
      // tool/call fires). Count it, and don't mistake the injected body for
      // the user's own words — those ride a separate plain user message.
      const source = event.data && typeof event.data === 'object' ? event.data.source : undefined
      if (source && typeof source === 'object' && source.kind === 'skill-invocation') {
        countSkillInvocation(source.name)
        return
      }
      let text = ''
      if (Array.isArray(event.data?.content)) {
        for (const block of event.data.content) {
          if (block?.type === 'text' && typeof block.text === 'string') {
            text = block.text
            break
          }
        }
      }
      if (text) recordUserIntent(sessionId, text)
    } else if (event.type === 'tool/call') {
      noteSkillInvocation(event.data.name, event.data.arguments)
      recordToolCall(sessionId, String(event.data.callId), event.data.name, event.data.arguments)
    } else if (event.type === 'tool/result') {
      const callId = String(event.data.message.source.callId)
      const success = !event.data.error
      const toolResultBlock = event.data.message.content[0]
      let summary = ''
      if (toolResultBlock && Array.isArray(toolResultBlock.content)) {
        for (const block of toolResultBlock.content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            summary = block.text
            break
          }
        }
      }
      recordToolResult(sessionId, callId, success, summary)
    } else if (event.type === 'turn/end') {
      const success = event.data.reason.kind === 'completed'
      const trace = finalizeTrace(sessionId, success)
      if (trace) evaluateTurn(trace)
    }
  })
}
