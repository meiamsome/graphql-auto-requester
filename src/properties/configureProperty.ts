import {
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  GraphQLObjectType,
  GraphQLField,
  ArgumentNode,
} from 'graphql'

import { AutoGraphQLObjectType } from '..'
import LazyPromise from '../LazyPromise'
import { lazyProperty } from '../utils'
import { resolveField } from '../resolveField'
import { configureListProperty } from './configureListProperty'
import { configureAbstractProperty } from './configureAbstractProperty'
import { graphQLAutoRequesterMeta } from '../ObjectType'

export const configureProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, field: GraphQLField<any, any>, args?: ArgumentNode[]) => {
  const type = field.type
  let baseType = type
  if (isNonNullType(type)) {
    baseType = type.ofType
  }
  if (isAbstractType(baseType)) {
    configureAbstractProperty(instance, propertyName, fieldName, baseType, args)
  } else if (isLeafType(baseType)) {
    instance[propertyName] = new LazyPromise(() => resolveField(instance, propertyName, fieldName, undefined, args))
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
      instance[propertyName] = new LazyPromise(async () => {
        const subField = new AutoGraphQLObjectType(
          instance[graphQLAutoRequesterMeta].parent,
          (selectionSet) => resolveField(instance, propertyName, fieldName, selectionSet, args),
          _baseType,
        )
        const exists = await resolveField(subField, '__typename', '__typename', undefined, undefined)
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
