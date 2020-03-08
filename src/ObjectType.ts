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
} from 'graphql'
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
      const type = field.type
      let baseType = type
      if (isNonNullType(type)) {
        baseType = type.ofType
      }
      if (isAbstractType(baseType)) {
        this._configureAbstractProperty(fieldName)
      } else if (isLeafType(baseType)) {
        lazyProperty(this, fieldName, () => this.resolveField(fieldName))
      } else if (isListType(baseType)) {
        this._configureListProperty(fieldName, baseType)
      } else if (isObjectType(baseType)) {
        const _baseType: GraphQLObjectType = baseType
        if (isNonNullType(type)) {
          lazyProperty(this, fieldName, () => new AutoGraphQLObjectType(
            parent,
            (selectionSet) => this.resolveField(fieldName, selectionSet),
            _baseType,
          ))
        } else {
          lazyProperty(this, fieldName, async () => {
            const subField = new AutoGraphQLObjectType(
              parent,
              (selectionSet) => this.resolveField(fieldName, selectionSet),
              _baseType,
            )
            const exists = await subField.resolveField('__typename')
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
  }

  _configureAbstractProperty (fieldName: string) {
    lazyProperty(this, fieldName, async () => {
      const { __typename: typeName } = await this.resolveField(fieldName, {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: '__typename',
          },
        }],
      })
      if (!typeName) {
        return typeName
      }

      const concreteType = this.parent.schema.getTypeMap()[typeName] as GraphQLObjectType
      return new AutoGraphQLObjectType(this.parent, (selectionSet) => this.resolveField(fieldName, {
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
      }), concreteType)
    })
  }

  _configureListProperty (fieldName: string, type: GraphQLList<any>) {
    const namedType = getNamedType(type)
    if (isLeafType(namedType)) {
      lazyProperty(this, fieldName, () => this.resolveField(fieldName))
      return
    }
    lazyProperty(this, fieldName, async () => {
      const list = await this.resolveField(fieldName, {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: '__typename',
          },
        }],
      })

      return list && list.map((element: any, index: number) => {
        if (!element) {
          return element
        }
        const concreteType = this.parent.schema.getTypeMap()[element.__typename] as GraphQLObjectType
        return new AutoGraphQLObjectType(this.parent, async (selectionSet) => {
          const result = await this.resolveField(fieldName, {
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
          })
          return result[index]
        }, concreteType)
      })
    })
  }

  async resolveField (fieldName: string, selectionSet?: SelectionSetNode) {
    const result = await this.execute({
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: fieldName,
        },
        selectionSet,
      }],
    })

    return result[fieldName]
  }
}
