import { SelectionSetNode, SelectionNode, FieldNode, Kind, VariableNode, InlineFragmentNode, ValueNode, NameNode } from 'graphql'

export const isSimilarValueNode = (left: ValueNode, right: ValueNode): boolean => {
  if (left.kind !== right.kind) {
    return false
  }
  if (left.kind === Kind.NULL) {
    return true
  }
  if (left.kind === Kind.VARIABLE) {
    return left.name.value === (right as VariableNode).name.value
  }
  if (left.kind === Kind.OBJECT) {
    return areSimilarFieldLists(left.fields, (right as any).fields)
  }
  if (left.kind === Kind.LIST) {
    if (left.values.length !== (right as any).values.length) {
      return false
    }
    for (let i = 0; i < left.values.length; i++) {
      if (!isSimilarValueNode(left.values[i], (right as any).values[i])) {
        return false
      }
    }
    return true
  }

  if (left.value === (right as any).value) {
    return true
  }

  return false
}

type FieldStructure = {name: NameNode, value: ValueNode}
export const areSimilarFieldLists = (left: readonly FieldStructure[], right: readonly FieldStructure[]): boolean => {
  if (left.length !== right.length) {
    return false
  }

  const leftByName: {[index: string]: FieldStructure} = {}
  for (const argument of left) {
    leftByName[argument.name.value] = argument
  }
  for (const rightArg of right) {
    const leftArg = leftByName[rightArg.name.value]
    if (!leftArg) {
      return false
    }

    if (isSimilarValueNode(leftArg.value, rightArg.value)) {
      continue
    }

    return false
  }

  return true
}

export const isSimilarFieldNode = (left: FieldNode, right: FieldNode, log = false): boolean => {
  if ((left.alias && left.alias.value) !== (right.alias && right.alias.value)) {
    return false
  }

  if (left.name.value !== right.name.value) {
    return false
  }

  const leftArgs = left.arguments || []
  const rightArgs = right.arguments || []
  if (leftArgs.length !== rightArgs.length) {
    if (log) console.log('Mismatched args', left.arguments, right.arguments)
    return false
  }

  if (!areSimilarFieldLists(leftArgs, rightArgs)) {
    return false
  }

  return true
}

const isSimilarSelectionNode = (left: SelectionNode, right: SelectionNode) => {
  if (left.kind !== right.kind) {
    return false
  }
  if (left.kind === Kind.FIELD) {
    return isSimilarFieldNode(left, right as FieldNode)
  }
  if (left.kind === Kind.INLINE_FRAGMENT) {
    return left.typeCondition?.name.value === (right as InlineFragmentNode).typeCondition?.name.value
  }
  if (left.kind === Kind.FRAGMENT_SPREAD) {
    throw new Error('Fragment spreads are unsupported')
  }

  return false
}

export const mergeFieldNodeInToSelectionSet = (selectionSet: SelectionSetNode, selection: SelectionNode) => {
  if (selection.kind === Kind.FRAGMENT_SPREAD) {
    throw new Error('Fragment spreads are unsupported')
  }
  let existingSelection: FieldNode | InlineFragmentNode = selectionSet.selections.find(s => isSimilarSelectionNode(s, selection)) as FieldNode | InlineFragmentNode
  if (!existingSelection) {
    if (selection.kind === Kind.FIELD) {
      existingSelection = {
        ...selection,
        selectionSet: selection.selectionSet && {
          kind: Kind.SELECTION_SET,
          selections: [],
        },
      }
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      existingSelection = {
        ...selection,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [],
        },
      }
    }
    ;(selectionSet.selections as any as SelectionNode[]).push(existingSelection)
  }
  if (existingSelection.selectionSet && selection.selectionSet) {
    mergeSelectionSetInToSelectionSet(existingSelection.selectionSet, selection.selectionSet)
  }
}

export const mergeSelectionSetInToSelectionSet = (existingSelection: SelectionSetNode, selectionSet: SelectionSetNode) => {
  for (const subSelection of selectionSet.selections) {
    mergeFieldNodeInToSelectionSet(existingSelection, subSelection)
  }
}

// NOTE: We can assume that the RIGHT selection set is built without duplicate keys.
export const leftOuterJoinSelectionSets = (leftSelectionSet: SelectionSetNode, rightSelectionSet: SelectionSetNode): SelectionSetNode => {
  const result: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [],
  }

  for (const leftSelection of leftSelectionSet.selections) {
    if (leftSelection.kind === Kind.FRAGMENT_SPREAD) {
      throw new Error('Fragment spreads are unsupported')
    }

    let found = false
    for (const rightSelection of rightSelectionSet.selections) {
      if (rightSelection.kind === Kind.FRAGMENT_SPREAD) {
        throw new Error('Fragment spreads are unsupported')
      }

      if (isSimilarSelectionNode(leftSelection, rightSelection)) {
        if (leftSelection.selectionSet && rightSelection.selectionSet) {
          const leftOuterJoinSub = leftOuterJoinSelectionSets(leftSelection.selectionSet, rightSelection.selectionSet)
          if (leftOuterJoinSub.selections.length !== 0) {
            mergeFieldNodeInToSelectionSet(result, {
              ...leftSelection,
              selectionSet: leftOuterJoinSub,
            })
          }
        }
        found = true
        break
      }
    }
    if (found) {
      continue
    }

    mergeFieldNodeInToSelectionSet(result, leftSelection)
  }

  return result
}
