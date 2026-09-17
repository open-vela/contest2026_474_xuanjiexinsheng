export const AI_ADVICE_TIMEOUT_MS = 10000

const KNOWN_FAILURE_CODES = [200, 202, 203, 204, 1000, 1001]
const INFRASTRUCTURE_FAILURE_PREFIXES = ['Sorry, I encountered an ']

function requireFiniteInteger(value, name, minimum) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < minimum) {
    throw new TypeError(name + ' 必须是有限整数')
  }
  return value
}

export function buildAiAdviceSummary(input) {
  if (!input || typeof input !== 'object') throw new TypeError('当天汇总不能为空')
  const intakeKcal = requireFiniteInteger(input.intakeKcal, '摄入 kcal', 0)
  const intakeTargetDeltaKcal = requireFiniteInteger(input.intakeTargetDeltaKcal, '饮食参考线差值 kcal', -Number.MAX_SAFE_INTEGER)
  const mealCount = requireFiniteInteger(input.mealCount, '已记录餐次数', 0)
  const streakDays = requireFiniteInteger(input.streakDays, '连续记录天数', 0)
  let targetText = '与每日饮食参考线相同'
  if (intakeTargetDeltaKcal < 0) targetText = '已记录摄入高于每日饮食参考线 ' + Math.abs(intakeTargetDeltaKcal) + ' kcal'
  else if (intakeTargetDeltaKcal > 0) targetText = '距每日饮食参考线 ' + intakeTargetDeltaKcal + ' kcal'
  return '今日脱敏汇总：已记录食物摄入 ' + intakeKcal + ' kcal；' + targetText + '；已记录餐次数 ' + mealCount + '；连续记录 ' + streakDays + ' 天。请给一句简短温和的生活管理建议，不作诊断。'
}

export function normalizeAiReply(reply) {
  if (typeof reply !== 'string') return null
  const normalized = reply.trim()
  if (!normalized || normalized.length > 2000 || normalized.indexOf('\u0000') >= 0) return null
  return normalized
}

function isInfrastructureFailureReply(reply) {
  return INFRASTRUCTURE_FAILURE_PREFIXES.some(prefix => reply.startsWith(prefix))
}

export function aiFailureReason(code) {
  return KNOWN_FAILURE_CODES.indexOf(code) >= 0 ? 'code-' + code : 'unknown'
}

export function requestAiAdvice(api, query, onResult, timers) {
  const clock = timers || { setTimeout, clearTimeout }
  let active = true
  let timeoutId = null
  const finish = result => {
    if (!active) return
    active = false
    if (timeoutId !== null) clock.clearTimeout(timeoutId)
    onResult(result)
  }
  const cancel = () => {
    if (!active) return
    active = false
    if (timeoutId !== null) clock.clearTimeout(timeoutId)
  }
  if (!api || typeof api.ask !== 'function') {
    finish({ status: 'unavailable', reason: 'capability-missing' })
    return cancel
  }
  timeoutId = clock.setTimeout(() => finish({ status: 'unavailable', reason: 'timeout' }), AI_ADVICE_TIMEOUT_MS)
  try {
    api.ask({
      query,
      success(res) {
        const reply = normalizeAiReply(res && res.reply)
        if (!reply) finish({ status: 'unavailable', reason: 'invalid-reply' })
        else if (isInfrastructureFailureReply(reply)) finish({ status: 'unavailable', reason: 'infrastructure-failure-reply' })
        else finish({ status: 'success', reply })
      },
      fail(data, code) {
        finish({ status: 'unavailable', reason: aiFailureReason(code) })
      },
      complete() {}
    })
  } catch (error) {
    finish({ status: 'unavailable', reason: 'sync-error' })
  }
  return cancel
}
