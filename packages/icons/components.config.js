import { pascalCase } from '@videojs/utils/string';

const PASCAL_CASE_ICON_NAME_OVERRIDES = {
  'airplay-enter': 'AirPlayEnter',
  'airplay-exit': 'AirPlayExit',
};

/** @param {string} name */
function iconComponentName(name) {
  return `${PASCAL_CASE_ICON_NAME_OVERRIDES[name] ?? pascalCase(name)}Icon`;
}

/** @param {string} set */
const iconConfig = (set) => ({
  components: [
    {
      files: `./src/assets/${set}/*.svg`,
      name: iconComponentName,
    },
  ],
  output: `./src/__generated__/${set}.ts`,
});

export default [iconConfig('default'), iconConfig('minimal')];
