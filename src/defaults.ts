import shajs from 'sha.js';
import type {
  KeySerializationMethod,
  WithSimpleCacheAsyncOptions,
} from 'with-simple-cache';

import type { RemoteStateCache } from '.';

export const defaultKeySerializationMethod: KeySerializationMethod<any> = (
  input,
  _context,
) =>
  [
    // display a preview of the request
    JSON.stringify(input)
      .replace(/[{}[\]:]/gi, '_')
      .replace(/[^0-9a-z_]/gi, '')
      .replace(/__+/g, '_')
      .slice(0, 50)
      .replace(/^_/, '')
      .replace(/_$/, ''), // stringify + replace all non-alphanumeric input

    // add a unique token, from the hashed inputs
    shajs('sha256')
      .update(JSON.stringify(input))
      .digest('hex'),
  ].join('.');

export const defaultValueSerializationMethod: Required<
  WithSimpleCacheAsyncOptions<any, RemoteStateCache>
>['serialize']['value'] = (output) => JSON.stringify(output);

export const defaultValueDeserializationMethod: Required<
  WithSimpleCacheAsyncOptions<any, RemoteStateCache>
>['deserialize']['value'] = (cached) => JSON.parse(cached);
