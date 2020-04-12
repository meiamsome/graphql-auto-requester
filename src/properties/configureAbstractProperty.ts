import { AutoGraphQLObjectType } from '..'
import { lazyProperty } from '../utils'
import { resolveField } from '../resolveField'
import { Kind, GraphQLObjectType, ArgumentNode } from 'graphql'
import { graphQLAutoRequesterMeta } from '../ObjectType'

export const configureAbstractProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, args?: ArgumentNode[]) => {
  lazyProperty(instance, propertyName, async () => {
    const result = await resolveField(instance, propertyName, fieldName, {
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      }],
    }, args)
    if (!result) {
      return result
    }

    const concreteType = instance[graphQLAutoRequesterMeta].parent.schema.getTypeMap()[result.__typename] as GraphQLObjectType
    return new AutoGraphQLObjectType(instance[graphQLAutoRequesterMeta].parent, (selectionSet) => resolveField(instance, propertyName, fieldName, {
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: result.__typename,
          },
        },
        selectionSet,
      }],
    }, args), concreteType)
  })
}
