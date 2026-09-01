/**
 * Host-half smoke test with a mock cordis context.
 *
 * Exercises the full crystallization path without a live DSH host:
 *   1. a successful 6-call turn with one failed step fires complex+recovered
 *   2. the (mocked) reviewer LLM answers VERDICT: SAVE
 *   3. the skill is parsed, persisted, and registered into the mock catalog
 *   4. a failed turn is never reviewed (Hermes: unresolved failures never crystallize)
 *   5. RPC list/get/remove round-trip, including file deletion
 *
 * Run: node test/smoke.mjs
 */
import { readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply } from '../plugin.mjs'

const GENERATED_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'generated')
const assert = (cond, msg) => {
  if (!cond) {
    console.error(`FAIL: ${msg}`)
    process.exit(1)
  }
  console.log(`ok - ${msg}`)
}

const registered = new Map()
let llmCalls = 0
const ctx = {
  logger: { info: () => {}, warn: (m) => console.error(`[plugin warn] ${m}`) },
  skills: {
    register(def) {
      registered.set(def.name, def)
      return () => registered.delete(def.name)
    },
  },
  llm: {
    async *stream() {
      llmCalls++
      yield {
        type: 'text-delta',
        text: [
          'VERDICT: SAVE',
          'NAME: smoke-test-workflow',
          'DESCRIPTION: Smoke test skill',
          '---',
          '# Smoke Test Workflow',
          '',
          '## When to Use',
          'Only during smoke tests.',
          '',
          '## Procedure',
          '1. Nothing to do.',
          '',
          '## Pitfalls',
          'None.',
          '',
          '## Verification',
          'This file exists.',
        ].join('\n'),
      }
      yield { type: 'finish', reason: { kind: 'completed' } }
    },
  },
  connection: { rpc: { handle(_channel, handler) { ctx._rpc = handler } } },
  _handlers: {},
  on(event, fn) {
    ctx._handlers[event] = fn
  },
}

apply(ctx, { minToolCalls: 5, minPatternOccurrences: 3, llmProvider: 'mock', llmModel: 'mock' })
assert(typeof ctx._rpc === 'function', 'registers the /skill-evolution RPC handler')

const session = { id: 'smoke-session' }
const emit = (type, data) => ctx._handlers['session/event'](session, { type, data })

// --- turn 1: six tool calls, one fails then recovers -------------------
emit('user/message', { content: [{ type: 'text', text: 'smoke test intent' }] })
const steps = [
  ['c1', 'bash', true],
  ['c2', 'read', true],
  ['c3', 'bash', false],
  ['c4', 'grep', true],
  ['c5', 'edit', true],
  ['c6', 'bash', true],
]
for (const [id, tool] of steps) emit('tool/call', { callId: id, name: tool, arguments: '{}' })
for (const [id, , ok] of steps) {
  emit('tool/result', {
    callId: id,
    error: ok ? undefined : { message: 'step failed' },
    message: { source: { callId: id }, content: [{ content: [{ type: 'text', text: ok ? 'done' : 'exit 1' }] }] },
  })
}
emit('turn/end', { reason: { kind: 'completed' } })
await new Promise((r) => setTimeout(r, 300))

assert(llmCalls === 1, 'successful turn with signals triggers exactly one review')
assert(registered.has('smoke-test-workflow'), 'crystallized skill is registered into the catalog')
assert(readdirSync(GENERATED_DIR).includes('smoke-test-workflow.json'), 'crystallized skill is persisted')

const list = ctx._rpc('list', { args: {} })
assert(list.ok && list.value.skills.length === 1, 'RPC list returns the skill')
assert(list.value.skills[0].signals.length >= 1, 'skill record carries crystallization signals')

const got = ctx._rpc('get', { args: { name: 'smoke-test-workflow' } })
assert(got.ok && got.value.content.includes('## Verification'), 'RPC get returns full SKILL.md content')

// --- turn 2: failed turn must never be reviewed -----------------------
llmCalls = 0
emit('user/message', { content: [{ type: 'text', text: 'failing task' }] })
for (let i = 0; i < 6; i++) {
  emit('tool/call', { callId: `f${i}`, name: 'bash', arguments: '{}' })
  emit('tool/result', { callId: `f${i}`, message: { source: { callId: `f${i}` }, content: [{ content: [{ type: 'text', text: 'x' }] }] } })
}
emit('turn/end', { reason: { kind: 'error', failure: { message: 'boom' } } })
await new Promise((r) => setTimeout(r, 200))
assert(llmCalls === 0, 'failed turn is never sent to review')

// --- cleanup via RPC remove --------------------------------------------
const rm = ctx._rpc('remove', { args: { name: 'smoke-test-workflow' } })
assert(rm.ok && rm.value.removed === 'smoke-test-workflow', 'RPC remove succeeds')
assert(registered.size === 0, 'removed skill is unregistered')
assert(!readdirSync(GENERATED_DIR).includes('smoke-test-workflow.json'), 'removed skill file is deleted')

console.log('\nsmoke test passed')
