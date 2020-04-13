import {
  ArgumentNode,
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  Kind,
  SelectionSetNode,
} from 'graphql'
import { graphQLAutoRequesterMeta } from '../ObjectType'
import GraphQLAutoRequester, { AutoGraphQLObjectType } from '..'
import { lazyProperty } from '../utils'
import { resolveField } from '../resolveField'

import { configureListProperty } from './configureListProperty'

jest.mock('../utils')
jest.mock('../resolveField')

const propertyName = 'testprop'
const fieldName = 'testfield'

describe('configureListProperty', () => {
  const inputArgs: ArgumentNode[] = (Symbol('args') as any) as ArgumentNode[]

  let parent: GraphQLAutoRequester
  let instance: AutoGraphQLObjectType
  beforeEach(() => {
    parent = {
      schema: {
        getTypeMap: jest.fn(),
      },
    } as any as GraphQLAutoRequester
    instance = {
      [graphQLAutoRequesterMeta]: {
        parent,
        execute: jest.fn(),
        type: {} as GraphQLObjectType,
      },
    }
    ;(resolveField as any).mockClear()
    ;(lazyProperty as any).mockClear()
  })

  describe('For a list of scalars', () => {
    const underlyingType = new GraphQLScalarType({
      name: 'TestScalar',
      serialize: x => x,
    })
    describe('that are nullable', () => {
      const type = new GraphQLList(underlyingType)

      it('Forwards the call to the underlying response', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([1, 2, 3, 'a', null])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        await expect(fn()).resolves.toEqual([1, 2, 3, 'a', null])
        expect(resolveField).toHaveBeenCalledTimes(1)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('Forwards the call to the underlying response', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([1, 2, 3, 'a'])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        await expect(fn()).resolves.toEqual([1, 2, 3, 'a'])
        expect(resolveField).toHaveBeenCalledTimes(1)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
      })
    })
  })

  describe('For a list of enums', () => {
    const underlyingType = new GraphQLEnumType({
      name: 'TestEnum',
      values: {
        A: {},
        B: {},
      },
    })
    describe('that are nullable', () => {
      const type = new GraphQLList(underlyingType)

      it('Forwards the call to the underlying response', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue(['A', 'B', null])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        await expect(fn()).resolves.toEqual(['A', 'B', null])
        expect(resolveField).toHaveBeenCalledTimes(1)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('Forwards the call to the underlying response', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue(['A', 'B'])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        await expect(fn()).resolves.toEqual(['A', 'B'])
        expect(resolveField).toHaveBeenCalledTimes(1)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
      })
    })
  })

  describe('For a list of objects', () => {
    const underlyingType = new GraphQLObjectType({
      name: 'TestObject',
      fields: {},
    })

    beforeEach(() => {
      ;(parent.schema.getTypeMap as jest.Mock).mockReturnValue({
        TestObject: underlyingType,
      })
    })

    describe('that are nullable', () => {
      const type = new GraphQLList(underlyingType)

      it('creates AutoGraphQLObjectType when non-null', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject' }, null])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          }],
        }, inputArgs)

        expect(result[0]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[1]).toBeNull()

        ;(resolveField as any).mockClear()
        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject',
              },
            },
            selectionSet,
          }],
        }, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('creates AutoGraphQLObjectType', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject' }, { __typename: 'TestObject' }])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          }],
        }, inputArgs)

        for (const elem of result) {
          expect(elem).toBeInstanceOf(AutoGraphQLObjectType)
        }

        ;(resolveField as any).mockClear()
        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject',
              },
            },
            selectionSet,
          }],
        }, inputArgs)
      })
    })
  })

  describe('For a list of interfaces', () => {
    const underlyingType = new GraphQLInterfaceType({
      name: 'TestInterface',
      fields: {},
    })
    const implementingType1 = new GraphQLObjectType({
      name: 'TestObject1',
      interfaces: [underlyingType],
      fields: {},
    })
    const implementingType2 = new GraphQLObjectType({
      name: 'TestObject2',
      interfaces: [underlyingType],
      fields: {},
    })

    beforeEach(() => {
      ;(parent.schema.getTypeMap as jest.Mock).mockReturnValue({
        TestObject1: implementingType1,
        TestObject2: implementingType2,
      })
    })

    describe('that are nullable', () => {
      const type = new GraphQLList(underlyingType)

      it('creates AutoGraphQLObjectType of the right concrete types when non-null', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }, null])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(3)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          }],
        }, inputArgs)

        expect(result[0]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[1]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[2]).toBeNull()

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject1',
              },
            },
            selectionSet,
          }],
        }, inputArgs)

        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject2',
              },
            },
            selectionSet,
          }],
        }, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('creates AutoGraphQLObjectType of the right concrete types', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          }],
        }, inputArgs)

        for (const elem of result) {
          expect(elem).toBeInstanceOf(AutoGraphQLObjectType)
        }

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject1',
              },
            },
            selectionSet,
          }],
        }, inputArgs)

        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject2',
              },
            },
            selectionSet,
          }],
        }, inputArgs)
      })
    })
  })

  describe('For a list of unions', () => {
    const unionedType1 = new GraphQLObjectType({
      name: 'TestObject1',
      fields: {},
    })
    const unionedType2 = new GraphQLObjectType({
      name: 'TestObject2',
      fields: {},
    })
    const underlyingType = new GraphQLUnionType({
      name: 'TestUnion',
      types: [unionedType1, unionedType2],
    })

    beforeEach(() => {
      ;(parent.schema.getTypeMap as jest.Mock).mockReturnValue({
        TestObject1: unionedType1,
        TestObject2: unionedType2,
      })
    })

    describe('that are nullable', () => {
      const type = new GraphQLList(underlyingType)

      it('creates AutoGraphQLObjectType of the right concrete types when non-null', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }, null])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(3)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          }],
        }, inputArgs)

        expect(result[0]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[1]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[2]).toBeNull()

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject1',
              },
            },
            selectionSet,
          }],
        }, inputArgs)

        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject2',
              },
            },
            selectionSet,
          }],
        }, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('creates AutoGraphQLObjectType of the right concrete types', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }])
        const fn = (lazyProperty as jest.Mock).mock.calls[0][2]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          }],
        }, inputArgs)

        for (const elem of result) {
          expect(elem).toBeInstanceOf(AutoGraphQLObjectType)
        }

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject1',
              },
            },
            selectionSet,
          }],
        }, inputArgs)

        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, {
          kind: Kind.SELECTION_SET,
          selections: [{
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: 'TestObject2',
              },
            },
            selectionSet,
          }],
        }, inputArgs)
      })
    })
  })
})
