import assert from 'node:assert/strict'
import { emptyState, defaultMealWindows, validateState, editableDailyTarget, isLowDailyTarget, TARGET_EDITOR_MIN_KCAL, TARGET_EDITOR_MAX_KCAL, TARGET_EDITOR_STEP_KCAL } from '../src/common/state.js'
import { FOODS } from '../src/data/foods.js'
import {
  EXERCISE_ACTIVITIES, calculateExerciseKcal, createExerciseRecord, editExerciseRecord,
  upsertExercise, deleteExercise, dailyEnergySummary, sevenDayEnergyTrend, sevenDayDietSummary, retainRecentLocalDays
} from '../src/common/energy-domain.js'
import { activeMealType, mealCapsuleView, setActiveMealLater, skipActiveMeal } from '../src/common/meal-domain.js'

function localAt(year, month, day, hour, minute) {
  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime()
}

function meal(id, localDate, mealType, kcal) {
  return { id, localDate, mealType, totalKcalSnapshot: kcal }
}

assert.equal(TARGET_EDITOR_MIN_KCAL, 1200)
assert.equal(TARGET_EDITOR_MAX_KCAL, 4000)
assert.equal(TARGET_EDITOR_STEP_KCAL, 100)
assert.equal(editableDailyTarget(800), 1200)
assert.equal(editableDailyTarget(5000), 4000)
assert.equal(editableDailyTarget(2050), 2100)
assert.equal(isLowDailyTarget(1400), true)
assert.equal(isLowDailyTarget(1500), false)

assert.deepEqual(EXERCISE_ACTIVITIES.map(item => [item.id, item.name, item.met]), [
  ['brisk_walk', '快走', 3.5], ['run', '跑步', 8], ['cycle', '骑行', 6.8],
  ['rope', '跳绳', 10], ['strength', '力量训练', 5], ['yoga', '瑜伽', 2.5]
])
assert.equal(calculateExerciseKcal(3.5, 60, 30), 110)
assert.equal(calculateExerciseKcal(8, 60, 30), 252)
assert.throws(() => calculateExerciseKcal(3.5, 60, 0), RangeError)
assert.throws(() => calculateExerciseKcal(3.5, 60, 601), RangeError)
assert.throws(() => calculateExerciseKcal(3.5, 24.9, 30), RangeError)
assert.equal(createExerciseRecord('swim', 60, 30, localAt(2026, 9, 10, 8)), null)

const createdAt = localAt(2026, 9, 10, 8)
const walk = createExerciseRecord('brisk_walk', 60, 30, createdAt)
const edited = editExerciseRecord(walk, 'run', 60, 40, createdAt + 1000)
assert.equal(edited.id, walk.id)
assert.equal(edited.localDate, walk.localDate)
assert.equal(edited.createdAt, walk.createdAt)
assert.equal(edited.activity, 'run')
assert.equal(edited.kcalSnapshot, 336)

const meals = [meal('breakfast', '2026-09-10', 'breakfast', 500), meal('lunch', '2026-09-10', 'lunch', 700)]
let exercises = upsertExercise([], walk)
assert.deepEqual(dailyEnergySummary(meals, exercises, '2026-09-10', 2000), { intakeKcal: 1200, exerciseKcal: 110, netKcal: 1090, intakeTargetDeltaKcal: 800, intakeProgressPercent: 60, mainMealRecordedCount: 2, foodVarietyCount: 0 })
exercises = upsertExercise(exercises, edited)
assert.deepEqual(dailyEnergySummary(meals, exercises, '2026-09-10', 1000), { intakeKcal: 1200, exerciseKcal: 336, netKcal: 864, intakeTargetDeltaKcal: -200, intakeProgressPercent: 120, mainMealRecordedCount: 2, foodVarietyCount: 0 })
assert.equal(dailyEnergySummary(meals, exercises, '2026-09-10', 2000).intakeTargetDeltaKcal, 800, '新增运动不得改变饮食目标差值')
const run2 = Object.assign({}, edited, { id: 'run-2', kcalSnapshot: 84, durationMinutes: 10 })
exercises = upsertExercise(exercises, run2)
assert.equal(dailyEnergySummary(meals, exercises, '2026-09-10', 500).intakeTargetDeltaKcal, -700)
exercises = deleteExercise(exercises, edited.id)
assert.equal(dailyEnergySummary(meals, exercises, '2026-09-10', 500).exerciseKcal, 84)

const trend = sevenDayEnergyTrend([meal('old', '2026-09-04', 'dinner', 300), meal('today', '2026-09-10', 'lunch', 500)], [run2], '2026-09-10', 1800)
assert.deepEqual(trend.map(day => day.localDate), ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'])
assert.equal(trend[1].intakeKcal, 0)
assert.equal(trend[1].exerciseKcal, 0)
assert.equal(trend[6].netKcal, 416)
const monthTrend = sevenDayEnergyTrend([], [], '2026-03-03', 1800)
assert.deepEqual(monthTrend.map(day => day.localDate), ['2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02', '2026-03-03'])
const weekMeals = [
  Object.assign(meal('week-old', '2026-09-04', 'dinner', 300), { items: [{ foodId: 'staple-rice' }, { foodId: 'protein-egg' }] }),
  Object.assign(meal('week-today', '2026-09-10', 'lunch', 500), { items: [{ foodId: 'staple-rice' }, { foodId: 'dish-tomato-egg' }] }),
  Object.assign(meal('outside', '2026-09-03', 'lunch', 900), { items: [{ foodId: 'fruit-apple' }] })
]
assert.deepEqual(sevenDayDietSummary(weekMeals, '2026-09-10'), { recordedDays: 2, averageIntakeKcal: 400, foodVarietyCount: 3 })
assert.deepEqual(sevenDayDietSummary([], '2026-09-10'), { recordedDays: 0, averageIntakeKcal: 0, foodVarietyCount: 0 })
const ringSummary = dailyEnergySummary([Object.assign(meal('ring', '2026-09-10', 'lunch', 500), { items: [{ foodId: 'staple-rice' }, { foodId: 'staple-rice' }, { foodId: 'protein-egg' }] })], [], '2026-09-10', 2000)
assert.equal(ringSummary.mainMealRecordedCount, 1)
assert.equal(ringSummary.foodVarietyCount, 2)

const retentionState = emptyState()
retentionState.meals = [meal('today', '2026-09-10', 'lunch', 1), meal('day-29', '2026-08-12', 'lunch', 1), meal('day-30', '2026-08-11', 'lunch', 1), meal('future', '2026-09-11', 'lunch', 1)]
retentionState.exercises = [Object.assign({}, walk, { id: 'day-29', localDate: '2026-08-12' }), Object.assign({}, walk, { id: 'day-30', localDate: '2026-08-11' }), Object.assign({}, walk, { id: 'future', localDate: '2026-09-11' })]
retentionState.mealPromptState = { localDate: '2026-09-09', breakfast: { status: 'skipped' }, lunch: { status: 'later', remindAt: createdAt }, dinner: { status: 'completed' } }
const original = JSON.parse(JSON.stringify(retentionState))
const maintenanceAt = localAt(2026, 9, 10, 9)
const retained = retainRecentLocalDays(retentionState, maintenanceAt)
assert.equal(retained.changed, true)
assert.equal(retained.state.lastMaintenanceAt, maintenanceAt)
assert.deepEqual(retained.state.meals.map(item => item.id), ['today', 'day-29', 'future'])
assert.deepEqual(retained.state.exercises.map(item => item.id), ['day-29', 'future'])
assert.deepEqual(retained.state.mealPromptState, { localDate: '2026-09-10', breakfast: { status: 'pending' }, lunch: { status: 'pending' }, dinner: { status: 'pending' } })
assert.deepEqual(retentionState, original, '维护不得原地改写输入')
const unchangedState = Object.assign({}, retained.state, { lastMaintenanceAt: maintenanceAt - 1 })
const unchanged = retainRecentLocalDays(unchangedState, maintenanceAt)
assert.equal(unchanged.changed, false)
assert.equal(unchanged.state, unchangedState)
assert.equal(unchanged.state.lastMaintenanceAt, maintenanceAt - 1)
const fallbackAt = localAt(2026, 9, 10, 10)
const originalDateNow = Date.now
Date.now = () => fallbackAt
try {
  const invalidNowState = Object.assign({}, unchangedState, { meals: [meal('old', '2026-08-01', 'lunch', 1)] })
  const invalidNowResult = retainRecentLocalDays(invalidNowState, Number.NaN)
  assert.equal(invalidNowResult.changed, true)
  assert.equal(invalidNowResult.state.lastMaintenanceAt, fallbackAt)
} finally {
  Date.now = originalDateNow
}

const profile = { mealWindows: defaultMealWindows() }
const breakfastTime = localAt(2026, 9, 10, 8)
const outsideTime = localAt(2026, 9, 10, 10)
const pending = emptyState().mealPromptState
assert.equal(activeMealType(profile, outsideTime), null)
assert.deepEqual(mealCapsuleView(profile, [], pending, outsideTime), { visibility: 'hidden', mealType: null })
assert.equal(mealCapsuleView(profile, [], pending, breakfastTime).visibility, 'expanded')
const laterResult = setActiveMealLater(profile, [], pending, breakfastTime)
assert.equal(laterResult.changed, true)
assert.equal(laterResult.promptState.breakfast.remindAt, breakfastTime + 15 * 60 * 1000)
assert.equal(mealCapsuleView(profile, [], laterResult.promptState, breakfastTime + 10 * 60 * 1000).status, 'later')
assert.equal(mealCapsuleView(profile, [], laterResult.promptState, breakfastTime + 16 * 60 * 1000).visibility, 'expanded')
const skipped = skipActiveMeal(profile, [], pending, breakfastTime)
assert.deepEqual(mealCapsuleView(profile, [], skipped.promptState, breakfastTime), { visibility: 'collapsed', status: 'skipped', mealType: 'breakfast' })
const completed = mealCapsuleView(profile, [meal('b1', '2026-09-10', 'breakfast', 300), meal('b2', '2026-09-10', 'breakfast', 120)], pending, breakfastTime)
assert.deepEqual(completed, { visibility: 'collapsed', status: 'completed', mealType: 'breakfast', kcal: 420 })
assert.equal(mealCapsuleView(profile, [], skipped.promptState, localAt(2026, 9, 11, 8)).status, 'pending', '跨日状态不得串日')
assert.equal(setActiveMealLater(profile, [], pending, outsideTime).changed, false)
assert.deepEqual(pending, emptyState().mealPromptState, 'prompt 操作不得改写输入')

const validState = emptyState()
validState.exercises = [walk]
assert.equal(validateState(validState, FOODS), true)
const historicalMet = JSON.parse(JSON.stringify(validState))
historicalMet.exercises[0].metSnapshot = 3.3
historicalMet.exercises[0].kcalSnapshot = calculateExerciseKcal(3.3, historicalMet.exercises[0].weightKgSnapshot, historicalMet.exercises[0].durationMinutes)
assert.equal(validateState(historicalMet, FOODS), true)
const zeroMet = JSON.parse(JSON.stringify(validState)); zeroMet.exercises[0].metSnapshot = 0
assert.equal(validateState(zeroMet, FOODS), false)
const excessiveMet = JSON.parse(JSON.stringify(validState)); excessiveMet.exercises[0].metSnapshot = 30.1
assert.equal(validateState(excessiveMet, FOODS), false)
const badFormula = JSON.parse(JSON.stringify(validState)); badFormula.exercises[0].kcalSnapshot += 1
assert.equal(validateState(badFormula, FOODS), false)
const badActivity = JSON.parse(JSON.stringify(validState)); badActivity.exercises[0].activity = 'swim'
assert.equal(validateState(badActivity, FOODS), false)
const duplicate = JSON.parse(JSON.stringify(validState)); duplicate.exercises.push(Object.assign({}, duplicate.exercises[0]))
assert.equal(validateState(duplicate, FOODS), false)
const tooLong = JSON.parse(JSON.stringify(validState)); tooLong.exercises[0].durationMinutes = 601
assert.equal(validateState(tooLong, FOODS), false)

console.log('M3 能量与餐时胶囊测试通过：运动 CRUD、即时回算、趋势、保留边界、prompt 状态机与严格校验均通过。')
