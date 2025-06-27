const {
  'Overall Controls (Guest)': overallControls,
  'Dynamic Background Gradient': dynamicGradientControlsFromSettings,
  ...elementControls
} = layoutSettingsFromPreview || {};

const {
  springPreset: selectedSpringPresetKeyGuest = 'default',
  colorScheme: selectedColorSchemeName = weddingColorSchemes[0].name,
  overallFontFamily = fontFamilyOptions[0],
} = overallControls || {}; 