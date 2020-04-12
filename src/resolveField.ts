import { Kind, ArgumentNode, SelectionSetNode } from 'graphql'
import { graphQLAutoRequesterMeta } from './ObjectType'
import { AutoGraphQLObjectType } from '.'

export const resolveField = async (instance: AutoGraphQLObjectType, propertyName: string, fieldName: string, selectionSet?: SelectionSetNode, args?: ArgumentNode[]) => {
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
