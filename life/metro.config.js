const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// lucide-react-native 1.17+ has an `exports` field pointing to ESM (.mjs)
// which Metro can't resolve. Force Metro to use the `main` field (CJS) instead.
config.resolver.unstable_enablePackageExports = false

module.exports = config
