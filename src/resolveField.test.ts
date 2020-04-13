
import { GraphQLObjectType, Kind, ArgumentNode, SelectionSetNode } from 'graphql'
import { graphQLAutoRequesterMeta } from './ObjectType'
import GraphQLAutoRequester, { AutoGraphQLObjectType } from '.'

import { resolveField } from './resolveField'

const result = Symbol('result')
const inputArgs: ArgumentNode[] = (Symbol('args') as any) as ArgumentNode[]

describe('resolveField', () => {
  let parent: GraphQLAutoRequester
  let instance: AutoGraphQLObjectType
  beforeEach(() => {
    parent = {} as GraphQLAutoRequester
    instance = {
      [graphQLAutoRequesterMeta]: {
        parent,
        execute: jest.fn(),
        type: {} as GraphQLObjectType,
      },
    }
  })

  it('uses no alias if none needed', async () => {
    ;(instance[graphQLAutoRequesterMeta].execute as jest.Mock).mockResolvedValueOnce({
      fieldName: result,
    })

    await expect(resolveField(instance, 'fieldName', 'fieldName', undefined, inputArgs)).resolves.toBe(result)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledWith({
      kind: Kind.SELECTION_SET,
      selections: [{
        arguments: inputArgs,
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'fieldName',
        },
      }],
    })
  })

  it('adds an alias if necessary', async () => {
    ;(instance[graphQLAutoRequesterMeta].execute as jest.Mock).mockResolvedValueOnce({
      propertyName: result,
    })

    await expect(resolveField(instance, 'propertyName', 'fieldName', undefined, inputArgs)).resolves.toBe(result)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledWith({
      kind: Kind.SELECTION_SET,
      selections: [{
        alias: {
          kind: Kind.NAME,
          value: 'propertyName',
        },
        arguments: inputArgs,
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'fieldName',
        },
      }],
    })
  })

  it('forwards a selection set', async () => {
    const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
    ;(instance[graphQLAutoRequesterMeta].execute as jest.Mock).mockResolvedValueOnce({
      fieldName: result,
    })

    await expect(resolveField(instance, 'fieldName', 'fieldName', selectionSet, inputArgs)).resolves.toBe(result)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledWith({
      kind: Kind.SELECTION_SET,
      selections: [{
        arguments: inputArgs,
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'fieldName',
        },
        selectionSet,
      }],
    })
  })
})
