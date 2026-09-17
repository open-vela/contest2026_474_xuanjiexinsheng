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

export function dailyDietSummary(meals, localDate, dailyTargetKcal) {
  const dayMeals = (meals || []).filter(item => item.localDate === localDate)
  const intakeKcal = dayMeals.reduce((sum, item) => sum + item.totalKcalSnapshot, 0)
  const mainMealStatus = { breakfast: false, lunch: false, dinner: false }
  dayMeals.forEach(function (meal) {
    if (Object.prototype.hasOwnProperty.call(mainMealStatus, meal.mealType)) mainMealStatus[meal.mealType] = true
  })
  const intakeProgressPercent = dailyTargetKcal > 0 ? Math.max(0, Math.round(intakeKcal * 100 / dailyTargetKcal)) : 0
  return {
    intakeKcal,
    intakeTargetDeltaKcal: dailyTargetKcal - intakeKcal,
    intakeProgressPercent,
    intakeProgressCappedPercent: Math.min(100, intakeProgressPercent),
    mealCount: dayMeals.length,
    mainMealStatus
  }
}

export function recordingStreak(meals, todayLocalDate) {
  if (!parseLocalDate(todayLocalDate)) return 0
  const recordedDates = {}
  ;(meals || []).forEach(function (meal) {
    if (meal && parseLocalDate(meal.localDate)) recordedDates[meal.localDate] = true
  })
  let cursor = recordedDates[todayLocalDate] ? todayLocalDate : shiftLocalDate(todayLocalDate, -1)
  let streak = 0
  while (cursor && recordedDates[cursor]) {
    streak += 1
    cursor = shiftLocalDate(cursor, -1)
  }
  return streak
}

export function sevenDayDietTrend(meals, todayLocalDate) {
  if (!parseLocalDate(todayLocalDate)) return []
  const result = []
  for (let offset = -6; offset <= 0; offset += 1) {
    const localDate = shiftLocalDate(todayLocalDate, offset)
    const dayMeals = (meals || []).filter(item => item.localDate === localDate)
    result.push({
      localDate,
      intakeKcal: dayMeals.reduce((sum, item) => sum + item.totalKcalSnapshot, 0),
      mealCount: dayMeals.length
    })
  }
  return result
}

export function sevenDayDietSummary(meals, todayLocalDate) {
  const days = sevenDayDietTrend(meals, todayLocalDate)
  const recorded = days.filter(day => day.mealCount > 0)
  const total = recorded.reduce((sum, day) => sum + day.intakeKcal, 0)
  return {
    recordedDays: recorded.length,
    averageIntakeKcal: recorded.length ? Math.round(total / recorded.length) : 0
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
