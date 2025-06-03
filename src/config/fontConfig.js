export const googleFontNames = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Inter',
  'Source Sans 3',
  'Oswald',
  'Raleway',
  'Merriweather'
];

export const systemFontStack = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, Times, serif',
  'Verdana, Geneva, sans-serif',
  'Courier New, Courier, monospace',
  'Tahoma, Geneva, sans-serif',
  'Palatino Linotype, Book Antiqua, Palatino, serif',
  'Lucida Console, Monaco, monospace'
];

export const fontFamilyOptions = [
  ...googleFontNames,
  ...systemFontStack
];

// Helper to identify if a font is a Google Font
export const isGoogleFont = (fontName) => googleFontNames.includes(fontName?.split(',')[0].trim()); 