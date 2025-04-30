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
              "841bbdd6931cc06b01215d9ef692cdfec530f76d78567569756f721fe36c63f0",
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
              "42f364d7abdace8651d60d9143a4a738849edf12562fcf3d3762b1e3093f1424",
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
              "e4055e289f36190353ae68fbfcde107a81e15396a833eb899ba241801a8dae28",
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
