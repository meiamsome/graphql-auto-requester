import { DocumentNode, parse, Kind, SelectionSetNode, GraphQLSchema, isObjectType, isUnionType, isAbstractType, doTypesOverlap, isCompositeType, GraphQLCompositeType, GraphQLObjectType, isInterfaceType, visit, TypeInfo, FieldNode, visitWithTypeInfo, FragmentDefinitionNode, NoUnusedFragmentsRule, validate, specifiedRules, ValidationContext, GraphQLError, OverlappingFieldsCanBeMergedRule, FragmentSpreadNode } from 'graphql'
import { mergeSelectionSetInToSelectionSet, mergeFieldNodeInToSelectionSet } from './selectionSet'
import GraphQLAutoRequester from '.'
import { getFieldAlias, getArgumentsFromNodes, getInputArgumentNodes } from './utils'

export type GraphQLFragmentTypeMap = {
  [typename: string]: SelectionSetNode
}

const noUnionFragmentDefinitionRule = (context: ValidationContext) => ({
  FragmentDefinition (node: FragmentDefinitionNode) {
    const type = context.getType()
    if (isUnionType(type)) {
      context.reportError(new GraphQLError(`You cannot add a preload fragment to the Union type ${type.name}.`, node))
    }
  },
})

const noFieldAliasesRule = (context: ValidationContext) => ({
  Field (node: FieldNode) {
    if (node.alias) {
      context.reportError(new GraphQLError(`${context.getParentType()!.name}.${node.name.value} must not have an alias.`, node))
    }
  },
})

const noFieldsFromInterfaces = (context: ValidationContext) => ({
  Field (node: FieldNode) {
    const type = context.getParentType()
    if (isObjectType(type)) {
      for (const interfaceType of type.getInterfaces()) {
        if (node.name.value in interfaceType.getFields()) {
          throw new Error(`${type.name}.${node.name.value} must not appear in this preload as it is from one or more interfaces.`)
        }
      }
    }
  },
})

const noInlineFragment = (context: ValidationContext) => ({
  InlineFragment () {
    const type: GraphQLCompositeType = context.getParentType()!
    throw new Error(`You cannot include an inline spread in a preload. Found in type ${type.name}.`)
  },
})

const fragmentSpreadsMustAppearInSameType = (context: ValidationContext) => ({
  FragmentSpread (node: FragmentSpreadNode) {
    const type: GraphQLCompositeType = context.getParentType()!
    const fragment = context.getFragment(node.name.value)!
    const fragmentTypeName = fragment.typeCondition.name.value
    if (fragmentTypeName !== type.name) {
      throw new Error(`You cannot include a fragment spread in a different type (${fragmentTypeName} !== ${type.name})`)
    }
  },
})

export const parseTypeMapFromGraphQLDocument = (schema: GraphQLSchema, document: string | DocumentNode | undefined): GraphQLFragmentTypeMap => {
  if (!document) {
    return {}
  }

  if (typeof document === 'string') {
    document = parse(document)
  }

  if (document.definitions.some(definition => definition.kind !== Kind.FRAGMENT_DEFINITION)) {
    throw new Error('The provided GraphQL document contained items that weren\'t fragments.')
  }

  const errors = validate(schema, document, [
    ...specifiedRules
      .filter(rule => rule !== OverlappingFieldsCanBeMergedRule)
      .filter(rule => rule !== NoUnusedFragmentsRule),

    noUnionFragmentDefinitionRule,
    noFieldAliasesRule,
    noFieldsFromInterfaces,
    noInlineFragment,
    fragmentSpreadsMustAppearInSameType,
  ])

  if (errors && errors[0]) {
    throw errors[0]
  }

  const typeInfo = new TypeInfo(schema)
  const aliasedDocument: DocumentNode = visit(document, visitWithTypeInfo(typeInfo, {
    Field (node: FieldNode): FieldNode | undefined {
      const type: GraphQLCompositeType = typeInfo.getParentType()! as GraphQLCompositeType
      if (isUnionType(type)) {
        throw new Error('Unexpected field on a union type.')
      }

      const field = type.getFields()[node.name.value]!
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
      }
    },
  }))

  const errors2 = validate(schema, aliasedDocument,
    specifiedRules
      .filter(rule => rule !== NoUnusedFragmentsRule)
  )
  if (errors2 && errors2[0]) {
    throw errors2[0]
  }

  const map: GraphQLFragmentTypeMap = {}
  visit(aliasedDocument, {
    SelectionSet: (selectionSet: SelectionSetNode) => {
      if (selectionSet.selections.some(({ kind }) => kind === Kind.FRAGMENT_SPREAD)) {
        const selections = []
        for (const selection of selectionSet.selections) {
          if (selection.kind === Kind.FRAGMENT_SPREAD) {
            const fragment = aliasedDocument.definitions
              .find((node) =>
                node.kind === Kind.FRAGMENT_DEFINITION &&
                node.name.value === selection.name.value
              ) as FragmentDefinitionNode
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
    FragmentDefinition: {
      leave (node: FragmentDefinitionNode) {
        const typeName = node.typeCondition.name.value
        if (!map[typeName]) {
          map[typeName] = {
            kind: Kind.SELECTION_SET,
            selections: [],
          }
        }
        mergeSelectionSetInToSelectionSet(map[typeName], node.selectionSet)
      },
    },
  })

  return map
}

export const getRelatedFragments = (schema: GraphQLSchema, map: GraphQLFragmentTypeMap, typeName: string): SelectionSetNode => {
  const selectionSet = {
    kind: Kind.SELECTION_SET,
    selections: [],
  }

  const type = schema.getType(typeName)!
  if (!isCompositeType(type)) {
    throw new Error('getRelatedFragments is only valid for composite types')
  }

  for (const otherType of Object.values(schema.getTypeMap())) {
    if (!isCompositeType(otherType)) {
      continue
    }
    if (!doTypesOverlap(schema, type, otherType)) {
      continue
    }
    const otherSelectionSet = map[otherType.name]
    if (otherSelectionSet) {
      if (type === otherType || !isAbstractType(type)) {
        mergeSelectionSetInToSelectionSet(selectionSet, otherSelectionSet)
      } else {
        mergeFieldNodeInToSelectionSet(selectionSet, {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: otherType.name,
            },
          },
          selectionSet: otherSelectionSet,
        })
      }
    }
  }

  return selectionSet
}

export const getInitialSelections = (instance: GraphQLAutoRequester, type: GraphQLCompositeType): SelectionSetNode => {
  const selectionSet = {
    kind: Kind.SELECTION_SET,
    selections: [{
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: '__typename',
      },
    }],
  }
  mergeSelectionSetInToSelectionSet(selectionSet, getRelatedFragments(
    instance.schema,
    instance.fragmentTypemap,
    type.name,
  ))

  return selectionSet
}

export const canonicalizeRequestedFields = (rootType: GraphQLCompositeType, concreteType: GraphQLObjectType, selectionSet: SelectionSetNode): SelectionSetNode => {
  if (concreteType === rootType) {
    return selectionSet
  }
  const rootSelections = {
    kind: Kind.SELECTION_SET,
    selections: [],
  }
  const fragmentSelections = {
    kind: Kind.SELECTION_SET,
    selections: [],
  }
  for (const selection of selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) {
      throw new Error('Unimplemented')
    }

    if (isInterfaceType(rootType) && selection.name.value in rootType.getFields()) {
      mergeFieldNodeInToSelectionSet(rootSelections, selection)
      continue
    }

    let found = false
    for (const interfaceType of concreteType.getInterfaces()) {
      if (selection.name.value in interfaceType.getFields()) {
        mergeFieldNodeInToSelectionSet(rootSelections, {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: interfaceType.name,
            },
          },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [selection],
          },
        })
        // A field can be in multiple interface and should be raised to be in all of them.
        found = true
      }
    }
    if (found) {
      continue
    }
    mergeFieldNodeInToSelectionSet(fragmentSelections, selection)
  }
  if (fragmentSelections.selections.length) {
    mergeFieldNodeInToSelectionSet(rootSelections, {
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: concreteType.name,
        },
      },
      selectionSet: fragmentSelections,
    })
  }

  return rootSelections
}
