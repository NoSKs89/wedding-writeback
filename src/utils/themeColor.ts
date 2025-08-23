/**
 * Utility for dynamically updating the theme-color meta tag
 * This controls the status bar appearance on mobile devices
 */

export const updateThemeColor = (color: string): void => {
  // Find the theme-color meta tag
  const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  
  if (themeColorMeta) {
    themeColorMeta.content = color;
    console.log(`[THEME COLOR] Updated to: ${color}`);
  } else {
    // Create the meta tag if it doesn't exist
    const newThemeColorMeta = document.createElement('meta');
    newThemeColorMeta.name = 'theme-color';
    newThemeColorMeta.content = color;
    document.head.appendChild(newThemeColorMeta);
    console.log(`[THEME COLOR] Created new meta tag with color: ${color}`);
  }
};

export const resetThemeColor = (): void => {
  updateThemeColor('#000000'); // Reset to black default
};

/**
 * Converts hex color to a darker version for better contrast in status bar
 * @param hexColor - Hex color string (with or without #)
 * @param darkenAmount - Amount to darken (0-1, default 0.2)
 * @returns Darkened hex color
 */
export const darkenColorForStatusBar = (hexColor: string, darkenAmount: number = 0.2): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Darken each component
  const darkenedR = Math.round(r * (1 - darkenAmount));
  const darkenedG = Math.round(g * (1 - darkenAmount));
  const darkenedB = Math.round(b * (1 - darkenAmount));
  
  // Convert back to hex
  const darkenedHex = `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
  
  return darkenedHex;
};

/**
 * Extracts the actual start color from gradient controls and color scheme
 * This matches the logic used in the gradient calculation
 */
export const getActualGradientStartColor = (
  gradientControls: any,
  selectedColorScheme: any
): string => {
  const {
    gradientMode = 'Scheme: Primary & Secondary',
    gradientColorStart = '#ee0038',
  } = gradientControls || {};

  let actualStartColor = gradientColorStart;

  if (selectedColorScheme && gradientMode !== 'Override') {
    switch (gradientMode) {
      case 'Scheme: Primary & Secondary':
        actualStartColor = selectedColorScheme.colors.primary || gradientColorStart;
        break;
      case 'Scheme: Primary & Accent':
        actualStartColor = selectedColorScheme.colors.primary || gradientColorStart;
        break;
      case 'Scheme: Secondary & Accent':
        actualStartColor = selectedColorScheme.colors.secondary || gradientColorStart;
        break;
      case 'Scheme: Text & Background':
        actualStartColor = selectedColorScheme.colors.text || gradientColorStart;
        break;
      default:
        actualStartColor = gradientColorStart;
    }
  }

  return actualStartColor;
}; 