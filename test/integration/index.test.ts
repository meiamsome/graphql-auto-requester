import { GraphQLObjectType } from 'graphql'
import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from '../../src/index'

describe('GraphQLAutoRequester', () => {
  it('resolves a scalar field on Query correctly', async () => {
    const schema = buildSchema(`
      type Query {
        testQuery: Int
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => 10
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')
    await expect(newQuery!.testQuery).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('resolves an error on a scalar field on Query correctly', async () => {
    const schema = buildSchema(`
      type Query {
        testError: Int
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testError.resolve = () => {
      throw new Error('test error')
    }
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testError')
    await expect(newQuery.testError).rejects.toThrow('test error')

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('resolves a scalar field on a non-null correctly', async () => {
    const schema = buildSchema(`
      type Test {
        answer: Int
      }
      type Query {
        testQuery: Test!
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => ({ answer: 10 })
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect(newQuery.testQuery.answer).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('resolves a scalar field on a deep non-null correctly', async () => {
    const schema = buildSchema(`
      type Test {
        answer: Int
        test: Test!
      }
      type Query {
        testQuery: Test!
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => {
      const test: any = {
        answer: 10,
      }
      test.test = test
      return test
    }
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect(newQuery.testQuery.test.test.test.test.answer).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('resolves a scalar field on a nullable field correctly', async () => {
    const schema = buildSchema(`
      type Test {
        answer: Int
      }
      type Query {
        testQuery: Test
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => ({ answer: 10 })
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect((await newQuery.testQuery).answer).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves a null scalar field on a nullable union correctly', async () => {
    const schema = buildSchema(`
      type Test1 {
        answer1: Int
      }
      type Test2 {
        answer2: Int
      }
      union Test = Test1 | Test2
      type Query {
        testQuery: Test
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => null
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect(newQuery.testQuery).resolves.toBe(null)

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('resolves a scalar field on a nullable union correctly', async () => {
    const schema = buildSchema(`
      type Test1 {
        answer1: Int
      }
      type Test2 {
        answer2: Int
      }
      union Test = Test1 | Test2
      type Query {
        testQuery: Test
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => ({
      __typename: 'Test2',
      answer2: 10,
    })
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect((await newQuery.testQuery).answer2).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves a scalar field on a union correctly', async () => {
    const schema = buildSchema(`
      type Test1 {
        answer1: Int
      }
      type Test2 {
        answer2: Int
      }
      union Test = Test1 | Test2
      type Query {
        testQuery: Test!
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => ({
      __typename: 'Test2',
      answer2: 10,
    })
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect((await newQuery.testQuery).answer2).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves a nulled object correctly', async () => {
    const schema = buildSchema(`
      type Test {
        answer: Int
      }
      type Query {
        testQuery: Test
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => null
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    const testQuery = await newQuery.testQuery
    expect(testQuery).toBe(null)

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('resolves a scalar field on a nullable interface correctly', async () => {
    const schema = buildSchema(`
      interface Test {
        answer: Int
      }
      type Test1 implements Test {
        answer: Int
      }
      type Test2 implements Test {
        answer: Int
        test2OnlyField: Int
      }
      type Query {
        testQuery: Test
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => ({
      __typename: 'Test2',
      answer: 10,
      test2OnlyField: 10,
    })
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    const testQuery = await newQuery.testQuery
    expect(testQuery.__typename).toBe('Test2')
    await Promise.all([
      expect(testQuery.answer).resolves.toBe(10),
      expect(testQuery.test2OnlyField).resolves.toBe(10),
    ])

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves a scalar field on an interface correctly', async () => {
    const schema = buildSchema(`
      interface Test {
        answer: Int
      }
      type Test1 implements Test {
        answer: Int
      }
      type Test2 implements Test {
        answer: Int
        test2OnlyField: Int
      }
      type Query {
        testQuery: Test!
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => ({
      __typename: 'Test2',
      answer: 10,
      test2OnlyField: 10,
    })
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    const testQuery = await newQuery.testQuery
    expect(testQuery.__typename).toBe('Test2')
    await Promise.all([
      expect(testQuery.answer).resolves.toBe(10),
      expect(testQuery.test2OnlyField).resolves.toBe(10),
    ])

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves a scalar field on a nullable list of nulls correctly', async () => {
    const schema = buildSchema(`
      type Test {
        answer: Int
      }
      type Query {
        testQuery: [Test]
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => (
      Array.from({ length: 10 }, (_, i) => (i % 2) === 0 ? null : {
        answer: 10 * i,
      })
    )
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    const list = (await newQuery.testQuery)
    expect(list).toHaveLength(10)
    for (let i = 0; i < list.length; i++) {
      const elem = list[i]
      if (elem) {
        await expect(elem.answer).resolves.toBe(10 * i)
      }
    }
    expect(list.filter((x: any) => x)).toHaveLength(5)

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves a scalar field on a nullable list of nullable unions correctly', async () => {
    const schema = buildSchema(`
      type Test1 {
        answer1: Int
      }
      type Test2 {
        answer2: Int
      }
      union Test = Test1 | Test2
      type Query {
        testQuery: [Test]
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => (
      Array.from({ length: 10 }, (_, i) => (i % 2) === 0 ? null : {
        __typename: (i % 4) === 2 ? 'Test2' : 'Test1',
        answer1: 10 * i,
        answer2: 5 * i,
      })
    )
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    const list = (await newQuery.testQuery)
    expect(list).toHaveLength(10)
    expect(list.filter((x: any) => x)).toHaveLength(5)
    for (let i = 0; i < list.length; i++) {
      const elem = list[i]
      if (elem) {
        if (await elem.__typename === 'Test1') {
          await expect(elem.answer1).resolves.toBe(10 * i)
        } else {
          await expect(elem.answer2).resolves.toBe(5 * i)
        }
      }
    }

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('resolves fields in parallel', async () => {
    const schema = buildSchema(`
      type Test {
        test: Test!
        answer: Int
      }
      type Query {
        testQuery: Int
        testError: Int
        getTest: Test!
        maybeGetTest: Test
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.testQuery.resolve = () => 10
    fields.testError.resolve = () => {
      throw new Error('test error')
    }
    fields.getTest.resolve = () => {
      const test: any = {
        answer: 10,
      }
      test.test = test
      return test
    }
    fields.maybeGetTest.resolve = fields.getTest.resolve
    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()

    await Promise.all([
      expect(newQuery.testQuery).resolves.toBe(10),
      expect(newQuery.testError).rejects.toThrow('test error'),
      expect(newQuery.getTest.test.test.test.answer).resolves.toBe(10),
      newQuery.maybeGetTest.then((r: any) => expect(r.test.test.test.answer).resolves.toBe(10)),
    ])

    expect(requester.execute).toHaveBeenCalledTimes(2)
  })

  it('supports arguments to resolve a scalar', async () => {
    const schema = buildSchema(`
      type Query {
        getResult(input: Int!): Int
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.getResult.resolve = (_, { input }) => input * 2

    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query
    expect(newQuery).toBeDefined()

    await Promise.all([
      expect(newQuery.getResult({ input: 5 })).resolves.toBe(10),
      expect(newQuery.getResult({ input: 4 })).resolves.toBe(8),
      expect(() => newQuery.getResult()).toThrow('Invalid value undefined: Expected non-nullable type Int! not to be null'),
    ])

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('supports argument result caching', async () => {
    const schema = buildSchema(`
      type Query {
        getResult(input: Int!): Int
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.getResult.resolve = (_, { input }) => input * 2

    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query
    expect(newQuery).toBeDefined()

    await expect(newQuery.getResult({ input: 5 })).resolves.toBe(10)
    await expect(newQuery.getResult({ input: 5 })).resolves.toBe(10)

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('supports optional arguments', async () => {
    const schema = buildSchema(`
      type Query {
        getResult(input: Int): Int
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.getResult.resolve = (_, { input }) => (input || 4) * 2

    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query
    expect(newQuery).toBeDefined()

    await Promise.all([
      expect(newQuery.getResult({ input: 5 })).resolves.toBe(10),
      expect(newQuery.getResult({ input: 4 })).resolves.toBe(8),
      expect(newQuery.getResult()).resolves.toBe(8),
    ])

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('supports doing some deep queries automatically', async () => {
    const schema = buildSchema(`
      type X {
        value: Int!
        add(input: Int! = 1): X!
        mult(input: Int!): X!
        sub(input: Int!): X!
      }
      type Query {
        getResult(input: Int!): X!
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.getResult.resolve = (_, { input }) => ({ value: input })
    const xType = schema.getType('X')! as GraphQLObjectType
    xType.getFields().add.resolve = ({ value }, { input }) => ({ value: value + input })
    xType.getFields().mult.resolve = ({ value }, { input }) => ({ value: value * input })
    xType.getFields().sub.resolve = ({ value }, { input }) => ({ value: value - input })

    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query
    expect(newQuery).toBeDefined()

    await Promise.all([
      expect(newQuery.getResult({ input: 5 }).value).resolves.toBe(5),
      expect(newQuery.getResult({ input: 4 }).value).resolves.toBe(4),
      expect(
        newQuery
          .getResult({ input: 4 })
          .add({ input: 10 })
          .value
      ).resolves.toBe(14),
      expect(
        newQuery
          .getResult({ input: 4 })
          .mult({ input: 9 })
          .sub({ input: 3 })
          .value
      ).resolves.toBe(33),
      expect(
        newQuery
          .getResult({ input: 4 })
          .add()
          .value
      ).resolves.toBe(5),
    ])

    // This should be covered by the default value case above, not requesting another time
    await expect(
      newQuery
        .getResult({ input: 4 })
        .add({ input: 1 })
        .value
    ).resolves.toBe(5)

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })

  it('supports complex input types', async () => {
    const schema = buildSchema(`
      input Test {
        unrequiredValue: Int
        valueInt: Int!
        valueFloat: Float!
        valueBoolean: Boolean!
        valueString: String!
        optionalObject: Test
      }

      type Query {
        getResult(input: Test!): Boolean
      }
    `)
    const fields = schema.getQueryType()!.getFields()
    fields.getResult.resolve = jest.fn(() => true)

    const requester = new GraphQLAutoRequester(schema)
    jest.spyOn(requester, 'execute')
    const newQuery: any = requester.query
    expect(newQuery).toBeDefined()

    await expect(newQuery.getResult({
      input: {
        valueInt: 5,
        valueFloat: 5.0,
        valueBoolean: true,
        valueString: 'This is a string',
        optionalObject: {
          valueInt: 6,
          valueFloat: 6.1,
          valueBoolean: false,
          valueString: 'This is also a string',
        },
      },
    })).resolves.toBe(true)

    expect(fields.getResult.resolve).toHaveBeenCalledWith(
      undefined,
      {
        input: {
          valueInt: 5,
          valueFloat: 5.0,
          valueBoolean: true,
          valueString: 'This is a string',
          optionalObject: {
            valueInt: 6,
            valueFloat: 6.1,
            valueBoolean: false,
            valueString: 'This is also a string',
          },
        },
      },
      undefined,
      expect.anything(),
    )

    expect(requester.execute).toHaveBeenCalledTimes(1)
  })
})
