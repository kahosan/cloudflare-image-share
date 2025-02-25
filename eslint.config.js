'use strict';

const { kaho } = require('eslint-config-kaho');

module.exports = kaho({
  ignores: {
    customGlobs: ['**/ui/*.tsx', 'next.config.mjs', 'postcss.config.mjs']
  }
});
