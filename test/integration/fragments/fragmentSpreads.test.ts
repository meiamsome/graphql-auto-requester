import { buildSchema, GraphQLObjectType } from 'graphql'

import GraphQLAutoRequester from '../../../src'

const schema = buildSchema(`
  type Y {
    field: Int!
    field2: Int!
  }
  type X {
    child: Y!
    field: Int!
  }
  type Query {
    testExample: X
    testExample2: Y
  }
`)
const fields = schema.getQueryType()!.getFields()
fields.testExample.resolve = () => ({
  field: 10,
  child: {
    field: 20,
    field2: 30,
  },
})
fields.testExample2.resolve = () => ({
  field: 40,
  field2: 50,
})

describe('for fragment spreads in preloads', () => {
  let requester: GraphQLAutoRequester
  let query: any
  beforeEach(() => {
    requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment y on Y {
          field
        }
        fragment x on X {
          child {
            ...y
          }
        }
      `
    })
    jest.spyOn(requester, 'execute')
    query = requester.query!
  })

  it ('requests the same field multiple times correctly', async () => {
    const x = await query.testExample
    expect(requester.execute).toHaveBeenCalledTimes(1)

    const child = await x.child
    expect(requester.execute).toHaveBeenCalledTimes(1)
    await expect(child.field).resolves.toEqual(20)

    await expect(x.field).resolves.toEqual(10)
    expect(requester.execute).toHaveBeenCalledTimes(2)

    await expect(child.field2).resolves.toEqual(30)
    expect(requester.execute).toHaveBeenCalledTimes(3)

    const baseY = await query.testExample2
    expect(requester.execute).toHaveBeenCalledTimes(4)

    await expect(baseY.field).resolves.toEqual(40)
    expect(requester.execute).toHaveBeenCalledTimes(4)

    await expect(baseY.field2).resolves.toEqual(50)
    expect(requester.execute).toHaveBeenCalledTimes(5)
  })
})
