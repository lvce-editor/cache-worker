# Cache Worker

Browser storage APIs for LVCE workers. `@lvce-editor/cache-worker` provides Cache Storage, IndexedDB, and Origin Private File System (OPFS) operations through a worker RPC command map.

## Commands

| Command                               | Arguments                                           | Result                                                                                                               |
| ------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Cache.getCacheStorageItem`           | `(request, cacheName = 'lvce-cache')`               | Structured-cloneable `{ body: ArrayBuffer, headers: [string, string][], status, statusText }` or `null` when missing |
| `Cache.setCacheStorageItem`           | `(request, value, cacheName = 'lvce-cache')`        | `undefined`; stores a body accepted by the browser `Response` constructor                                            |
| `Cache.removeCacheStorageItem`        | `(request, cacheName = 'lvce-cache')`               | `boolean` indicating whether an item was removed                                                                     |
| `IndexedDb.addIndexedDbFileHandle`    | `(key, handle, databaseName = 'lvce-cache-worker')` | `undefined` after the write transaction commits                                                                      |
| `IndexedDb.getIndexedDbFileHandle`    | `(key, databaseName = 'lvce-cache-worker')`         | Stored handle or `null` when missing through worker RPC                                                              |
| `IndexedDb.removeIndexedDbFileHandle` | `(key, databaseName = 'lvce-cache-worker')`         | `undefined` after the delete transaction commits; deleting a missing key is a no-op                                  |
| `Opfs.readFile`                       | `(name)`                                            | UTF-8 text; rejects when the file does not exist                                                                     |
| `Opfs.writeFile`                      | `(name, content)`                                   | `undefined` after the writable is closed                                                                             |
| `Opfs.removeFile`                     | `(name)`                                            | `undefined`; rejects when the file does not exist                                                                    |

Missing browser APIs reject with an error that names the unavailable capability. Browser storage quota, security, invalid key, structured-clone, and transaction errors are propagated to the caller. File handles must be structured-cloneable by the browser and writable in the current origin. OPFS filenames are single path components; directory traversal is not supported.

Resolve the worker entry URL with `getCacheWorkerUrl` and connect it using `@lvce-editor/rpc`'s `ModuleWorkerRpcParent`:

```js
import { ModuleWorkerRpcParent } from '@lvce-editor/rpc'
import { getCacheWorkerUrl } from '@lvce-editor/cache-worker'

const rpc = await ModuleWorkerRpcParent.create({
  commandMap: {},
  url: getCacheWorkerUrl().href,
})
```

The worker registers the commands in `src/parts/CommandMap/CommandMap.js`. `Response` values are converted to structured-cloneable data before crossing RPC; callers can create a new `Response` from the returned body and metadata.

## Development

This repository uses npm workspaces and a root `package-lock.json`.

The cross-browser suite checks Cache Storage and OPFS through worker RPC in Chromium, Firefox, and WebKit. IndexedDB file-handle restoration is covered in Firefox; Chromium checks general structured-clone persistence. WebKit runs in CI as advisory coverage because some e2e tests may not pass there yet.

```sh
npm ci
npm test
npm run build
npm run e2e -- --browser=webkit
```

The browser suite runs against Chromium, Firefox, and WebKit. Install them with `npx playwright install --with-deps chromium firefox webkit`.
