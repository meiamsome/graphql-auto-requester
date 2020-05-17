import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../src/index'

const schema = buildSchema(`
  interface Interface {
    unused: Int
  }

  union Union = Int

  type Query {
    scalar: Int
    scalarWithArguments(arg: Int): Int
    nonNullScalar: Int!
    nonNullScalarWithArguments(arg: Int): Int!
    arrayOfScalars: [Int]
    arrayOfScalarsWithArguments(arg: Int): [Int]
    arrayOfNonNullScalars: [Int!]
    arrayOfNonNullScalarsWithArguments(arg: Int): [Int!]
    nonNullArrayOfNonNullScalars: [Int!]!
    nonNullArrayOfNonNullScalarsWithArguments(arg: Int): [Int!]!

    interface: Interface
    interfaceWithArguments(arg: Int): Interface
    nonNullInterface: Interface!
    nonNullInterfaceWithArguments(arg: Int): Interface!
    arrayOfInterfaces: [Interface]
    arrayOfInterfacesWithArguments(arg: Int): [Interface]
    arrayOfNonNullInterfaces: [Interface!]
    arrayOfNonNullInterfacesWithArguments(arg: Int): [Interface!]
    nonNullArrayOfNonNullInterfaces: [Interface!]!
    nonNullArrayOfNonNullInterfacesWithArguments(arg: Int): [Interface!]!

    union: Union
    unionWithArguments(arg: Int): Union
    nonNullUnion: Union!
    nonNullUnionWithArguments(arg: Int): Union!
    arrayOfUnions: [Union]
    arrayOfUnionsWithArguments(arg: Int): [Union]
    arrayOfNonNullUnions: [Union!]
    arrayOfNonNullUnionsWithArguments(arg: Int): [Union!]
    nonNullArrayOfNonNullUnions: [Union!]!
    nonNullArrayOfNonNullUnionsWithArguments(arg: Int): [Union!]!
  }
`)

describe('Object Fragments', () => {
  let requester

  beforeEach(() => {
    requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'createNextRequest')
  })

  it.each(
    Object.keys(schema.getQueryType()!.getFields())
  )('Does not resolve %s until it is awaited', async (fieldName) => {
    expect(requester.query[fieldName]).toBeDefined()

    expect(requester.createNextRequest).not.toHaveBeenCalled()
  })
})
