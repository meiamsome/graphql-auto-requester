import { GraphQLSchema, execute, DocumentNode, Kind, SelectionNode, OperationDefinitionNode } from 'graphql'
// @ts-ignore There are no typings for this module
import { createResultProxy } from 'graphql-result-proxy'
import AutoGraphQLObjectType from './ObjectType'

import GraphQLAutoRequester from '.'
jest.mock('graphql')
jest.mock('graphql-result-proxy')
jest.mock('./ObjectType')

describe('GraphQLAutoRequester', () => {
  it('Constructs without a Query Type', () => {
    const schema: GraphQLSchema = {
      getQueryType: () => null,
    } as GraphQLSchema

    const requester = new GraphQLAutoRequester(schema)
    expect(requester).not.toHaveProperty('query')
  })

  it('Constructs with a Query Type', () => {
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
      it('Forwards to graphql-js execute, and creates a result proxy', async () => {
        const intermediate = Symbol('inter')
        ;(execute as jest.Mock).mockResolvedValue(intermediate)
        const result = Symbol('result')
        ;(createResultProxy as jest.Mock).mockResolvedValue(result)

        const document: DocumentNode = Symbol('documentNode') as any as DocumentNode
        await expect(requester.execute(document)).resolves.toBe(result)

        expect(createResultProxy).toHaveBeenCalledTimes(1)
        expect(createResultProxy).toHaveBeenCalledWith(intermediate)

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

      it('Creates the next request', async () => {
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
      beforeEach(() => {
        jest.spyOn(requester, 'createNextRequest')
      })

      afterEach(() => {
        ;(requester.createNextRequest as jest.Mock).mockReset()
      })

      it('creates the next request if required', async () => {
        const result = Symbol('result')
        ;(requester.createNextRequest as jest.Mock).mockImplementationOnce(() => {
          requester._nextRequestPromise = result as any
          requester._nextRequest = {
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
        })

        const selection = Symbol('selection')
        expect(requester.handleQuerySelectionSet({
          kind: Kind.SELECTION_SET,
          selections: [
            selection as any as SelectionNode,
          ],
        })).toBe(result)
        expect((requester._nextRequest!.definitions[0] as OperationDefinitionNode).selectionSet.selections).toEqual([
          selection,
        ])
      })

      it('attaches to the next request if available', async () => {
        const result = Symbol('result')
        requester._nextRequestPromise = result as any
        requester._nextRequest = {
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

        const selection = Symbol('selection')
        expect(requester.handleQuerySelectionSet({
          kind: Kind.SELECTION_SET,
          selections: [
            selection as any as SelectionNode,
          ],
        })).toBe(result)
        expect((requester._nextRequest!.definitions[0] as OperationDefinitionNode).selectionSet.selections).toEqual([
          selection,
        ])
      })
    })
  })
})
