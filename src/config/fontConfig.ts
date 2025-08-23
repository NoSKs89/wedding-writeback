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
    'Alex Brush, cursive',
    'Allura, cursive',
    'Cookie, cursive',
    'Kaushan Script, cursive',
    'Pacifico, cursive',
    'Rouge Script, cursive',
    'Tangerine, cursive',
];

export const isGoogleFont = (fontFamily: string) => {
    const googleFonts = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 
        'Raleway', 'Playfair Display', 'Merriweather',
        'Alex Brush', 'Allura', 'Cookie', 'Kaushan Script',
        'Pacifico', 'Rouge Script', 'Tangerine'
    ];
    const fontName = fontFamily.split(',')[0].trim();
    return googleFonts.includes(fontName);
};

export const googleFontNames = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
    'Raleway', 'Playfair Display', 'Merriweather',
    'Alex Brush', 'Allura', 'Cookie', 'Kaushan Script',
    'Pacifico', 'Rouge Script', 'Tangerine'
];

export const systemFontStack = [
    'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
    'Helvetica Neue', 'Arial', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji',
    'Segoe UI Symbol'
]; 