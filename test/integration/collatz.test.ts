import { GraphQLObjectType, print } from 'graphql'
import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../src/index'

const collatzSchema = buildSchema(`
  type Num {
    value: Int!
    add(input: Int! = 1): Num!
    div(input: Int!): Num!
    mult(input: Int!): Num!
    sub(input: Int!): Num!
  }

  type Query {
    getNumber(input: Int!): Num!
  }
`)
const fields = collatzSchema.getQueryType()!.getFields()
fields.getNumber.resolve = (_, { input }) => ({ value: input })
const numberType = collatzSchema.getType('Num')! as GraphQLObjectType
numberType.getFields().add.resolve = ({ value }, { input }) => ({ value: value + input })
numberType.getFields().div.resolve = ({ value }, { input }) => ({ value: Math.floor(value / input) })
numberType.getFields().mult.resolve = ({ value }, { input }) => ({ value: value * input })
numberType.getFields().sub.resolve = ({ value }, { input }) => ({ value: value - input })

// TODO: Performance is not great when querying extremely deep in the tree
// See issue #6
jest.setTimeout(10000)

describe('The Collatz conjecture example', () => {
  const expectedFirstRequest = `\
{
  getNumber_e6e96e2a313bcfc471e29e861bb52eec08b269b5: getNumber(input: 1) {
    value
  }
  getNumber_7573e530abc31249331561cc8398fe9a777914a6: getNumber(input: 2) {
    value
  }
  getNumber_c6878f25e074084c15daf696b7c3e9163d0ca854: getNumber(input: 4) {
    value
  }
  getNumber_f57d96d77ca317fdffbaea09ecc1b37d140e2e5e: getNumber(input: 100) {
    value
  }
  getNumber_354d91734f6d7607a3038b4b29141236d20afc33: getNumber(input: 3711) {
    value
  }
}
`
  let requester: GraphQLAutoRequester
  let query: any
  beforeEach(() => {
    requester = new GraphQLAutoRequester(collatzSchema)
    jest.spyOn(requester, 'execute')
    query = requester.query!
  })

  it('works for the recursive example', async () => {
    const collatzRecursive = async (number: any): Promise<number> => {
      const value = await number.value
      if (value === 1) {
        return 0
      }
      if (value % 2 === 0) {
        return 1 + await collatzRecursive(number.div({ input: 2 }))
      } else {
        return 1 + await collatzRecursive(number.mult({ input: 3 }).add({ input: 1 }))
      }
    }

    await Promise.all([
      expect(collatzRecursive(query.getNumber({ input: 1 }))).resolves.toBe(0),
      expect(collatzRecursive(query.getNumber({ input: 2 }))).resolves.toBe(1),
      expect(collatzRecursive(query.getNumber({ input: 4 }))).resolves.toBe(2),
      expect(collatzRecursive(query.getNumber({ input: 100 }))).resolves.toBe(25),
      expect(collatzRecursive(query.getNumber({ input: 3711 }))).resolves.toBe(237),
    ])

    expect(requester.execute).toHaveBeenCalledTimes(238)
    expect(print((requester.execute as any).mock.calls[0][0])).toBe(expectedFirstRequest)
  })

  it('works for the loop example', async () => {
    const collatzLoop = async (number: any): Promise<number> => {
      let steps
      for (steps = 0; await number.value !== 1; steps++) {
        if (await number.value % 2 === 0) {
          number = number.div({ input: 2 })
        } else {
          number = number.mult({ input: 3 }).add({ input: 1 })
        }
      }
      return steps
    }

    await Promise.all([
      expect(collatzLoop(query.getNumber({ input: 1 }))).resolves.toBe(0),
      expect(collatzLoop(query.getNumber({ input: 2 }))).resolves.toBe(1),
      expect(collatzLoop(query.getNumber({ input: 4 }))).resolves.toBe(2),
      expect(collatzLoop(query.getNumber({ input: 100 }))).resolves.toBe(25),
      expect(collatzLoop(query.getNumber({ input: 3711 }))).resolves.toBe(237),
    ])

    expect(requester.execute).toHaveBeenCalledTimes(238)
    expect(print((requester.execute as any).mock.calls[0][0])).toBe(expectedFirstRequest)
  })
})
