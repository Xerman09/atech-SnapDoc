const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const tslibCjsPath = path.resolve(__dirname, 'node_modules', 'tslib', 'tslib.js');

// Keep package exports enabled for React Native 0.88+ (react-native/react-private-interface)
// while routing `tslib` to its CJS entry to prevent Metro Web `tslib.default` errors.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      filePath: tslibCjsPath,
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
