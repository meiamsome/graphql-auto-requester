import { GraphQLObjectType, GraphQLScalarType, GraphQLInputObjectType, Kind } from 'graphql'
import GraphQLAutoRequester from '.'
import { configureProperty } from './properties/configureProperty'
import { getRelatedFragments } from './fragmentTypemap'

import AutoGraphQLObjectType, { graphQLAutoRequesterMeta } from './ObjectType'

jest.mock('./properties/configureProperty')
jest.mock('./fragmentTypemap')

const scalarType = new GraphQLScalarType({
  name: 'TestScalar',
  serialize: () => {},
})

describe('AutoGraphQLObjectType', () => {
  let parent: GraphQLAutoRequester
  beforeEach(() => {
    parent = {} as GraphQLAutoRequester
    ;(configureProperty as jest.Mock).mockClear()
    ;(getRelatedFragments as jest.Mock).mockReset()
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

    const fieldResult = Symbol('fieldResult')
    ;(configureProperty as jest.Mock).mockImplementation((instance) => {
      instance.testField_bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f = fieldResult
    })
    expect(result.testField()).toBe(fieldResult)

    expect(configureProperty).toHaveBeenCalledWith(
      result,
      'testField_bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f', // This is the hash for an empty json object
      'testField',
      type.getFields().testField,
      [{
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: 'testArg',
        },
        value: {
          kind: Kind.NULL,
        },
      }]
    )

    ;(configureProperty as jest.Mock).mockClear()
    result.testField()
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

    const fieldResult = Symbol('fieldResult')
    ;(configureProperty as jest.Mock).mockImplementation((instance) => {
      instance.testField_a80b968fbe3202c81418bf79f946b51f0b40ea88 = fieldResult
    })
    expect(result.testField()).toBe(fieldResult)

    expect(configureProperty).toHaveBeenCalledWith(
      result,
      'testField_a80b968fbe3202c81418bf79f946b51f0b40ea88', // This is the hash for a json object {"testArg":{}}
      'testField',
      type.getFields().testField,
      [{
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: 'testArg',
        },
        value: {
          kind: Kind.OBJECT,
          fields: [],
        },
      }]
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
