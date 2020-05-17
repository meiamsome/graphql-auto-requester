
import {
  ArgumentNode,
  GraphQLObjectType,
  GraphQLInterfaceType,
  SelectionSetNode,
  GraphQLUnionType,
} from 'graphql'
import { graphQLAutoRequesterMeta } from '../ObjectType'
import GraphQLAutoRequester, { AutoGraphQLObjectType } from '..'
import LazyPromise from '../LazyPromise'
import { getInitialSelections, canonicalizeRequestedFields } from '../fragmentTypemap'
import { resolveField } from '../resolveField'

import { configureAbstractProperty } from './configureAbstractProperty'

jest.mock('../LazyPromise')
jest.mock('../fragmentTypemap')
jest.mock('../resolveField')

const propertyName = 'testprop'
const fieldName = 'testfield'

const initialSelectionSet = Symbol('initialSelectionSet')
const canonicalSelectionSet = Symbol('canonicalSelectionSet')

describe('configureAbstractProperty', () => {
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

  describe('For an interface', () => {
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

    describe('that is nullable', () => {
      it('creates AutoGraphQLObjectType of the right concrete type when non-null', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue({ __typename: 'TestObject1' })
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(AutoGraphQLObjectType)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, implementingType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })

      it('resolves to null correctly', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue(null)
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeNull()

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)
      })
    })

    describe('that is non-null', () => {
      it('creates AutoGraphQLObjectType of the right concrete type when non-null', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue({ __typename: 'TestObject1' })
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(AutoGraphQLObjectType)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, implementingType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })

      it('resolves to null correctly', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue(null)
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeNull()

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)
      })
    })
  })

  describe('For a union', () => {
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

    describe('that is nullable', () => {
      it('creates AutoGraphQLObjectType of the right concrete type when non-null', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue({ __typename: 'TestObject1' })
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(AutoGraphQLObjectType)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[graphQLAutoRequesterMeta].execute(selectionSet)
        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, unionedType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })

      it('resolves to null correctly', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue(null)
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeNull()

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)
      })
    })

    describe('that is non-null', () => {
      it('creates AutoGraphQLObjectType of the right concrete type when non-null', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue({ __typename: 'TestObject1' })
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeInstanceOf(AutoGraphQLObjectType)

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        ;(resolveField as any).mockClear()
        result[graphQLAutoRequesterMeta].execute(selectionSet)

        expect(canonicalizeRequestedFields).toHaveBeenCalledWith(underlyingType, unionedType1, selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, canonicalSelectionSet, inputArgs)
      })

      it('resolves to null correctly', async () => {
        configureAbstractProperty(instance, propertyName, fieldName, underlyingType, inputArgs)
        expect(LazyPromise).toHaveBeenCalledTimes(1)
        expect(LazyPromise).toHaveBeenCalledWith(expect.anything())
        expect(instance[propertyName]).toBeInstanceOf(LazyPromise)

        ;(resolveField as jest.Mock).mockResolvedValue(null)
        const fn = (LazyPromise as jest.Mock).mock.calls[0][0]
        const result = await fn()
        expect(result).toBeNull()

        expect(getInitialSelections).toHaveBeenCalledWith(parent, underlyingType)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, initialSelectionSet, inputArgs)
      })
    })
  })
})
