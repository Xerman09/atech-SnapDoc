const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix Metro Web ESM/CJS interop for tslib ("Cannot destructure property '__extends' of 'tslib.default'")
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
