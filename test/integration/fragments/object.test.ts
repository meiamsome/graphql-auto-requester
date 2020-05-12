import { GraphQLObjectType } from 'graphql'
import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../../src/index'

describe('Object Fragments', () => {
  it('resolves a scalar field on Query correctly', async () => {
    const schema = buildSchema(`
      type X {
        test: Int
      }
      type Query {
        testQuery: X
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => ({test: 10})
    const requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment xFragment on X {
          test
        }
      `
    })
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')
    const anX = await newQuery.testQuery
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(anX.test).resolves.toBe(10)
    expect(requester.execute).toHaveBeenCalledTimes(1)
  })
})
