module.exports = {
  extends: [
    "stylelint-config-standard-scss",
    "stylelint-config-prettier",
    "stylelint-config-recommended-vue",
  ],
  rules: {
    "no-empty-source": null
  },
  ignoreFiles: ["src/assets/scss/global/normalize.scss", "src/assets/scss/global/reset.scss"]
};
