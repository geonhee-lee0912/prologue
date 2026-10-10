module.exports = function (api) {
  api.cache(true);
  return {
    // zustand 의 ESM 빌드가 import.meta.env 를 써서 웹 번들이 깨진다. 웹에만 적용한다.
    presets: [['babel-preset-expo', { web: { unstable_transformImportMeta: true } }]],
  };
};
