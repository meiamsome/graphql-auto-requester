import { isLeafType, getNamedType, GraphQLObjectType, GraphQLList, ArgumentNode, isInputObjectType } from 'graphql'

import { resolveField } from '../resolveField'
import { lazyProperty } from '../utils'
import AutoGraphQLObjectType, { graphQLAutoRequesterMeta } from '../ObjectType'
import { getInitialSelections, canonicalizeRequestedFields } from '../fragmentTypemap'

export const configureListProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, type: GraphQLList<any>, args?: ArgumentNode[]) => {
  const namedType = getNamedType(type)
  if (isLeafType(namedType)) {
    lazyProperty(instance, propertyName, () => resolveField(instance, propertyName, fieldName, undefined, args))
    return
  }
  if (isInputObjectType(namedType)) {
    throw new Error('Unreachable')
  }
  lazyProperty(instance, propertyName, async () => {
    const selectionSet = getInitialSelections(instance[graphQLAutoRequesterMeta].parent, namedType)
    const list = await resolveField(instance, propertyName, fieldName, selectionSet, args)

    return list && list.map((element: any, index: number) => {
      if (!element) {
        return element
      }
      const concreteType = instance[graphQLAutoRequesterMeta].parent.schema.getTypeMap()[element.__typename] as GraphQLObjectType
      return new AutoGraphQLObjectType(instance[graphQLAutoRequesterMeta].parent, async (selectionSet) => {
        const selections = canonicalizeRequestedFields(namedType, concreteType, selectionSet)
        const result = await resolveField(instance, propertyName, fieldName, selections, args)
        return result[index]
      }, concreteType)
    })
  })
}
