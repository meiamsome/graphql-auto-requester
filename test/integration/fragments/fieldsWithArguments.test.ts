import { buildSchema, GraphQLObjectType } from 'graphql'

import GraphQLAutoRequester from '../../../src'

const schema = buildSchema(`
  type X {
    field(argument: Int!): Int!
  }
  type Query {
    testExample: X
  }
`)
const fields = schema.getQueryType()!.getFields()
fields.testExample.resolve = () => ({
  __typename: 'X',
})
const xFields = (schema.getType('X')! as GraphQLObjectType).getFields()

xFields.field.resolve = (_, { argument }) => argument * 2

describe('for fieldsWithArguments', () => {
  let requester: GraphQLAutoRequester
  let query: any
  beforeEach(() => {
    requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment x on X {
          field(argument: 100)
          field(argument: 120)
        }
      `
    })
    jest.spyOn(requester, 'execute')
    query = requester.query!
  })

  it ('requests the same field multiple times correctly', async () => {
    const x = await query.testExample
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(x.field({ argument: 100 })).resolves.toEqual(200)
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(x.field({ argument: 120 })).resolves.toEqual(240)
    expect(requester.execute).toHaveBeenCalledTimes(1)
  })
})
