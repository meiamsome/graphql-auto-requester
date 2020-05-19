import { GraphQLSchema, execute, DocumentNode, Kind, SelectionSetNode, OperationDefinitionNode } from 'graphql'

// @ts-ignore There are no typings for this module
import { createResultProxy, getDataWithErrorsInline } from 'graphql-result-proxy'

import { GraphQLFragmentTypeMap, parseTypeMapFromGraphQLDocument } from './fragmentTypemap'
import AutoGraphQLObjectType from './ObjectType'
import {
  mergeSelectionSetInToSelectionSet,
  leftOuterJoinSelectionSets,
} from './selectionSet'
import {
  dataMerge,
} from './utils'

export * from './meta'
export { default as AutoGraphQLObjectType } from './ObjectType'

export type GraphQLAutoRequesterSettings = {
  fragments?: string | DocumentNode,
  contextValue?: any,
}

export class GraphQLAutoRequester {
  fragmentTypemap: GraphQLFragmentTypeMap
  schema: GraphQLSchema
  settings: GraphQLAutoRequesterSettings
  _fetchedData: any
  _fetchedResultProxy: any
  _fetchedSelectionSet: SelectionSetNode
  _nextRequest?: DocumentNode
  _nextRequestPromise?: Promise<any>

  query?: AutoGraphQLObjectType

  constructor (schema: GraphQLSchema, settings: GraphQLAutoRequesterSettings = {}) {
    this.schema = schema
    this.settings = settings
    this.fragmentTypemap = parseTypeMapFromGraphQLDocument(schema, settings.fragments)

    this._fetchedData = {}
    this._fetchedSelectionSet = {
      kind: Kind.SELECTION_SET,
      selections: [],
    }

    const queryType = this.schema.getQueryType()
    if (queryType) {
      this.query = new AutoGraphQLObjectType(this, (selectionSet) => this.handleQuerySelectionSet(selectionSet), queryType)
    }
  }

  async execute (document: DocumentNode) {
    const result = await execute({
      document,
      schema: this.schema,
      contextValue: this.settings.contextValue,
    })

    mergeSelectionSetInToSelectionSet(this._fetchedSelectionSet, (document.definitions[0] as OperationDefinitionNode).selectionSet)

    const data = getDataWithErrorsInline(createResultProxy(result))
    this._fetchedData = dataMerge(this._fetchedData, data)
    this._fetchedResultProxy = createResultProxy({ data: this._fetchedData })

    return this._fetchedResultProxy
  }

  createNextRequest () {
    this._nextRequest = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          operation: 'query',
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [],
          },
        },
      ],
    }
    this._nextRequestPromise = new Promise((resolve) => {
      setImmediate(() => {
        const request = this._nextRequest!
        delete this._nextRequest
        delete this._nextRequestPromise

        resolve(this.execute(request))
      })
    })
  }

  handleQuerySelectionSet (selectionSet: SelectionSetNode) {
    const requiredToFetch = leftOuterJoinSelectionSets(selectionSet, this._fetchedSelectionSet)

    if (requiredToFetch.selections.length === 0) {
      return this._fetchedResultProxy
    }

    if (!this._nextRequest) {
      this.createNextRequest()
    }

    const nextRequestCurrentSelectionSet = (this._nextRequest!.definitions[0] as OperationDefinitionNode).selectionSet
    mergeSelectionSetInToSelectionSet(nextRequestCurrentSelectionSet, selectionSet)

    return this._nextRequestPromise!
  }

  setContext (contextValue: any) {
    this.settings.contextValue = contextValue
  }
}

export default GraphQLAutoRequester
