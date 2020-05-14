import deepmerge from 'deepmerge'
import { ArgumentNode, astFromValue, coerceInputValue, GraphQLField, Kind, valueFromAST } from 'graphql'
import { digest } from 'json-hash'

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

export const getArgumentsFromNodes = (field: GraphQLField<any, any>, argumentNodes: readonly ArgumentNode[] | undefined): any => {
  const args: {[index: string]: any} = {}
  if (argumentNodes) {
    for (const argument of argumentNodes) {
      const fieldArgument = field.args.find(({ name }) => name === argument.name.value)!
      args[argument.name.value] = valueFromAST(argument.value, fieldArgument.type)
    }
  }
  return args
}

export const getInputArgumentNodes = (field: GraphQLField<any, any>, args: any): ArgumentNode[] => {
  const inputs: ArgumentNode[] = []
  for (const argument of field.args) {
    if (argument.defaultValue) {
      args[argument.name] = args[argument.name] || argument.defaultValue
    }
    const value = astFromValue(coerceInputValue(args[argument.name], argument.type), argument.type)!
    inputs.push({
      kind: Kind.ARGUMENT,
      name: {
        kind: Kind.NAME,
        value: argument.name,
      },
      value,
    })
  }
  return inputs
}

export const getFieldAlias = (field: GraphQLField<any, any>, argumentNodes: readonly ArgumentNode[] | undefined): string => {
  return `${field.name}_${digest(getArgumentsFromNodes(field, argumentNodes))}`
}
