import { parse, GraphQLResolveInfo, buildSchema, GraphQLOutputType, OperationDefinitionNode, Kind, FieldNode, GraphQLObjectType, FragmentDefinitionNode } from 'graphql'

import delegate from './delegate'
import GraphQLAutoRequester, { AutoGraphQLObjectType } from '..'
import { graphQLAutoRequesterMeta } from '../ObjectType'
import { GraphQLFragmentTypeMap } from '../fragmentTypemap'

const upstreamSchema = buildSchema(`
  type Type {
    testSubField: Int
    testDeepField: Type
    fieldWithAnArgument(arg: Int): Int
  }
  type Query {
    testField: Type
  }
`)
const downstreamSchema = buildSchema(`
  type TypeHasADifferentName {
    testSubField: Int
    testDeepField: TypeHasADifferentName
    fieldWithAnArgument(arg: Int): Int

    testFieldThatExtendsUnderlyingField: Int
  }
  type Query {
    testField: TypeHasADifferentName
  }
`)

describe('delegate', () => {
  it('delegates a simple document', async () => {
    const document = parse(`
      {
        testField {
          testSubField
          testDeepField {
            testSubField
          }
        }
      }
    `)

    const fieldNode = (document.definitions[0] as OperationDefinitionNode)
      .selectionSet
      .selections
      .find((selection) => selection.kind === Kind.FIELD && selection.name.value === 'testField') as FieldNode

    const instance: AutoGraphQLObjectType = {
      [graphQLAutoRequesterMeta]: {
        execute: jest.fn(),
        parent: {
          fragmentTypemap: {},
          schema: upstreamSchema,
        } as GraphQLAutoRequester,
        type: upstreamSchema.getType('Type')! as GraphQLObjectType,
      },
    }

    const info: GraphQLResolveInfo = {
      fieldName: 'testField',
      fragments: {},
      fieldNodes: [
        fieldNode,
      ],
      parentType: downstreamSchema.getQueryType(),
      returnType: downstreamSchema.getType('TypeHasADifferentName') as GraphQLOutputType,
      schema: downstreamSchema,
    } as any as GraphQLResolveInfo

    // Executed in the `testField` resolver on the outer schema
    await expect(delegate(instance, info)).resolves.toBe(instance)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect((instance[graphQLAutoRequesterMeta].execute as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({
      kind: Kind.SELECTION_SET,
      selections: [expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: '__typename',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testSubField',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testDeepField',
        }),
        selectionSet: expect.objectContaining({
          kind: Kind.SELECTION_SET,
          selections: [expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: '__typename',
            }),
            selectionSet: undefined,
          }), expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: 'testSubField',
            }),
            selectionSet: undefined,
          })],
        }),
      })],
    }))
  })

  it('does not delegate extended fields', async () => {
    const document = parse(`
      {
        testField {
          testFieldThatExtendsUnderlyingField
        }
      }
    `)

    const fieldNode = (document.definitions[0] as OperationDefinitionNode)
      .selectionSet
      .selections
      .find((selection) => selection.kind === Kind.FIELD && selection.name.value === 'testField') as FieldNode

    const instance: AutoGraphQLObjectType = {
      [graphQLAutoRequesterMeta]: {
        execute: jest.fn(),
        parent: {
          fragmentTypemap: {},
          schema: upstreamSchema,
        } as GraphQLAutoRequester,
        type: upstreamSchema.getType('Type')! as GraphQLObjectType,
      },
    }

    const info: GraphQLResolveInfo = {
      fieldName: 'testField',
      fragments: {},
      fieldNodes: [
        fieldNode,
      ],
      parentType: downstreamSchema.getQueryType(),
      returnType: downstreamSchema.getType('TypeHasADifferentName') as GraphQLOutputType,
      schema: downstreamSchema,
    } as any as GraphQLResolveInfo

    // Executed in the `testField` resolver on the outer schema
    await expect(delegate(instance, info)).resolves.toBe(instance)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect((instance[graphQLAutoRequesterMeta].execute as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({
      kind: Kind.SELECTION_SET,
      selections: [expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: '__typename',
        }),
        selectionSet: undefined,
      })],
    }))
  })

  it('unrolls fragments', async () => {
    const document = parse(`
      {
        testField {
          testSubField
          ...X
        }
      }
      fragment X on TypeHasADifferentName {
        testDeepField {
          testSubField
        }
      }
    `)

    const fieldNode = (document.definitions[0] as OperationDefinitionNode)
      .selectionSet
      .selections
      .find((selection) => selection.kind === Kind.FIELD && selection.name.value === 'testField') as FieldNode

    const instance: AutoGraphQLObjectType = {
      [graphQLAutoRequesterMeta]: {
        execute: jest.fn(),
        parent: {
          fragmentTypemap: {},
          schema: upstreamSchema,
        } as GraphQLAutoRequester,
        type: upstreamSchema.getType('Type')! as GraphQLObjectType,
      },
    }

    const info: GraphQLResolveInfo = {
      fieldName: 'testField',
      fragments: {
        X: document.definitions[1] as FragmentDefinitionNode,
      },
      fieldNodes: [
        fieldNode,
      ],
      parentType: downstreamSchema.getQueryType(),
      returnType: downstreamSchema.getType('TypeHasADifferentName') as GraphQLOutputType,
      schema: downstreamSchema,
    } as any as GraphQLResolveInfo

    // Executed in the `testField` resolver on the outer schema
    await expect(delegate(instance, info)).resolves.toBe(instance)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect((instance[graphQLAutoRequesterMeta].execute as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({
      kind: Kind.SELECTION_SET,
      selections: [expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: '__typename',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testSubField',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testDeepField',
        }),
        selectionSet: expect.objectContaining({
          kind: Kind.SELECTION_SET,
          selections: [expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: '__typename',
            }),
            selectionSet: undefined,
          }), expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: 'testSubField',
            }),
            selectionSet: undefined,
          })],
        }),
      })],
    }))
  })

  it('discards aliases', async () => {
    const document = parse(`
      {
        testField {
          testSubField
          anAliasIsHere: testDeepField {
            testSubField
          }
        }
      }
    `)

    const fieldNode = (document.definitions[0] as OperationDefinitionNode)
      .selectionSet
      .selections
      .find((selection) => selection.kind === Kind.FIELD && selection.name.value === 'testField') as FieldNode

    const instance: AutoGraphQLObjectType = {
      [graphQLAutoRequesterMeta]: {
        execute: jest.fn(),
        parent: {
          fragmentTypemap: {},
          schema: upstreamSchema,
        } as GraphQLAutoRequester,
        type: upstreamSchema.getType('Type')! as GraphQLObjectType,
      },
    }

    const info: GraphQLResolveInfo = {
      fieldName: 'testField',
      fragments: {},
      fieldNodes: [
        fieldNode,
      ],
      parentType: downstreamSchema.getQueryType(),
      returnType: downstreamSchema.getType('TypeHasADifferentName') as GraphQLOutputType,
      schema: downstreamSchema,
    } as any as GraphQLResolveInfo

    // Executed in the `testField` resolver on the outer schema
    await expect(delegate(instance, info)).resolves.toBe(instance)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect((instance[graphQLAutoRequesterMeta].execute as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({
      kind: Kind.SELECTION_SET,
      selections: [expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: '__typename',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testSubField',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testDeepField',
        }),
        selectionSet: expect.objectContaining({
          kind: Kind.SELECTION_SET,
          selections: [expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: '__typename',
            }),
            selectionSet: undefined,
          }), expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: 'testSubField',
            }),
            selectionSet: undefined,
          })],
        }),
      })],
    }))
  })

  it('adds computed alias for field with arguments', async () => {
    const document = parse(`
      {
        testField {
          fieldWithAnArgument(arg: 10)
        }
      }
    `)

    const fieldNode = (document.definitions[0] as OperationDefinitionNode)
      .selectionSet
      .selections
      .find((selection) => selection.kind === Kind.FIELD && selection.name.value === 'testField') as FieldNode

    const instance: AutoGraphQLObjectType = {
      [graphQLAutoRequesterMeta]: {
        execute: jest.fn(),
        parent: {
          fragmentTypemap: {},
          schema: upstreamSchema,
        } as GraphQLAutoRequester,
        type: upstreamSchema.getType('Type')! as GraphQLObjectType,
      },
    }

    const info: GraphQLResolveInfo = {
      fieldName: 'testField',
      fragments: {},
      fieldNodes: [
        fieldNode,
      ],
      parentType: downstreamSchema.getQueryType(),
      returnType: downstreamSchema.getType('TypeHasADifferentName') as GraphQLOutputType,
      schema: downstreamSchema,
    } as any as GraphQLResolveInfo

    // Executed in the `testField` resolver on the outer schema
    await expect(delegate(instance, info)).resolves.toBe(instance)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect((instance[graphQLAutoRequesterMeta].execute as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({
      kind: Kind.SELECTION_SET,
      selections: [expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: '__typename',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        alias: expect.objectContaining({
          kind: Kind.NAME,
          value: 'fieldWithAnArgument_07db6271e31540a21deba8158670c9f04467aa0e',
        }),
        arguments: [expect.objectContaining({
          kind: Kind.ARGUMENT,
          name: expect.objectContaining({
            kind: Kind.NAME,
            value: 'arg',
          }),
          value: expect.objectContaining({
            kind: Kind.INT,
            value: '10',
          }),
        })],
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'fieldWithAnArgument',
        }),
        selectionSet: undefined,
      })],
    }))
  })

  it('resolves variables inline', async () => {
    const document = parse(`
      query test($arg: Int) {
        testField {
          fieldWithAnArgument(arg: $arg)
        }
      }
    `)

    const fieldNode = (document.definitions[0] as OperationDefinitionNode)
      .selectionSet
      .selections
      .find((selection) => selection.kind === Kind.FIELD && selection.name.value === 'testField') as FieldNode

    const instance: AutoGraphQLObjectType = {
      [graphQLAutoRequesterMeta]: {
        execute: jest.fn(),
        parent: {
          fragmentTypemap: {},
          schema: upstreamSchema,
        } as GraphQLAutoRequester,
        type: upstreamSchema.getType('Type')! as GraphQLObjectType,
      },
    }

    const info: GraphQLResolveInfo = {
      fieldName: 'testField',
      fragments: {},
      fieldNodes: [
        fieldNode,
      ],
      parentType: downstreamSchema.getQueryType(),
      returnType: downstreamSchema.getType('TypeHasADifferentName') as GraphQLOutputType,
      schema: downstreamSchema,
      variableValues: {
        arg: 10,
      },
    } as any as GraphQLResolveInfo

    // Executed in the `testField` resolver on the outer schema
    await expect(delegate(instance, info)).resolves.toBe(instance)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect((instance[graphQLAutoRequesterMeta].execute as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({
      kind: Kind.SELECTION_SET,
      selections: [expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: '__typename',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        alias: expect.objectContaining({
          kind: Kind.NAME,
          value: 'fieldWithAnArgument_07db6271e31540a21deba8158670c9f04467aa0e',
        }),
        arguments: [expect.objectContaining({
          kind: Kind.ARGUMENT,
          name: expect.objectContaining({
            kind: Kind.NAME,
            value: 'arg',
          }),
          value: expect.objectContaining({
            kind: Kind.INT,
            value: '10',
          }),
        })],
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'fieldWithAnArgument',
        }),
        selectionSet: undefined,
      })],
    }))
  })

  it('will fill in from the typemap', async () => {
    const document = parse(`
      query test($arg: Int) {
        testField {
          testDeepField {
            testDeepField {
              testSubField
            }
          }
        }
      }
    `)

    const fieldNode = (document.definitions[0] as OperationDefinitionNode)
      .selectionSet
      .selections
      .find((selection) => selection.kind === Kind.FIELD && selection.name.value === 'testField') as FieldNode

    const instance: AutoGraphQLObjectType = {
      [graphQLAutoRequesterMeta]: {
        execute: jest.fn(),
        parent: {
          fragmentTypemap: {
            Type: {
              kind: Kind.SELECTION_SET,
              selections: [{
                kind: Kind.FIELD,
                name: {
                  kind: Kind.NAME,
                  value: 'testSubField',
                },
                selectionSet: undefined,
              }],
            },
          } as GraphQLFragmentTypeMap,
          schema: upstreamSchema,
        } as GraphQLAutoRequester,
        type: upstreamSchema.getType('Type')! as GraphQLObjectType,
      },
    }

    const info: GraphQLResolveInfo = {
      fieldName: 'testField',
      fragments: {},
      fieldNodes: [
        fieldNode,
      ],
      parentType: downstreamSchema.getQueryType(),
      returnType: downstreamSchema.getType('TypeHasADifferentName') as GraphQLOutputType,
      schema: downstreamSchema,
    } as any as GraphQLResolveInfo

    // Executed in the `testField` resolver on the outer schema
    await expect(delegate(instance, info)).resolves.toBe(instance)

    expect(instance[graphQLAutoRequesterMeta].execute).toHaveBeenCalledTimes(1)
    expect((instance[graphQLAutoRequesterMeta].execute as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({
      kind: Kind.SELECTION_SET,
      selections: [expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: '__typename',
        }),
        selectionSet: undefined,
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testDeepField',
        }),
        selectionSet: expect.objectContaining({
          kind: Kind.SELECTION_SET,
          selections: [expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: '__typename',
            }),
            selectionSet: undefined,
          }), expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: 'testDeepField',
            }),
            selectionSet: expect.objectContaining({
              kind: Kind.SELECTION_SET,
              selections: [expect.objectContaining({
                kind: Kind.FIELD,
                name: expect.objectContaining({
                  kind: Kind.NAME,
                  value: '__typename',
                }),
                selectionSet: undefined,
              }), expect.objectContaining({
                kind: Kind.FIELD,
                name: expect.objectContaining({
                  kind: Kind.NAME,
                  value: 'testSubField',
                }),
                selectionSet: undefined,
              })],
            }),
          }), expect.objectContaining({
            kind: Kind.FIELD,
            name: expect.objectContaining({
              kind: Kind.NAME,
              value: 'testSubField',
            }),
            selectionSet: undefined,
          })],
        }),
      }), expect.objectContaining({
        kind: Kind.FIELD,
        name: expect.objectContaining({
          kind: Kind.NAME,
          value: 'testSubField',
        }),
        selectionSet: undefined,
      })],
    }))
  })
})
