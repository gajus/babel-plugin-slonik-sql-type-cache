import { type SqlTag } from '@slonik/sql-tag';

export const defineBuildSqlType = (
  build: (sql: SqlTag, hash: string, build: () => unknown) => void,
) => {
  globalThis.buildSqlType = build;
};
