import { DocumentNode, parse, Kind, SelectionSetNode, GraphQLSchema, isObjectType, isUnionType, isAbstractType, doTypesOverlap, isCompositeType, GraphQLCompositeType, GraphQLObjectType, isInterfaceType } from 'graphql'
import { mergeSelectionSetInToSelectionSet, mergeFieldNodeInToSelectionSet } from './selectionSet'
import GraphQLAutoRequester from '.'

export type GraphQLFragmentTypeMap = {
  [typename: string]: SelectionSetNode
}

export const parseTypeMapFromGraphQLDocument = (schema: GraphQLSchema, document: string | DocumentNode | undefined): GraphQLFragmentTypeMap => {
  if (!document) {
    return {}
  }

  if (typeof document === 'string') {
    document = parse(document)
  }

  const map: GraphQLFragmentTypeMap = {}

  for (const fragment of document.definitions) {
    if (fragment.kind !== Kind.FRAGMENT_DEFINITION) {
      throw new Error('The provided GraphQL document contained items that weren\'t fragments.')
    }
    const typeName = fragment.typeCondition.name.value
    const type = schema.getType(typeName)
    if (!type) {
      throw new Error(`Unknown type ${typeName} appearing in preload fragments.`)
    }
    if (!isCompositeType(type)) {
      throw new Error(`You cannot add a preload fragment to the non-composite type ${typeName}.`)
    }
    if (isUnionType(type)) {
      throw new Error(`You cannot add a preload fragment to the Union type ${typeName}.`)
    }
    if (!map[typeName]) {
      map[typeName] = {
        kind: Kind.SELECTION_SET,
        selections: [],
      }
    }
    for (const selection of fragment.selectionSet.selections) {
      if (selection.kind !== Kind.FIELD) {
        throw new Error(`You cannot include a fragment spread in a preload. Found in type ${typeName}.`)
      }
      if (selection.alias) {
        throw new Error(`${typeName}.${selection.name.value} must not have an alias.`)
      }

      if (isObjectType(type)) {
        for (const interfaceType of type.getInterfaces()) {
          if (selection.name.value in interfaceType.getFields()) {
            throw new Error(`${typeName}.${selection.name.value} must not appear in this preload as it is from one or more interfaces.`)
          }
        }
      }
    }
    mergeSelectionSetInToSelectionSet(map[typeName], fragment.selectionSet)
  }

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
