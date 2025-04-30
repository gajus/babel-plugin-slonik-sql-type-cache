import { type z } from 'zod';

export const defineBuildSqlType = (
  build: (hash: string, buildZodSchema: () => z.ZodTypeAny) => void,
) => {
  globalThis.buildSqlType = build;
};
