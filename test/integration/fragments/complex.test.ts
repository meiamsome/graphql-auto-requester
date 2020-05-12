import { GraphQLObjectType } from 'graphql'
import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../../src/index'

describe('Interface & Union & Object Fragments', () => {
  it('fetch correctly', async () => {
    const schema = buildSchema(`
      interface Interface {
        test: Int
      }
      type X implements Interface {
        test: Int
        test2: Int
      }
      type Y implements Interface {
        test: Int
        test3: Int
      }
      type Z {
        test: Int
        test4: Int
      }
      union Union = Y | Z
      type Query {
        testQueryX: X
        testQueryY: Interface
        testQueryZ: Union
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQueryX.resolve = () => ({
      __typename: 'X',
      test: 10,
      test2: 50,
    })
    fields.testQueryY.resolve = () => ({
      __typename: 'Y',
      test: 20,
      test3: 60,
    })
    fields.testQueryZ.resolve = () => ({
      __typename: 'Z',
      test: 30,
      test4: 70,
    })
    const requester = new GraphQLAutoRequester(schema, {
      fragments: `
        fragment interfaceFragment on Interface {
          test
        }
        fragment xFragment on X {
          test2
        }
        fragment yFragment on Y {
          test3
        }
        fragment ZFragment on Z {
          test4
        }
      `
    })
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    const anX = await newQuery.testQueryX
    expect(requester.execute).toHaveBeenCalledTimes(1)

    await expect(anX.test).resolves.toBe(10)
    expect(requester.execute).toHaveBeenCalledTimes(1)
    await expect(anX.test2).resolves.toBe(50)
    expect(requester.execute).toHaveBeenCalledTimes(1)

    const anY = await newQuery.testQueryY
    expect(requester.execute).toHaveBeenCalledTimes(2)

    await expect(anY.test).resolves.toBe(20)
    expect(requester.execute).toHaveBeenCalledTimes(2)
    await expect(anY.test3).resolves.toBe(60)
    expect(requester.execute).toHaveBeenCalledTimes(2)

    const anZ = await newQuery.testQueryZ
    expect(requester.execute).toHaveBeenCalledTimes(3)

    await expect(anZ.test4).resolves.toBe(70)
    expect(requester.execute).toHaveBeenCalledTimes(3)
    await expect(anZ.test).resolves.toBe(30)
    expect(requester.execute).toHaveBeenCalledTimes(4)
  })
})
