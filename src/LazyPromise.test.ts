import LazyPromise from './LazyPromise'

const returnValue = Symbol('retVal')
describe('LazyPromise', () => {
  let func
  let lazyPromise
  beforeEach(() => {
    func = jest.fn().mockResolvedValue(returnValue)
    lazyPromise = new LazyPromise(func)
  })

  it('does not execute the function until it is awaited.', async () => {
    expect(func).not.toHaveBeenCalled()

    await expect(lazyPromise).resolves.toBe(returnValue)

    expect(func).toHaveBeenCalledTimes(1)
  })

  it('does not execute the function twice.', async () => {
    await expect(lazyPromise).resolves.toBe(returnValue)
    await expect(lazyPromise).resolves.toBe(returnValue)
    expect(func).toHaveBeenCalledTimes(1)
  })
})
