// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // O app guarda nome, telefone e composição familiar de gente em situação
    // de vulnerabilidade: nenhum console.* pode entrar no código, porque é
    // exatamente onde esse dado escaparia sem querer (inclusive em log de
    // exceção).
    rules: {
      'no-console': 'error',
    },
  },
]);
