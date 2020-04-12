import { GraphQLScalarType, GraphQLField, GraphQLArgument, GraphQLNonNull, GraphQLEnumType, GraphQLObjectType, GraphQLInterfaceType, GraphQLUnionType, ArgumentNode, GraphQLList, SelectionSetNode, GraphQLOutputType } from 'graphql'

import AutoGraphQLObjectType, { graphQLAutoRequesterMeta } from '../ObjectType'
import { lazyProperty } from '../utils'
import { resolveField } from '../resolveField'
import { configureAbstractProperty } from './configureAbstractProperty'
import { configureListProperty } from './configureListProperty'

import { configureProperty } from './configureProperty'
import GraphQLAutoRequester from '..'

jest.mock('../utils')
jest.mock('../resolveField')
jest.mock('./configureAbstractProperty')
jest.mock('./configureListProperty')

const propertyName = 'testprop'
const fieldName = 'testfield'

describe('configureProperty', () => {
  let parent: GraphQLAutoRequester
  let instance: AutoGraphQLObjectType
  beforeEach(() => {
    parent = {} as GraphQLAutoRequester
    instance = {
      [graphQLAutoRequesterMeta]: {
        parent,
        execute: jest.fn(),
        type: {} as GraphQLObjectType,
      },
    }
    ;(resolveField as any).mockClear()
    ;(lazyProperty as any).mockClear()
    ;(configureAbstractProperty as any).mockClear()
    ;(configureListProperty as any).mockClear()
  })

  const args: GraphQLArgument[] = []
  const inputArgs: ArgumentNode[] = (Symbol('args') as any) as ArgumentNode[]
  describe('For a scalar type', () => {
    const type = new GraphQLScalarType({
      name: 'TestScalar',
      serialize: (x) => x,
    })

    it('sets a lazy property for null', () => {
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type,
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(lazyProperty).toHaveBeenCalledTimes(1)
      expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

      const result = Symbol('result')
      ;(resolveField as any).mockReturnValueOnce(result)
      const fieldResult = (lazyProperty as jest.Mock).mock.calls[0][2]()
      expect(fieldResult).toBe(result)
      expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
    })

    it('sets a lazy property for non-null', () => {
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type: new GraphQLNonNull(type),
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(lazyProperty).toHaveBeenCalledTimes(1)
      expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

      const result = Symbol('result')
      ;(resolveField as any).mockReturnValueOnce(result)
      const fieldResult = (lazyProperty as jest.Mock).mock.calls[0][2]()
      expect(fieldResult).toBe(result)
      expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
    })
  })

  describe('For an enum type', () => {
    const type = new GraphQLEnumType({
      name: 'TestEnum',
      values: {},
    })

    it('sets a lazy property for null', () => {
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type,
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(lazyProperty).toHaveBeenCalledTimes(1)
      expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

      const result = Symbol('result')
      ;(resolveField as any).mockReturnValueOnce(result)
      const fieldResult = (lazyProperty as jest.Mock).mock.calls[0][2]()
      expect(fieldResult).toBe(result)
      expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
    })

    it('sets a lazy property for non-null', () => {
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type: new GraphQLNonNull(type),
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(lazyProperty).toHaveBeenCalledTimes(1)
      expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

      const result = Symbol('result')
      ;(resolveField as any).mockReturnValueOnce(result)
      const fieldResult = (lazyProperty as jest.Mock).mock.calls[0][2]()
      expect(fieldResult).toBe(result)
      expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, undefined, inputArgs)
    })
  })

  describe('For an object type', () => {
    const type = new GraphQLObjectType({
      name: 'TestObject',
      fields: {},
    })

    describe('when nullable', () => {
      it('sets a lazy property for nullable that requires await, and returns null if it is null', async () => {
        const field: GraphQLField<any, any> = {
          args,
          description: '',
          extensions: undefined,
          name: fieldName,
          type,
        }
        configureProperty(instance, propertyName, fieldName, field, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        ;(resolveField as any).mockReturnValueOnce(null)

        const fieldResultPromise = (lazyProperty as jest.Mock).mock.calls[0][2]()
        await expect(fieldResultPromise).resolves.toBeNull()
        expect(resolveField).toHaveBeenCalledWith(expect.anything(), '__typename', '__typename', undefined, undefined)
        const subAutoGraphQLObjectType = (resolveField as jest.Mock).mock.calls[0][0] as AutoGraphQLObjectType
        ;(resolveField as any).mockClear()

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        subAutoGraphQLObjectType[graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, selectionSet, inputArgs)
      })

      it('sets a lazy property for nullable that requires await', async () => {
        const field: GraphQLField<any, any> = {
          args,
          description: '',
          extensions: undefined,
          name: fieldName,
          type,
        }
        configureProperty(instance, propertyName, fieldName, field, inputArgs)
        expect(lazyProperty).toHaveBeenCalledTimes(1)
        expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

        const typename = Symbol('result')
        ;(resolveField as any).mockReturnValueOnce(typename)

        const fieldResultPromise = (lazyProperty as jest.Mock).mock.calls[0][2]()
        await expect(fieldResultPromise).resolves.toBeInstanceOf(AutoGraphQLObjectType)
        const fieldResult = await fieldResultPromise
        expect(resolveField).toHaveBeenCalledWith(fieldResult, '__typename', '__typename', undefined, undefined)

        ;(resolveField as any).mockClear()
        const subAutoGraphQLObjectType = fieldResult as AutoGraphQLObjectType

        const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
        subAutoGraphQLObjectType[graphQLAutoRequesterMeta].execute(selectionSet)
        expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, selectionSet, inputArgs)
      })
    })

    it('sets a lazy property for non-null that does not call out to the network', () => {
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type: new GraphQLNonNull(type),
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(lazyProperty).toHaveBeenCalledTimes(1)
      expect(lazyProperty).toHaveBeenCalledWith(instance, propertyName, expect.anything())

      const result = Symbol('result')
      ;(resolveField as any).mockReturnValueOnce(result)
      const fieldResult = (lazyProperty as jest.Mock).mock.calls[0][2]()
      expect(fieldResult).toBeInstanceOf(AutoGraphQLObjectType)
      expect(resolveField).not.toHaveBeenCalled()

      const subAutoGraphQLObjectType = fieldResult as AutoGraphQLObjectType

      const selectionSet: SelectionSetNode = Symbol('selectionSet') as any as SelectionSetNode
      subAutoGraphQLObjectType[graphQLAutoRequesterMeta].execute(selectionSet)
      expect(resolveField).toHaveBeenCalledWith(instance, propertyName, fieldName, selectionSet, inputArgs)
    })
  })

  describe('For an interface type', () => {
    const type = new GraphQLInterfaceType({
      name: 'TestInterface',
      fields: {},
    })

    it('defers to configureAbstractProperty', () => {
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type,
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(configureAbstractProperty).toHaveBeenCalledTimes(1)
      expect(configureAbstractProperty).toHaveBeenCalledWith(instance, propertyName, fieldName, inputArgs)
    })
  })

  describe('For an union type', () => {
    const type = new GraphQLUnionType({
      name: 'TestInterface',
      types: [],
    })

    it('defers to configureAbstractProperty', () => {
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type,
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(configureAbstractProperty).toHaveBeenCalledTimes(1)
      expect(configureAbstractProperty).toHaveBeenCalledWith(instance, propertyName, fieldName, inputArgs)
    })
  })

  describe('For a list type', () => {
    const underlyingType = new GraphQLEnumType({
      name: 'TestEnum',
      values: {},
    })

    it('defers to configureAbstractProperty', () => {
      const type = new GraphQLList(underlyingType)
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type,
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(configureListProperty).toHaveBeenCalledTimes(1)
      expect(configureListProperty).toHaveBeenCalledWith(instance, propertyName, fieldName, type, inputArgs)
    })

    it('defers to configureAbstractProperty when non-null', () => {
      const listType = new GraphQLList(underlyingType)
      const type = new GraphQLNonNull(listType)
      const field: GraphQLField<any, any> = {
        args,
        description: '',
        extensions: undefined,
        name: fieldName,
        type,
      }
      configureProperty(instance, propertyName, fieldName, field, inputArgs)
      expect(configureListProperty).toHaveBeenCalledTimes(1)
      expect(configureListProperty).toHaveBeenCalledWith(instance, propertyName, fieldName, listType, inputArgs)
    })
  })

  it('throws an error for an invalid type', () => {
    const field: GraphQLField<any, any> = {
      args,
      description: '',
      extensions: undefined,
      name: fieldName,
      type: null as any as GraphQLOutputType,
    }
    expect(() => configureProperty(instance, '', '', field)).toThrowError('unreachable code branch')
  })
})
