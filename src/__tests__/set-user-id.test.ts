jest.mock('../CertiLayerRoot', () => ({
  CertiLayerRoot: () => null,
}))

jest.mock(
  'react-native',
  () => ({
    View: 'View',
    AppState: { addEventListener: () => ({ remove: () => {} }) },
    StyleSheet: { absoluteFill: {}, create: (s: unknown) => s },
  }),
  { virtual: true },
)

jest.mock(
  'react',
  () => {
    const createElement = (...args: unknown[]) => ({ type: args[0], props: args[1] })
    return { __esModule: true, default: { createElement }, createElement }
  },
  { virtual: true },
)

import CertiLayer, { getTouchHandlers } from '../index'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const touch = (x: number, y: number): any => ({
  nativeEvent: { touches: [{ pageX: x, pageY: y }], changedTouches: [{ pageX: x, pageY: y }] },
})

const realFetch = global.fetch
const fetchMock = jest.fn()

beforeAll(() => {
  ;(global as any).fetch = fetchMock
})
afterAll(() => {
  ;(global as any).fetch = realFetch
})
beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({}),
    text: async () => '',
  })
})
afterEach(async () => {
  await CertiLayer.stop()
})

async function runSession(configure?: () => void): Promise<string> {
  fetchMock.mockClear()
  CertiLayer.init({
    apiKey: 'certilayer_live_pk_test',
    endpoint: 'http://127.0.0.1:9',
    flushIntervalMs: 60_000,
    batchSize: 50,
  })
  configure?.()
  const h = getTouchHandlers()
  h.onTouchStart(touch(10, 20))
  await sleep(5)
  h.onTouchMove(touch(14, 24))
  await sleep(5)
  h.onTouchMove(touch(18, 28))
  await sleep(5)
  h.onTouchEnd(touch(18, 28))
  await CertiLayer.stop()
  return fetchMock.mock.calls.map((c) => String((c[1] as any)?.body ?? '')).join('\n')
}

describe('setUserId', () => {
  it('puts user_id and device_class into the final batch', async () => {
    const body = await runSession(() => CertiLayer.setUserId('user-123'))
    expect(body).toContain('"device_class":"mobile"')
    expect(body).toContain('"user_id":"user-123"')
  })

  it('omits user_id when never set', async () => {
    const body = await runSession()
    expect(body).toContain('"device_class":"mobile"')
    expect(body).not.toContain('user_id')
  })

  it('ignores empty, blank and over-long ids', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const body = await runSession(() => {
      CertiLayer.setUserId('   ')
      CertiLayer.setUserId('x'.repeat(257))
    })
    expect(body).not.toContain('user_id')
    warn.mockRestore()
  })

  it('setUserId(null) clears a previously set id', async () => {
    const body = await runSession(() => {
      CertiLayer.setUserId('user-123')
      CertiLayer.setUserId(null)
    })
    expect(body).not.toContain('user_id')
  })

  it('stop() clears the id so the next session does not inherit it', async () => {
    const first = await runSession(() => CertiLayer.setUserId('user-123'))
    expect(first).toContain('"user_id":"user-123"')
    const second = await runSession()
    expect(second).toContain('"device_class":"mobile"')
    expect(second).not.toContain('user_id')
  })
})
