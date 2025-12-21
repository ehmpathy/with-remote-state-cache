# with-remote-state-cache

a simple, typesafe way to cache remote state with automatic invalidation and updates

![ci_on_commit](https://github.com/ehmpathy/with-remote-state-cache/workflows/ci_on_commit/badge.svg)
![deploy_on_tag](https://github.com/ehmpathy/with-remote-state-cache/workflows/deploy_on_tag/badge.svg)

# why

to cache remote state is easy. to keep it in sync is hard.

when you cache api responses, you need to answer:
- when should i invalidate the cache?
- how do i know which cached entries are affected by a mutation?
- what if my mutation fails partway through?
- how do i update the cache optimistically without a refetch?

these wrappers automate the answers, safely and thoroughly.

connect queries, mutations, and subscriptions with type-safe triggers to maximize cache-hits and eliminate cache-stales via observable cache-invalidation and cache-updates.

# features

- **automatic cache invalidation** - mutations trigger cache invalidation on connected queries
- **automatic cache updates** - skip the refetch, update cache directly from mutation output
- **type-safe triggers** - typescript ensures mutation inputs/outputs match your trigger logic
- **any cache backend** - localstorage, s3, dynamodb, redis, on-disk, etc
- **serverless-friendly** - supports runtime cache injection for ephemeral contexts
- **fail-safe** - triggers fire even when mutations throw, so the cache never goes stale
- built on battle-tested [with-simple-cache](https://github.com/ehmpathy/with-simple-cache)

# install

```sh
npm install with-remote-state-cache
```

# tldr

```ts
import { createRemoteStateCacheContext } from 'with-remote-state-cache';

// 1. create a context with your cache
const { withRemoteStateQueryCache, withRemoteStateMutationRegistration } =
  createRemoteStateCacheContext({ cache: yourCache });

// 2. wrap your queries to cache them
const getRecipes = withRemoteStateQueryCache(
  async ({ searchFor }: { searchFor: string }) => api.recipes.search(searchFor),
  { name: 'getRecipes' }
);

// 3. register your mutations
const createRecipe = withRemoteStateMutationRegistration(
  async ({ recipe }: { recipe: Recipe }) => api.recipes.create(recipe),
  { name: 'createRecipe' }
);

// 4. connect them with type-safe triggers
getRecipes.addTrigger({
  invalidatedBy: {
    mutation: createRecipe,
    affects: ({ mutationInput }) => ({
      inputs: [{ searchFor: mutationInput[0].recipe.category }]
    })
  }
});

// done! now when createRecipe runs, affected getRecipes caches are automatically invalidated
await getRecipes.execute({ searchFor: 'desserts' }); // calls api, caches result
await getRecipes.execute({ searchFor: 'desserts' }); // returns from cache

await createRecipe.execute({ recipe: { category: 'desserts', ... } }); // triggers invalidation

await getRecipes.execute({ searchFor: 'desserts' }); // calls api again (cache was invalidated)
```

# examples

### scenario

say you have a recipe website where users search and upload recipes:

```ts
type Recipe = { uuid?: string; title: string; description: string; ingredients: string[]; steps: string[] };

// query: search recipes from the api
const getRecipes = ({ searchFor }: { searchFor: string }): Promise<Recipe[]> => { /* ... */ };

// mutation: save a recipe to the database
const saveRecipe = ({ recipe }: { recipe: Recipe }): Promise<Required<Recipe>> => { /* ... */ };
```

### setup

create a remote-state cache context with your cache of choice:

```ts
import { createRemoteStateCacheContext } from 'with-remote-state-cache';
import { createCache } from 'simple-localstorage-cache';

const { withRemoteStateQueryCache, withRemoteStateMutationRegistration } = createRemoteStateCacheContext({
  cache: createCache({ namespace: 'recipes-api' }),
});
```

you can use any cache that implements the simple interface - see [compatible caches](#compatible-caches) below.


### cache a query

wrap your query to add a cache - subsequent calls with the same input return from cache:

```ts
const queryGetRecipes = withRemoteStateQueryCache(getRecipes, { name: 'getRecipes' });

await queryGetRecipes.execute({ searchFor: 'chocolate' }); // calls api
await queryGetRecipes.execute({ searchFor: 'chocolate' }); // returns from cache
await queryGetRecipes.execute({ searchFor: 'bananas' });   // calls api (different input)
await queryGetRecipes.execute({ searchFor: 'bananas' });   // returns from cache
```


### manually invalidate cache

force the next call to hit the api:

```ts
await queryGetRecipes.execute({ searchFor: 'bananas' }); // returns from cache
await queryGetRecipes.invalidate({ forInput: [{ searchFor: 'bananas' }] });
await queryGetRecipes.execute({ searchFor: 'bananas' }); // calls api (cache was invalidated)
```

### manually update cache

update the cached value without a refetch:

```ts
const newRecipe: Recipe = { title: 'banana bread', /* ... */ };
await queryGetRecipes.update({
  forInput: [{ searchFor: 'bananas' }],
  toValue: ({ fromCachedOutput }) => [...fromCachedOutput, newRecipe],
});
```

### automatic invalidation

trigger cache invalidation when mutations run:

```ts
// 1. register the mutation
const mutationSaveRecipe = withRemoteStateMutationRegistration(saveRecipe, { name: 'saveRecipe' });

// 2. connect it to the query with a trigger
queryGetRecipes.addTrigger({
  invalidatedBy: {
    mutation: mutationSaveRecipe,
    affects: ({ mutationInput, cachedQueryKeys }) => ({
      keys: cachedQueryKeys.filter((key) => key.includes(mutationInput[0].recipe.title)),
    }),
  },
});

// now when saveRecipe runs, matching cache entries are automatically invalidated
```

the `affects` function gives you full control over which cache entries to invalidate - by key, by input, or both.

### automatic updates

skip the refetch entirely - update the cache directly from mutation output:

```ts
queryGetRecipes.addTrigger({
  updatedBy: {
    mutation: mutationSaveRecipe,
    affects: ({ mutationInput, cachedQueryKeys }) => ({
      keys: cachedQueryKeys.filter((key) => key.includes(mutationInput[0].recipe.title)),
    }),
    update: ({ from: { cachedQueryOutput }, with: { mutationOutput } }) => {
      return [mutationOutput, ...cachedQueryOutput]; // prepend the new recipe
    },
  },
});
```

this is more efficient than invalidation since it avoids the extra api call.


# compatible caches

any cache that implements this interface works:

```ts
interface SimpleCache {
  get: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string, options?: { secondsUntilExpiration?: number }) => Promise<void>;
  keys: () => Promise<string[]>;
}
```

some options:
- [simple-localstorage-cache](https://github.com/ehmpathy/simple-localstorage-cache) - browser localstorage
- [simple-on-disk-cache](https://github.com/ehmpathy/simple-on-disk-cache) - node.js filesystem
- [simple-dynamodb-cache](https://github.com/ehmpathy/simple-dynamodb-cache) - aws dynamodb
- [simple-s3-cache](https://github.com/ehmpathy/simple-s3-cache) - aws s3

or build your own - the interface is minimal.


# pit of success

this library is designed to make the right thing easy and the wrong thing hard:

- **type-safe triggers** - typescript catches mismatches between mutations and queries at compile time
- **fail-safe invalidation** - triggers fire even when mutations throw, so cache never gets stale from partial failures
- **explicit connections** - `addTrigger` makes query-mutation relationships visible and auditable
- **no magic** - you control exactly which cache entries are affected via the `affects` function
- **any cache backend** - swap implementations without changes to application code


# faq

### why use `addTrigger` instead of wrapper options?

typescript can't infer types for both the query and mutation simultaneously in wrapper options. `addTrigger` operates on one query-mutation pair at a time, which gives you full type safety and autocomplete on `mutationInput` and `mutationOutput`.

bonus: triggers can be collocated with either the query or mutation, whichever makes more sense for your codebase.


# roadmap

- domain-object reference cache
- mutation optimistic-response cache with resolution
- remote-state update event subscriptions
