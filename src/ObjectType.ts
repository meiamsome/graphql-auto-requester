import {
  getNamedType,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  SelectionSetNode,
  GraphQLList,
  GraphQLObjectType,
  GraphQLField,
  ArgumentNode,
  coerceInputValue,
  astFromValue,
} from 'graphql'
import {
  digest,
} from 'json-hash'

import GraphQLAutoRequester from '.'
import { lazyProperty } from './utils'

export default class AutoGraphQLObjectType {
  execute: (selectionSet: SelectionSetNode) => Promise<any>
  type: GraphQLObjectType
  parent: GraphQLAutoRequester
  __typename: string

  constructor (
    parent: GraphQLAutoRequester,
    execute: (selectionSet: SelectionSetNode) => Promise<any>,
    type: GraphQLObjectType,
  ) {
    this.execute = execute
    this.type = type
    this.parent = parent
    this.__typename = type.name

    for (const [fieldName, field] of Object.entries(this.type.getFields())) {
      if (field.args.length) {
        // @ts-ignore
        this[fieldName] = (args: any = {}) => {
          const inputs: ArgumentNode[] = []
          for (const argument of field.args) {
            if (argument.defaultValue) {
              args[argument.name] = args[argument.name] || argument.defaultValue
            }
            const value = astFromValue(coerceInputValue(args[argument.name], argument.type), argument.type)!
            inputs.push({
              kind: Kind.ARGUMENT,
              name: {
                kind: Kind.NAME,
                value: argument.name,
              },
              value,
            })
          }
          const key = `${fieldName}_${digest(args)}`
          if (!Object.prototype.hasOwnProperty.call(this, key)) {
            this._configureProperty(key, fieldName, field, inputs)
          }
          // @ts-ignore
          return this[key]
        }
      } else {
        this._configureProperty(fieldName, fieldName, field)
      }
    }
  }

  _configureProperty (propertyName: string, fieldName: string, field: GraphQLField<any, any>, args?: ArgumentNode[]) {
    const type = field.type
    let baseType = type
    if (isNonNullType(type)) {
      baseType = type.ofType
    }
    if (isAbstractType(baseType)) {
      this._configureAbstractProperty(propertyName, fieldName, args)
    } else if (isLeafType(baseType)) {
      lazyProperty(this, propertyName, () => this.resolveField(propertyName, fieldName, undefined, args))
    } else if (isListType(baseType)) {
      this._configureListProperty(propertyName, fieldName, baseType, args)
    } else if (isObjectType(baseType)) {
      const _baseType: GraphQLObjectType = baseType
      if (isNonNullType(type)) {
        lazyProperty(this, propertyName, () => new AutoGraphQLObjectType(
          this.parent,
          (selectionSet) => this.resolveField(propertyName, fieldName, selectionSet, args),
          _baseType,
        ))
      } else {
        lazyProperty(this, propertyName, async () => {
          const subField = new AutoGraphQLObjectType(
            this.parent,
            (selectionSet) => this.resolveField(propertyName, fieldName, selectionSet, args),
            _baseType,
          )
          const exists = await subField.resolveField('__typename', '__typename')
          if (!exists) {
            return exists
          }
          return subField
        })
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = baseType
      throw new Error('unreachable code branch')
    }
  }

  _configureAbstractProperty (propertyName: string, fieldName: string, args?: ArgumentNode[]) {
    lazyProperty(this, propertyName, async () => {
      const { __typename: typeName } = await this.resolveField(propertyName, fieldName, {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: '__typename',
          },
        }],
      }, args)
      if (!typeName) {
        return typeName
      }

      const concreteType = this.parent.schema.getTypeMap()[typeName] as GraphQLObjectType
      return new AutoGraphQLObjectType(this.parent, (selectionSet) => this.resolveField(propertyName, fieldName, {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: typeName,
            },
          },
          selectionSet,
        }],
      }, args), concreteType)
    })
  }

  _configureListProperty (propertyName: string, fieldName: string, type: GraphQLList<any>, args?: ArgumentNode[]) {
    const namedType = getNamedType(type)
    if (isLeafType(namedType)) {
      lazyProperty(this, propertyName, () => this.resolveField(propertyName, fieldName, undefined, args))
      return
    }
    lazyProperty(this, propertyName, async () => {
      const list = await this.resolveField(propertyName, fieldName, {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: '__typename',
          },
        }],
      }, args)

      return list && list.map((element: any, index: number) => {
        if (!element) {
          return element
        }
        const concreteType = this.parent.schema.getTypeMap()[element.__typename] as GraphQLObjectType
        return new AutoGraphQLObjectType(this.parent, async (selectionSet) => {
          const result = await this.resolveField(propertyName, fieldName, {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.INLINE_FRAGMENT,
              typeCondition: {
                kind: Kind.NAMED_TYPE,
                name: {
                  kind: Kind.NAME,
                  value: element.__typename,
                },
              },
              selectionSet,
            }],
          }, args)
          return result[index]
        }, concreteType)
      })
    })
  }

  async resolveField (propertyName: string, fieldName: string, selectionSet?: SelectionSetNode, args?: ArgumentNode[]) {
    const result = await this.execute({
      kind: Kind.SELECTION_SET,
      selections: [{
        alias: propertyName !== fieldName ? {
          kind: Kind.NAME,
          value: propertyName,
        } : undefined,
        arguments: args,
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: fieldName,
        },
        selectionSet,
      }],
    })

    return result[propertyName]
  }
}
