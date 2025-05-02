/* eslint-disable no-console */

import { declare } from '@babel/helper-plugin-utils';
import { type Visitor } from '@babel/traverse';
// eslint-disable-next-line id-length
import * as t from '@babel/types';
import { createHash } from 'node:crypto';

const calculateLocationHash = (code: string, loc: t.SourceLocation) => {
  return createHash('sha256')
    .update(
      `${code}:${loc.start.line}:${loc.start.column}:${loc.end.line}:${loc.end.column}`,
    )
    .digest('hex');
};

const isStaticSchema = (node: null | t.Node | undefined): boolean => {
  if (!node) {
    return false;
  }

  // Direct z.object({...}), etc.
  if (t.isCallExpression(node)) {
    // Could add more checks here, e.g., ensure the callee is z.object, z.string etc.
    // For now, assume any CallExpression initializer is static enough.
    return true;
  }

  // Anything else (ConditionalExpression, other function calls) is dynamic
  return false;
};

export default declare((api) => {
  api.assertVersion(7);

  const visitor: Visitor = {
    CallExpression(path) {
      const callee = path.node.callee;

      // Check if it's a MemberExpression (something.something())
      if (!t.isMemberExpression(callee)) {
        return;
      }

      // Check if it's sql.type()
      if (
        !t.isIdentifier(callee.object, { name: 'sql' }) ||
        !t.isIdentifier(callee.property, { name: 'type' })
      ) {
        return;
      }

      const parentPath = path.parentPath;

      // Check if it is sql.type()``
      if (parentPath.type !== 'TaggedTemplateExpression') {
        return;
      }

      // --- Start Static Analysis ---
      const originalArgument = path.node.arguments[0];

      if (!originalArgument) {
        // sql.type() called without arguments? Should not happen for valid code.
        return;
      }

      let argumentIsStatic = false;

      if (isStaticSchema(originalArgument)) {
        // Argument is directly a static schema definition (e.g., z.object({...}))
        argumentIsStatic = true;
      } else if (t.isIdentifier(originalArgument)) {
        // Argument is a variable reference, check its declaration
        const binding = path.scope.getBinding(originalArgument.name);

        // Check if it's a constant binding and initialized with a static schema
        if (binding && binding.constant) {
          if (
            // Case 1: Local const initialized with static schema
            binding.path.isVariableDeclarator() &&
            isStaticSchema(binding.path.node.init)
          ) {
            argumentIsStatic = true;
          } else if (
            // Case 2: Imported binding (imported from another file)
            binding.path.isImportSpecifier() ||
            binding.path.isImportDefaultSpecifier() ||
            binding.path.isImportNamespaceSpecifier()
          ) {
            argumentIsStatic = true;
          }
        }
        // Note: If binding is not constant (let/var), or not initialized statically,
        // it's considered dynamic.
      }

      // If the argument is not considered static, stop the transformation.
      if (!argumentIsStatic) {
        console.warn(
          `[babel-plugin-slonik-sql-type-cache] Skipping transformation for sql.type() at ${
            this.filename ?? 'unknown'
          }:${
            path.node.loc?.start.line ?? '?'
          } because the argument is dynamic or cannot be statically analyzed.`,
        );
        return;
      }
      // --- End Static Analysis ---

      // Get the location information
      const loc = path.node.loc;

      if (!loc) {
        // Should ideally not happen if static analysis passed, but keep for safety
        return;
      }

      const locationHash = calculateLocationHash(this.file.code, loc);

      // Create the new function expression that wraps the original argument
      const wrappedArgument = t.arrowFunctionExpression(
        [],
        t.blockStatement([t.returnStatement(originalArgument)]),
      );

      // Create the new buildSqlType call
      const newCallee = t.memberExpression(
        t.identifier('globalThis'),
        t.identifier('buildSqlType'),
      );

      // We need to replace the *parent* TaggedTemplateExpression's tag
      const newNode = t.callExpression(newCallee, [
        t.identifier('sql'),
        t.stringLiteral(locationHash),
        wrappedArgument,
      ]);

      // Replace the *tag* part (the CallExpression) of the TaggedTemplateExpression
      path.replaceWith(newNode);
    },
  };

  return {
    name: 'babel-plugin-slonik-sql-type-cache',
    visitor,
  };
});
