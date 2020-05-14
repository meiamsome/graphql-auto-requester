import {
  Kind,
  SelectionSetNode,
  GraphQLObjectType,
} from 'graphql'

import GraphQLAutoRequester from '.'
import { configureProperty } from './properties/configureProperty'
import { mergeSelectionSetInToSelectionSet } from './selectionSet'
import { getRelatedFragments } from './fragmentTypemap'
import { getInputArgumentNodes, getFieldAlias } from './utils'

export type GraphQLAutoRequesterMeta = {
  execute: (selectionSet: SelectionSetNode) => Promise<any>
  type: GraphQLObjectType
  parent: GraphQLAutoRequester
}
// TODO: This should be downgradeable to all possible input types.
// The issue is that there's no way to tell all the possible input types from the GraphQLSchema type or any subtypes.
export type FieldArguments = {
  [index: string]: any
}
// TODO: This should be downgradeable to all possible scalar output types, null and AutoGraphQLObjectType.
// The issue is that there's no way to tell all the possible scalar output types from the GraphQLSchema type or any subtypes.
export type ElementReturnType = any

export const graphQLAutoRequesterMeta = Symbol('graphql-auto-requester-meta')

export default class AutoGraphQLObjectType {
  [graphQLAutoRequesterMeta]: GraphQLAutoRequesterMeta
  [index: string]: ElementReturnType | Promise<ElementReturnType> | ((args: any) => Promise<ElementReturnType>)

  constructor (
    parent: GraphQLAutoRequester,
    execute: (selectionSet: SelectionSetNode) => Promise<any>,
    type: GraphQLObjectType,
  ) {
    this[graphQLAutoRequesterMeta] = {
      execute,
      type,
      parent,
    }
    const fragment = getRelatedFragments(parent.schema, parent.fragmentTypemap, type.name)
    if (fragment && fragment.selections.length) {
      this[graphQLAutoRequesterMeta].execute = (selectionSet) => {
        // Unwrap after the first execution
        this[graphQLAutoRequesterMeta].execute = execute

        const modifiedSelectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [],
        }

        mergeSelectionSetInToSelectionSet(modifiedSelectionSet, selectionSet)
        mergeSelectionSetInToSelectionSet(modifiedSelectionSet, fragment)
        return execute(modifiedSelectionSet)
      }
    }
    this.__typename = type.name

    for (const [fieldName, field] of Object.entries(type.getFields())) {
      if (field.args.length) {
        this[fieldName] = (args: any = {}) => {
          const inputs = getInputArgumentNodes(field, args)
          const key = getFieldAlias(field, inputs)
          if (!Object.prototype.hasOwnProperty.call(this, key)) {
            configureProperty(this, key, fieldName, field, inputs)
          }
          return this[key] as Promise<ElementReturnType>
        }
      } else {
        configureProperty(this, fieldName, fieldName, field)
      }
    }
  }
}
