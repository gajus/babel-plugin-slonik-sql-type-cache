# Babel Plugin to Cache sql.type() initializations

Automatically transforms Slonik's [`sql.type()`](https://github.com/gajus/slonik) calls to use a caching mechanism that prevents expensive re-initialization of Zod schemas, improving performance without requiring code changes, i.e.,

This:

```ts
sql.type(
  z.object({
    bar: z.text(),
  })
)`SELECT bar`;
```

Becomes this:

```ts
globalThis.buildSqlType(
  sql,
  "8598d15279bd5e3eb41ae6d074d6b70568579dff7a7d27f096162eb373c1b344",
  () => {
    return z.object({
      bar: z.text(),
    });
  }
)`SELECT bar`;
```

Where `buildSqlType` is a helper function that acts as a singleton.

## Motivation

Initializing [Zod](https://zod.dev/) schemas is expensive.

By using a build helper with a hash of the location, we can avoid re-initializing the schema every time we use it. This Babel plugin helps us to do that automatically without changing how we write our code.

## Why Use This?

- **Performance Boost**: Prevents unnecessary re-initialization and can leverage `zod-accelerator` to speed up the schema execution.
- **Zero Mental Overhead**: Write normal Zod code - the caching happens automatically.
- **No Code Changes Required**: Works with your existing codebase without modifications.

## Installation

```bash
npm install --save-dev babel-plugin-slonik-sql-type-cache
```

## Usage

Add the plugin to your Babel configuration:

```json
{
  "plugins": ["babel-plugin-slonik-sql-type-cache"]
}
```

After you install the plugin, you have to define the `buildSqlType` helper in your project, which you can do using the `defineBuildSqlType` helper.

```ts
import { defineBuildSqlType } from 'babel-plugin-slonik-sql-type-cache/helper';

defineBuildSqlType((sql, hash, build) => {});
```

You have to do this once in your project, i.e. in your entry file.

Example:

```ts
import { defineBuildSqlType } from 'babel-plugin-slonik-sql-type-cache/helper';

const sqlTypeCache: Record<string, unknown> = {};

defineBuildSqlType((sql, hash, build) => {
  if (sqlTypeCache[uid]) {
    return sqlTypeCache[uid];
  }

  sqlTypeCache[uid] = build();

  return sqlTypeCache[uid];
});
```

### Combining it with `zod-accelerator`

[`zod-accelerator`](https://www.npmjs.com/package/@duplojs/zod-accelerator) is a library that allows you to accelerate Zod schemas, and it can make a very big difference in performance. However, instrumenting every instance of `z.object()` is not practical. This plugin helps you to do that automatically.

```ts
import { defineBuildSqlType } from 'babel-plugin-slonik-sql-type-cache/helper';
import ZodAccelerator from '@duplojs/zod-accelerator';

const sqlTypeCache: Record<string, unknown> = {};

defineBuildSqlType((sql, uid, build) => {
  if (sqlTypeCache[uid]) {
    return sqlTypeCache[uid];
  }

  const zodSchema = build();
  const acceleratedZodSchema = ZodAccelerator.build(zodSchema);
  const sqlType = sql.type(acceleratedZodSchema);

  sqlTypeCache[uid] = sqlType;

  return sqlTypeCache[uid];
});
```
