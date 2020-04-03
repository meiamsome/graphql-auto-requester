import {
  getNamedType,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  SelectionSetNode,
  GraphQLList,
  GraphQLObjectType,
  GraphQLField,
  ArgumentNode,
  coerceInputValue,
  astFromValue,
} from 'graphql'
import {
  digest,
} from 'json-hash'

import GraphQLAutoRequester from '.'
import { lazyProperty } from './utils'

export type GraphQLAutoRequesterMeta = {
  execute: (selectionSet: SelectionSetNode) => Promise<any>
  type: GraphQLObjectType
  parent: GraphQLAutoRequester
}
// TODO: This should be downgradeable to all possible input types.
// The issue is that there's no way to tell all the possible input types from the GraphQLSchema type or any subtypes.
export type FieldArguments = {
  [index: string]: any
}
// TODO: This should be downgradeable to all possible scalar output types, null and AutoGraphQLObjectType.
// The issue is that there's no way to tell all the possible scalar output types from the GraphQLSchema type or any subtypes.
export type ElementReturnType = any

export const graphQLAutoRequesterMeta = Symbol('graphql-auto-requester-meta')

const configureProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, field: GraphQLField<any, any>, args?: ArgumentNode[]) => {
  const type = field.type
  let baseType = type
  if (isNonNullType(type)) {
    baseType = type.ofType
  }
  if (isAbstractType(baseType)) {
    configureAbstractProperty(instance, propertyName, fieldName, args)
  } else if (isLeafType(baseType)) {
    lazyProperty(instance, propertyName, () => resolveField(instance, propertyName, fieldName, undefined, args))
  } else if (isListType(baseType)) {
    configureListProperty(instance, propertyName, fieldName, baseType, args)
  } else if (isObjectType(baseType)) {
    const _baseType: GraphQLObjectType = baseType
    if (isNonNullType(type)) {
      lazyProperty(instance, propertyName, () => new AutoGraphQLObjectType(
        instance[graphQLAutoRequesterMeta].parent,
        (selectionSet) => resolveField(instance, propertyName, fieldName, selectionSet, args),
        _baseType,
      ))
    } else {
      lazyProperty(instance, propertyName, async () => {
        const subField = new AutoGraphQLObjectType(
          instance[graphQLAutoRequesterMeta].parent,
          (selectionSet) => resolveField(instance, propertyName, fieldName, selectionSet, args),
          _baseType,
        )
        const exists = await resolveField(subField, '__typename', '__typename')
        if (!exists) {
          return exists
        }
        return subField
      })
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _exhaustiveCheck: never = baseType
    throw new Error('unreachable code branch')
  }
}

const configureAbstractProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, args?: ArgumentNode[]) => {
  lazyProperty(instance, propertyName, async () => {
    const { __typename: typeName } = await resolveField(instance, propertyName, fieldName, {
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      }],
    }, args)
    if (!typeName) {
      return typeName
    }

    const concreteType = instance[graphQLAutoRequesterMeta].parent.schema.getTypeMap()[typeName] as GraphQLObjectType
    return new AutoGraphQLObjectType(instance[graphQLAutoRequesterMeta].parent, (selectionSet) => resolveField(instance, propertyName, fieldName, {
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: typeName,
          },
        },
        selectionSet,
      }],
    }, args), concreteType)
  })
}

const configureListProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, type: GraphQLList<any>, args?: ArgumentNode[]) => {
  const namedType = getNamedType(type)
  if (isLeafType(namedType)) {
    lazyProperty(instance, propertyName, () => resolveField(instance, propertyName, fieldName, undefined, args))
    return
  }
  lazyProperty(instance, propertyName, async () => {
    const list = await resolveField(instance, propertyName, fieldName, {
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      }],
    }, args)

    return list && list.map((element: any, index: number) => {
      if (!element) {
        return element
      }
      const concreteType = instance[graphQLAutoRequesterMeta].parent.schema.getTypeMap()[element.__typename] as GraphQLObjectType
      return new AutoGraphQLObjectType(instance[graphQLAutoRequesterMeta].parent, async (selectionSet) => {
        const result = await resolveField(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: element.__typename,
              },
            },
            selectionSet,
          }],
        }, args)
        return result[index]
      }, concreteType)
    })
  })
}

const resolveField = async (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, selectionSet?: SelectionSetNode, args?: ArgumentNode[]) => {
  const result = await instance[graphQLAutoRequesterMeta].execute({
    kind: Kind.SELECTION_SET,
    selections: [{
      alias: propertyName !== fieldName ? {
        kind: Kind.NAME,
        value: propertyName,
      } : undefined,
      arguments: args,
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: fieldName,
      },
      selectionSet,
    }],
  })

  return result[propertyName]
}

export default class AutoGraphQLObjectType {
  [graphQLAutoRequesterMeta]: GraphQLAutoRequesterMeta
  [index: string]: ElementReturnType | Promise<ElementReturnType> | ((args: any) => Promise<ElementReturnType>)

  constructor (
    parent: GraphQLAutoRequester,
    execute: (selectionSet: SelectionSetNode) => Promise<any>,
    type: GraphQLObjectType,
  ) {
    this[graphQLAutoRequesterMeta] = {
      execute,
      type,
      parent,
    }
    this.__typename = type.name

    for (const [fieldName, field] of Object.entries(type.getFields())) {
      if (field.args.length) {
        this[fieldName] = (args: any = {}) => {
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
          const key = `${fieldName}_${digest(args)}`
          if (!Object.prototype.hasOwnProperty.call(this, key)) {
            configureProperty(this, key, fieldName, field, inputs)
          }
          return this[key] as Promise<ElementReturnType>
        }
      } else {
        configureProperty(this, fieldName, fieldName, field)
      }
    }
  }
}
