import deepmerge from 'deepmerge'

// Gets the union type of all keys of T
type ValueOf<T> = T[keyof T]

export const lazyProperty = <
  Result,
  // Checks the index of Target extends Result | ValueOf<Target>, i.e. that Result is valid to be added to the object based on index type
  Target extends { [index: string]: Result | ValueOf<Target> }
>(
    target: Target,
    property: string,
    instantiator: () => Result,
  ) => {
  let init = false
  let data: Result
  Object.defineProperty(target, property, {
    get: () => {
      if (!init) {
        init = true
        data = instantiator()
      }
      return data
    },
  })
}

export const dataMerge = (destination: any, source: any) =>
  deepmerge(destination, source, {
    arrayMerge,
    clone: false,
  })

export const arrayMerge = (destination: any[], source: any[], options?: deepmerge.Options) =>
  Array.from({ length: Math.max(destination.length, source.length) }, (_, i) => {
    if (destination[i] === undefined) {
      return source[i]
    }
    if (source[i] === undefined) {
      return destination[i]
    }
    if (!destination[i] || !source[i]) {
      return destination[i] || source[i]
    }
    return deepmerge(destination[i], source[i], options)
  })
