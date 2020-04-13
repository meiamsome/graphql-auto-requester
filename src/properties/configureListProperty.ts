import { AutoGraphQLObjectType } from '..'
import { resolveField } from '../resolveField'
import { lazyProperty } from '../utils'
import { isLeafType, getNamedType, Kind, GraphQLObjectType, GraphQLList, ArgumentNode } from 'graphql'
import { graphQLAutoRequesterMeta } from '../ObjectType'

export const configureListProperty = (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, type: GraphQLList<any>, args?: ArgumentNode[]) => {
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
