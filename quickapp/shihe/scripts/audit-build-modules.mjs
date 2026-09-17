import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const pagesRoot = path.resolve('build/pages')
const sourcePagesRoot = path.resolve('src/pages')
const healthAdviceSource = await readFile(path.resolve('src/common/health-advice.js'), 'utf8')
const healthServiceSource = await readFile(path.resolve('src/services/health-service.js'), 'utf8')
const healthWatchdogSource = await readFile(path.resolve('src/common/no-response-watchdog.js'), 'utf8')
const aiAdviceSource = await readFile(path.resolve('src/common/ai-advice.js'), 'utf8')
const velaclawServiceSource = await readFile(path.resolve('src/services/velaclaw-service.js'), 'utf8')
const manifest = JSON.parse(await readFile(path.resolve('src/manifest.json'), 'utf8'))
const manifestPages = manifest.router && manifest.router.pages
assert.ok(manifestPages && typeof manifestPages === 'object', 'manifest router.pages 必须存在')
assert.ok(Array.isArray(manifest.features) && manifest.features.some(item => item && item.name === 'service.health'), 'manifest 必须声明 service.health feature')
assert.ok(manifest.features.some(item => item && item.name === 'system.velaclaw'), 'manifest 必须声明 system.velaclaw feature')
assert.ok(Array.isArray(manifest.permissions) && manifest.permissions.some(item => item && item.name === 'hapjs.permission.HEALTH'), 'manifest 必须声明 HEALTH permission')
const backgroundFeatures = manifest.config && manifest.config.background && manifest.config.background.features
assert.ok(!Array.isArray(backgroundFeatures) || !backgroundFeatures.includes('service.health'), '不得声明后台 service.health')
assert.match(healthAdviceSource, /当前设备暂不支持/, 'health 状态必须包含明确不支持文案')
assert.match(healthAdviceSource, /健康数据暂时读取失败/, 'health 状态必须包含读取错误文案')
assert.match(healthAdviceSource, /暂无有效健康数据/, 'health 状态必须包含无效样本文案')
assert.match(healthServiceSource, /if \(!health \|\| !health\.DATA_TYPES\) return null/, 'health 模块及 DATA_TYPES 必须先做缺失保护')
assert.match(healthServiceSource, /typeof health\.subscribeSample !== 'function' \|\| typeof health\.unsubscribeSample !== 'function'/, 'health 订阅接口必须先做完整性保护')
assert.match(healthServiceSource, /dataTypes\.HEART_RATE == null \|\| dataTypes\.SPO2 == null \|\| dataTypes\.STRESS == null/, 'health 三项 DATA_TYPES 常量必须先做完整性保护')
assert.doesNotMatch(healthServiceSource, /dataType:\s*health\.DATA_TYPES\./, 'health DATA_TYPES 不得在能力保护外直接访问')
assert.match(healthServiceSource, /if \(!api\) \{\s*healthKinds\.forEach\(kind => \{\s*onState\(kind, \{ status: 'unsupported', reason: 'feature-missing' \}\)/, 'health 能力缺失必须同步回报三项 unsupported')
assert.match(healthServiceSource, /status: healthFailureStatus\(code\)/, 'health fail 必须通过已测试的错误码映射')
assert.match(healthServiceSource, /status: 'invalid-sample'/, 'health callback 无效样本必须独立标记')
assert.match(healthWatchdogSource, /HEALTH_RESPONSE_TIMEOUT_MS\s*=\s*4000/, 'health 无响应看门狗必须等待 4 秒')
assert.match(healthServiceSource, /status: 'read-error', reason: 'no-response'/, 'health 无响应必须标记为读取失败')
assert.match(healthServiceSource, /callback: sample => \{\s*responseWatchdogs\.clear\(entry\.kind\)/, 'health sample 必须清理对应看门狗')
assert.match(healthServiceSource, /fail: \(data, code\) => \{\s*responseWatchdogs\.clear\(entry\.kind\)/, 'health fail 必须清理对应看门狗')
assert.match(healthServiceSource, /unsubscribeAllHealth\(\) \{\s*responseWatchdogs\.clearAll\(\)/, 'health 退订必须清理全部看门狗')
assert.match(velaclawServiceSource, /import velaclaw from '@system\.velaclaw'/, 'VelaClaw 必须使用官方系统模块导入')
assert.match(velaclawServiceSource, /requestAiAdvice\(velaclaw, query, onResult\)/, 'VelaClaw 服务必须经过安全适配器')
assert.match(aiAdviceSource, /!api \|\| typeof api\.ask !== 'function'/, 'VelaClaw 适配器必须保护模块及 ask 缺失')
assert.match(aiAdviceSource, /AI_ADVICE_TIMEOUT_MS\s*=\s*10000/, 'VelaClaw 应用层超时必须为 10 秒')
assert.match(aiAdviceSource, /try \{[\s\S]*api\.ask\(\{/, 'VelaClaw ask 必须保护同步抛错')
const routes = Object.entries(manifestPages)
const expectedPageCount = routes.length

async function waitForDirectory(directory, attempts = 30, intervalMs = 100) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await readdir(directory)
      return
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      if (attempt === attempts) {
        throw new Error(`等待构建目录超时（${attempts * intervalMs}ms）：${directory}`)
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }
}

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await javascriptFiles(target))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(target)
  }
  return files
}

await waitForDirectory(pagesRoot)
const files = await javascriptFiles(pagesRoot)
assert.equal(files.length, expectedPageCount, `应生成 ${expectedPageCount} 个页面 JavaScript 包`)

const sourcePageFiles = routes.map(([route, config]) => {
  assert.ok(config && typeof config.component === 'string' && config.component, `${route} 必须声明 component`)
  const lastSegment = route.split('/').filter(Boolean).pop()
  return path.join(sourcePagesRoot, lastSegment, config.component + '.ux')
})
for (const file of sourcePageFiles) {
  const source = await readFile(file, 'utf8')
  const hasData = /\bdata\s*:\s*\{/.test(source)
  const hasAccessFields = /\b(?:public|protected|private)\s*:\s*\{/.test(source)
  assert.ok(!(hasData && hasAccessFields), path.relative(process.cwd(), file) + ' 不得混用 data 与访问器字段')
  if (path.basename(file) === 'history.ux') {
    assert.match(source, /\bfor="\(index, day\) in days"/, 'history.ux 必须使用显式 day 循环变量')
    assert.match(source, /最近 7 天饮食记录/, 'history.ux 必须明确是饮食记录')
    assert.match(source, /有记录日平均 kcal/, 'history.ux 必须展示有记录日平均摄入')
    assert.match(source, /已记录 \{\{day\.mealCount\}\} 餐/, 'history.ux 必须展示每日记录餐数')
    assert.doesNotMatch(source, /手动补录|估算净摄入|食品种类/, 'history.ux 不得保留已移除指标')
  }
  if (path.basename(file) === 'home.ux') {
    assert.match(source, /\$canIUse\('@service\.health'\)/, 'home.ux 必须在订阅前探测 service.health 能力')
    assert.match(source, /onHide\s*\(\)\s*\{[^}]*stopHealth\s*\(/, 'home.ux onHide 必须清理健康订阅')
    assert.match(source, /onDestroy\s*\(\)\s*\{[^}]*stopHealth\s*\(/, 'home.ux onDestroy 必须清理健康订阅')
    assert.match(source, /由 service\.health 自动读取；比赛模拟器中为官方 Mock/, 'home.ux 必须说明健康数据自动读取与比赛 Mock 来源')
    assert.match(source, /仅展示，不用于热量计算或诊断/, 'home.ux 必须声明健康数据用途边界')
    assert.match(source, /今日已记录/, 'home.ux 必须以已记录食物摄入为主指标')
    assert.match(source, /每日饮食参考线/, 'home.ux 必须解释饮食参考线')
    assert.match(source, /连续记录 \{\{streakDays\}\} 天/, 'home.ux 必须展示连续记录天数')
    assert.match(source, /早餐\{\{breakfastState\}\}/, 'home.ux 必须展示三餐记录状态')
    assert.doesNotMatch(source, /食衡三环|foodVarietyCount|手动补录运动|估算净摄入/, 'home.ux 不得保留已移除指标')
    assert.match(source, /今日小建议/, 'home.ux 必须始终保留本地建议卡')
    assert.match(source, /将发送给端侧 AI/, 'home.ux 必须展示实际发送摘要预览')
    assert.match(source, /取消/, 'home.ux AI 预览必须提供取消入口')
    assert.match(source, /确认发送/, 'home.ux AI 预览必须提供确认入口')
    assert.match(source, /onHide\s*\(\)\s*\{[^}]*cancelAiRequest\s*\(/, 'home.ux onHide 必须取消 AI 请求')
    assert.match(source, /onDestroy\s*\(\)\s*\{[^}]*cancelAiRequest\s*\(/, 'home.ux onDestroy 必须取消 AI 请求')
    assert.match(source, /AI 暂不可用，已保留本地建议/, 'home.ux 必须明确展示 AI 回退文案')
  }
  if (path.basename(file) === 'meal.ux') {
    assert.match(source, /entryMode:'transcript'/, 'meal.ux 必须默认使用一句话记餐模式')
    assert.match(source, /一句话记餐/, 'meal.ux 必须提供一句话入口')
    assert.match(source, /快捷选择/, 'meal.ux 必须保留快捷选择备用入口')
    assert.match(source, /识别这顿饭/, 'meal.ux 必须提供清晰的识别主操作')
    assert.match(source, /全部（60）/, 'meal.ux 必须提供完整 60 项目录入口')
    assert.match(source, /removeDraft/, 'meal.ux 必须允许在确认前移除误选食品')
    assert.match(source, /MEAL_TEMPLATES/, 'meal.ux 必须接入常见套餐模板')
  }
}

const failures = []
const relativeRequire = /\brequire\s*\(\s*(['"])\.\.?\//g
for (const file of files) {
  const source = await readFile(file, 'utf8')
  if (relativeRequire.test(source)) failures.push(path.relative(process.cwd(), file))
  relativeRequire.lastIndex = 0

  const requiredModules = [...source.matchAll(/__webpack_require__\((['"])(\.\/src\/[^'"]+\.js)\1\)/g)]
  for (const [, , moduleId] of requiredModules) {
    const escapedId = moduleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const modulePattern = new RegExp(
      `['"]${escapedId}['"]\\s*\\([^,]+,\\s*exports(?:,|\\))[^\\{]*\\{` +
      `[\\s\\S]*?\\bexports\\.[A-Za-z_$][\\w$]*\\s*=`,
    )
    if (!modulePattern.test(source)) {
      failures.push(`${path.relative(process.cwd(), file)}: ${moduleId} 未写入 wrapper exports`)
    }
  }
}

assert.deepEqual(failures, [], '页面包模块审计失败: ' + failures.join(', '))
console.log(`页面审计通过：${expectedPageCount} 页及模块打包正常；health 声明、能力探测、前台生命周期及饮食数据来源文案均符合要求。`)
