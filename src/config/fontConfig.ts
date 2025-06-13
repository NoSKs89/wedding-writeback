export interface FontObject {
    name: string;
    weights?: (string|number)[];
    styles?: string[];
} 

export const fontFamilyOptions = [
    'Arial, sans-serif',
    'Georgia, serif',
    'Courier New, monospace',
    'Roboto, sans-serif',
    'Open Sans, sans-serif',
    'Lato, sans-serif',
    'Montserrat, sans-serif',
    'Oswald, sans-serif',
    'Raleway, sans-serif',
    'Playfair Display, serif',
    'Merriweather, serif',
];

export const isGoogleFont = (fontFamily: string) => {
    const googleFonts = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 
        'Raleway', 'Playfair Display', 'Merriweather'
    ];
    const fontName = fontFamily.split(',')[0].trim();
    return googleFonts.includes(fontName);
};

export const googleFontNames = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
    'Raleway', 'Playfair Display', 'Merriweather'
];

export const systemFontStack = [
    'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
    'Helvetica Neue', 'Arial', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji',
    'Segoe UI Symbol'
]; 