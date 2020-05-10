import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../src/index'

const schema = buildSchema(`
  type X {
    value: Int!
  }

  type Query {
    getXs: [X!]!
  }
`)
const fields = schema.getQueryType()!.getFields()
fields.getXs.resolve = () => Array.from({ length: 100 }, (_, i) => ({ value: i }))

describe('Array siblings', () => {
  let requester: GraphQLAutoRequester
  let query: any
  beforeEach(() => {
    requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    query = requester.query!
  })

  it('only queries once for the same field in siblings', async () => {
    const array = await query.getXs
    for (let i = 0; i < array.length; i++) {
      expect(await array[i].value).toBe(i)
    }
    expect(requester.execute).toHaveBeenCalledTimes(2)
  })
})
