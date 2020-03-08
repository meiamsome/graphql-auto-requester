import { buildSchema } from 'graphql/utilities'

import GraphQLAutoRequester from './index'

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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')
    await expect(newQuery!.testQuery).resolves.toBe(10)

    expect(requester._executionCount).toBe(1)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testError')
    await expect(newQuery.testError).rejects.toThrow('test error')

    expect(requester._executionCount).toBe(1)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect(newQuery.testQuery.answer).resolves.toBe(10)

    expect(requester._executionCount).toBe(1)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect(newQuery.testQuery.test.test.test.test.answer).resolves.toBe(10)

    expect(requester._executionCount).toBe(1)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect((await newQuery.testQuery).answer).resolves.toBe(10)

    expect(requester._executionCount).toBe(2)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect((await newQuery.testQuery).answer2).resolves.toBe(10)

    expect(requester._executionCount).toBe(2)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    await expect((await newQuery.testQuery).answer2).resolves.toBe(10)

    expect(requester._executionCount).toBe(2)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    const testQuery = await newQuery.testQuery
    expect(testQuery.__typename).toBe('Test2')
    await Promise.all([
      expect(testQuery.answer).resolves.toBe(10),
      expect(testQuery.test2OnlyField).resolves.toBe(10),
    ])

    expect(requester._executionCount).toBe(2)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()
    expect(newQuery).toHaveProperty('testQuery')

    const testQuery = await newQuery.testQuery
    expect(testQuery.__typename).toBe('Test2')
    await Promise.all([
      expect(testQuery.answer).resolves.toBe(10),
      expect(testQuery.test2OnlyField).resolves.toBe(10),
    ])

    expect(requester._executionCount).toBe(2)
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

    // TODO: This should only need 2 requests, with a data caching solution
    expect(requester._executionCount).toBe(6)
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

    // TODO: This should only need 3 requests, with a data caching solution
    expect(requester._executionCount).toBe(6)
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
    const newQuery: any = requester.query

    expect(newQuery).toBeDefined()

    await Promise.all([
      expect(newQuery.testQuery).resolves.toBe(10),
      expect(newQuery.testError).rejects.toThrow('test error'),
      expect(newQuery.getTest.test.test.test.answer).resolves.toBe(10),
      newQuery.maybeGetTest.then((r: any) => expect(r.test.test.test.answer).resolves.toBe(10)),
    ])

    expect(requester._executionCount).toBe(2)
  })
})
