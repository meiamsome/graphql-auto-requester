# graphql-auto-requester

`graphql-auto-requester` is a tool for making working with GraphQL requests a simpler and more efficient by only
requesting fields that are required at any given time.

## An Example

Given the following schema:

```graphql
type Num {
  value: Int!
  add(input: Int! = 1): Num!
  div(input: Int!): Num!
  mult(input: Int!): Num!
  sub(input: Int!): Num!
}

type Query {
  getNumber(input: Int!): Num!
}
```

You would usually have to manually define your query, which could get complex depending upon your use case. Using the
requester we are able to traverse the schema and onlty request data when it is required. For example:

```js
const requester = new GraphQLAutoRequester(schema)
const result = await requester.query.getNumber({ input: 100 })
  .add({ input: 10 })
  .mult({ input: 5 })
  .value
console.log(result) // 550
```

This is equivalent to the following GraphQL query (And this is the query that would be automatically executed)
```graphql
query {
  getNumber(input: 100) {
    add(input: 10) {
      mult(input: 5) {
        value
      }
    }
  }
}
```

However, it is hard for us to implement a feature that explores the graph very deeply without having to struggle to
maintain one query file that represents the superset of all options we may want to perform. This also means that when we
request data, we will often be asking for more data than we need. For an example, let's try to implement the [Collatz
conjecture](https://en.wikipedia.org/wiki/Collatz_conjecture) against this API. To be able to compute the Collatz
conjecture we may consider something like the following:
```graphql
query ($input: Int!) {
  getNumber(input: $input) {
    div(input: 2) {
      value
    }
    mult(input: 3) {
      add(input: 1) {
        value
      }
    }
  }
}
```
```js
const queryApiForValue = async (value) => { ... } // Implementation elided
const collatzByQuery = async (value) => {
  if (value === 1) {
    return 0
  }
  const result = await queryApiForValue(value)
  if (value % 2) {
    return 1 + await collatzByQuery(result.div.value)
  } else {
    return 1 + await collatzByQuery(result.mult.add.value)
  }
}

// Calling example
const steps = await collatzByQuery(100)
console.log(steps) // 10
```
There are some problems with this implementation, mainly that we are requesting the result of the division and of the
addition when only one is ever required. We could make our queries smaller at the increased cost of code verbosity.

Alternatively, with `graphql-auto-requester` we could instead do:
```js
const collatzAutoRequester = async (number) => {
  const value = await number.value
  if (value === 1) {
    return 0
  }
  if (value % 2 === 0) {
    return 1 + await collatzAutoRequester(number.div({ input: 2 }))
  } else {
    return 1 + await collatzAutoRequester(number.mult({ input: 3 }).add({ input: 1 }))
  }
}

// Calling example
const requester = new GraphQLAutoRequester(schema)
const steps = await collatzAutoRequester(requester.getNumber({ input: 100 }))
console.log(steps) // 10
```

### Query Aggregation
That may not seem like that dramatic a change, but it is when we start running queries in parallel that we get to use
the full power of `graphql-auto-requester`. Fields that are requested in the same tick of the JS event loop will be
bundled in to a single request.

If we call the original function a couple of times in parallel:
```js
const results = await Promise.all([
  collatzByQuery(1),
  collatzByQuery(2919),
  collatzByQuery(3711),
])
console.log(results) // [0, 216, 237]
```
Then we get results, but we also execute a query for every node visited for every instance, so 0 + 216 + 237 = 453
queries against our pretend API. If we compare that to the `collatzAutoRequester` version:

```js
const requester = new GraphQLAutoRequester(schema)
const results = await Promise.all([
  collatzByQuery(requester.getNumber({ input: 1 })),
  collatzByQuery(requester.getNumber({ input: 2919 })),
  collatzByQuery(requester.getNumber({ input: 3711 })),
])
console.log(results) // [0, 216, 237]
```
We get the same result, but we only execute 238 queries. This is because we bundle together all the queries, so we only
take the maximum step count (238) - and add one because we make a call out for the initial `value` in this version.

In particular, this is very useful for using a GraphQL service as a datasource in another GraphQL service. If we were
to make a new service that had the following schema:
```graphql
type Num {
  value: Int!
  square: Num!
  mod(input: Int!): Num!
}

type Query {
  getNumberSquared(input: Int!): Num!
}
```

We could implement the following resolvers:
```js
const resolvers = {
  Num: {
    // value is automatically implemented by normal GraphQL behaviour of looking on the parent for properties
    async square(num, _, { dataSources }) {
      const value = await num.value
      return dataSources.query.getNumber({ input: value }).mult({ input: value })
    },
    async mod(num, { input }, { dataSources }) {
      const value = await num.value
      return dataSources.query.getNumber({ input: value % input })
    }
  },
  Query: {
    getNumberSquared(_, { input }, { dataSources }) {
      // Note that this does not execute a query yet, so if the client does not select any fields that use this, no
      // call is made to the datasource
      return dataSources.query.getNumber({ input }).mult({ input })
    },
  },
}
```

Which provides us a custom GraphQL service backed by another GraphQL service. We can then make a query such as:
```graphql
query {
  getNumberSquared(input: 2) {
    value
    square {
      value
      mod(input: 5) {
        value
      }
      square {
        value
        square {
          __typename
        }
      }
    }
    mod(input: 4) {
      value
      mod(input: 3) {
        value
      }
      square {
        value
      }
    }
  }
}
```
We would see 3 queries to the upstream GraphQL, as the mod and square branches are executed in parallel by the GraphQL
executor on our new service.
Importantly, the request for `__typename` does NOT result in a further request to the upstream service, as we can tell
from the Schema that this is valid and do not need to execute a request for any subfields as `__typename` is simply
resolved.
