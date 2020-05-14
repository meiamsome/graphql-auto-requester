import { GraphQLObjectType, GraphQLScalarType, GraphQLInputObjectType, Kind } from 'graphql'
import GraphQLAutoRequester from '.'
import { configureProperty } from './properties/configureProperty'
import { getRelatedFragments } from './fragmentTypemap'
import { getFieldAlias, getInputArgumentNodes } from './utils'

import AutoGraphQLObjectType, { graphQLAutoRequesterMeta } from './ObjectType'

jest.mock('./properties/configureProperty')
jest.mock('./fragmentTypemap')
jest.mock('./utils')

const scalarType = new GraphQLScalarType({
  name: 'TestScalar',
  serialize: () => {},
})

const argumentInputs = Symbol('argumentInputs')

describe('AutoGraphQLObjectType', () => {
  let parent: GraphQLAutoRequester
  beforeEach(() => {
    parent = {} as GraphQLAutoRequester
    ;(configureProperty as jest.Mock).mockClear()
    ;(getRelatedFragments as jest.Mock).mockReset()
    ;(getInputArgumentNodes as jest.Mock).mockReset()
    ;(getInputArgumentNodes as jest.Mock).mockReturnValue(argumentInputs)
  })

  it('configures properties with no arguments', () => {
    const execute = jest.fn()
    const type = new GraphQLObjectType({
      name: 'TestObject',
      fields: {
        testField: {
          type: scalarType,
        },
        testField2: {
          type: scalarType,
        },
      },
    })

    const result = new AutoGraphQLObjectType(parent, execute, type)
    expect(configureProperty).toHaveBeenCalledTimes(2)

    expect(configureProperty).toHaveBeenCalledWith(result, 'testField', 'testField', type.getFields().testField)
    expect(configureProperty).toHaveBeenCalledWith(result, 'testField2', 'testField2', type.getFields().testField2)
  })

  it('configures properties with arguments', () => {
    const execute = jest.fn()
    const inputType = new GraphQLInputObjectType({
      name: 'InputObject',
      fields: {},
    })
    const type = new GraphQLObjectType({
      name: 'TestObject',
      fields: {
        testField: {
          type: scalarType,
          args: {
            testArg: {
              type: inputType,
            },
          },
        },
      },
    })

    const result = new AutoGraphQLObjectType(parent, execute, type)
    expect(configureProperty).not.toHaveBeenCalled()
    expect(result).toHaveProperty('testField')
    expect(result.testField).toBeInstanceOf(Function)

    const alias = 'exampleAlias'
    ;(getFieldAlias as jest.Mock).mockReturnValue(alias)
    const fieldResult = Symbol('fieldResult')
    ;(configureProperty as jest.Mock).mockImplementation((instance, fieldAlias) => {
      instance[fieldAlias] = fieldResult
    })
    expect(result.testField()).toBe(fieldResult)

    expect(configureProperty).toHaveBeenCalledWith(
      result,
      alias,
      'testField',
      type.getFields().testField,
      argumentInputs,
    )

    ;(configureProperty as jest.Mock).mockClear()
    expect(result.testField()).toBe(fieldResult)
    expect(configureProperty).not.toHaveBeenCalled()
  })

  it('configures properties with default arguments', () => {
    const execute = jest.fn()
    const inputType = new GraphQLInputObjectType({
      name: 'InputObject',
      fields: {},
    })
    const type = new GraphQLObjectType({
      name: 'TestObject',
      fields: {
        testField: {
          type: scalarType,
          args: {
            testArg: {
              type: inputType,
              defaultValue: {},
            },
          },
        },
      },
    })

    const result = new AutoGraphQLObjectType(parent, execute, type)
    expect(configureProperty).not.toHaveBeenCalled()
    expect(result).toHaveProperty('testField')
    expect(result.testField).toBeInstanceOf(Function)

    const alias = 'exampleAlias'
    ;(getFieldAlias as jest.Mock).mockReturnValue(alias)
    const fieldResult = Symbol('fieldResult')
    ;(configureProperty as jest.Mock).mockImplementation((instance, fieldAlias) => {
      instance[fieldAlias] = fieldResult
    })
    expect(result.testField()).toBe(fieldResult)

    expect(configureProperty).toHaveBeenCalledWith(
      result,
      alias,
      'testField',
      type.getFields().testField,
      argumentInputs,
    )

    ;(configureProperty as jest.Mock).mockClear()
    result.testField()
    expect(configureProperty).not.toHaveBeenCalled()
  })

  it('handles preloaded fragments correctly', async () => {
    const execute = jest.fn()
    const type = new GraphQLObjectType({
      name: 'TestObject',
      fields: {
        testField: {
          type: scalarType,
        },
        testField2: {
          type: scalarType,
        },
      },
    })

    ;(getRelatedFragments as jest.Mock)
      .mockReturnValue({
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'testField',
          },
        }],
      })

    const result = new AutoGraphQLObjectType(parent, execute, type)
    expect(configureProperty).toHaveBeenCalledTimes(2)

    expect(execute).not.toHaveBeenCalled()

    // First request requests the preload fragment
    result[graphQLAutoRequesterMeta].execute({
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      }],
    })

    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledWith({
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      }, {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'testField',
        },
      }],
    })

    execute.mockClear()

    // Second request does not re-request the preload fragment.
    result[graphQLAutoRequesterMeta].execute({
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'testField2',
        },
      }],
    })

    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledWith({
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'testField2',
        },
      }],
    })
  })
})
