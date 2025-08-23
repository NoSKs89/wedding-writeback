export interface FormTheme {
  name: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
  borderColor?: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  // Add other style properties as needed, e.g., inputBackgroundColor, linkColor
}

export const formThemes: FormTheme[] = [
  {
    name: 'Light',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontFamily: 'Arial, Helvetica, sans-serif',
    borderColor: '#CCCCCC',
    buttonBackgroundColor: '#007bff',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Dark',
    backgroundColor: '#1A1A1A',
    textColor: '#FFFFFF',
    fontFamily: 'Arial, Helvetica, sans-serif',
    borderColor: '#444444',
    buttonBackgroundColor: '#007bff',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Ocean Breeze',
    backgroundColor: '#E0F7FA',
    textColor: '#004D40',
    fontFamily: 'Georgia, serif',
    borderColor: '#4DB6AC',
    buttonBackgroundColor: '#00796B',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Sunset Glow',
    backgroundColor: '#FFF3E0',
    textColor: '#E65100',
    fontFamily: 'Verdana, sans-serif',
    borderColor: '#FFB74D',
    buttonBackgroundColor: '#F57C00',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Forest Whisper',
    backgroundColor: '#E8F5E9',
    textColor: '#1B5E20',
    fontFamily: 'Times New Roman, Times, serif',
    borderColor: '#66BB6A',
    buttonBackgroundColor: '#388E3C',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Midnight Bloom',
    backgroundColor: '#311B92',
    textColor: '#EDE7F6',
    fontFamily: 'Courier New, Courier, monospace',
    borderColor: '#7E57C2',
    buttonBackgroundColor: '#512DA8',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Desert Sands',
    backgroundColor: '#FFF8E1',
    textColor: '#795548',
    fontFamily: 'Tahoma, Geneva, sans-serif',
    borderColor: '#A1887F',
    buttonBackgroundColor: '#5D4037',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Classic Ivory',
    backgroundColor: '#FFFFF0',
    textColor: '#5D4037',
    fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, serif',
    borderColor: '#D7CCC8',
    buttonBackgroundColor: '#795548',
    buttonTextColor: '#FFFFFF',
  },
  {
    name: 'Crimson Velvet',
    backgroundColor: '#6A2E3D', // Deep Maroon
    textColor: '#DCD3C9',       // Light Beige
    fontFamily: 'Georgia, serif',
    borderColor: '#9E2A2B',     // Crimson Red
    buttonBackgroundColor: '#9E2A2B',
    buttonTextColor: '#DCD3C9',
  },
  {
    name: 'Dusty Mauve',
    backgroundColor: '#A295A3', // Dusty Lavender
    textColor: '#2E232F',       // Dark Eggplant
    fontFamily: 'Verdana, sans-serif',
    borderColor: '#6A2E3D',     // Deep Maroon
    buttonBackgroundColor: '#2E232F',
    buttonTextColor: '#DCD3C9',
  },
  {
    name: 'Elegant Onyx',
    backgroundColor: '#DCD3C9', // Light Beige
    textColor: '#2E232F',       // Dark Eggplant
    fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, serif',
    borderColor: '#A295A3',     // Dusty Lavender
    buttonBackgroundColor: '#2E232F',
    buttonTextColor: '#DCD3C9',
  },
];

export const defaultThemeName = 'Light';

export const getThemeByName = (name: string): FormTheme | undefined => {
  return formThemes.find(theme => theme.name === name) || formThemes.find(theme => theme.name === defaultThemeName);
}; 