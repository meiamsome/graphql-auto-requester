import { buildSchema, GraphQLObjectType, execute, parse } from 'graphql';
import GraphQLAutoRequester from '../../../src';
import delegate from '../../../src/meta/delegate';

const collatzSchema = buildSchema(`
type Num {
  value: Int!
  add(input: Int! = 1): Num
  div(input: Int!): Num
  mult(input: Int!): Num
  sub(input: Int!): Num
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


const schemaDocument = `
  type Number {
    value: Int!
    add(input: Int! = 1): Number!
    sub(input: Int!): Number!

    multiplyBy10: NonDelegatedType
  }

  type NonDelegatedType {
    number: Number
  }

  type Query {
    nonDelegatedType: NonDelegatedType!
  }
`

const document = parse(`{
  nonDelegatedType {
    number {
      value
      add(input: 100) {
        value
        aliasedSub: sub(input: 10) {
          value
        }
        multiplyBy10 {
          number {
            add(input: 50) {
              value
            }
          }
        }
      }
    }
  }
}`)
const expectedResult = {
  data: {
    nonDelegatedType: {
      number: {
        value: 10,
        add: {
          value: 110,
          aliasedSub: {
            value: 100,
          },
          multiplyBy10: {
            number: {
              add: {
                value: 1150,
              },
            },
          },
        },
      },
    },
  },
}

describe('Use as a schema delegator', () => {
  describe('When not using built in delegation', () => {
    const requester = new GraphQLAutoRequester(collatzSchema)
    jest.spyOn(requester, 'execute')
    const schema = buildSchema(schemaDocument)
    schema.getQueryType().getFields().nonDelegatedType.resolve = () => ({
      number: 10
    })
    const NonDelegatedType = schema.getType('NonDelegatedType') as GraphQLObjectType
    NonDelegatedType.getFields().number.resolve = ({ number }) => {
      return requester.query.getNumber({ input: number })
    }
    const NumberType = schema.getType('Number') as GraphQLObjectType
    NumberType.getFields().multiplyBy10.resolve = async ({ value }) => ({
      number: (await value) * 10
    })

    it('works for document, calling remote schema multiple times', async () => {
      const result = await execute({
        schema,
        document,
      })

      expect(result).toEqual(expectedResult)

      expect(requester.execute).toHaveBeenCalledTimes(4)
    })
  })

  describe('When using built in delegation', () => {
    const requester = new GraphQLAutoRequester(collatzSchema)
    jest.spyOn(requester, 'execute')
    const schema = buildSchema(schemaDocument)
    schema.getQueryType().getFields().nonDelegatedType.resolve = () => ({
      number: 10
    })
    const NonDelegatedType = schema.getType('NonDelegatedType') as GraphQLObjectType
    NonDelegatedType.getFields().number.resolve = ({ number }, args, context, info) => {
      return delegate(requester.query.getNumber({ input: number }), info)
    }
    const NumberType = schema.getType('Number') as GraphQLObjectType
    NumberType.getFields().multiplyBy10.resolve = async ({ value }) => ({
      number: (await value) * 10
    })

    it('works for document, calling remote schema the minimum amount', async () => {
      const result = await execute({
        schema,
        document,
      })

      expect(result).toEqual(expectedResult)

      expect(requester.execute).toHaveBeenCalledTimes(2)
    })
  })
})
