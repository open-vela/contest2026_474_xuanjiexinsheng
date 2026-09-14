import assert from 'node:assert/strict'
import { FOODS, calculateFoodKcal, validateFoodCatalog } from '../src/data/foods.js'
import { MEAL_TEMPLATES } from '../src/data/meal-templates.js'
import { parseMealText, canSaveParsedMeal, MAX_MEAL_TEXT_LENGTH } from '../src/common/meal-text-parser.js'

const expectedCategories = {
  '主食': 12,
  '常见菜肴': 10,
  '蛋白质': 10,
  '蔬菜': 8,
  '水果': 8,
  '饮品': 7,
  '零食': 5
}

assert.equal(FOODS.length, 60, '食品必须恰好 60 项')
const counts = {}
const ids = new Set()
const names = new Set()
FOODS.forEach(function (food) {
  counts[food.category] = (counts[food.category] || 0) + 1
  assert.match(food.id, /^[a-z0-9-]+$/, food.name + ' id 格式无效')
  assert.equal(ids.has(food.id), false, food.id + ' id 重复')
  ids.add(food.id)
  assert.ok(Array.isArray(food.aliases) && food.aliases.length > 0, food.name + ' aliases 缺失')
  ;[food.name].concat(food.aliases).forEach(function (name) {
    assert.ok(name && name.trim() === name, food.name + ' 名称或别名无效')
    assert.equal(names.has(name), false, name + ' 名称/别名冲突')
    names.add(name)
  })
  assert.ok(Object.prototype.hasOwnProperty.call(expectedCategories, food.category), food.name + ' 分类无效')
  assert.ok(food.basisUnit === 'g' || food.basisUnit === 'ml', food.name + ' basisUnit 无效')
  assert.ok(Number.isFinite(food.energyKcalPer100) && food.energyKcalPer100 >= 0, food.name + ' 热量无效')
  assert.deepEqual(Object.keys(food).filter(function (key) { return /kcal|energy/i.test(key) }), ['energyKcalPer100'], food.name + ' 存在第二能量事实')
  assert.ok(food.sourceId && food.sourceNote, food.name + ' 来源缺失')
  assert.ok(Array.isArray(food.tags) && food.tags.length > 0, food.name + ' tags 缺失')
  const serving = food.defaultServing
  assert.ok(serving && Number.isFinite(serving.amount) && serving.amount > 0 && serving.unit && serving.label, food.name + ' 默认份量无效')
  assert.ok(food.parseUnits && Number.isFinite(food.parseUnits[serving.unit]) && food.parseUnits[serving.unit] > 0, food.name + ' 默认单位未声明')
  Object.keys(food.parseUnits).forEach(function (unit) {
    assert.ok(unit && Number.isFinite(food.parseUnits[unit]) && food.parseUnits[unit] > 0, food.name + ' parseUnits 无效')
  })
})
assert.deepEqual(counts, expectedCategories, '分类配额不符')
assert.equal(validateFoodCatalog(FOODS), true)
assert.throws(function () {
  validateFoodCatalog([FOODS[0], Object.assign({}, FOODS[1], { aliases: [FOODS[0].name] })])
}, /冲突/, '别名冲突必须在数据校验阶段报错')

const rice = FOODS.find(function (food) { return food.id === 'staple-rice' })
const milk = FOODS.find(function (food) { return food.id === 'protein-milk' })
assert.equal(calculateFoodKcal(rice, 150), 174, 'g 热量换算错误')
assert.equal(calculateFoodKcal(milk, 250), 153, 'ml 热量换算或四舍五入错误')

function parsed(text, itemCount, unknownCount, status) {
  const output = parseMealText(text, FOODS, calculateFoodKcal, MEAL_TEMPLATES)
  assert.equal(output.recognizedItems.length, itemCount, text + ' 识别项数量错误')
  assert.equal(output.unknownSegments.length, unknownCount, text + ' 未知项数量错误')
  assert.equal(output.status, status, text + ' 状态错误')
  return output
}

const plan = parsed('一碗米饭、一份番茄炒蛋、一杯无糖豆浆', 3, 0, 'complete')
assert.deepEqual(plan.recognizedItems.map(function (item) { return item.kcal }), [174, 210, 78])
const taiwanRice = parsed('台湾卤肉饭', 4, 0, 'complete')
assert.deepEqual(taiwanRice.recognizedItems.map(function (item) { return item.foodId }), ['staple-rice', 'dish-braised-pork', 'protein-egg', 'dish-stirfried-greens'])
assert.equal(taiwanRice.recognizedItems.reduce(function (sum, item) { return sum + item.kcal }, 0), 676)
assert.equal(taiwanRice.assumptions[0].name, '台湾卤肉饭')
assert.equal(taiwanRice.assumptions[0].totalKcal, 676)
assert.equal(parsed('半份台湾卤肉饭', 4, 0, 'complete').assumptions[0].totalKcal, 338)
assert.equal(parsed('两份台湾卤肉饭', 4, 0, 'complete').assumptions[0].totalKcal, 1352)
assert.equal(parsed('番茄炒蛋盖饭', 2, 0, 'complete').assumptions[0].totalKcal, 442)
assert.equal(parsed('鱼香肉丝盖饭', 2, 0, 'complete').assumptions[0].totalKcal, 606)
assert.equal(parsed('牛肉面', 3, 0, 'complete').assumptions[0].totalKcal, 523)
assert.equal(parsed('台湾卤肉饭不要蛋', 0, 1, 'needs_review').unknownSegments[0].reason, 'unsupported_modifier')
assert.equal(parsed('台湾卤肉饭加肉', 0, 1, 'needs_review').unknownSegments[0].reason, 'unsupported_modifier')
assert.equal(parsed('两碗白粥和三个水煮蛋', 2, 0, 'complete').recognizedItems[0].basisAmount, 500)
assert.equal(parsed('米饭200克、鸡胸肉150g', 2, 0, 'complete').recognizedItems[1].kcal, 248)
assert.equal(parsed('橙汁300ml加纯牛奶二百毫升', 2, 0, 'complete').recognizedItems[1].basisAmount, 200)
assert.equal(parsed('三份番茄炒蛋', 1, 0, 'complete').recognizedItems[0].basisAmount, 600)
assert.equal(parsed('苹果', 1, 0, 'complete').recognizedItems[0].usedDefaultServing, true)
assert.equal(parsed('一瓶可乐，没吃米饭', 1, 1, 'needs_review').unknownSegments[0].reason, 'negation')
assert.equal(parsed('火锅', 0, 1, 'needs_review').unknownSegments[0].reason, 'unknown_food')
assert.equal(parsed('米饭2斤', 0, 1, 'needs_review').unknownSegments[0].reason, 'unsupported_unit')
assert.equal(parsed('米饭200', 0, 1, 'needs_review').unknownSegments[0].reason, 'invalid_quantity_or_missing_unit')
const candyBoundary = parsed('牛奶糖', 1, 0, 'complete')
assert.equal(candyBoundary.recognizedItems[0].foodId, 'snack-milk-candy', '牛奶不能从牛奶糖中子串命中')
assert.equal(parsed('牛奶糖果', 0, 1, 'needs_review').unknownSegments[0].reason, 'invalid_quantity_or_missing_unit')
assert.equal(parsed('', 0, 0, 'empty').status, 'empty')
assert.equal(parsed('米饭、salad', 1, 1, 'needs_review').unknownSegments[0].text, 'salad')
assert.equal(parsed('米饭、鸡胸肉、苹果、香蕉、橙子、梨、葡萄、西瓜、草莓、猕猴桃、黄瓜、番茄、菠菜', 12, 1, 'needs_review').unknownSegments[0].reason, 'too_many_segments')
assert.equal(parsed('米'.repeat(MAX_MEAL_TEXT_LENGTH + 1), 0, 1, 'needs_review').unknownSegments[0].reason, 'input_too_long')

const review = parseMealText('一碗米饭、火锅', FOODS, calculateFoodKcal, MEAL_TEMPLATES)
assert.equal(canSaveParsedMeal(review), false, '未知项未处理时不能保存')
assert.equal(canSaveParsedMeal(review, ['ignore']), true, '明确忽略后可保存')
assert.equal(canSaveParsedMeal(parseMealText('火锅', FOODS, calculateFoodKcal, MEAL_TEMPLATES), ['ignore']), false, '没有识别项时不能保存')
assert.equal(canSaveParsedMeal(plan), true, '完整结果应可进入上层确认')

console.log('M2 食品目录与一句话解析器测试通过：60 项，固定语句与保存门禁均通过。')
