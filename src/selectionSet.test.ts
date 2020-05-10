import { Kind, parse, FragmentDefinitionNode, NameNode, BooleanValueNode, IntValueNode, NullValueNode, VariableNode, ObjectValueNode, ObjectFieldNode, ValueNode, ListValueNode } from 'graphql'

import {
  mergeSelectionSetInToSelectionSet,
  leftOuterJoinSelectionSets,
  areSimilarFieldLists,
  isSimilarValueNode,
} from './selectionSet'

const getNameNode = (name: string): NameNode => ({
  kind: Kind.NAME,
  value: name,
})
const getBooleanValue = (value: boolean): BooleanValueNode => ({
  kind: Kind.BOOLEAN,
  value,
})
const getIntValue = (value: string): IntValueNode => ({
  kind: Kind.INT,
  value,
})
const getNullValue = (): NullValueNode => ({
  kind: Kind.NULL,
})
const getVariableNode = (name: string): VariableNode => ({
  kind: Kind.VARIABLE,
  name: getNameNode(name),
})
const getObjectFieldNode = (name: string, value: ValueNode): ObjectFieldNode => ({
  kind: Kind.OBJECT_FIELD,
  name: getNameNode(name),
  value,
})
const getObjectNode = (fields: ObjectFieldNode[]): ObjectValueNode => ({
  kind: Kind.OBJECT,
  fields,
})
const getListNode = (values: ValueNode[]): ListValueNode => ({
  kind: Kind.LIST,
  values,
})

describe('isSimilarValueNode', () => {
  it('works for nulls', () => {
    expect(isSimilarValueNode(getNullValue(), getNullValue())).toBe(true)
  })

  it('works for boolean values', () => {
    expect(isSimilarValueNode(getBooleanValue(true), getBooleanValue(true))).toBe(true)
    expect(isSimilarValueNode(getBooleanValue(false), getBooleanValue(false))).toBe(true)

    expect(isSimilarValueNode(getBooleanValue(true), getBooleanValue(false))).toBe(false)
    expect(isSimilarValueNode(getBooleanValue(false), getBooleanValue(true))).toBe(false)
  })

  it('works for variables', () => {
    expect(isSimilarValueNode(getVariableNode('name'), getVariableNode('name'))).toBe(true)
    expect(isSimilarValueNode(getVariableNode('name'), getVariableNode('name2'))).toBe(false)
  })

  describe('for objects', () => {
    it('works without any fields', () => {
      expect(isSimilarValueNode(getObjectNode([]), getObjectNode([]))).toBe(true)
    })

    it('works with a matching field', () => {
      expect(isSimilarValueNode(
        getObjectNode([
          getObjectFieldNode('test', getNullValue()),
        ]),
        getObjectNode([
          getObjectFieldNode('test', getNullValue()),
        ]),
      )).toBe(true)
    })

    it('fails with a field that differs in name', () => {
      expect(isSimilarValueNode(
        getObjectNode([
          getObjectFieldNode('test', getNullValue()),
        ]),
        getObjectNode([
          getObjectFieldNode('test2', getNullValue()),
        ]),
      )).toBe(false)
    })

    it('fails with a field that differs in value', () => {
      expect(isSimilarValueNode(
        getObjectNode([
          getObjectFieldNode('test', getNullValue()),
        ]),
        getObjectNode([
          getObjectFieldNode('test', getBooleanValue(false)),
        ]),
      )).toBe(false)
    })
  })

  describe('for lists', () => {
    it('works without any entries', () => {
      expect(isSimilarValueNode(getListNode([]), getListNode([]))).toBe(true)
    })

    it('fails with mismatching entry counts', () => {
      expect(isSimilarValueNode(getListNode([getNullValue()]), getListNode([]))).toBe(false)
    })

    it('fails with mismatching entry', () => {
      expect(isSimilarValueNode(getListNode([getNullValue()]), getListNode([getBooleanValue(true)]))).toBe(false)
    })
  })
})

describe('areSimilarFieldLists', () => {
  it('fails for different lengths', () => {
    expect(areSimilarFieldLists([{
      name: getNameNode('a'),
      value: getBooleanValue(false),
    }], [])).toBe(false)
  })

  it('fails for differently named args', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }],
      [{
        name: getNameNode('b'),
        value: getBooleanValue(false),
      }]
    )).toBe(false)
  })

  it('fails for differently kind args', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }],
      [{
        name: getNameNode('a'),
        value: getIntValue(10),
      }]
    )).toBe(false)
  })

  it('fails for different variable args', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getVariableNode('test'),
      }],
      [{
        name: getNameNode('a'),
        value: getVariableNode('notTest'),
      }]
    )).toBe(false)
  })

  // Success scenarios
  it('works for blank arrays', () => {
    expect(areSimilarFieldLists([], [])).toBe(true)
  })

  it('works for single argument', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }],
      [{
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }]
    )).toBe(true)
  })

  it('works for null argument', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getNullValue(),
      }],
      [{
        name: getNameNode('a'),
        value: getNullValue(),
      }]
    )).toBe(true)
  })

  it('works for variable argument', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getVariableNode('variableName'),
      }],
      [{
        name: getNameNode('a'),
        value: getVariableNode('variableName'),
      }]
    )).toBe(true)
  })

  it('works for multiples arguments in order', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }, {
        name: getNameNode('b'),
        value: getBooleanValue(false),
      }],
      [{
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }, {
        name: getNameNode('b'),
        value: getBooleanValue(false),
      }]
    )).toBe(true)
  })

  it('works for multiples arguments out of order', () => {
    expect(areSimilarFieldLists(
      [{
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }, {
        name: getNameNode('b'),
        value: getBooleanValue(false),
      }],
      [{
        name: getNameNode('b'),
        value: getBooleanValue(false),
      }, {
        name: getNameNode('a'),
        value: getBooleanValue(false),
      }]
    )).toBe(true)
  })
})

describe('mergeSelectionSetInToSelectionSet', () => {
  const data = `
    fragment inputA on Test {
      test1
      test2 {
        __typename
        ... on Test2 {
          fieldA
        }
      }
    }

    fragment inputB on Test {
      test2 {
        ... on Test2 {
          fieldB
        }
      }
    }

    fragment output on Test {
      test1
      test2 {
        __typename
        ... on Test2 {
          fieldA
          fieldB
        }
      }
    }
  `
  it('merges sets correctly', () => {
    const document = parse(data, { noLocation: true })
    const inputA = (document.definitions.find(def => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === 'inputA') as FragmentDefinitionNode).selectionSet
    const inputB = (document.definitions.find(def => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === 'inputB') as FragmentDefinitionNode).selectionSet
    const output = (document.definitions.find(def => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === 'output') as FragmentDefinitionNode).selectionSet

    mergeSelectionSetInToSelectionSet(inputA, inputB)
    expect(inputA).toEqual(output)
  })
})

describe('leftOuterJoinSelectionSets', () => {
  const data = `
    fragment inputA on Test {
      test1
      test2 {
        ... on Test2 {
          fieldA(argA: true)
          fieldB
          aliasedField
          alias2: aliasedField2
          defaultArgField
          defaultArgField2(withArg: true)
        }
      }
    }

    fragment inputB on Test {
      test1
      test2 {
        ... on Test2 {
          fieldA(argA: false)
          alias: aliasedField
          aliasedField2
          defaultArgField(withArg: true)
          defaultArgField2
        }
      }
    }

    fragment output on Test {
      test2 {
        ... on Test2 {
          fieldA(argA: true)
          fieldB
          aliasedField
          alias2: aliasedField2
          defaultArgField
          defaultArgField2(withArg: true)
        }
      }
    }
  `
  it('merges sets correctly', () => {
    const document = parse(data, { noLocation: true })
    const inputA = (document.definitions.find(def => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === 'inputA') as FragmentDefinitionNode).selectionSet
    const inputB = (document.definitions.find(def => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === 'inputB') as FragmentDefinitionNode).selectionSet
    const output = (document.definitions.find(def => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === 'output') as FragmentDefinitionNode).selectionSet

    expect(leftOuterJoinSelectionSets(inputA, inputB)).toEqual(output)
  })
})
