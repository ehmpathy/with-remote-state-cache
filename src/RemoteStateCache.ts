import { SimpleAsyncCache } from 'with-simple-cache';

/**
 * any simple-cache can be used as a remote-state-cache as long as it also implements a `keys` method which returns all of the currently valid keys for the cache
 *
 * relevance
 * - in order to trigger updates/invalidations, we need to expose all of the keys the user may want to choose from to the user
 */
export interface RemoteStateCache extends SimpleAsyncCache<string> {
  keys: () => Promise<string[]> | string[];
}
