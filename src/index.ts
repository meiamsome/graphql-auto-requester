import { GraphQLSchema, execute, DocumentNode, Kind, SelectionSetNode, OperationDefinitionNode, SelectionNode } from 'graphql'

// @ts-ignore There are no typings for this module
import { createResultProxy } from 'graphql-result-proxy'

import AutoGraphQLObjectType from './ObjectType'

export { default as AutoGraphQLObjectType } from './ObjectType'

export class GraphQLAutoRequester {
  schema: GraphQLSchema
  _nextRequest?: DocumentNode
  _nextRequestPromise?: Promise<any>

  query?: AutoGraphQLObjectType

  constructor (schema: GraphQLSchema) {
    this.schema = schema

    const queryType = this.schema.getQueryType()
    if (queryType) {
      this.query = new AutoGraphQLObjectType(this, (selectionSet) => this.handleQuerySelectionSet(selectionSet), queryType)
    }
  }

  async execute (document: DocumentNode) {
    const result = await execute({
      document,
      schema: this.schema,
    })

    return createResultProxy(result)
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
    if (!this._nextRequest) {
      this.createNextRequest()
    }

    const nextRequestCurrentSelectionSet = (this._nextRequest!.definitions[0] as OperationDefinitionNode).selectionSet
    const selections: SelectionNode[] = nextRequestCurrentSelectionSet.selections as SelectionNode[]
    selections.push(...selectionSet.selections)

    return this._nextRequestPromise!
  }
}

export default GraphQLAutoRequester
