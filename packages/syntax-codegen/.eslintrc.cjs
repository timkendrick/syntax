const base = require('@timkendrick/build-config/templates/eslint/base.eslintrc.cjs');

module.exports = {
  ...base,
  parserOptions: {
    ...base.parserOptions,
    tsconfigRootDir: __dirname,
  },
  rules: {
    ...base.rules,
    'import/extensions': ['error', 'ignorePackages'],
  },
};
