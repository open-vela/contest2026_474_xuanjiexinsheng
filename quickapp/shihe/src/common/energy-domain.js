export const EXERCISE_ACTIVITIES = [
  { id: 'brisk_walk', name: '快走', met: 3.5 },
  { id: 'run', name: '跑步', met: 8.0 },
  { id: 'cycle', name: '骑行', met: 6.8 },
  { id: 'rope', name: '跳绳', met: 10.0 },
  { id: 'strength', name: '力量训练', met: 5.0 },
  { id: 'yoga', name: '瑜伽', met: 2.5 }
]

function finiteNumber(value) {
  return typeof value === 'number' && isFinite(value)
}

function pad(value) {
  return value < 10 ? '0' + value : String(value)
}

export function localDateOf(timestamp) {
  const date = new Date(timestamp)
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function parseLocalDate(localDate) {
  if (typeof localDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return null
  const parts = localDate.split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return null
  return date
}

function shiftLocalDate(localDate, days) {
  const date = parseLocalDate(localDate)
  if (!date) return null
  date.setDate(date.getDate() + days)
  return localDateOf(date.getTime())
}

export function activityById(activity) {
  return EXERCISE_ACTIVITIES.find(item => item.id === activity) || null
}

export function calculateExerciseKcal(met, weightKg, durationMinutes) {
  if (!finiteNumber(met) || met <= 0) throw new RangeError('MET 必须是正的有限数')
  if (!finiteNumber(weightKg) || weightKg < 25 || weightKg > 250) throw new RangeError('体重必须在 25–250 kg')
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) throw new RangeError('时长必须是 1–600 分钟的整数')
  return Math.round(met * 3.5 * weightKg / 200 * durationMinutes)
}

export function createExerciseRecord(activity, weightKg, durationMinutes, now) {
  const definition = activityById(activity)
  const timestamp = now === undefined ? Date.now() : now
  if (!definition || !finiteNumber(timestamp) || timestamp <= 0) return null
  try {
    return {
      schemaVersion: 1,
      id: 'exercise-' + timestamp + '-' + Math.floor(Math.random() * 1000000),
      localDate: localDateOf(timestamp),
      activity: definition.id,
      metSnapshot: definition.met,
      weightKgSnapshot: weightKg,
      durationMinutes,
      kcalSnapshot: calculateExerciseKcal(definition.met, weightKg, durationMinutes),
      createdAt: timestamp,
      updatedAt: timestamp
    }
  } catch (error) {
    return null
  }
}

export function editExerciseRecord(record, activity, weightKg, durationMinutes, now) {
  if (!record || typeof record.id !== 'string' || !record.id || !parseLocalDate(record.localDate) || !finiteNumber(record.createdAt) || record.createdAt <= 0) return null
  const definition = activityById(activity)
  const timestamp = now === undefined ? Date.now() : now
  if (!definition || !finiteNumber(timestamp) || timestamp < record.createdAt) return null
  try {
    return {
      schemaVersion: 1,
      id: record.id,
      localDate: record.localDate,
      activity: definition.id,
      metSnapshot: definition.met,
      weightKgSnapshot: weightKg,
      durationMinutes,
      kcalSnapshot: calculateExerciseKcal(definition.met, weightKg, durationMinutes),
      createdAt: record.createdAt,
      updatedAt: timestamp
    }
  } catch (error) {
    return null
  }
}

export function upsertExercise(exercises, record) {
  const next = (exercises || []).slice()
  const index = next.findIndex(item => item.id === record.id)
  if (index >= 0) next[index] = record
  else next.push(record)
  return next
}

export function deleteExercise(exercises, id) {
  return (exercises || []).filter(record => record.id !== id)
}

export function dailyEnergySummary(meals, exercises, localDate, dailyTargetKcal) {
  const dayMeals = (meals || []).filter(item => item.localDate === localDate)
  const intakeKcal = dayMeals.reduce((sum, item) => sum + item.totalKcalSnapshot, 0)
  const exerciseKcal = (exercises || []).filter(item => item.localDate === localDate).reduce((sum, item) => sum + item.kcalSnapshot, 0)
  const netKcal = intakeKcal - exerciseKcal
  const mealTypes = []
  const foodIds = []
  dayMeals.forEach(function (meal) {
    if (['breakfast', 'lunch', 'dinner'].includes(meal.mealType) && !mealTypes.includes(meal.mealType)) mealTypes.push(meal.mealType)
    ;(meal.items || []).forEach(function (item) {
      if (item && item.foodId && !foodIds.includes(item.foodId)) foodIds.push(item.foodId)
    })
  })
  const intakeProgressPercent = dailyTargetKcal > 0 ? Math.max(0, Math.round(intakeKcal * 100 / dailyTargetKcal)) : 0
  return {
    intakeKcal,
    exerciseKcal,
    netKcal,
    intakeTargetDeltaKcal: dailyTargetKcal - intakeKcal,
    intakeProgressPercent,
    mainMealRecordedCount: mealTypes.length,
    foodVarietyCount: foodIds.length
  }
}

export function sevenDayEnergyTrend(meals, exercises, todayLocalDate, dailyTargetKcal) {
  if (!parseLocalDate(todayLocalDate)) return []
  const result = []
  for (let offset = -6; offset <= 0; offset += 1) {
    const localDate = shiftLocalDate(todayLocalDate, offset)
    result.push(Object.assign({ localDate }, dailyEnergySummary(meals, exercises, localDate, dailyTargetKcal)))
  }
  return result
}

export function sevenDayDietSummary(meals, todayLocalDate) {
  if (!parseLocalDate(todayLocalDate)) return { recordedDays: 0, averageIntakeKcal: 0, foodVarietyCount: 0 }
  const firstDate = shiftLocalDate(todayLocalDate, -6)
  const dayTotals = {}
  const foodIds = []
  ;(meals || []).forEach(function (meal) {
    if (!meal || meal.localDate < firstDate || meal.localDate > todayLocalDate) return
    dayTotals[meal.localDate] = (dayTotals[meal.localDate] || 0) + meal.totalKcalSnapshot
    ;(meal.items || []).forEach(function (item) {
      if (item && item.foodId && !foodIds.includes(item.foodId)) foodIds.push(item.foodId)
    })
  })
  const dates = Object.keys(dayTotals)
  const total = dates.reduce(function (sum, localDate) { return sum + dayTotals[localDate] }, 0)
  return {
    recordedDays: dates.length,
    averageIntakeKcal: dates.length ? Math.round(total / dates.length) : 0,
    foodVarietyCount: foodIds.length
  }
}

function pendingPromptState(localDate) {
  return {
    localDate,
    breakfast: { status: 'pending' },
    lunch: { status: 'pending' },
    dinner: { status: 'pending' }
  }
}

export function retainRecentLocalDays(state, now) {
  const timestamp = finiteNumber(now) && now > 0 ? now : Date.now()
  const today = localDateOf(timestamp)
  const cutoff = shiftLocalDate(today, -29)
  const keep = record => record.localDate > today || record.localDate >= cutoff
  const meals = (state.meals || []).filter(keep)
  const exercises = (state.exercises || []).filter(keep)
  const resetPrompt = !state.mealPromptState || state.mealPromptState.localDate !== today
  const changed = meals.length !== (state.meals || []).length || exercises.length !== (state.exercises || []).length || resetPrompt
  if (!changed) return { changed: false, state }
  return {
    changed: true,
    state: Object.assign({}, state, {
      meals,
      exercises,
      mealPromptState: resetPrompt ? pendingPromptState(today) : state.mealPromptState,
      lastMaintenanceAt: timestamp
    })
  }
}
