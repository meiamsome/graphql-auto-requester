export const lazyProperty = <T>(object: any, property: string | number, creator: () => T) => {
  let init = false
  let data: T
  Object.defineProperty(object, property, {
    get: () => {
      if (!init) {
        init = true
        data = creator()
      }
      return data
    },
  })
}
