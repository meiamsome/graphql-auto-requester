import { AutoGraphQLObjectType } from '..'
import { lazyProperty } from '../utils'
import { resolveField } from '../resolveField'
import { GraphQLObjectType, ArgumentNode, GraphQLAbstractType } from 'graphql'
import { graphQLAutoRequesterMeta } from '../ObjectType'
import { getInitialSelections, canonicalizeRequestedFields } from '../fragmentTypemap'

export const configureAbstractProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, type: GraphQLAbstractType, args?: ArgumentNode[]) => {
  lazyProperty(instance, propertyName, async () => {
    const selectionSet = getInitialSelections(instance[graphQLAutoRequesterMeta].parent, type)
    const result = await resolveField(instance, propertyName, fieldName, selectionSet, args)
    if (!result) {
      return result
    }

    const concreteType = instance[graphQLAutoRequesterMeta].parent.schema.getTypeMap()[result.__typename] as GraphQLObjectType
    return new AutoGraphQLObjectType(instance[graphQLAutoRequesterMeta].parent, (selectionSet) => {
      const rootSelections = canonicalizeRequestedFields(type, concreteType, selectionSet)
      return resolveField(instance, propertyName, fieldName, rootSelections, args)
    }, concreteType)
  })
}
