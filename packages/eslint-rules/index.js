/**
 * ESLint rules for Sync platform
 */

module.exports = {
  rules: {
    'no-plaintext-logs': require('./no-plaintext-logs.js')
  },
  configs: {
    recommended: {
      plugins: ['@sync/eslint-rules'],
      rules: {
        '@sync/eslint-rules/no-plaintext-logs': 'error'
      }
    }
  }
};
