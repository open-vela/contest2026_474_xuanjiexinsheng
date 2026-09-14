export const MEAL_TEXT_PARSER_NAME = '一句话记餐（模拟器转写模式）'
export const MAX_MEAL_TEXT_LENGTH = 80
export const MAX_MEAL_SEGMENTS = 12

const NEGATION = /^(不吃|没吃|没有吃|不要|未吃|不喝|没喝)/
const UNSUPPORTED_MODIFIER = /(少饭|多饭|不要|不加|加肉|加蛋|少油|少盐)/
const NUMBER_TEXT = '(?:\\d+(?:\\.\\d+)?|[零〇一二两三四五六七八九十百半]+)'

function chineseNumber(text) {
  if (text === '半') return 0.5
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text)
  const digits = { '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 }
  if (text.indexOf('百') >= 0) {
    const parts = text.split('百')
    return (digits[parts[0]] || 1) * 100 + (parts[1] ? chineseNumber(parts[1]) : 0)
  }
  if (text.indexOf('十') >= 0) {
    const parts = text.split('十')
    return (parts[0] ? digits[parts[0]] : 1) * 10 + (parts[1] ? digits[parts[1]] : 0)
  }
  let result = 0
  for (let i = 0; i < text.length; i += 1) result = result * 10 + digits[text[i]]
  return result
}

function fragment(text, reason) {
  return { text: text, reason: reason }
}

function allNames(food) {
  return [food.name].concat(food.aliases)
}

function aliasesByLength(foods) {
  const entries = []
  foods.forEach(function (food) {
    allNames(food).forEach(function (name) { entries.push({ name: name, food: food }) })
  })
  return entries.sort(function (a, b) { return b.name.length - a.name.length })
}

function templateAliasesByLength(templates) {
  const entries = []
  ;(templates || []).forEach(function (template) {
    template.aliases.forEach(function (name) { entries.push({ name: name, template: template }) })
  })
  return entries.sort(function (a, b) { return b.name.length - a.name.length })
}

function templateScale(text) {
  if (!text) return 1
  const matched = new RegExp('^(' + NUMBER_TEXT + ')份$').exec(text)
  if (!matched) return null
  const value = chineseNumber(matched[1])
  return isFinite(value) && value > 0 ? value : null
}

function parseTemplateSegment(segment, templateAliases, foods, calculateFoodKcal) {
  for (let i = 0; i < templateAliases.length; i += 1) {
    const entry = templateAliases[i]
    const alias = entry.name
    let remainder = null
    if (segment === alias) remainder = ''
    else if (segment.indexOf(alias) === 0) remainder = segment.slice(alias.length)
    else if (segment.length >= alias.length && segment.lastIndexOf(alias) === segment.length - alias.length) remainder = segment.slice(0, segment.length - alias.length)
    if (remainder === null) continue
    if (UNSUPPORTED_MODIFIER.test(remainder) || NEGATION.test(remainder)) return { unknown: fragment(segment, 'unsupported_modifier') }
    const scale = templateScale(remainder)
    if (scale === null) return { unknown: fragment(segment, 'unsupported_modifier') }
    const items = []
    const components = []
    for (let componentIndex = 0; componentIndex < entry.template.components.length; componentIndex += 1) {
      const component = entry.template.components[componentIndex]
      const food = foods.find(function (item) { return item.id === component.foodId })
      if (!food) return { unknown: fragment(segment, 'invalid_template') }
      const basisAmount = component.basisAmount * scale
      const item = makeItem(calculateFoodKcal, food, basisAmount, food.basisUnit, basisAmount, false)
      items.push(item)
      components.push({ name: food.name, basisAmount: basisAmount, basisUnit: food.basisUnit, kcal: item.kcal })
    }
    return {
      items: items,
      assumption: {
        templateId: entry.template.id,
        name: entry.template.name,
        servings: scale,
        components: components,
        totalKcal: items.reduce(function (sum, item) { return sum + item.kcal }, 0)
      }
    }
  }
  return null
}

function parseSegment(segment, aliases, calculateFoodKcal) {
  if (NEGATION.test(segment)) return { unknown: fragment(segment, 'negation') }
  let matched = null
  let quantityText = ''
  for (let i = 0; i < aliases.length; i += 1) {
    const entry = aliases[i]
    if (segment.indexOf(entry.name) === 0) {
      matched = entry
      quantityText = segment.slice(entry.name.length)
      break
    }
    if (segment.length >= entry.name.length && segment.lastIndexOf(entry.name) === segment.length - entry.name.length) {
      matched = entry
      quantityText = segment.slice(0, segment.length - entry.name.length)
      break
    }
  }
  if (!matched) return { unknown: fragment(segment, 'unknown_food') }

  if (!quantityText) {
    const serving = matched.food.defaultServing
    const basisAmount = serving.amount * matched.food.parseUnits[serving.unit]
    return { item: makeItem(calculateFoodKcal, matched.food, serving.amount, serving.unit, basisAmount, true) }
  }

  const quantityMatch = new RegExp('^(' + NUMBER_TEXT + ')([^\\d零〇一二两三四五六七八九十百半]+)$').exec(quantityText)
  if (!quantityMatch) return { unknown: fragment(segment, 'invalid_quantity_or_missing_unit') }
  const amount = chineseNumber(quantityMatch[1])
  const unit = quantityMatch[2].toLowerCase()
  if (!(unit in matched.food.parseUnits)) return { unknown: fragment(segment, 'unsupported_unit') }
  if (!isFinite(amount) || amount <= 0) return { unknown: fragment(segment, 'invalid_quantity') }
  return { item: makeItem(calculateFoodKcal, matched.food, amount, unit, amount * matched.food.parseUnits[unit], false) }
}

function makeItem(calculateFoodKcal, food, amount, unit, basisAmount, usedDefaultServing) {
  return {
    foodId: food.id,
    name: food.name,
    amount: amount,
    unit: unit,
    basisAmount: basisAmount,
    basisUnit: food.basisUnit,
    energyKcalPer100: food.energyKcalPer100,
    kcal: calculateFoodKcal(food, basisAmount),
    servingLabel: usedDefaultServing ? food.defaultServing.label : amount + unit,
    usedDefaultServing: usedDefaultServing
  }
}

export function parseMealText(input, foods, calculateFoodKcal, templates) {
  const catalog = foods
  if (typeof input !== 'string' || !input.trim()) return result('empty', [], [], [])
  const text = input.trim()
  if (text.length > MAX_MEAL_TEXT_LENGTH) return result('needs_review', [], [fragment(text, 'input_too_long')], [])
  const rawSegments = []
  text.split(/[、，,。；;]|(?:和)/).forEach(function (part) {
    const trimmed = part.trim()
    if (!trimmed) return
    if (UNSUPPORTED_MODIFIER.test(trimmed)) rawSegments.push(trimmed)
    else trimmed.split('加').map(function (item) { return item.trim() }).filter(Boolean).forEach(function (item) { rawSegments.push(item) })
  })
  if (!rawSegments.length) return result('empty', [], [], [])
  const aliases = aliasesByLength(catalog)
  const templateAliases = templateAliasesByLength(templates)
  const recognized = []
  const unknown = []
  const assumptions = []
  rawSegments.forEach(function (segment, index) {
    if (index >= MAX_MEAL_SEGMENTS) {
      unknown.push(fragment(segment, 'too_many_segments'))
      return
    }
    const templateResult = parseTemplateSegment(segment, templateAliases, catalog, calculateFoodKcal)
    if (templateResult) {
      if (templateResult.items) {
        templateResult.items.forEach(function (item) { recognized.push(item) })
        assumptions.push(templateResult.assumption)
      } else unknown.push(templateResult.unknown)
      return
    }
    const parsed = parseSegment(segment, aliases, calculateFoodKcal)
    if (parsed.item) recognized.push(parsed.item)
    else unknown.push(parsed.unknown)
  })
  return result(unknown.length ? 'needs_review' : 'complete', recognized, unknown, assumptions)
}

function result(status, recognizedItems, unknownSegments, assumptions) {
  return {
    status: status,
    recognizedItems: recognizedItems,
    unknownSegments: unknownSegments,
    assumptions: assumptions || [],
    // 保留技术设计中的字段名，便于 M1/M2 后续接线；两组引用指向同一结果。
    items: recognizedItems,
    unresolved: unknownSegments
  }
}

export function canSaveParsedMeal(parseResult, reviewDecision) {
  if (!parseResult || !parseResult.recognizedItems || !parseResult.recognizedItems.length) return false
  if (!parseResult.unknownSegments || !parseResult.unknownSegments.length) return true
  if (!Array.isArray(reviewDecision) || reviewDecision.length !== parseResult.unknownSegments.length) return false
  return reviewDecision.every(function (decision) { return decision === 'replace' || decision === 'ignore' })
}
