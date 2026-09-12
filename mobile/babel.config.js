module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/worklets plugin MUST be last.
      'react-native-worklets/plugin',
    ],
  };
};
