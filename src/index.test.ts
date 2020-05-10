import { GraphQLSchema, execute, DocumentNode, Kind, SelectionNode, SelectionSetNode } from 'graphql'
// @ts-ignore There are no typings for this module
import { createResultProxy } from 'graphql-result-proxy'
import AutoGraphQLObjectType from './ObjectType'
import {
  mergeSelectionSetInToSelectionSet,
  leftOuterJoinSelectionSets,
} from './selectionSet'
import { dataMerge } from './utils'

import GraphQLAutoRequester from '.'
jest.mock('graphql')
jest.mock('graphql-result-proxy')
jest.mock('./ObjectType')
jest.mock('./selectionSet')
jest.mock('./utils')

describe('GraphQLAutoRequester', () => {
  afterEach(() => {
    ;(leftOuterJoinSelectionSets as jest.Mock).mockReset()
    ;(mergeSelectionSetInToSelectionSet as jest.Mock).mockReset()
  })

  it('constructs without a Query Type', () => {
    const schema: GraphQLSchema = {
      getQueryType: () => null,
    } as GraphQLSchema

    const requester = new GraphQLAutoRequester(schema)
    expect(requester).not.toHaveProperty('query')
  })

  it('constructs with a Query Type', () => {
    const schema: GraphQLSchema = {
      getQueryType: () => ({}),
    } as GraphQLSchema

    ;(AutoGraphQLObjectType as jest.Mock).mockReturnValueOnce({})

    const requester = new GraphQLAutoRequester(schema)
    expect(requester).toHaveProperty('query')
  })

  describe('without a query type', () => {
    const schema: GraphQLSchema = {
      getQueryType: () => null,
    } as GraphQLSchema

    const requester = new GraphQLAutoRequester(schema)

    describe('execute', () => {
      beforeEach(() => {
        requester._fetchedSelectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [],
        }
      })

      it('forwards to graphql-js execute, and creates a result proxy', async () => {
        const intermediate = Symbol('inter')
        ;(execute as jest.Mock).mockResolvedValue(intermediate)
        const dataMergeResult = Symbol('dataMergeResult')
        ;(dataMerge as jest.Mock).mockReturnValue(dataMergeResult)
        const result = Symbol('result')
        ;(createResultProxy as jest.Mock).mockReturnValue(result)

        const selectionSet = Symbol('SelectionSet')
        const document: DocumentNode = {
          kind: Kind.DOCUMENT,
          definitions: [{
            kind: Kind.OPERATION_DEFINITION,
            operation: 'query',
            selectionSet: (selectionSet as any) as SelectionSetNode,
          }],
        }
        await expect(requester.execute(document)).resolves.toBe(result)

        expect(mergeSelectionSetInToSelectionSet).toHaveBeenCalledTimes(1)
        expect(mergeSelectionSetInToSelectionSet).toHaveBeenCalledWith(
          requester._fetchedSelectionSet,
          selectionSet
        )

        expect(dataMerge).toHaveBeenCalledTimes(1)
        expect(requester._fetchedData).toBe(dataMergeResult)

        expect(createResultProxy).toHaveBeenCalledTimes(2)
        expect(createResultProxy).toHaveBeenNthCalledWith(1, intermediate)
        expect(createResultProxy).toHaveBeenNthCalledWith(2, { data: dataMergeResult })
        expect(requester._fetchedResultProxy).toBe(result)

        expect(execute).toHaveBeenCalledTimes(1)
        expect(execute).toHaveBeenCalledWith({
          document,
          schema,
        })
      })
    })

    describe('createNextRequest', () => {
      beforeEach(() => {
        jest.spyOn(requester, 'execute')
      })

      afterEach(() => {
        ;(requester.execute as jest.Mock).mockReset()
      })

      it('creates the next request', async () => {
        requester._nextRequest = null
        requester._nextRequestPromise = null
        requester.createNextRequest()
        expect(requester._nextRequest).not.toBeNull()
        expect(requester._nextRequestPromise).toBeInstanceOf(Promise)

        const result = Symbol('result')
        ;(requester.execute as jest.Mock).mockResolvedValue(result)
        await expect(requester._nextRequestPromise).resolves.toBe(result)
      })
    })

    describe('handleQuerySelectionSet', () => {
      let fetchedResultProxyMock
      let fetchedSelectionSetMock
      beforeEach(() => {
        fetchedResultProxyMock = Symbol('_fetchedResultProxyMock')
        requester._fetchedResultProxy = fetchedResultProxyMock
        fetchedSelectionSetMock = Symbol('_fetchedSelectionSetMock')
        requester._fetchedSelectionSet = fetchedSelectionSetMock
        jest.spyOn(requester, 'createNextRequest')
      })

      afterEach(() => {
        ;(requester.createNextRequest as jest.Mock).mockReset()
      })

      it('immediately returns the current results if the data has been fetched', () => {
        ;(leftOuterJoinSelectionSets as jest.Mock).mockReturnValue({
          kind: Kind.SELECTION_SET,
          selections: [],
        })

        const selection = Symbol('selection')
        const selectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [
            selection as any as SelectionNode,
          ],
        }
        expect(requester.handleQuerySelectionSet(selectionSet)).toBe(fetchedResultProxyMock)

        expect(leftOuterJoinSelectionSets).toHaveBeenCalledTimes(1)
        expect(leftOuterJoinSelectionSets).toHaveBeenCalledWith(selectionSet, fetchedSelectionSetMock)
      })

      it('creates the next request if required', async () => {
        const result = Symbol('result')
        const nextRequestSelectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [],
        }
        ;(requester.createNextRequest as jest.Mock).mockImplementationOnce(() => {
          requester._nextRequestPromise = result as any
          requester._nextRequest = {
            kind: Kind.DOCUMENT,
            definitions: [
              {
                kind: Kind.OPERATION_DEFINITION,
                operation: 'query',
                selectionSet: nextRequestSelectionSet,
              },
            ],
          }
        })

        const selection = Symbol('selection')
        const selectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [
            selection as any as SelectionNode,
          ],
        }
        ;(leftOuterJoinSelectionSets as jest.Mock).mockReturnValue(selectionSet)

        expect(requester.handleQuerySelectionSet(selectionSet)).toBe(result)
        expect(mergeSelectionSetInToSelectionSet).toHaveBeenCalledWith(
          nextRequestSelectionSet,
          selectionSet
        )
      })

      it('attaches to the next request if available', async () => {
        const result = Symbol('result')
        requester._nextRequestPromise = result as any
        const nextRequestSelectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [],
        }
        requester._nextRequest = {
          kind: Kind.DOCUMENT,
          definitions: [
            {
              kind: Kind.OPERATION_DEFINITION,
              operation: 'query',
              selectionSet: nextRequestSelectionSet,
            },
          ],
        }

        const selection = Symbol('selection')
        const selectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [
            selection as any as SelectionNode,
          ],
        }
        ;(leftOuterJoinSelectionSets as jest.Mock).mockReturnValue(selectionSet)

        expect(requester.handleQuerySelectionSet(selectionSet)).toBe(result)
        expect(mergeSelectionSetInToSelectionSet).toHaveBeenCalledWith(
          nextRequestSelectionSet,
          selectionSet
        )
      })
    })
  })
})
