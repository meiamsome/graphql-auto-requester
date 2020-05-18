import AutoGraphQLObjectType, { graphQLAutoRequesterMeta } from '../ObjectType'
import { GraphQLResolveInfo, SelectionSetNode, Kind, visit, FieldNode, GraphQLCompositeType, visitWithTypeInfo, isUnionType, TypeInfo, isCompositeType, VariableNode, astFromValue, coerceInputValue } from 'graphql'
import { mergeSelectionSetInToSelectionSet } from '../selectionSet'
import { getArgumentsFromNodes, getInputArgumentNodes, getFieldAlias } from '../utils'
import { getRelatedFragments } from '../fragmentTypemap'

// We need to strip:
// - Fragments
// - Aliases on fields
// - Resolve arguments
// - Unknown fields
//
// We need to prepare:
// - Add preload fragments + __typename
// - Adding correct aliases
const stripSelectionSet = (selectionSet: SelectionSetNode, instance: AutoGraphQLObjectType, info: GraphQLResolveInfo): SelectionSetNode => {
  const parent = instance[graphQLAutoRequesterMeta].parent
  const innerSchemaTypeInfo = new TypeInfo(parent.schema, undefined, instance[graphQLAutoRequesterMeta].type)
  const outerSchemaTypeInfo = new TypeInfo(info.schema, undefined, info.returnType)
  return visit(selectionSet, visitWithTypeInfo(outerSchemaTypeInfo, visitWithTypeInfo(innerSchemaTypeInfo, {
    Variable (node: VariableNode) {
      const value = info.variableValues[node.name.value]
      const type = outerSchemaTypeInfo.getInputType()!
      return astFromValue(coerceInputValue(value, type), type)!
    },
    Field: {
      enter (node: FieldNode): FieldNode | null {
        // Remove fields we don't know about
        const innerType = innerSchemaTypeInfo.getParentType()
        if (!innerType || !isCompositeType(innerType) || isUnionType(innerType)) {
          return null
        }
        const innerField = innerType.getFields()[node.name.value]
        if (!innerField) {
          return null
        }
        return node
      },
      leave (node: FieldNode): FieldNode | null {
        const outerType: GraphQLCompositeType = outerSchemaTypeInfo.getParentType()! as GraphQLCompositeType
        if (isUnionType(outerType)) {
          throw new Error('Unexpected field on a union type.')
        }

        const field = outerType.getFields()[node.name.value]!
        if (field.args.length) {
          const inputs = getArgumentsFromNodes(field, node.arguments)
          const nodeArguments = getInputArgumentNodes(field, inputs)
          const alias = getFieldAlias(field, node.arguments)
          return {
            ...node,
            alias: {
              kind: Kind.NAME,
              value: alias,
            },
            arguments: nodeArguments,
          }
        } else {
          return {
            ...node,
            alias: undefined,
          }
        }
      },
    },
    SelectionSet: {
      enter: (selectionSet: SelectionSetNode) => {
        if (selectionSet.selections.some(({ kind }) => kind === Kind.FRAGMENT_SPREAD)) {
          const selections = []
          for (const selection of selectionSet.selections) {
            if (selection.kind === Kind.FRAGMENT_SPREAD) {
              const fragment = info.fragments[selection.name.value]
              selections.push(...fragment.selectionSet.selections)
            } else {
              selections.push(selection)
            }
          }
          return {
            ...selectionSet,
            selections,
          }
        }
      },
      leave: (selectionSet: SelectionSetNode) => {
        const result: SelectionSetNode = {
          kind: Kind.SELECTION_SET,
          selections: [
            {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: '__typename',
              },
            },
            ...selectionSet.selections,
          ],
        }

        const type = innerSchemaTypeInfo.getParentType() as GraphQLCompositeType
        const fragment = getRelatedFragments(parent.schema, parent.fragmentTypemap, type.name)
        if (fragment && fragment.selections.length) {
          mergeSelectionSetInToSelectionSet(result, fragment)
        }

        return result
      },
    },
  })))
}

const delegate = async (instance: AutoGraphQLObjectType, info: GraphQLResolveInfo) => {
  const selectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [],
  }
  for (const fieldNode of info.fieldNodes) {
    if (fieldNode.selectionSet) {
      const preparedForDelegation = stripSelectionSet(fieldNode.selectionSet, instance, info)
      mergeSelectionSetInToSelectionSet(selectionSet, preparedForDelegation)
    }
  }

  await instance[graphQLAutoRequesterMeta].execute(selectionSet)

  return instance
}

export default delegate
