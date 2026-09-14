export const STATE_SCHEMA_VERSION = 1
export const DEFAULT_DAILY_TARGET_KCAL = 2000
export const TARGET_EDITOR_MIN_KCAL = 1200
export const TARGET_EDITOR_MAX_KCAL = 4000
export const TARGET_EDITOR_STEP_KCAL = 100
export const LOW_TARGET_WARNING_KCAL = 1500

export function editableDailyTarget(value) {
  const input = finiteNumber(Number(value)) ? Number(value) : DEFAULT_DAILY_TARGET_KCAL
  const rounded = Math.round(input / TARGET_EDITOR_STEP_KCAL) * TARGET_EDITOR_STEP_KCAL
  return Math.max(TARGET_EDITOR_MIN_KCAL, Math.min(TARGET_EDITOR_MAX_KCAL, rounded))
}

export function isLowDailyTarget(value) {
  return finiteNumber(Number(value)) && Number(value) < LOW_TARGET_WARNING_KCAL
}

export function defaultMealWindows() {
  return {
    breakfast: { start: '07:00', end: '09:30' },
    lunch: { start: '11:30', end: '14:00' },
    dinner: { start: '17:30', end: '20:30' }
  }
}

export function emptyState() {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    profile: null,
    meals: [],
    exercises: [],
    recentFoodIds: [],
    favoriteMeals: [],
    mealPromptState: {
      localDate: '',
      breakfast: { status: 'pending' },
      lunch: { status: 'pending' },
      dinner: { status: 'pending' }
    },
    lastMaintenanceAt: 0
  }
}

function finiteNumber(value) {
  return typeof value === 'number' && isFinite(value)
}

function validTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function validWindow(window) {
  return window && validTime(window.start) && validTime(window.end) && window.start < window.end
}

function validPromptEntry(entry) {
  if (!entry || typeof entry !== 'object' || !['pending', 'later', 'skipped', 'completed'].includes(entry.status)) return false
  const hasRemindAt = Object.prototype.hasOwnProperty.call(entry, 'remindAt')
  if (entry.status === 'later' && !hasRemindAt) return false
  return !hasRemindAt || (finiteNumber(entry.remindAt) && entry.remindAt > 0)
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_SOURCES = ['catalog', 'recent', 'favorite', 'transcript-demo']
const EXERCISE_METS = { brisk_walk: 3.5, run: 8.0, cycle: 6.8, rope: 10.0, strength: 5.0, yoga: 2.5 }
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parts = value.split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2]
}
function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 120 }
function validMealItem(item, foodIds) {
  if (!item || !foodIds.includes(item.foodId) || typeof item.nameSnapshot !== 'string' || !item.nameSnapshot) return false
  if (!finiteNumber(item.amount) || item.amount <= 0 || !['g', 'ml'].includes(item.basisUnit)) return false
  if (!finiteNumber(item.energyKcalPer100Snapshot) || item.energyKcalPer100Snapshot < 0) return false
  return Number.isInteger(item.kcalSnapshot) && item.kcalSnapshot === Math.round(item.energyKcalPer100Snapshot * item.amount / 100)
}
function validMeal(meal, foodIds) {
  if (!meal || meal.schemaVersion !== 1 || !validId(meal.id) || !validDate(meal.localDate)) return false
  if (!MEAL_TYPES.includes(meal.mealType) || !MEAL_SOURCES.includes(meal.source)) return false
  if (!finiteNumber(meal.createdAt) || meal.createdAt <= 0 || !finiteNumber(meal.updatedAt) || meal.updatedAt < meal.createdAt) return false
  if (!Array.isArray(meal.items) || !meal.items.length || !meal.items.every(item => validMealItem(item, foodIds))) return false
  return Number.isInteger(meal.totalKcalSnapshot) && meal.totalKcalSnapshot === meal.items.reduce((sum, item) => sum + item.kcalSnapshot, 0)
}
function validFavorite(favorite, foodIds) {
  if (!favorite || !validId(favorite.id) || typeof favorite.name !== 'string' || !favorite.name) return false
  if (!finiteNumber(favorite.createdAt) || favorite.createdAt <= 0 || !finiteNumber(favorite.updatedAt) || favorite.updatedAt < favorite.createdAt) return false
  return Array.isArray(favorite.items) && favorite.items.length > 0 && favorite.items.every(item => item && foodIds.includes(item.foodId) && finiteNumber(item.amount) && item.amount > 0 && ['g', 'ml'].includes(item.basisUnit))
}
function validExercise(record) {
  if (!record || record.schemaVersion !== 1 || !validId(record.id) || !validDate(record.localDate)) return false
  if (!Object.prototype.hasOwnProperty.call(EXERCISE_METS, record.activity)) return false
  if (!finiteNumber(record.metSnapshot) || record.metSnapshot <= 0 || record.metSnapshot > 30) return false
  if (!finiteNumber(record.weightKgSnapshot) || record.weightKgSnapshot < 25 || record.weightKgSnapshot > 250) return false
  if (!Number.isInteger(record.durationMinutes) || record.durationMinutes < 1 || record.durationMinutes > 600) return false
  if (!finiteNumber(record.createdAt) || record.createdAt <= 0 || !finiteNumber(record.updatedAt) || record.updatedAt < record.createdAt) return false
  const expectedKcal = Math.round(record.metSnapshot * 3.5 * record.weightKgSnapshot / 200 * record.durationMinutes)
  return Number.isInteger(record.kcalSnapshot) && record.kcalSnapshot === expectedKcal
}

export function normalizeProfile(profile) {
  if (!profile || profile.schemaVersion !== STATE_SCHEMA_VERSION) return null
  if (!finiteNumber(profile.weightKg) || profile.weightKg < 25 || profile.weightKg > 250) return null
  if (!Number.isInteger(profile.dailyTargetKcal) || profile.dailyTargetKcal < 800 || profile.dailyTargetKcal > 5000) return null
  const windows = profile.mealWindows
  if (!windows || !validWindow(windows.breakfast) || !validWindow(windows.lunch) || !validWindow(windows.dinner)) return null
  if (!finiteNumber(profile.disclaimerAcceptedAt) || profile.disclaimerAcceptedAt <= 0) return null
  if (!finiteNumber(profile.updatedAt) || profile.updatedAt <= 0) return null
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    weightKg: Math.round(profile.weightKg * 10) / 10,
    dailyTargetKcal: profile.dailyTargetKcal,
    mealWindows: {
      breakfast: { start: windows.breakfast.start, end: windows.breakfast.end },
      lunch: { start: windows.lunch.start, end: windows.lunch.end },
      dinner: { start: windows.dinner.start, end: windows.dinner.end }
    },
    disclaimerAcceptedAt: profile.disclaimerAcceptedAt,
    updatedAt: profile.updatedAt
  }
}

export function validateProfile(profile) {
  return normalizeProfile(profile) !== null
}

export function validateState(state, foods) {
  if (!Array.isArray(foods)) return false
  const foodIds = foods.map(item => item.id)
  if (!state || state.schemaVersion !== STATE_SCHEMA_VERSION) return false
  if (state.profile !== null && !validateProfile(state.profile)) return false
  if (!Array.isArray(state.meals) || !Array.isArray(state.exercises) || !Array.isArray(state.recentFoodIds) || !Array.isArray(state.favoriteMeals)) return false
  if (!state.meals.every(meal => validMeal(meal, foodIds)) || state.meals.some((meal, index) => state.meals.findIndex(other => other.id === meal.id) !== index)) return false
  if (!state.exercises.every(validExercise) || state.exercises.some((record, index) => state.exercises.findIndex(other => other.id === record.id) !== index)) return false
  if (state.recentFoodIds.length > 12 || !state.recentFoodIds.every((id, index) => foodIds.includes(id) && state.recentFoodIds.indexOf(id) === index)) return false
  if (state.favoriteMeals.length > 8 || !state.favoriteMeals.every(favorite => validFavorite(favorite, foodIds)) || state.favoriteMeals.some((item, index) => state.favoriteMeals.findIndex(other => other.id === item.id) !== index)) return false
  const prompts = state.mealPromptState
  if (!prompts || typeof prompts !== 'object' || (prompts.localDate !== '' && !validDate(prompts.localDate))) return false
  if (!validPromptEntry(prompts.breakfast) || !validPromptEntry(prompts.lunch) || !validPromptEntry(prompts.dinner)) return false
  if (!finiteNumber(state.lastMaintenanceAt) || state.lastMaintenanceAt < 0) return false
  return true
}

export function createOnboardedState(weightKg, dailyTargetKcal, mealWindows, now) {
  const timestamp = finiteNumber(now) && now > 0 ? now : Date.now()
  const profile = normalizeProfile({
    schemaVersion: STATE_SCHEMA_VERSION,
    weightKg: Number(weightKg),
    dailyTargetKcal: Number(dailyTargetKcal),
    mealWindows,
    disclaimerAcceptedAt: timestamp,
    updatedAt: timestamp
  })
  if (!profile) return null
  const state = emptyState()
  state.profile = profile
  state.lastMaintenanceAt = timestamp
  return state
}
