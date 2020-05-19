import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../src/index'

const schema = buildSchema(`
  type Query {
    testField: Int!
  }
`)
const fields = schema.getQueryType()!.getFields()

const context = Symbol('context')

describe('When used with graphql context', () => {
  let requester: GraphQLAutoRequester
  let query: any
  beforeEach(() => {
    requester = new GraphQLAutoRequester(schema, { contextValue: context })
    jest.spyOn(requester, 'execute')
    query = requester.query!

    fields.testField.resolve = jest.fn().mockResolvedValue(10)
  })

  it('passes the context to the underlying schema', async () => {
    await query.testField

    expect(fields.testField.resolve).toBeCalledWith(undefined, {}, context, expect.anything())
  })

  it('passes the context to the underlying schema', async () => {
    const newContext = Symbol('new context')
    requester.setContext(newContext)

    await query.testField

    expect(fields.testField.resolve).toBeCalledWith(undefined, {}, newContext, expect.anything())
  })
})
