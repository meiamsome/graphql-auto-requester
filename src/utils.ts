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
