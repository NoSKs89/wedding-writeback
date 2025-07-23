import { fontFamilyOptions } from './fontConfig';

export interface SpringConfigPreset {
  tension: number;
  friction: number;
  name: string;
}

export interface WeddingColorScheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
    textOnPrimary?: string; // Optional for themes where it's not needed
    textOnSecondary?: string;
    textOnAccent?: string;
  };
}

// Easing functions
const easeInOutQuad = (t:number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const linear = (t:number) => t;
const easeInCubic = (t:number) => t * t * t;
const easeOutCubic = (t:number) => 1 - Math.pow(1 - t, 3);
const easeInQuint = (t:number) => t * t * t * t * t;
const easeInQuart = (t:number) => t * t * t * t;
const easeOutQuad = (t:number) => 1 - Math.pow(1 - t, 2);
const easeInSextic = (t:number) => t * t * t * t * t * t;

const quickInSlowOut = (t:number) => {
  const midPointRawProgress = 0.15;
  if (t <= midPointRawProgress) {
    return easeInSextic(t / midPointRawProgress) * 0.5;
  } else {
    const remainingRawProgressDuration = 1.0 - midPointRawProgress;
    if (remainingRawProgressDuration === 0) return 0.5;
    return 0.5 + easeOutQuad((t - midPointRawProgress) / remainingRawProgressDuration) * 0.5;
  }
};

export const animationCurves = {
  linear,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInQuint,
  quickInSlowOut,
};

export const springConfigPresets: { [key: string]: SpringConfigPreset } = {
  default: { tension: 170, friction: 26, name: 'Default (react-spring)' },
  gentle: { tension: 120, friction: 14, name: 'Gentle (react-spring)' },
  wobbly: { tension: 180, friction: 12, name: 'Wobbly (react-spring)' },
  stiff: { tension: 210, friction: 20, name: 'Stiff (react-spring)' },
  slow: { tension: 280, friction: 60, name: 'Slow (react-spring)' },
  molasses: { tension: 280, friction: 120, name: 'Molasses (react-spring)' },
  responsive: { tension: 200, friction: 22, name: 'Responsive (Custom)' },
  snappy: { tension: 250, friction: 18, name: 'Snappy (Custom)' },
  delicate: { tension: 100, friction: 10, name: 'Delicate (Custom)' },
  strong: { tension: 300, friction: 30, name: 'Strong (Custom)' },
};

// Parallax physics presets for scroll-based motion and effects
export interface ParallaxPhysicsPreset {
  name: string;
  scrollSpeedMultiplier: number; // Multiplier for all scroll-based animations
  scrollEasing: string; // Easing function name from animationCurves
  momentumDamping: number; // How much to dampen scroll momentum effects (0-1)
  responsiveness: number; // How quickly animations respond to scroll changes (0.1-2)
}

export const parallaxPhysicsPresets: { [key: string]: ParallaxPhysicsPreset } = {
  default: { 
    name: 'Default', 
    scrollSpeedMultiplier: 1.0, 
    scrollEasing: 'linear', 
    momentumDamping: 0.8, 
    responsiveness: 1.0 
  },
  smooth: { 
    name: 'Smooth', 
    scrollSpeedMultiplier: 0.8, 
    scrollEasing: 'easeInOutQuad', 
    momentumDamping: 0.9, 
    responsiveness: 0.7 
  },
  snappy: { 
    name: 'Snappy', 
    scrollSpeedMultiplier: 1.3, 
    scrollEasing: 'easeOutCubic', 
    momentumDamping: 0.6, 
    responsiveness: 1.5 
  },
  cinematic: { 
    name: 'Cinematic', 
    scrollSpeedMultiplier: 0.6, 
    scrollEasing: 'quickInSlowOut', 
    momentumDamping: 0.95, 
    responsiveness: 0.5 
  },
  energetic: { 
    name: 'Energetic', 
    scrollSpeedMultiplier: 1.4, 
    scrollEasing: 'easeInQuint', 
    momentumDamping: 0.5, 
    responsiveness: 1.8 
  },
  gentle: { 
    name: 'Gentle', 
    scrollSpeedMultiplier: 0.7, 
    scrollEasing: 'easeInOutQuad', 
    momentumDamping: 0.95, 
    responsiveness: 0.6 
  },
};

export const weddingColorSchemes: WeddingColorScheme[] = [
    { 
      name: "Classic Elegance", 
      colors: { primary: '#FDFDFD', secondary: '#B08D57', accent: '#D8BFD8', text: '#36454F', background: '#F5F5F5' }
    },
    { 
      name: "Romantic Blush", 
      colors: { primary: '#FADADD', secondary: '#F4C2C2', accent: '#C0C0C0', text: '#5A5A5A', background: '#FFF0F5' }
    },
    { 
      name: "Rustic Charm", 
      colors: { primary: '#DEB887', secondary: '#8FBC8F', accent: '#A0522D', text: '#4A4A4A', background: '#FAF0E6' }
    },
    { 
      name: "Ocean Breeze", 
      colors: { primary: '#ADD8E6', secondary: '#B0E0E6', accent: '#F0E68C', text: '#2F4F4F', background: '#F0FFFF' }
    },
    { 
      name: "Enchanted Forest", 
      colors: { primary: '#228B22', secondary: '#556B2F', accent: '#DAA520', text: '#F8F8FF', background: '#F5F5DC' }
    },
    { 
      name: "Modern Minimalist", 
      colors: { primary: '#FFFFFF', secondary: '#E0E0E0', accent: '#333333', text: '#212121', background: '#F9F9F9' }
    },
    { 
      name: "Vintage Glamour", 
      colors: { primary: '#E6E6FA', secondary: '#778899', accent: '#FFD700', text: '#483D8B', background: '#FFF5EE' }
    },
    { 
      name: "Sunset Glow", 
      colors: { primary: '#FF7F50', secondary: '#FFDAB9', accent: '#FFA07A', text: '#8B4513', background: '#FFF8DC' }
    }
];

export const overallControlsSchemaDefinitionGuest = (isSetupModeFromContext: boolean) => ({
    showHUD: { value: false, label: 'Show Debug HUD (Guest)' },
    springPreset: { value: 'default', options: Object.keys(springConfigPresets), label: 'Scrapbook Image Physics (Guest)' },
    parallaxPhysicsPreset: { value: 'default', options: Object.keys(parallaxPhysicsPresets), label: 'Parallax Physics Preset (Guest)' },
    colorScheme: { value: weddingColorSchemes[0].name, options: weddingColorSchemes.map(scheme => scheme.name), label: 'Color Scheme' },
    overallFontFamily: { value: fontFamilyOptions[0], options: fontFamilyOptions, label: 'Global Font Family' },
    previewingLayoutSlot: { value: 1, options: [1, 2, 3, 4, 5], label: 'Previewing Layout Slot' },
    saveToLayoutSlot: { value: 1, options: [1, 2, 3, 4, 5], label: 'Save to Layout Slot' },
    
    // Auto Navigation Scroll Controls
    autoScrollDuration: { value: 4000, min: 1000, max: 10000, step: 500, label: 'Auto Scroll Duration (ms)' },
    autoScrollEasing: { value: 'easeOut', options: ['easeOut', 'easeInOut', 'linear', 'bouncy'], label: 'Auto Scroll Easing' },
    
    // Auto Navigation Arrow Controls
    arrowNormalScale: { value: 1.0, min: 0.2, max: 3.0, step: 0.1, label: 'Arrow Normal Scale' },
    arrowNormalOpacity: { value: 1.0, min: 0.1, max: 1.0, step: 0.05, label: 'Arrow Normal Opacity' },
    arrowShrinkScale: { value: 0.001, min: 0.001, max: 0.5, step: 0.001, label: 'Arrow Shrink Scale' },
    arrowBounceScale: { value: 1.5, min: 1.0, max: 3.0, step: 0.1, label: 'Arrow Bounce Scale' },
    arrowAnimationSpeed: { value: 1200, min: 100, max: 2000, step: 50, label: 'Arrow Animation Speed' },
    arrowBounceSpeed: { value: 180, min: 50, max: 500, step: 10, label: 'Arrow Bounce Speed' },
    arrowHoldDuration: { value: 800, min: 200, max: 2000, step: 100, label: 'Arrow Hold Duration (ms)' },
    
    // Auto Navigation Arrow Styling
    arrowTextColor: { value: '#ffffff', label: 'Arrow Text Color' },
    arrowBackgroundColor: { value: 'transparent', label: 'Arrow Background Color' },
    arrowBackgroundOpacity: { value: 0.8, min: 0, max: 1, step: 0.05, label: 'Arrow Background Opacity' },
    arrowBorderRadius: { value: 8, min: 0, max: 50, step: 1, label: 'Arrow Border Radius (px)' },
    arrowFontSize: { value: 48, min: 24, max: 96, step: 2, label: 'Arrow Font Size (px)' },
    arrowPadding: { value: 8, min: 0, max: 30, step: 1, label: 'Arrow Padding (px)' },
    arrowShadowEnabled: { value: true, label: 'Enable Arrow Text Shadow' },
    arrowShadowColor: { value: 'rgba(0, 0, 0, 0.8)', label: 'Arrow Text Shadow Color' },
    arrowShadowBlur: { value: 10, min: 0, max: 50, step: 1, label: 'Arrow Text Shadow Blur (px)' },
    arrowShadowOffsetX: { value: 2, min: -20, max: 20, step: 1, label: 'Arrow Text Shadow Offset X (px)' },
    arrowShadowOffsetY: { value: 4, min: -20, max: 20, step: 1, label: 'Arrow Text Shadow Offset Y (px)' },
    arrowBorderEnabled: { value: false, label: 'Enable Arrow Border' },
    arrowBorderColor: { value: '#ffffff', label: 'Arrow Border Color' },
    arrowBorderWidth: { value: 2, min: 1, max: 10, step: 1, label: 'Arrow Border Width (px)' },
    arrowBackdropBlur: { value: 0, min: 0, max: 20, step: 1, label: 'Arrow Backdrop Blur (px)' },
});

export const getElementSchema = (element: any, globalFontFamilyFromStore: any) => {
    let controlsSchema = {
        opacityAtStart: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ Start' },
        opacityAtMiddle: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ Middle' },
        opacityAtEnd: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ End' },
        opacityAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Opacity Curve' },
    };

    if (element.type === 'text') {
        return {
            ...controlsSchema,
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            textColor: { value: '#333333', label: 'Text Color' },
            fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
            fontSizeAtStart: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ Start (px)' },
            fontSizeAtEnd: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ End (px)' },
            fontSizeAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Font Size Curve' },
            lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
            spreadAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Spread Curve' },
            yOffsetAtAnimStart: { value: 20, step: 1, label: 'Y Offset @ Anim Start (px)' },
            yOffsetAtAnimEnd: { value: 0, step: 1, label: 'Y Offset @ Anim End (px)' },
            letterSpacingAtAnimStart: { value: -5, min: -100, max: 100, step: 0.1, label: 'L-Spacing @ Anim Start (px)' },
            letterSpacingAtAnimEnd: { value: 0, min: -100, max: 100, step: 0.1, label: 'L-Spacing @ Anim End (px)' },
            textShadowEffect: { value: false, label: 'Enable Text Shadow' },
            textShadowCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Text Shadow Curve' },
            textShadowXStart: { value: 0, step: 1, label: 'Shadow X Start (px)' },
            textShadowYStart: { value: 0, step: 1, label: 'Shadow Y Start (px)' },
            textShadowBlurStart: { value: 0, min:0, step: 1, label: 'Shadow Blur Start (px)' },
            textShadowXEnd: { value: 2, step: 1, label: 'Shadow X End (px)' },
            textShadowYEnd: { value: 2, step: 1, label: 'Shadow Y End (px)' },
            textShadowBlurEnd: { value: 3, min:0, step: 1, label: 'Shadow Blur End (px)' },
            textShadowColor: { value: 'rgba(0,0,0,0.5)', label: 'Text Shadow Color' },
        };
    } else if (element.type === 'photo' && element.name !== 'background-image') {
        return {
            ...controlsSchema,
            // Override default opacity for photos to create natural fade-out
            opacityAtStart: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ Start' },
            opacityAtMiddle: { value: 0.8, min: 0, max: 1, step: 0.01, label: 'Opacity @ Middle' },
            opacityAtEnd: { value: 0, min: 0, max: 1, step: 0.01, label: 'Opacity @ End' },
            opacityAnimationCurve: { value: 'easeInOutQuad', options: ['disabled', ...Object.keys(animationCurves)], label: 'Opacity Curve' },
            landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
            endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
            scaleEndYPosition: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Scale End Y (% duration)' },
            scaleAnimationCurve: { value: 'linear', options: Object.keys(animationCurves), label: 'Scale Animation Curve' },
            lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
            fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
            fontSize: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size (px)' },
            lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
        };
    } else if (element.type === 'background-image') {
        return {
            ...controlsSchema,
            // Override default opacity for background images to create natural fade-out
            opacityAtStart: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ Start' },
            opacityAtMiddle: { value: 0.7, min: 0, max: 1, step: 0.01, label: 'Opacity @ Middle' },
            opacityAtEnd: { value: 0, min: 0, max: 1, step: 0.01, label: 'Opacity @ End' },
            opacityAnimationCurve: { value: 'easeInOutQuad', options: ['disabled', ...Object.keys(animationCurves)], label: 'Opacity Curve' },
            cropToCircleEffect: { value: false, label: 'Enable Circle Crop & Shrink' },
            circleEffectCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Circle Effect Curve' },
            circleInitialRadius: { value: 150, min: 50, max: 200, step: 1, label: 'Circle Initial Radius (%)' },
            circleFinalRadius: { value: 0, min: 0, max: 100, step: 1, label: 'Circle Final Radius (%)' },
            bgImageInitialScale: { value: 1, min: 0.1, max: 3, step: 0.01, label: 'BG Initial Scale' },
            bgImageFinalScale: { value: 0.1, min: 0, max: 3, step: 0.01, label: 'BG Final Scale' },
        };
    } else if (element.type === 'video') {
        return {
            ...controlsSchema,
            landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            
            // Video playback controls
            autoplay: { value: true, label: 'Auto Play' },
            loop: { value: true, label: 'Loop Video' },
            muted: { value: true, label: 'Muted' },
            showControls: { value: false, label: 'Show Video Controls' },
            
            // Video fade controls
            enableVideoFade: { value: true, label: 'Enable Fade on Loop' },
            videoFadeDuration: { value: 1.5, min: 0.1, max: 5.0, step: 0.1, label: 'Fade Duration (seconds)' },
        };
    } else if (element.type === 'background-video') {
        return {
            ...controlsSchema,
            
            // Video playback controls
            autoplay: { value: true, label: 'Auto Play' },
            loop: { value: true, label: 'Loop Video' },
            muted: { value: true, label: 'Muted' },
            showControls: { value: false, label: 'Show Video Controls' },
            
            // Video fade controls
            enableVideoFade: { value: true, label: 'Enable Fade on Loop' },
            videoFadeDuration: { value: 1.5, min: 0.1, max: 5.0, step: 0.1, label: 'Fade Duration (seconds)' },
        };
    } else if (element.type === 'component') {
        // Include component-specific controls based on component name
        let baseComponentControls = {
            landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
        };
        
        if (element.name === 'RSVP Form') {
            // RSVP Form controls would be handled by the component itself
            return {
                ...controlsSchema,
                ...baseComponentControls,
                textColor: { value: '#333333', label: 'Text Color' },
                fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
                fontSizeAtStart: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ Start (px)' },
                fontSizeAtEnd: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ End (px)' },
                fontSizeAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Font Size Curve' },
                lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
            };
        } else if (element.name === 'Scrapbook') {
            // Scrapbook controls would be handled by the component itself
            return {
                ...controlsSchema,
                ...baseComponentControls,
            };
        } else if (element.name === 'Bottom Navbar') {
            // Bottom Navbar specific controls
            return {
                ...controlsSchema,
                navbarHeight: { value: '20vh', options: ['10vh', '15vh', '20vh', '25vh', '30vh', '35vh', '40vh'], label: 'Navbar Height' },
                backgroundColor: { value: '#000000', label: 'Background Color' },
                startingOpacity: { value: 0.8, min: 0, max: 1, step: 0.01, label: 'Starting Opacity' },
                endingOpacity: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Ending Opacity' },
                springConfig: { value: 'default', options: Object.keys(springConfigPresets), label: 'Animation Config' },
                textContent: { value: 'Bottom Navigation', label: 'Text Content' },
                textColor: { value: '#ffffff', label: 'Text Color' },
                fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
                fontSize: { value: 16, min: 8, max: 40, step: 1, label: 'Font Size (px)' },
                fontWeight: { value: 'normal', options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'], label: 'Font Weight' },
            };
        }

        // For unknown component types, just return basic controls
        return {
            ...controlsSchema,
            ...baseComponentControls,
        };
    }
    return controlsSchema;
};
