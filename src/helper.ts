import { type createSqlTag, type SqlTag } from '@slonik/sql-tag';

type SqlType = ReturnType<typeof createSqlTag>['type'];

export const defineBuildSqlType = (
  build: (sql: SqlTag, hash: string, buildSqlType: () => SqlType) => void,
) => {
  globalThis.buildSqlType = build;
};
