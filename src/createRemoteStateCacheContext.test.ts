import { promises as fs } from 'fs';
import { createCache as createOnDiskCache } from 'simple-on-disk-cache';
import { HasMetadata } from 'type-fns';
import uuid from 'uuid';
import { SimpleCache } from 'with-simple-cache';

import { RemoteStateCache } from './RemoteStateCache';
import { createRemoteStateCacheContext } from './createRemoteStateCacheContext';
import { defaultKeySerializationMethod } from './defaults';

/**
 * a recipe
 */
type Recipe = {
  uuid?: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
};

const cacheDir = `${__dirname}/__test_assets__/__tmp__`;
const createCache = () =>
  createOnDiskCache({
    directory: {
      mounted: {
        path: cacheDir,
      },
    },
  });

describe('createRemoteStateCacheContext', () => {
  beforeEach(() =>
    // invalidate all of the current cached data, so past tests dont interfere
    fs
      .unlink([cacheDir, '_.simple_on_disk_cache.valid_keys'].join('/'))
      .catch(() => {}),
  );
  describe('cache', () => {
    it('should be possible to add extended cache to a query', async () => {
      // start the context
      const { withRemoteStateQueryCache } = createRemoteStateCacheContext({
        cache: createCache(),
      });

      // define a query that we'll add cache to
      const apiCalls = [];
      const queryGetRecipes = withRemoteStateQueryCache(
        async ({ searchFor }: { searchFor: string }): Promise<Recipe[]> => {
          apiCalls.push(searchFor);
          return [
            {
              uuid: uuid(),
              title: '__TITLE__',
              description: '__DESCRIPTION__',
              ingredients: [],
              steps: [],
            },
          ];
        },
        {
          name: 'queryGetRecipes',
        },
      );

      // make a few requests
      const result1 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result2 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      const result3 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result4 = await queryGetRecipes.execute({ searchFor: 'smoothie' });

      // prove that subsequent duplicate requests returned the same result
      expect(result3).toEqual(result1);
      expect(result4).toEqual(result2);

      // prove that we only called the api twice, once per unique request, since dupe request responses should have come from cache
      expect(apiCalls.length).toEqual(2);

      // invalidate a request
      await queryGetRecipes.invalidate({ forInput: [{ searchFor: 'steak' }] });

      // now make the query again and prove that it hits the api
      const result5 = await queryGetRecipes.execute({ searchFor: 'steak' });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);

      // update a request
      await queryGetRecipes.update({
        forKey: [
          queryGetRecipes.name,
          defaultKeySerializationMethod({ searchFor: 'smoothie' }, undefined),
        ].join('.'), // update by key, instead of input
        toValue: async ({ fromCachedOutput }) => [
          ...(fromCachedOutput ?? []),
          {
            title: 'new smoothie',
            description: 'great smothie',
            ingredients: [],
            steps: [],
          }, // add a new recipe to it
        ],
      });

      // now make a query again and prove that it doesn't hit the api, but returned the updated value
      const result6 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      expect(apiCalls.length).toEqual(3); // no increase
      expect(result6).not.toEqual(result2); // new value
      expect(result6.length).toEqual(2); // should have 2 recipes now
      expect(result6[1]).toMatchObject({ title: 'new smoothie' }); // the second should be the one we explicitly added
    });
    it('should use the context level key serialization method as default when specified', async () => {
      // start the context
      const cache = createCache();
      const { withRemoteStateQueryCache } = createRemoteStateCacheContext({
        cache,
        serialize: {
          key: (input, _context) => ['for', ...Object.values(input)].join('.'), // add a default serialization method
        },
      });

      // define a query that we'll add cache to
      const apiCalls = [];
      const queryGetRecipes = withRemoteStateQueryCache(
        async ({ searchFor }: { searchFor: string }): Promise<Recipe[]> => {
          apiCalls.push(searchFor);
          return [
            {
              uuid: uuid(),
              title: '__TITLE__',
              description: '__DESCRIPTION__',
              ingredients: [],
              steps: [],
            },
          ];
        },
        {
          name: 'queryGetRecipes',
        },
      );

      // make a few requests
      await queryGetRecipes.execute({ searchFor: 'steak' });
      await queryGetRecipes.execute({ searchFor: 'smoothie' });
      await queryGetRecipes.execute({ searchFor: 'steak' });
      await queryGetRecipes.execute({ searchFor: 'smoothie' });

      // check that the keys look correct
      const keys = await cache.keys();
      expect(keys.length).toEqual(2);
      expect(keys[0]).toEqual('queryGetRecipes.for.steak');
      expect(keys[1]).toEqual('queryGetRecipes.for.smoothie');
    });
  });
  describe('triggers', () => {
    it('should be possible to automatically invalidate and update a query cache from mutations', async () => {
      // start the context
      const { withRemoteStateQueryCache, withRemoteStateMutationRegistration } =
        createRemoteStateCacheContext({ cache: createCache() });

      // define a mutation which we'll have as a trigger for cache invalidation
      const mutationAddRecipe = withRemoteStateMutationRegistration(
        async ({ recipe }: { recipe: Recipe }) => recipe,
        { name: 'mutationAddRecipe' },
      );

      // define a mutation which we'll have as a trigger for cache update
      const mutationDeleteRecipe = withRemoteStateMutationRegistration(
        async (_: { recipeUuid: string }) => {},
        {
          name: 'mutationDeleteRecipe',
        },
      );

      // define a query that we'll add cache to
      const apiCalls = [];
      const queryGetRecipes = withRemoteStateQueryCache(
        async ({
          searchFor,
        }: {
          searchFor: string;
        }): Promise<HasMetadata<Recipe>[]> => {
          apiCalls.push(searchFor);
          return [
            {
              uuid: uuid(),
              title: '__TITLE__',
              description: '__DESCRIPTION__',
              ingredients: [],
              steps: [],
            },
          ];
        },
        {
          name: 'queryGetRecipes',
        },
      );

      // assign the invalidatedBy and updatedBy triggers
      queryGetRecipes.addTrigger({
        invalidatedBy: {
          mutation: mutationAddRecipe,
          affects: ({ mutationInput }) => ({
            inputs: mutationInput[0].recipe.title
              .split(' ')
              .map((substring) => [{ searchFor: substring }]), // invalidate every query that was run on a word in the title of the recipe (note: this is not a good real-world example, but does the job for testing)
          }),
        },
      });
      queryGetRecipes.addTrigger({
        updatedBy: {
          mutation: mutationDeleteRecipe,
          affects: ({ cachedQueryKeys }) => ({ keys: cachedQueryKeys }), // update _all_ keys, since we dont know which ones will have included this recipe
          update: ({ from: { cachedQueryOutput }, with: { mutationInput } }) =>
            cachedQueryOutput.then((recipes) =>
              recipes.filter(
                (recipe) => recipe.uuid !== mutationInput[0].recipeUuid,
              ),
            ),
        },
      });

      // make a few requests
      const result1 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result2 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      const result3 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result4 = await queryGetRecipes.execute({ searchFor: 'smoothie' });

      // prove that subsequent duplicate requests returned the same result
      expect(result3).toEqual(result1);
      expect(result4).toEqual(result2);

      // prove that we only called the api twice, once per unique request, since dupe request responses should have come from cache
      expect(apiCalls.length).toEqual(2);

      // execute mutation to add a recipe which includes the word 'steak' in the title
      await mutationAddRecipe.execute({
        recipe: {
          title: 'perfect, jalapeno t-bone steak',
          description:
            'a juicy, perfectly cooked, spicy, jalapeno t-bone steak',
          ingredients: [],
          steps: [],
        },
      });

      // prove that we invalidated the request
      const result5 = await queryGetRecipes.execute({ searchFor: 'steak' });
      expect(result5).not.toEqual(result1); // should have gotten a different result after cache invalidation
      expect(apiCalls.length).toEqual(3); // and should have called the api after cache invalidation

      // execute mutation to delete a recipe we've previously found for smoothie
      await mutationDeleteRecipe.execute({ recipeUuid: result2[0]!.uuid });

      // prove that we updated the cached value for that request
      const result6 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      expect(result2.length).toEqual(1);
      expect(result6.length).toEqual(0); // should no longer have any results, since our updatedBy trigger should have removed the recipe by uuid
      expect(apiCalls.length).toEqual(3); // should not have had another api call, since we updated the cache, not invalidated it
    });
    it('should be possible to invalidate and update a query cache from mutation, when cache is pulled from input at runtime', async () => {
      // start the context
      const { withRemoteStateQueryCache, withRemoteStateMutationRegistration } =
        createRemoteStateCacheContext({
          cache: ({ fromInput }) => fromInput[1].cache,
        });

      // define a mutation which we'll have as a trigger for cache invalidation
      const mutationAddRecipe = withRemoteStateMutationRegistration(
        async (
          { recipe }: { recipe: Recipe },
          _: { cache: RemoteStateCache },
        ) => recipe,
        {
          name: 'mutationAddRecipe',
        },
      );

      // define a mutation which we'll have as a trigger for cache update
      const mutationDeleteRecipe = withRemoteStateMutationRegistration(
        async (
          _: { recipeUuid: string },
          __: { cache: RemoteStateCache },
        ) => {},
        {
          name: 'mutationDeleteRecipe',
        },
      );

      // define a query that we'll add cache to
      const apiCalls = [];
      const queryGetRecipes = withRemoteStateQueryCache(
        async (
          { searchFor }: { searchFor: string },
          _: { cache: RemoteStateCache },
        ): Promise<HasMetadata<Recipe>[]> => {
          apiCalls.push(searchFor);
          return [
            {
              uuid: uuid(),
              title: '__TITLE__',
              description: '__DESCRIPTION__',
              ingredients: [],
              steps: [],
            },
          ];
        },
        {
          name: 'queryGetRecipes',
        },
      );

      // assign the invalidatedBy and updatedBy triggers
      queryGetRecipes.addTrigger({
        invalidatedBy: {
          mutation: mutationAddRecipe,
          affects: ({ mutationInput }) => ({
            inputs: mutationInput[0].recipe.title
              .split(' ')
              .map((substring) => [
                { searchFor: substring },
                { cache: mutationInput[1].cache },
              ]), // invalidate every query that was run on a word in the title of the recipe (note: this is not a good real-world example, but does the job for testing)
          }),
        },
      });
      queryGetRecipes.addTrigger({
        updatedBy: {
          mutation: mutationDeleteRecipe,
          affects: ({ cachedQueryKeys }) => ({ keys: cachedQueryKeys }), // update _all_ keys, since we dont know which ones will have included this recipe
          update: ({ from: { cachedQueryOutput }, with: { mutationInput } }) =>
            cachedQueryOutput.then((recipes) =>
              recipes.filter(
                (recipe) => recipe.uuid !== mutationInput[0].recipeUuid,
              ),
            ),
        },
      });

      // initialize a cache we'll use for the requests in input
      const cache = createCache();

      // make a few requests
      const result1 = await queryGetRecipes.execute(
        { searchFor: 'steak' },
        { cache },
      );
      const result2 = await queryGetRecipes.execute(
        { searchFor: 'smoothie' },
        { cache },
      );
      const result3 = await queryGetRecipes.execute(
        { searchFor: 'steak' },
        { cache },
      );
      const result4 = await queryGetRecipes.execute(
        { searchFor: 'smoothie' },
        { cache },
      );

      // prove that subsequent duplicate requests returned the same result
      expect(result3).toEqual(result1);
      expect(result4).toEqual(result2);

      // prove that we only called the api twice, once per unique request, since dupe request responses should have come from cache
      expect(apiCalls.length).toEqual(2);

      // execute mutation to add a recipe which includes the word 'steak' in the title
      await mutationAddRecipe.execute(
        {
          recipe: {
            title: 'perfect, jalapeno t-bone steak',
            description:
              'a juicy, perfectly cooked, spicy, jalapeno t-bone steak',
            ingredients: [],
            steps: [],
          },
        },
        { cache },
      );

      // prove that we invalidated the request
      const result5 = await queryGetRecipes.execute(
        { searchFor: 'steak' },
        { cache },
      );
      expect(result5).not.toEqual(result1); // should have gotten a different result after cache invalidation
      expect(apiCalls.length).toEqual(3); // and should have called the api after cache invalidation

      // execute mutation to delete a recipe we've previously found for smoothie
      await mutationDeleteRecipe.execute(
        { recipeUuid: result2[0]!.uuid },
        { cache },
      );

      // prove that we updated the cached value for that request
      const result6 = await queryGetRecipes.execute(
        { searchFor: 'smoothie' },
        { cache },
      );
      expect(result2.length).toEqual(1);
      expect(result6.length).toEqual(0); // should no longer have any results, since our updatedBy trigger should have removed the recipe by uuid
      expect(apiCalls.length).toEqual(3); // should not have had another api call, since we updated the cache, not invalidated it
    });
    it('should still trigger invalidations and updates if the mutation threw an error', async () => {
      // start the context
      const { withRemoteStateQueryCache, withRemoteStateMutationRegistration } =
        createRemoteStateCacheContext({ cache: createCache() });

      // define a mutation which we'll have as a trigger for cache invalidation
      const mutationAddRecipe = withRemoteStateMutationRegistration(
        async (_: { recipe: Recipe }) => {
          throw new Error('surprise!');
        },
        { name: 'mutationAddRecipe' },
      );

      // define a mutation which we'll have as a trigger for cache update
      const mutationDeleteRecipe = withRemoteStateMutationRegistration(
        async (_: { recipeUuid: string }) => {
          throw new Error('surprise!');
        },
        {
          name: 'mutationDeleteRecipe',
        },
      );

      // define a query that we'll add cache to
      const apiCalls = [];
      const queryGetRecipes = withRemoteStateQueryCache(
        async ({
          searchFor,
        }: {
          searchFor: string;
        }): Promise<HasMetadata<Recipe>[]> => {
          apiCalls.push(searchFor);
          return [
            {
              uuid: uuid(),
              title: '__TITLE__',
              description: '__DESCRIPTION__',
              ingredients: [],
              steps: [],
            },
          ];
        },
        {
          name: 'queryGetRecipes',
        },
      );

      // assign the invalidatedBy and updatedBy triggers
      queryGetRecipes.addTrigger({
        invalidatedBy: {
          mutation: mutationAddRecipe,
          affects: ({ mutationInput }) => ({
            inputs: mutationInput[0].recipe.title
              .split(' ')
              .map((substring) => [{ searchFor: substring }]), // invalidate every query that was run on a word in the title of the recipe (note: this is not a good real-world example, but does the job for testing)
          }),
        },
      });
      queryGetRecipes.addTrigger({
        updatedBy: {
          mutation: mutationDeleteRecipe,
          affects: ({ cachedQueryKeys }) => ({ keys: cachedQueryKeys }), // update _all_ keys, since we dont know which ones will have included this recipe
          update: ({ from: { cachedQueryOutput }, with: { mutationInput } }) =>
            cachedQueryOutput.then((recipes) =>
              recipes.filter(
                (recipe) => recipe.uuid !== mutationInput[0].recipeUuid,
              ),
            ),
        },
      });

      // make a few requests
      const result1 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result2 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      const result3 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result4 = await queryGetRecipes.execute({ searchFor: 'smoothie' });

      // prove that subsequent duplicate requests returned the same result
      expect(result3).toEqual(result1);
      expect(result4).toEqual(result2);

      // prove that we only called the api twice, once per unique request, since dupe request responses should have come from cache
      expect(apiCalls.length).toEqual(2);

      // execute mutation to add a recipe which includes the word 'steak' in the title, but which threw an error
      try {
        await mutationAddRecipe.execute({
          recipe: {
            title: 'perfect, jalapeno t-bone steak',
            description:
              'a juicy, perfectly cooked, spicy, jalapeno t-bone steak',
            ingredients: [],
            steps: [],
          },
        });
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toEqual('surprise!');
      }

      // prove that we invalidated the request
      const result5 = await queryGetRecipes.execute({ searchFor: 'steak' });
      expect(result5).not.toEqual(result1); // should have gotten a different result after cache invalidation
      expect(apiCalls.length).toEqual(3); // and should have called the api after cache invalidation

      // execute mutation to delete a recipe we've previously found for smoothie
      try {
        await mutationDeleteRecipe.execute({ recipeUuid: result2[0]!.uuid });
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toEqual('surprise!');
      }

      // prove that we updated the cached value for that request
      const result6 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      expect(result2.length).toEqual(1);
      expect(result6.length).toEqual(0); // should no longer have any results, since our updatedBy trigger should have removed the recipe by uuid
      expect(apiCalls.length).toEqual(3); // should not have had another api call, since we updated the cache, not invalidated it
    });
  });

  describe('ephemeral contexts', () => {
    /**
     * define a method which returns a totally new execution context, but uses the same cache
     *
     * relevance
     * - this is to simulate running operations from the same cache against different processes, which is the most common use case in the real world
     * - for example, consider the following operations w/ an aws-s3 based cache
     *   - invoking node to run a query, subsequently invoking node to run a mutation or another query
     *   - running queries in parallel across different serverless functions
     *   - etc
     * - in each case
     *   - a new context is built for each operation
     *   - each context just happens to reference the same cache (e.g., one persisted on disk)
     */
    const getNewExecutionContextOperations = ({
      apiCalls,
    }: {
      apiCalls: any[];
    }) => {
      // start the context
      const { withRemoteStateQueryCache, withRemoteStateMutationRegistration } =
        createRemoteStateCacheContext({
          cache: ({ fromInput }) => fromInput[1].cache,
        });

      // define a mutation which we'll have as a trigger for cache invalidation
      const mutationAddRecipe = withRemoteStateMutationRegistration(
        async (
          { recipe }: { recipe: Recipe },
          _: { cache: RemoteStateCache },
        ) => recipe,
        {
          name: 'mutationAddRecipe',
        },
      );

      // define a mutation which we'll have as a trigger for cache update
      const mutationDeleteRecipe = withRemoteStateMutationRegistration(
        async (
          _: { recipeUuid: string },
          __: { cache: SimpleCache<any> },
        ) => {},
        {
          name: 'mutationDeleteRecipe',
        },
      );

      // define a query that we'll add cache to
      const queryGetRecipes = withRemoteStateQueryCache(
        async (
          { searchFor }: { searchFor: string },
          _: { cache: SimpleCache<any> },
        ): Promise<HasMetadata<Recipe>[]> => {
          apiCalls.push(searchFor);
          return [
            {
              uuid: uuid(),
              title: '__TITLE__',
              description: '__DESCRIPTION__',
              ingredients: [],
              steps: [],
            },
          ];
        },
        {
          name: 'queryGetRecipes',
        },
      );

      // assign the invalidatedBy and updatedBy triggers
      queryGetRecipes.addTrigger({
        invalidatedBy: {
          mutation: mutationAddRecipe,
          affects: ({ mutationInput }) => ({
            inputs: mutationInput[0].recipe.title
              .split(' ')
              .map((substring) => [
                { searchFor: substring },
                { cache: mutationInput[1].cache },
              ]), // invalidate every query that was run on a word in the title of the recipe (note: this is not a good real-world example, but does the job for testing)
          }),
        },
      });
      queryGetRecipes.addTrigger({
        updatedBy: {
          mutation: mutationDeleteRecipe,
          affects: ({ cachedQueryKeys }) => ({ keys: cachedQueryKeys }), // update _all_ keys, since we dont know which ones will have included this recipe
          update: ({ from: { cachedQueryOutput }, with: { mutationInput } }) =>
            cachedQueryOutput.then((recipes) =>
              recipes.filter(
                (recipe) => recipe.uuid !== mutationInput[0].recipeUuid,
              ),
            ),
        },
      });

      return {
        queryGetRecipes,
        mutationAddRecipe,
        mutationDeleteRecipe,
        apiCalls,
      };
    };

    it('should be possible to invalidate and update a query cache from mutation, when multiple contexts are used, simulating separate processes', async () => {
      // track api calls across all contexts
      const apiCalls: any[] = [];

      // initialize a cache we'll use for the requests in input, across all contexts
      const cache = createCache();

      // run a couple queries against one context
      const { queryGetRecipes: queryGetRecipesA } =
        getNewExecutionContextOperations({ apiCalls });
      const result1 = await queryGetRecipesA.execute(
        { searchFor: 'steak' },
        { cache },
      );
      const result2 = await queryGetRecipesA.execute(
        { searchFor: 'smoothie' },
        { cache },
      );

      // run a couple queries against another context
      const { queryGetRecipes: queryGetRecipesB } =
        getNewExecutionContextOperations({ apiCalls });
      const result3 = await queryGetRecipesB.execute(
        { searchFor: 'steak' },
        { cache },
      );
      const result4 = await queryGetRecipesB.execute(
        { searchFor: 'smoothie' },
        { cache },
      );

      // prove that subsequent duplicate requests returned the same result
      expect(result3).toEqual(result1);
      expect(result4).toEqual(result2);

      // prove that we only called the api twice, once per unique request, since dupe request responses should have come from cache
      expect(apiCalls.length).toEqual(2);

      // execute mutation to add a recipe which includes the word 'steak' in the title, in a different context
      const { mutationAddRecipe } = getNewExecutionContextOperations({
        apiCalls,
      });
      await mutationAddRecipe.execute(
        {
          recipe: {
            title: 'perfect, jalapeno t-bone steak',
            description:
              'a juicy, perfectly cooked, spicy, jalapeno t-bone steak',
            ingredients: [],
            steps: [],
          },
        },
        { cache },
      );

      // prove that we invalidated the request
      const result5 = await queryGetRecipesA.execute(
        { searchFor: 'steak' },
        { cache },
      );
      expect(result5).not.toEqual(result1); // should have gotten a different result after cache invalidation
      expect(apiCalls.length).toEqual(3); // and should have called the api after cache invalidation

      // execute mutation to delete a recipe we've previously found for smoothie, in another different context
      const { mutationDeleteRecipe } = getNewExecutionContextOperations({
        apiCalls,
      });
      await mutationDeleteRecipe.execute(
        { recipeUuid: result2[0]!.uuid },
        { cache },
      );

      // prove that we updated the cached value for that request
      const result6 = await queryGetRecipesA.execute(
        { searchFor: 'smoothie' },
        { cache },
      );
      expect(result2.length).toEqual(1);
      expect(result6.length).toEqual(0); // should no longer have any results, since our updatedBy trigger should have removed the recipe by uuid
      expect(apiCalls.length).toEqual(3); // should not have had another api call, since we updated the cache, not invalidated it
    });
  });
  describe('(de)serialization', () => {
    it('should allow user to specify default context level serialization and deserialization', async () => {
      // start the context
      const { withRemoteStateQueryCache } = createRemoteStateCacheContext({
        cache: createCache(),
        serialize: {
          value: (output) => JSON.stringify(output),
        },
        deserialize: {
          value: (cached) => JSON.parse(cached),
        },
      });

      // define a query that we'll add cache to
      const apiCalls = [];
      const queryGetRecipes = withRemoteStateQueryCache(
        async ({ searchFor }: { searchFor: string }): Promise<Recipe[]> => {
          apiCalls.push(searchFor);
          return [
            {
              uuid: uuid(),
              title: '__TITLE__',
              description: '__DESCRIPTION__',
              ingredients: [],
              steps: [],
            },
          ];
        },
        {
          name: 'queryGetRecipes',
        },
      );

      // make a few requests
      const result1 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result2 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      const result3 = await queryGetRecipes.execute({ searchFor: 'steak' });
      const result4 = await queryGetRecipes.execute({ searchFor: 'smoothie' });

      // prove that subsequent duplicate requests returned the same result
      expect(result3).toEqual(result1);
      expect(result4).toEqual(result2);

      // prove that we only called the api twice, once per unique request, since dupe request responses should have come from cache
      expect(apiCalls.length).toEqual(2);

      // invalidate a request
      await queryGetRecipes.invalidate({ forInput: [{ searchFor: 'steak' }] });

      // now make the query again and prove that it hits the api
      const result5 = await queryGetRecipes.execute({ searchFor: 'steak' });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);

      // update a request
      await queryGetRecipes.update({
        forKey: [
          queryGetRecipes.name,
          defaultKeySerializationMethod({ searchFor: 'smoothie' }, undefined),
        ].join('.'), // update by key, instead of input
        toValue: async ({ fromCachedOutput }) => [
          ...((await fromCachedOutput) ?? []),
          {
            title: 'new smoothie',
            description: 'great smothie',
            ingredients: [],
            steps: [],
          }, // add a new recipe to it
        ],
      });

      // now make a query again and prove that it doesn't hit the api, but returned the updated value
      const result6 = await queryGetRecipes.execute({ searchFor: 'smoothie' });
      expect(apiCalls.length).toEqual(3); // no increase
      expect(result6).not.toEqual(result2); // new value
      expect(result6.length).toEqual(2); // should have 2 recipes now
      expect(result6[1]).toMatchObject({ title: 'new smoothie' }); // the second should be the one we explicitly added
    });
  });
});
