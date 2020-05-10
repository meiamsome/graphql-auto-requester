import { GraphQLObjectType } from 'graphql'
import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../../src/index'

describe('interface Fragments', () => {
  it('interface fragments are added to all implementors', async () => {
    const schema = buildSchema(`
      interface X {
        test: Int
      }
      type Y implements X {
        test: Int
      }
      type Z implements X {
        test: Int
      }
      type Query {
        testQueryY: Y
        testQueryZ: Z
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQueryY.resolve = () => ({
      __typename: 'Y',
      test: 10
    })
    fields.testQueryZ.resolve = () => ({
      __typename: 'Z',
      test: 20
    })
    const requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment xFragment on X {
          test
        }
      `
    })
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    const anY = await newQuery.testQueryY
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(anY.test).resolves.toBe(10)
    expect(requester.execute).toHaveBeenCalledTimes(1)

    const anZ = await newQuery.testQueryZ
    expect(requester.execute).toHaveBeenCalledTimes(2)

    await expect(anZ.test).resolves.toBe(20)
    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('implementor fragments are applied to an interface field', async () => {
    const schema = buildSchema(`
      interface X {
        test: Int
      }
      type Y implements X {
        test: Int
        test2: Int
      }
      type Z implements X {
        test: Int
        test3: Int
      }
      type Query {
        testQueryY: X
        testQueryZ: X
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQueryY.resolve = () => ({
      __typename: 'Y',
      test: 10,
      test2: 30,
    })
    fields.testQueryZ.resolve = () => ({
      __typename: 'Z',
      test: 20,
      test3: 40,
    })
    const requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment xFragment on X {
          test
        }
        fragment yFragment on Y {
          test2
        }
        fragment zFragment on Z {
          test3
        }
      `
    })
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    const anY = await newQuery.testQueryY
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(anY.test2).resolves.toBe(30)
    expect(requester.execute).toHaveBeenCalledTimes(1)

    const anZ = await newQuery.testQueryZ
    expect(requester.execute).toHaveBeenCalledTimes(2)

    await expect(anZ.test3).resolves.toBe(40)
    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('interface fragments work for lists', async () => {
    const schema = buildSchema(`
      interface X {
        test: Int
      }
      type Y implements X {
        test: Int
        test2: Int
      }
      type Z implements X {
        test: Int
        test3: Int
      }
      type Query {
        testQuery: [X]
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => [{
      __typename: 'Y',
      test: 10,
      test2: 50
    }, {
      __typename: 'Z',
      test: 20,
      test3: 60
    }]

    const requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment xFragment on X {
          test
        }
        fragment yFragment on Y {
          test2
        }
        fragment zFragment on Z {
          test3
        }
      `
    })
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    const array = await newQuery.testQuery
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(array[0].test).resolves.toBe(10)
    expect(requester.execute).toHaveBeenCalledTimes(1)
    await expect(array[0].test2).resolves.toBe(50)
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(array[1].test).resolves.toBe(20)
    expect(requester.execute).toHaveBeenCalledTimes(1)
    await expect(array[1].test3).resolves.toBe(60)
    expect(requester.execute).toHaveBeenCalledTimes(1)
  })
})
