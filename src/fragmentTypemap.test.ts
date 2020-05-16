import { buildSchema, Kind, GraphQLObjectType, SelectionSetNode, GraphQLCompositeType } from 'graphql'

import {
  parseTypeMapFromGraphQLDocument,
  getRelatedFragments,
  getInitialSelections,
  canonicalizeRequestedFields,
} from './fragmentTypemap'
import GraphQLAutoRequester from '.'

const schema = buildSchema(`
  scalar Scalar

  interface Inter {
    interfaceField: Int
  }

  interface Inter2 {
    interfaceField: Int
  }

  type X implements Inter & Inter2 {
    test: Int
    interfaceField: Int
    fieldWithAnArgument(argument: Int): Int
  }

  union Union = X

  type Query {
    field: Int
  }
`)

describe('parseTypeMapFromGraphQLDocument', () => {
  it('prevents a document that contains non-fragments.', () => {
    expect(() => parseTypeMapFromGraphQLDocument(schema, `
      query {
        field
      }
    `)).toThrow('The provided GraphQL document contained items that weren\'t fragments.')
  })

  it('prevents a fragment on a non-existing type.', () => {
    expect(() => parseTypeMapFromGraphQLDocument(schema, `
      fragment fakeFragment on FakeType {
        field
      }
    `)).toThrow('Unknown type "FakeType".')
  })

  it('prevents a fragment on a scalar', () => {
    expect(() => parseTypeMapFromGraphQLDocument(schema, `
      fragment unionFragment on Scalar {
        field
      }
    `)).toThrow('Fragment "unionFragment" cannot condition on non composite type "Scalar".')
  })

  it('prevents a fragment on a union', () => {
    expect(() => parseTypeMapFromGraphQLDocument(schema, `
      fragment unionFragment on Union {
        field
      }
    `)).toThrow('You cannot add a preload fragment to the Union type Union.')
  })

  it('prevents a fragment with a spread', () => {
    expect(() => parseTypeMapFromGraphQLDocument(schema, `
      fragment xFragment on X {
        ... on Inter {
          interfaceField
        }
      }
    `)).toThrow('You cannot include an inline spread in a preload. Found in type X.')
  })

  it('prevents a fragment with an aliased field', () => {
    expect(() => parseTypeMapFromGraphQLDocument(schema, `
      fragment xFragment on X {
        alias: test
      }
    `)).toThrow('X.test must not have an alias.')
  })

  it('prevents a fragment with an implemented field', () => {
    expect(() => parseTypeMapFromGraphQLDocument(schema, `
      fragment xFragment on X {
        interfaceField
      }
    `)).toThrow('X.interfaceField must not appear in this preload as it is from one or more interfaces.')
  })

  it('parses a list of fragments', () => {
    expect(parseTypeMapFromGraphQLDocument(schema, `
      fragment xFragment on X {
        test
      }
    `)).toEqual({
      X: {
        kind: Kind.SELECTION_SET,
        selections: [expect.objectContaining({
          kind: Kind.FIELD,
          name: expect.objectContaining({
            kind: Kind.NAME,
            value: 'test',
          }),
        })],
      },
    })
  })

  describe('for a field with arguments', () => {
    it('permits a fragment with arguments', () => {
      expect(parseTypeMapFromGraphQLDocument(schema, `
        fragment xFragment on X {
          fieldWithAnArgument(argument: 100)
        }
      `)).toEqual({
        X: {
          kind: Kind.SELECTION_SET,
          selections: [expect.objectContaining({
            kind: Kind.FIELD,
            alias: expect.objectContaining({
              kind: Kind.NAME,
              value: 'fieldWithAnArgument_e51c8e76f47873b9bd3540b2e6807c1b098c2e5d',
            }),
            arguments: [expect.objectContaining({
              kind: Kind.ARGUMENT,
              name: expect.objectContaining({
                kind: Kind.NAME,
                value: 'argument',
              }),
              value: expect.objectContaining({
                kind: Kind.INT,
                value: '100',
              }),
            })],
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: 'fieldWithAnArgument',
            }),
          })],
        },
      })
    })

    it('permits a fragment without arguments if permitted', () => {
      expect(parseTypeMapFromGraphQLDocument(schema, `
        fragment xFragment on X {
          fieldWithAnArgument
        }
      `)).toEqual({
        X: {
          kind: Kind.SELECTION_SET,
          selections: [expect.objectContaining({
            kind: Kind.FIELD,
            alias: expect.objectContaining({
              kind: Kind.NAME,
              value: 'fieldWithAnArgument_bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f',
            }),
            arguments: [expect.objectContaining({
              kind: Kind.ARGUMENT,
              name: expect.objectContaining({
                kind: Kind.NAME,
                value: 'argument',
              }),
              value: expect.objectContaining({
                kind: Kind.NULL,
              }),
            })],
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: 'fieldWithAnArgument',
            }),
          })],
        },
      })
    })

    it('permits a fragment with multiple entries for the same field', () => {
      expect(parseTypeMapFromGraphQLDocument(schema, `
        fragment xFragment on X {
          fieldWithAnArgument
          fieldWithAnArgument(argument: 100)
        }
      `)).toEqual({
        X: {
          kind: Kind.SELECTION_SET,
          selections: [
            expect.objectContaining({
              kind: Kind.FIELD,
              alias: expect.objectContaining({
                kind: Kind.NAME,
                value: 'fieldWithAnArgument_bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f',
              }),
              arguments: [expect.objectContaining({
                kind: Kind.ARGUMENT,
                name: expect.objectContaining({
                  kind: Kind.NAME,
                  value: 'argument',
                }),
                value: expect.objectContaining({
                  kind: Kind.NULL,
                }),
              })],
              name: expect.objectContaining({
                kind: Kind.NAME,
                value: 'fieldWithAnArgument',
              }),
            }),
            expect.objectContaining({
              kind: Kind.FIELD,
              alias: expect.objectContaining({
                kind: Kind.NAME,
                value: 'fieldWithAnArgument_e51c8e76f47873b9bd3540b2e6807c1b098c2e5d',
              }),
              arguments: [expect.objectContaining({
                kind: Kind.ARGUMENT,
                name: expect.objectContaining({
                  kind: Kind.NAME,
                  value: 'argument',
                }),
                value: expect.objectContaining({
                  kind: Kind.INT,
                  value: '100',
                }),
              })],
              name: expect.objectContaining({
                kind: Kind.NAME,
                value: 'fieldWithAnArgument',
              }),
            }),
          ],
        },
      })
    })
  })
})

describe('getRelatedFragments', () => {
  it('gets a blank selection set if not in typemap', () => {
    expect(getRelatedFragments(schema, {}, 'X')).toEqual({
      kind: Kind.SELECTION_SET,
      selections: [],
    })
  })

  it('errors for scalars', () => {
    expect(() => getRelatedFragments(schema, {}, 'Scalar'))
      .toThrow('getRelatedFragments is only valid for composite types')
  })

  describe('with an object fragment', () => {
    const typeMap = {
      X: {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'test',
          },
        }],
      },
    }

    it('gets an object\'s own map', () => {
      expect(getRelatedFragments(schema, typeMap, 'X')).toEqual({
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'test',
          },
        }],
      })
    })

    it('gets an object\'s map in the interface', () => {
      expect(getRelatedFragments(schema, typeMap, 'Inter')).toEqual({
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'X',
            },
          },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'test',
              },
            }],
          },
        }],
      })
    })

    it('gets an object\'s map in the union', () => {
      expect(getRelatedFragments(schema, typeMap, 'Union')).toEqual({
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'X',
            },
          },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'test',
              },
            }],
          },
        }],
      })
    })
  })
})

describe('getInitialSelections', () => {
  it('gets __typename only with no typemap', () => {
    expect(getInitialSelections(
      {
        fragmentTypemap: {},
        schema,
      } as GraphQLAutoRequester,
      schema.getType('X') as GraphQLObjectType,
    )).toEqual({
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      }],
    })
  })
})

describe('canonicalizeRequestedFields', () => {
  it('returns the selectionSet if the types match', () => {
    const type = schema.getType('X') as GraphQLObjectType
    const selectionSet = Symbol('selectionSet') as any as SelectionSetNode
    expect(canonicalizeRequestedFields(type, type, selectionSet))
      .toBe(selectionSet)
  })

  it('moves interface field up to the interface level', () => {
    const rootType = schema.getType('Inter') as GraphQLCompositeType
    const concreteType = schema.getType('X') as GraphQLObjectType
    const selectionSet = {
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'test',
        },
      }, {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'interfaceField',
        },
      }],
    }
    expect(canonicalizeRequestedFields(rootType, concreteType, selectionSet))
      .toEqual({
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'interfaceField',
          },
          selectionSet: undefined,
        }, {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'X',
            },
          },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'test',
              },
              selectionSet: undefined,
            }],
          },
        }],
      })
  })

  it('moves interface field up to the interface level on a union field', () => {
    const rootType = schema.getType('Union') as GraphQLCompositeType
    const concreteType = schema.getType('X') as GraphQLObjectType
    const selectionSet = {
      kind: Kind.SELECTION_SET,
      selections: [{
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'test',
        },
      }, {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'interfaceField',
        },
      }],
    }
    expect(canonicalizeRequestedFields(rootType, concreteType, selectionSet))
      .toEqual({
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'Inter',
            },
          },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'interfaceField',
              },
              selectionSet: undefined,
            }],
          },
        }, {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'Inter2',
            },
          },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'interfaceField',
              },
              selectionSet: undefined,
            }],
          },
        }, {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'X',
            },
          },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'test',
              },
              selectionSet: undefined,
            }],
          },
        }],
      })
  })
})
