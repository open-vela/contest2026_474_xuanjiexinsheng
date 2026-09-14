export const MEAL_TEMPLATES = [
  {
    id: 'taiwan-braised-pork-rice',
    name: '台湾卤肉饭',
    aliases: ['台湾卤肉饭', '台式卤肉饭', '卤肉饭'],
    components: [
      { foodId: 'staple-rice', basisAmount: 200 },
      { foodId: 'dish-braised-pork', basisAmount: 100 },
      { foodId: 'protein-egg', basisAmount: 50 },
      { foodId: 'dish-stirfried-greens', basisAmount: 80 }
    ]
  },
  {
    id: 'tomato-egg-rice',
    name: '番茄炒蛋盖饭',
    aliases: ['番茄炒蛋盖饭', '西红柿鸡蛋盖饭'],
    components: [
      { foodId: 'staple-rice', basisAmount: 200 },
      { foodId: 'dish-tomato-egg', basisAmount: 200 }
    ]
  },
  {
    id: 'fish-fragrant-pork-rice',
    name: '鱼香肉丝盖饭',
    aliases: ['鱼香肉丝盖饭', '鱼香肉丝饭'],
    components: [
      { foodId: 'staple-rice', basisAmount: 200 },
      { foodId: 'dish-fish-fragrant-pork', basisAmount: 220 }
    ]
  },
  {
    id: 'beef-noodle-bowl',
    name: '牛肉面',
    aliases: ['牛肉面', '清汤牛肉面'],
    components: [
      { foodId: 'staple-noodles', basisAmount: 300 },
      { foodId: 'protein-beef', basisAmount: 80 },
      { foodId: 'dish-stirfried-greens', basisAmount: 50 }
    ]
  }
]

export const MEAL_TEMPLATE_NOTE = '按常见餐厅份量估算，实际配方和重量可能不同；请在保存前调整。'
