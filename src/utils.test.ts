import deepmerge from 'deepmerge'

import { lazyProperty, dataMerge, arrayMerge } from './utils'

jest.mock('deepmerge')

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

describe('dataMerge', () => {
  it('calls deepmerge with configuration', () => {
    const result = Symbol('result')
    ;(deepmerge as any as jest.Mock).mockReturnValue(result)

    const source = Symbol('source')
    const destination = Symbol('destination')

    expect(dataMerge(destination, source)).toBe(result)

    expect(deepmerge).toHaveBeenCalledTimes(1)
    expect(deepmerge).toHaveBeenCalledWith(destination, source, {
      arrayMerge,
      clone: false,
    })
  })
})

describe('arrayMerge', () => {
  beforeEach(() => {
    ;(deepmerge as any as jest.Mock).mockReset()
  })

  it.each([
    [undefined, undefined, undefined],
    [undefined, null, null],
    [undefined, {}, {}],
    [null, undefined, null],
    [null, null, null],
    [null, {}, {}],
    [{}, undefined, {}],
    [{}, null, {}],
  ])('handles array with %0 and %1 to produce %2', (inputA, inputB, output) => {
    expect(arrayMerge([inputA], [inputB])).toEqual([output])
  })

  it('calls deepmerge if required', () => {
    const options = Symbol('options')
    const result = Symbol('result')

    ;(deepmerge as any as jest.Mock).mockReturnValue(result)

    expect(arrayMerge(
      [
        { left: true },
      ],
      [
        { right: true },
      ],
      options as deepmerge.Options
    )).toEqual([result])

    expect(deepmerge).toHaveBeenCalledTimes(1)
    expect(deepmerge).toHaveBeenCalledWith(
      { left: true },
      { right: true },
      options
    )
  })
})
