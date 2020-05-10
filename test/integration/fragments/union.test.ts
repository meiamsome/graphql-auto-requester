import { GraphQLObjectType } from 'graphql'
import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../../src/index'

describe('Object Fragments', () => {
  it('resolves a scalar field on Query correctly', async () => {
    // global.printDocs = true
    const schema = buildSchema(`
      type X {
        test: Int
      }
      type Y {
        test2: Int
      }
      union Z = X | Y
      type Query {
        testQueryX: Z
        testQueryY: Z
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQueryX.resolve = () => ({
      __typename: 'X',
      test: 10
    })
    fields.testQueryY.resolve = () => ({
      __typename: 'Y',
      test2: 20
    })
    const requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment xFragment on X {
          test
        }
        fragment yFragment on Y {
          test2
        }
      `
    })
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    const anX = await newQuery.testQueryX
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(anX.test).resolves.toBe(10)
    expect(requester.execute).toHaveBeenCalledTimes(1)

    const anY = await newQuery.testQueryY
    expect(requester.execute).toHaveBeenCalledTimes(2)

    await expect(anY.test2).resolves.toBe(20)
    expect(requester.execute).toHaveBeenCalledTimes(2)
  })
})
