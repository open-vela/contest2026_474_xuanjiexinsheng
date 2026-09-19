import device from '@system.device'

export function detectNarrowLayout(callback) {
  let settled = false
  const finish = value => {
    if (settled) return
    settled = true
    callback(value === true)
  }
  try {
    device.getInfo({
      success(info) {
        const width = Number(info && info.screenWidth)
        finish((Number.isFinite(width) && width <= 360) || (info && info.deviceType === 'band'))
      },
      fail() { finish(true) }
    })
  } catch (error) {
    finish(true)
  }
}
