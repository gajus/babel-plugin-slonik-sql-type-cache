import buildSqlTag from './buildSqlTag.js';
import { pluginTester } from 'babel-plugin-tester';
import multiline from 'multiline-ts';

pluginTester({
  filepath: 'test.ts',
  plugin: buildSqlTag,
  tests: [
    {
      code: multiline`
        const foo = async () => {
          await pool.query(
            sql.type(
              z.object({
                bar: z.text(),
              })
            )\`SELECT 1\`
          );
        };
      `,
      output: multiline`
        const foo = async () => {
          await pool.query(
            globalThis.buildSqlType(
              sql,
              "d9412862c025ac1aa884c33f719e7535ce47830325cd5d949f1e94970fb9fa1d",
              () => {
                return z.object({
                  bar: z.text(),
                });
              }
            )\`SELECT 1\`
          );
        };
      `,
      title:
        'replaces sql.type() with globalThis.buildSqlType() (inline z.object())',
    },
    {
      code: multiline`
        import { PersonZodSchema } from './PersonZodSchema.js';
        const foo = async () => {
          await pool.query(
            sql.type(
              PersonZodSchema
            )\`SELECT 1\`
          );
        };
      `,
      output: multiline`
        import { PersonZodSchema } from "./PersonZodSchema.js";
        const foo = async () => {
          await pool.query(
            globalThis.buildSqlType(
              sql,
              "b016f5affaf8a9a593e9a2efa5d903503f356de2ee088c9bded749d0ea6ec1e9",
              () => {
                return PersonZodSchema;
              }
            )\`SELECT 1\`
          );
        };
      `,
      title:
        'replaces sql.type() with globalThis.buildSqlType() (imported zod schema)',
    },
    {
      code: multiline`
        const FooZodSchema = z.object({
          bar: z.text(),
        });

        const foo = async () => {
          await pool.query(
            sql.type(FooZodSchema)\`SELECT 1\`
          );
        };
      `,
      output: multiline`
        const FooZodSchema = z.object({
          bar: z.text(),
        });
        const foo = async () => {
          await pool.query(
            globalThis.buildSqlType(
              sql,
              "20e784eee65ba17efc5c44df925f0c0ceac769c90eb76c902a25100555271c2d",
              () => {
                return FooZodSchema;
              }
            )\`SELECT 1\`
          );
        };
      `,
      title:
        'replaces sql.type() with globalThis.buildSqlType() (zod schema reference)',
    },
    {
      code: multiline`
        const FooZodSchema = Math.random() > 0.5 ? z.object({
          bar: z.text(),
        }) : z.object({
          baz: z.text(),
        });

        const foo = async () => {
          await pool.query(
            sql.type(FooZodSchema)\`SELECT 1\`
          );
        };
      `,
      output: multiline`
        const FooZodSchema =
          Math.random() > 0.5
            ? z.object({
                bar: z.text(),
              })
            : z.object({
                baz: z.text(),
              });
        const foo = async () => {
          await pool.query(sql.type(FooZodSchema)\`SELECT 1\`);
        };
      `,
      title:
        'does not replace sql.type() with globalThis.buildSqlType() if the zod schema is dynamic',
    },
  ],
});
