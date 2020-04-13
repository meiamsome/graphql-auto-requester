import { lazyProperty } from './utils'

describe('lazyProperty', () => {
  it('defines a property without executing the instantiator', () => {
    const instantiator = jest.fn()
    const target : { [index: string]: string } = {}

    lazyProperty(target, 'property', instantiator)
    expect(instantiator).not.toHaveBeenCalled()

    expect(target).toHaveProperty('property')
  })

  it('defines a property that calls the executor once', () => {
    const result = Symbol('result')
    const instantiator = jest.fn().mockReturnValue(result)
    const target : { [index: string]: string } = {}

    lazyProperty(target, 'property', instantiator)
    expect(target.property).toBe(result)
    expect(target.property).toBe(result)
    expect(instantiator).toHaveBeenCalledTimes(1)
  })
})
