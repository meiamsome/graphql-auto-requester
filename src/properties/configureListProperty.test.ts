import {
  ArgumentNode,
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  SelectionSetNode,
} from 'graphql'
import { graphQLAutoRequesterMeta } from '../ObjectType'
import GraphQLAutoRequester, { AutoGraphQLObjectType } from '..'
import LazyPromise from '../LazyPromise'
import { getInitialSelections, canonicalizeRequestedFields } from '../fragmentTypemap'
import { resolveField } from '../resolveField'

import { configureListProperty } from './configureListProperty'

jest.mock('../LazyPromise')
jest.mock('../fragmentTypemap')
jest.mock('../resolveField')

const propertyName = 'testprop'
const fieldName = 'testfield'

const initialSelectionSet = Symbol('initialSelectionSet')
const canonicalSelectionSet = Symbol('canonicalSelectionSet')

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
    ;(LazyPromise as any).mockClear()
    ;(getInitialSelections as jest.Mock)
      .mockClear()
    ;(getInitialSelections as jest.Mock)
      .mockReturnValue(initialSelectionSet)
    ;(canonicalizeRequestedFields as jest.Mock)
      .mockClear()
    ;(canonicalizeRequestedFields as jest.Mock)
      .mockReturnValue(canonicalSelectionSet)
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
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([1, 2, 3, 'a', null])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        await expect(fn()).resolves.toEqual([1, 2, 3, 'a', null])
        expect(resolveField).toHaveBeenCalledTimes(1)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('Forwards the call to the underlying response', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([1, 2, 3, 'a'])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
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
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue(['A', 'B', null])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        await expect(fn()).resolves.toEqual(['A', 'B', null])
        expect(resolveField).toHaveBeenCalledTimes(1)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('Forwards the call to the underlying response', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue(['A', 'B'])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
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
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject' }, null])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        expect(result[0]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[1]).toBeNull()

        ;(resolveField as any).mockClear()
        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)
        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, underlyingType, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('creates AutoGraphQLObjectType', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject' }, { __typename: 'TestObject' }])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        for (const elem of result) {
          expect(elem).toBeInstanceOf(AutoGraphQLObjectType)
        }

        ;(resolveField as any).mockClear()
        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, underlyingType, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
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
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }, null])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(3)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        expect(result[0]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[1]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[2]).toBeNull()

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, implementingType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)

        ;(canonicalizeRequestedFields as any).mockClear()
        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, implementingType2, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('creates AutoGraphQLObjectType of the right concrete types', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        for (const elem of result) {
          expect(elem).toBeInstanceOf(AutoGraphQLObjectType)
        }

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, implementingType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)

        ;(canonicalizeRequestedFields as any).mockClear()
        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, implementingType2, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
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
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }, null])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(3)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        expect(result[0]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[1]).toBeInstanceOf(AutoGraphQLObjectType)
        expect(result[2]).toBeNull()

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, unionedType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)

        ;(canonicalizeRequestedFields as any).mockClear()
        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, unionedType2, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })
    })

    describe('that are non-null', () => {
      const type = new GraphQLList(new GraphQLNonNull(underlyingType))

      it('creates AutoGraphQLObjectType of the right concrete types', async () => {
        configureListProperty(instance, propertyName, fieldName, type, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue([{ __typename: 'TestObject1' }, { __typename: 'TestObject2' }])
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        for (const elem of result) {
          expect(elem).toBeInstanceOf(AutoGraphQLObjectType)
        }

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[0][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, unionedType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)

        ;(canonicalizeRequestedFields as any).mockClear()
        ;(resolveField as any).mockClear()
        result[1][graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, unionedType2, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })
    })
  })
})
