import assert from 'node:assert/strict'
import {
  emptyState, defaultMealWindows, validateState, createOnboardedState,
  editableDailyTarget, isLowDailyTarget, dailyTargetReferenceText,
  TARGET_EDITOR_MIN_KCAL, TARGET_EDITOR_MAX_KCAL, TARGET_EDITOR_STEP_KCAL
} from '../src/common/state.js'
import { FOODS } from '../src/data/foods.js'
import { dailyDietSummary, recordingStreak, sevenDayDietTrend, sevenDayDietSummary, retainRecentLocalDays } from '../src/common/energy-domain.js'
import { activeMealType, mealCapsuleView, setActiveMealLater, skipActiveMeal } from '../src/common/meal-domain.js'

function localAt(year, month, day, hour, minute) {
  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime()
}

function meal(id, localDate, mealType, kcal) {
  return { id, localDate, mealType, totalKcalSnapshot: kcal }
}

function legacyExercise(id, localDate) {
  const createdAt = localAt(2026, 9, 10, 8)
  return {
    schemaVersion: 1, id, localDate, activity: 'brisk_walk', metSnapshot: 3.5,
    weightKgSnapshot: 60, durationMinutes: 30, kcalSnapshot: 110,
    createdAt, updatedAt: createdAt
  }
}

assert.equal(TARGET_EDITOR_MIN_KCAL, 1200)
assert.equal(TARGET_EDITOR_MAX_KCAL, 4000)
assert.equal(TARGET_EDITOR_STEP_KCAL, 100)
assert.equal(editableDailyTarget(800), 1200)
assert.equal(editableDailyTarget(5000), 4000)
assert.equal(editableDailyTarget(2050), 2100)
assert.equal(isLowDailyTarget(1400), true)
assert.equal(isLowDailyTarget(1500), false)
assert.equal(dailyTargetReferenceText(1200), '比 2000 kcal 标签参考值低 800 kcal')
assert.equal(dailyTargetReferenceText(2000), '与 2000 kcal 标签参考值相同')
assert.equal(dailyTargetReferenceText(4000), '比 2000 kcal 标签参考值高 2000 kcal')

const onboardingAt = localAt(2026, 9, 10, 7)
const onboarded = createOnboardedState(2000, defaultMealWindows(), onboardingAt)
assert.ok(onboarded)
assert.equal(Object.prototype.hasOwnProperty.call(onboarded.profile, 'weightKg'), false)
assert.equal(validateState(onboarded, FOODS), true)
const legacyProfile = JSON.parse(JSON.stringify(onboarded))
legacyProfile.profile.weightKg = 65
legacyProfile.exercises = [legacyExercise('legacy-walk', '2026-09-10')]
assert.equal(validateState(legacyProfile, FOODS), true, '旧体重和旧运动记录必须继续可读')
const invalidLegacyWeight = JSON.parse(JSON.stringify(legacyProfile)); invalidLegacyWeight.profile.weightKg = 10
assert.equal(validateState(invalidLegacyWeight, FOODS), false)

const meals = [meal('breakfast', '2026-09-10', 'breakfast', 500), meal('lunch', '2026-09-10', 'lunch', 700)]
assert.deepEqual(dailyDietSummary(meals, '2026-09-10', 2000), {
  intakeKcal: 1200,
  intakeTargetDeltaKcal: 800,
  intakeProgressPercent: 60,
  intakeProgressCappedPercent: 60,
  mealCount: 2,
  mainMealStatus: { breakfast: true, lunch: true, dinner: false }
})
assert.deepEqual(dailyDietSummary(meals, '2026-09-10', 1000), {
  intakeKcal: 1200,
  intakeTargetDeltaKcal: -200,
  intakeProgressPercent: 120,
  intakeProgressCappedPercent: 100,
  mealCount: 2,
  mainMealStatus: { breakfast: true, lunch: true, dinner: false }
})
const withLegacyExercise = JSON.parse(JSON.stringify(legacyProfile))
withLegacyExercise.meals = meals
assert.equal(dailyDietSummary(withLegacyExercise.meals, '2026-09-10', 2000).intakeKcal, 1200, '旧运动记录不得影响饮食汇总')

const streakMeals = [
  meal('today', '2026-09-10', 'lunch', 500),
  meal('yesterday', '2026-09-09', 'dinner', 600),
  meal('two-days', '2026-09-08', 'breakfast', 300)
]
assert.equal(recordingStreak(streakMeals, '2026-09-10'), 3)
assert.equal(recordingStreak(streakMeals.filter(item => item.id !== 'today'), '2026-09-10'), 2, '今天未记录时从昨天计算')
assert.equal(recordingStreak(streakMeals.filter(item => item.localDate !== '2026-09-09'), '2026-09-10'), 1, '昨天断档后不得跨过断档')
assert.equal(recordingStreak([meal('month-today', '2026-03-01', 'lunch', 1), meal('month-prev', '2026-02-28', 'dinner', 1)], '2026-03-01'), 2)
assert.equal(recordingStreak([], '2026-09-10'), 0)

const trend = sevenDayDietTrend([meal('old', '2026-09-04', 'dinner', 300), meal('today-a', '2026-09-10', 'lunch', 500), meal('today-b', '2026-09-10', 'snack', 100)], '2026-09-10')
assert.deepEqual(trend.map(day => day.localDate), ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'])
assert.equal(trend[1].intakeKcal, 0)
assert.equal(trend[1].mealCount, 0)
assert.equal(trend[6].intakeKcal, 600)
assert.equal(trend[6].mealCount, 2)
const monthTrend = sevenDayDietTrend([], '2026-03-03')
assert.deepEqual(monthTrend.map(day => day.localDate), ['2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02', '2026-03-03'])
assert.deepEqual(sevenDayDietSummary([meal('week-old', '2026-09-04', 'dinner', 300), meal('week-today', '2026-09-10', 'lunch', 500), meal('outside', '2026-09-03', 'lunch', 900)], '2026-09-10'), { recordedDays: 2, averageIntakeKcal: 400 })
assert.deepEqual(sevenDayDietSummary([], '2026-09-10'), { recordedDays: 0, averageIntakeKcal: 0 })

const retentionState = emptyState()
retentionState.meals = [meal('today', '2026-09-10', 'lunch', 1), meal('day-29', '2026-08-12', 'lunch', 1), meal('day-30', '2026-08-11', 'lunch', 1), meal('future', '2026-09-11', 'lunch', 1)]
retentionState.exercises = [legacyExercise('day-29', '2026-08-12'), legacyExercise('day-30', '2026-08-11'), legacyExercise('future', '2026-09-11')]
retentionState.mealPromptState = { localDate: '2026-09-09', breakfast: { status: 'skipped' }, lunch: { status: 'later', remindAt: onboardingAt }, dinner: { status: 'completed' } }
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

const validLegacyState = emptyState()
validLegacyState.exercises = [legacyExercise('walk', '2026-09-10')]
assert.equal(validateState(validLegacyState, FOODS), true)
const badFormula = JSON.parse(JSON.stringify(validLegacyState)); badFormula.exercises[0].kcalSnapshot += 1
assert.equal(validateState(badFormula, FOODS), false)
const duplicate = JSON.parse(JSON.stringify(validLegacyState)); duplicate.exercises.push(Object.assign({}, duplicate.exercises[0]))
assert.equal(validateState(duplicate, FOODS), false)

console.log('M3 饮食汇总与餐时胶囊测试通过：参考线、旧数据兼容、连续记录、七天摘要、保留边界和 prompt 状态机均通过。')
