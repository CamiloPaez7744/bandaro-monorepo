const fs = require('fs');
try {
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch (e) {
  // Graceful fallback if not loaded
}

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Only watch specific directories needed by the mobile app
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/ui'),
  path.resolve(monorepoRoot, 'packages/core'),
  path.resolve(monorepoRoot, 'packages/config'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 2. Resolve modules from both local and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Block non-mobile directories to avoid file handle exhaustion
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
  ? [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  /.*[/\\]backend[/\\].*/,
  /.*[/\\]billiard-references[/\\].*/,
  /.*[/\\]\.git[/\\].*/,
  /.*[/\\]\.turbo[/\\].*/,
];

// 4. Optimize @tabler/icons-react-native: alias the 5000-icon barrel file to curated icons
const targetedIconsPath = path.resolve(projectRoot, 'src/presentation/components/icons/index.ts');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@tabler/icons-react-native') {
    return {
      filePath: targetedIconsPath,
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 5. Limit maxWorkers on Windows to prevent EMFILE handle exhaustion
config.maxWorkers = 2;

// 6. Wrap cache stores to gracefully handle transient EMFILE / EBUSY errors without crashing
if (Array.isArray(config.cacheStores)) {
  config.cacheStores = config.cacheStores.map((store) => {
    if (!store || typeof store.get !== 'function') return store;
    return {
      async get(key) {
        try {
          return await store.get(key);
        } catch (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE' || err.code === 'EBUSY')) {
            return null; // Fallback to cache miss instead of crashing Metro
          }
          throw err;
        }
      },
      async set(key, value) {
        try {
          await store.set(key, value);
        } catch (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE' || err.code === 'EBUSY')) {
            return; // Cache write failure is non-fatal
          }
          throw err;
        }
      },
      clear() {
        if (typeof store.clear === 'function') {
          try {
            store.clear();
          } catch {}
        }
      },
    };
  });
}

module.exports = config;
