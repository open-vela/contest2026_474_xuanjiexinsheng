import assert from 'node:assert/strict'
import { AI_ADVICE_TIMEOUT_MS, buildAiAdviceSummary, requestAiAdvice } from '../src/common/ai-advice.js'

function fakeTimers() {
  const pending = []
  return {
    pending,
    setTimeout(callback, delay) { const timer = { callback, delay, cleared: false }; pending.push(timer); return timer },
    clearTimeout(timer) { timer.cleared = true }
  }
}

const remaining = buildAiAdviceSummary({ intakeKcal: 1200, intakeTargetDeltaKcal: 780, mealCount: 2, streakDays: 4 })
assert.match(remaining, /距每日饮食参考线 780 kcal/)
assert.match(remaining, /连续记录 4 天/)
assert.doesNotMatch(remaining, /运动|净摄入/)
assert.match(buildAiAdviceSummary({ intakeKcal: 2200, intakeTargetDeltaKcal: -300, mealCount: 3, streakDays: 1 }), /已记录摄入高于每日饮食参考线 300 kcal/)
assert.match(buildAiAdviceSummary({ intakeKcal: 2000, intakeTargetDeltaKcal: 0, mealCount: 3, streakDays: 1 }), /与每日饮食参考线相同/)
for (const forbidden of ['心率', '血氧', '压力', '体重', '米饭', '用户', '历史']) assert.equal(remaining.includes(forbidden), false)
assert.throws(() => buildAiAdviceSummary({ intakeKcal: NaN, intakeTargetDeltaKcal: 0, mealCount: 0, streakDays: 0 }), TypeError)
assert.throws(() => buildAiAdviceSummary({ intakeKcal: 1.2, intakeTargetDeltaKcal: 0, mealCount: 0, streakDays: 0 }), TypeError)
assert.equal(AI_ADVICE_TIMEOUT_MS, 10000)

let callback
let results = []
let timers = fakeTimers()
requestAiAdvice({ ask(options) { callback = options } }, remaining, result => results.push(result), timers)
assert.equal(timers.pending[0].delay, 10000)
callback.success({ reply: '  今天慢慢来。  ' })
assert.deepEqual(results, [{ status: 'success', reply: '今天慢慢来。' }])

results = []; timers = fakeTimers()
requestAiAdvice({ ask(options) { options.success({ reply: 'Sorry, I encountered an error while processing your request.' }) } }, remaining, result => results.push(result), timers)
assert.deepEqual(results, [{ status: 'unavailable', reason: 'infrastructure-failure-reply' }])

results = []; timers = fakeTimers()
requestAiAdvice({ ask(options) { options.success({ reply: 'Sorry，今天的安排有些满，建议先从规律吃饭开始。' }) } }, remaining, result => results.push(result), timers)
assert.deepEqual(results, [{ status: 'success', reply: 'Sorry，今天的安排有些满，建议先从规律吃饭开始。' }])

results = []; timers = fakeTimers()
requestAiAdvice({ ask(options) { options.success({ reply: '   ' }) } }, remaining, result => results.push(result), timers)
assert.equal(results[0].reason, 'invalid-reply')

results = []; timers = fakeTimers()
requestAiAdvice({ ask(options) { options.fail(null, 203) } }, remaining, result => results.push(result), timers)
assert.deepEqual(results, [{ status: 'unavailable', reason: 'code-203' }])

results = []; timers = fakeTimers()
requestAiAdvice({ ask(options) { callback = options } }, remaining, result => results.push(result), timers)
timers.pending[0].callback()
callback.success({ reply: '迟到回复' })
assert.deepEqual(results, [{ status: 'unavailable', reason: 'timeout' }])

results = []; timers = fakeTimers()
const cancel = requestAiAdvice({ ask(options) { callback = options } }, remaining, result => results.push(result), timers)
cancel()
callback.fail(null, 200)
callback.success({ reply: '取消后的迟到回复' })
assert.deepEqual(results, [])

for (const code of [200, 202, 203, 204, 1000, 1001]) {
  results = []; timers = fakeTimers()
  requestAiAdvice({ ask(options) { options.fail(null, code) } }, remaining, result => results.push(result), timers)
  assert.equal(results[0].reason, 'code-' + code)
}
assert.doesNotThrow(() => requestAiAdvice(undefined, remaining, () => {}, fakeTimers()))
assert.doesNotThrow(() => requestAiAdvice({}, remaining, () => {}, fakeTimers()))
assert.doesNotThrow(() => requestAiAdvice({ ask() { throw new Error('sync') } }, remaining, () => {}, fakeTimers()))
console.log('M4 VelaClaw 测试通过：脱敏汇总、目标措辞、基础设施失败回复及成功/失败/超时/取消门禁均通过。')
