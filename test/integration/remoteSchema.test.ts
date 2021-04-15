import { execute, Kind } from 'graphql'
import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../src/index'

describe('For proxied schemas', () => {
  it('resolves an union multiple times', async () => {
    const schemaDocument = `
      type A {
        value: Int
      }

      union TestUnion = A

      type Query {
        testValue: TestUnion
      }
    `
    const remoteSchema = buildSchema(schemaDocument)
    const remoteFields = remoteSchema.getQueryType()!.getFields()
    remoteFields.testValue.resolve = () => ({
      __typename: 'A',
      value: 10,
    })

    const localSchema = buildSchema(schemaDocument)
    const localFields = localSchema.getQueryType()!.getFields()
    localFields.testValue.resolve = async (parent, args, context, info) => {
      const result = await execute({
        schema: remoteSchema,
        document: {
          kind: Kind.DOCUMENT,
          definitions: [
            info.operation,
          ],
        },
      })
      return result.data[info.fieldName]
    }

    const requester = new GraphQLAutoRequester(localSchema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    const union = await newQuery!.testValue
    await expect(union.value).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves an interface multiple times', async () => {
    const schemaDocument = `
      interface TestInterface {
        value: Int
      }

      type A implements TestInterface {
        value: Int
      }

      type Query {
        testValue: TestInterface
      }
    `
    const remoteSchema = buildSchema(schemaDocument)
    const remoteFields = remoteSchema.getQueryType()!.getFields()
    remoteFields.testValue.resolve = () => ({
      __typename: 'A',
      value: 10,
    })

    const localSchema = buildSchema(schemaDocument)
    const localFields = localSchema.getQueryType()!.getFields()
    localFields.testValue.resolve = async (parent, args, context, info) => {
      const result = await execute({
        schema: remoteSchema,
        document: {
          kind: Kind.DOCUMENT,
          definitions: [
            info.operation,
          ],
        },
      })
      return result.data[info.fieldName]
    }

    const requester = new GraphQLAutoRequester(localSchema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    const union = await newQuery!.testValue
    await expect(union.value).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })
})
