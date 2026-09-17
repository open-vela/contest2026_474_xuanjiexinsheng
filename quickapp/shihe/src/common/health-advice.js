export const HEALTH_KINDS = ['heartRate', 'spo2', 'stress']
export const LOCAL_STRESS_REMINDER_THRESHOLD = 40

const SAMPLE_RANGES = {
  heartRate: { min: 48, max: 182 },
  spo2: { min: 90, max: 99 },
  stress: { min: 1, max: 49 }
}

// 范围仅用于拒绝不可信的 Mock 输入，不代表健康判断或诊断阈值。
export function normalizeHealthSample(kind, sample) {
  const range = SAMPLE_RANGES[kind]
  if (!range || !sample || typeof sample !== 'object' || Array.isArray(sample)) return null
  if (typeof sample.timeStamp !== 'number' || !isFinite(sample.timeStamp) || sample.timeStamp < 0) return null
  if (typeof sample.value !== 'number' || !isFinite(sample.value) || Math.floor(sample.value) !== sample.value) return null
  if (sample.value < range.min || sample.value > range.max) return null
  return { timeStamp: sample.timeStamp, value: sample.value }
}

export function healthStateText(state) {
  if (state && state.status === 'unsupported') return '当前设备暂不支持'
  if (state && state.status === 'invalid-sample') return '暂无有效健康数据'
  return '健康数据暂时读取失败'
}

export function healthFailureStatus(code) {
  return code === 203 ? 'unsupported' : 'read-error'
}

export function deterministicLocalAdvice(input) {
  const data = input || {}
  if (typeof data.stress === 'number' && isFinite(data.stress) && data.stress >= LOCAL_STRESS_REMINDER_THRESHOLD) {
    return '先慢慢呼吸一分钟，再决定是否进食，避免情绪化进食。'
  }
  if (typeof data.intakeTargetDeltaKcal === 'number' && isFinite(data.intakeTargetDeltaKcal) && data.intakeTargetDeltaKcal < 0) {
    return '今日已记录摄入高于饮食参考线，下一餐可优先选择清淡、适量的食物。'
  }
  const meals = Array.isArray(data.meals) ? data.meals : []
  if (!meals.length) return '今天还没有记录餐食，记下第一餐后建议会随记录更新。'
  const foods = Array.isArray(data.foods) ? data.foods : []
  const categories = {}
  foods.forEach(food => { if (food && typeof food.id === 'string') categories[food.id] = food.category })
  const hasVegetable = meals.some(meal => Array.isArray(meal && meal.items) && meal.items.some(item => item && categories[item.foodId] === '蔬菜'))
  if (!hasVegetable) return '今天的记录里还没有蔬菜，下一餐可考虑添一份蔬菜。'
  return '继续按实际份量记录，保持今天的饮食节奏。'
}
