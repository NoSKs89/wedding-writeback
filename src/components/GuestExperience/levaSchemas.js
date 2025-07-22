import { fontFamilyOptions, googleFontNames, isGoogleFont } from '../../config/fontConfig';

// Import component schemas - we need to import these dynamically to avoid circular dependencies
let rsvpFormControlsSchema;
let scrapbookLayoutControlsSchema;

// Helper to safely import RSVP schema
const getRsvpFormControlsSchema = () => {
    if (!rsvpFormControlsSchema) {
        try {
            const rsvpModule = require('../RSVPForm');
            rsvpFormControlsSchema = rsvpModule.rsvpFormControlsSchema;
        } catch (error) {
            console.warn('Could not import RSVP Form controls schema:', error);
            rsvpFormControlsSchema = {};
        }
    }
    return rsvpFormControlsSchema;
};

// Helper to safely import Scrapbook schema
const getScrapbookLayoutControlsSchema = () => {
    if (!scrapbookLayoutControlsSchema) {
        try {
            const scrapbookModule = require('./InteractiveScrapbook');
            scrapbookLayoutControlsSchema = scrapbookModule.scrapbookLayoutControlsSchema;
        } catch (error) {
            console.warn('Could not import Scrapbook Layout controls schema:', error);
            scrapbookLayoutControlsSchema = {};
        }
    }
    return scrapbookLayoutControlsSchema;
};

// Helper to safely import Prompt Form schema
let promptFormControlsSchema = null; // Cache the schema
const getPromptFormControlsSchema = () => {
    if (!promptFormControlsSchema) {
        try {
            const promptFormModule = require('../PromptForm');
            promptFormControlsSchema = promptFormModule.promptFormControlsSchema;
        } catch (error) {
            console.warn('Could not import Prompt Form controls schema:', error);
            promptFormControlsSchema = {};
        }
    }
    return promptFormControlsSchema;
};

// Helper to generate element-specific RSVP controls with correct render paths
const getElementSpecificRsvpControls = (element) => {
    const baseSchema = getRsvpFormControlsSchema();
    const folderName = generateElementFolderName(element);
    
    // Update render paths to use the element folder name
    return Object.entries(baseSchema).reduce((acc, [key, value]) => {
        if (value.render && typeof value.render === 'function') {
            // Update the render function to use the element folder name
            acc[key] = {
                ...value,
                render: (get) => {
                    // For useThemeButtonColors dependency
                    if (key === 'cantMakeItColor' || key === 'canMakeItColor') {
                        return !get(`${folderName}.useThemeButtonColors`);
                    }
                    // For formHeight dependency on overwriteFlexHeight
                    if (key === 'formHeight') {
                        return get(`${folderName}.overwriteFlexHeight`);
                    }
                    return value.render(get);
                }
            };
        } else {
            acc[key] = value;
        }
        return acc;
    }, {});
};

// Helper to generate element-specific Prompt Form controls with correct render paths
const getElementSpecificPromptFormControls = (element) => {
    const baseSchema = getPromptFormControlsSchema();
    const folderName = generateElementFolderName(element);
    
    // Update render paths to use the element folder name
    return Object.entries(baseSchema).reduce((acc, [key, value]) => {
        if (value.render && typeof value.render === 'function') {
            // Update the render function to use the element folder name
            acc[key] = {
                ...value,
                render: (get) => {
                    // For formWidth dependency on overwriteFlexWidth
                    if (key === 'formWidth') {
                        return get(`${folderName}.overwriteFlexWidth`);
                    }
                    // For formHeight dependency on overwriteFlexHeight
                    if (key === 'formHeight') {
                        return get(`${folderName}.overwriteFlexHeight`);
                    }
                    return value.render(get);
                }
            };
        } else {
            acc[key] = value;
        }
        return acc;
    }, {});
};

// Helper function to generate consistent folder names across components
export const generateElementFolderName = (element) => {
    let namePart;
    
    // Helper function to sanitize text - removes special chars, keeps only alphanumeric and underscores
    const sanitizeText = (text) => {
        return text
            .replace(/[^a-zA-Z0-9\s]/g, '') // Remove all special characters except spaces
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    };
    
    if (element.type === 'text') {
        if (typeof element.content === 'string' && element.content.trim()) {
            // Use sanitized and truncated text content for folder name
            const cleanContent = sanitizeText(element.content.trim());
            namePart = cleanContent.substring(0, 12);
        } else {
            namePart = 'Text';
        }
    } else if (element.type === 'photo' || element.type === 'background-image' || element.type === 'video' || element.type === 'background-video') {
        if (element.content) {
            // Extract filename without extension and sanitize
            const filename = element.content.split('/').pop() || element.content;
            const nameWithoutExt = filename.split('.')[0];
            const sanitizedName = sanitizeText(nameWithoutExt);
            namePart = sanitizedName.substring(0, 12);
        } else {
            namePart = element.type === 'background-image' ? 'BgImg' 
                     : element.type === 'background-video' ? 'BgVideo'
                     : element.type === 'video' ? 'Video'
                     : 'Photo';
        }
    } else if (element.type === 'component') {
        // For component types, sanitize the name and add underscores between words
        if (element.name) {
            const sanitizedName = sanitizeText(element.name);
            namePart = sanitizedName.substring(0, 12);
        } else {
            namePart = 'Component';
        }
    } else {
        namePart = element.name || element.type;
    }
    
    // ALWAYS use the new convention: element_id_type_namePart
    return `element_${element.id}_${element.type}_${namePart}`;
};

// Easing functions
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const linear = t => t;
const easeInCubic = t => t * t * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInQuint = t => t * t * t * t * t;
const easeInQuart = t => t * t * t * t;
const easeOutQuad = t => 1 - Math.pow(1 - t, 2);
const easeInSextic = t => t * t * t * t * t * t;

const quickInSlowOut = t => {
  const midPointRawProgress = 0.15;
  if (t <= midPointRawProgress) {
    if (midPointRawProgress === 0) return 0;
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

export const springConfigPresets = {
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

export const weddingColorSchemes = [
    { name: "Classic Elegance", primary: '#FDFDFD', secondary: '#B08D57', accent: '#D8BFD8', text: '#36454F', background: '#F5F5F5' },
    { name: "Romantic Blush", primary: '#FADADD', secondary: '#F4C2C2', accent: '#C0C0C0', text: '#5A5A5A', background: '#FFF0F5' },
    { name: "Rustic Charm", primary: '#DEB887', secondary: '#8FBC8F', accent: '#A0522D', text: '#4A4A4A', background: '#FAF0E6' },
    { name: "Ocean Breeze", primary: '#ADD8E6', secondary: '#B0E0E6', accent: '#F0E68C', text: '#2F4F4F', background: '#F0FFFF' },
    { name: "Enchanted Forest", primary: '#228B22', secondary: '#556B2F', accent: '#DAA520', text: '#F8F8FF', background: '#F5F5DC' },
    { name: "Modern Minimalist", primary: '#FFFFFF', secondary: '#E0E0E0', accent: '#333333', text: '#212121', background: '#F9F9F9' },
    { name: "Vintage Glamour", primary: '#E6E6FA', secondary: '#778899', accent: '#FFD700', text: '#483D8B', background: '#FFF5EE' },
    { name: "Sunset Glow", primary: '#FF7F50', secondary: '#FFDAB9', accent: '#FFA07A', text: '#8B4513', background: '#FFF8DC' }
];

export const overallControlsSchemaDefinitionGuest = (isSetupModeFromContext) => ({
    showHUD: { value: false, label: 'Show Debug HUD (Guest)' },
    springPreset: { value: 'default', options: Object.keys(springConfigPresets), label: 'Animation Physics Preset (Guest)' },
    colorScheme: { value: weddingColorSchemes[0].name, options: weddingColorSchemes.map(scheme => scheme.name), label: 'Color Scheme' },
    overallFontFamily: { value: fontFamilyOptions[0], options: fontFamilyOptions, label: 'Global Font Family' },
    previewingLayoutSlot: { value: 1, options: [1, 2, 3, 4, 5], label: 'Previewing Layout Slot' },
    saveToLayoutSlot: { value: 1, options: [1, 2, 3, 4, 5], label: 'Save to Layout Slot' },
});

export const getElementSchema = (element, globalFontFamilyFromStore) => {
    let controlsSchema = {
        autoSequence: { 
            value: null, 
            options: ['none', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], 
            label: 'Auto Navigation' 
        },
        opacityAtStart: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ Start' },
        opacityAtMiddle: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ Middle' },
        opacityAtEnd: { value: 1, min: 0, max: 1, step: 0.01, label: 'Opacity @ End' },
        opacityAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Opacity Curve' },
    };

    if (element.type === 'text') {
        return {
            ...controlsSchema,
            landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
            textColor: { value: '#333333', label: 'Text Color' },
            fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
            fontSizeAtStart: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ Start (px)' },
            fontSizeAtEnd: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ End (px)' },
            fontSizeAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Font Size Curve' },
            lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
            paddingLeft: { value: 0, min: 0, max: 200, step: 1, label: 'Padding Left (px)' },
            paddingRight: { value: 0, min: 0, max: 200, step: 1, label: 'Padding Right (px)' },
            enableParentContainer: { value: false, label: 'Enable Parent Container' },
            containerSize: { value: 400, min: 100, max: 1200, step: 10, label: 'Container Size (px)', render: (get) => {
                const folderName = generateElementFolderName(element);
                return get(`${folderName}.enableParentContainer`);
            }},
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
            // Rotate In Animation Controls for Text
            rotateInEffect: { value: false, label: 'Enable Rotate In Effect' },
            rotateInType: { 
                value: 'vertical-90', 
                options: [
                    'vertical-15',
                    'vertical-30',
                    'vertical-45',
                    'vertical-90', 
                    'vertical-180', 
                    'vertical-270', 
                    'horizontal-15',
                    'horizontal-30',
                    'horizontal-45',
                    'horizontal-90', 
                    'horizontal-180', 
                    'horizontal-270',
                    'clockwise-15',
                    'clockwise-30',
                    'clockwise-45',
                    'clockwise-90',
                    'clockwise-180',
                    'clockwise-270',
                    'counter-clockwise-15',
                    'counter-clockwise-30',
                    'counter-clockwise-45',
                    'counter-clockwise-90',
                    'counter-clockwise-180',
                    'counter-clockwise-270'
                ], 
                label: 'Rotate In Type',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Rotate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Rotate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            // Translate In Animation Controls for Text
            translateInEffect: { value: false, label: 'Enable Translate In Effect' },
            translateInDirection: { 
                value: 'from-left', 
                options: [
                    'from-left',
                    'from-right', 
                    'from-top',
                    'from-bottom'
                ], 
                label: 'Translate In Direction',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Translate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Translate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDistance: { 
                value: 200, 
                min: 50, 
                max: 1000, 
                step: 10, 
                label: 'Translate In Distance (px)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
        };
            } else if (element.type === 'photo' && element.name !== 'background-image') {
        return {
            ...controlsSchema,
            landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
            endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
            scaleEndYPosition: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Scale End Y (% duration)' },
            scaleAnimationCurve: { value: 'linear', options: Object.keys(animationCurves), label: 'Scale Animation Curve' },
            lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
            // Rotate In Animation Controls
            rotateInEffect: { value: false, label: 'Enable Rotate In Effect' },
            rotateInType: { 
                value: 'vertical-90', 
                options: [
                    'vertical-15',
                    'vertical-30',
                    'vertical-45',
                    'vertical-90', 
                    'vertical-180', 
                    'vertical-270', 
                    'horizontal-15',
                    'horizontal-30',
                    'horizontal-45',
                    'horizontal-90', 
                    'horizontal-180', 
                    'horizontal-270',
                    'clockwise-15',
                    'clockwise-30',
                    'clockwise-45',
                    'clockwise-90',
                    'clockwise-180',
                    'clockwise-270',
                    'counter-clockwise-15',
                    'counter-clockwise-30',
                    'counter-clockwise-45',
                    'counter-clockwise-90',
                    'counter-clockwise-180',
                    'counter-clockwise-270'
                ], 
                label: 'Rotate In Type',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Rotate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Rotate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            // Translate In Animation Controls
            translateInEffect: { value: false, label: 'Enable Translate In Effect' },
            translateInDirection: { 
                value: 'from-left', 
                options: [
                    'from-left',
                    'from-right', 
                    'from-top',
                    'from-bottom'
                ], 
                label: 'Translate In Direction',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Translate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Translate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDistance: { 
                value: 200, 
                min: 50, 
                max: 1000, 
                step: 10, 
                label: 'Translate In Distance (px)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
        };
            } else if (element.type === 'video') {
        return {
            ...controlsSchema,
            landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
            endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
            scaleEndYPosition: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Scale End Y (% duration)' },
            scaleAnimationCurve: { value: 'linear', options: Object.keys(animationCurves), label: 'Scale Animation Curve' },
            lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
            // Video-specific controls
            autoplay: { value: true, label: 'Autoplay Video' },
            loop: { value: true, label: 'Loop Video' },
            muted: { value: true, label: 'Muted (required for autoplay)' },
            showControls: { value: false, label: 'Show Video Controls' },
            // Rotate In Animation Controls
            rotateInEffect: { value: false, label: 'Enable Rotate In Effect' },
            rotateInType: { 
                value: 'vertical-90', 
                options: [
                    'vertical-15',
                    'vertical-30',
                    'vertical-45',
                    'vertical-90', 
                    'vertical-180', 
                    'vertical-270', 
                    'horizontal-15',
                    'horizontal-30',
                    'horizontal-45',
                    'horizontal-90', 
                    'horizontal-180', 
                    'horizontal-270',
                    'clockwise-15',
                    'clockwise-30',
                    'clockwise-45',
                    'clockwise-90',
                    'clockwise-180',
                    'clockwise-270',
                    'counter-clockwise-15',
                    'counter-clockwise-30',
                    'counter-clockwise-45',
                    'counter-clockwise-90',
                    'counter-clockwise-180',
                    'counter-clockwise-270'
                ], 
                label: 'Rotate In Type',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Rotate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Rotate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            // Translate In Animation Controls
            translateInEffect: { value: false, label: 'Enable Translate In Effect' },
            translateInDirection: { 
                value: 'from-left', 
                options: [
                    'from-left',
                    'from-right', 
                    'from-top',
                    'from-bottom'
                ], 
                label: 'Translate In Direction',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Translate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Translate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDistance: { 
                value: 200, 
                min: 50, 
                max: 1000, 
                step: 10, 
                label: 'Translate In Distance (px)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
        };
            } else if (element.type === 'background-image') {
        return {
            ...controlsSchema,
            cropToCircleEffect: { value: false, label: 'Enable Circle Crop & Shrink' },
            circleEffectCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Circle Effect Curve' },
            circleInitialRadius: { value: 150, min: 50, max: 200, step: 1, label: 'Circle Initial Radius (%)' },
            circleFinalRadius: { value: 0, min: 0, max: 100, step: 1, label: 'Circle Final Radius (%)' },
            bgImageInitialScale: { value: 1, min: 0.1, max: 3, step: 0.01, label: 'BG Initial Scale' },
            bgImageFinalScale: { value: 0.1, min: 0, max: 3, step: 0.01, label: 'BG Final Scale' },
            startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
            endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
            // Rotate In Animation Controls
            rotateInEffect: { value: false, label: 'Enable Rotate In Effect' },
            rotateInType: { 
                value: 'vertical-90', 
                options: [
                    'vertical-15',
                    'vertical-30',
                    'vertical-45',
                    'vertical-90', 
                    'vertical-180', 
                    'vertical-270', 
                    'horizontal-15',
                    'horizontal-30',
                    'horizontal-45',
                    'horizontal-90', 
                    'horizontal-180', 
                    'horizontal-270',
                    'clockwise-15',
                    'clockwise-30',
                    'clockwise-45',
                    'clockwise-90',
                    'clockwise-180',
                    'clockwise-270',
                    'counter-clockwise-15',
                    'counter-clockwise-30',
                    'counter-clockwise-45',
                    'counter-clockwise-90',
                    'counter-clockwise-180',
                    'counter-clockwise-270'
                ], 
                label: 'Rotate In Type',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Rotate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Rotate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            // Translate In Animation Controls
            translateInEffect: { value: false, label: 'Enable Translate In Effect' },
            translateInDirection: { 
                value: 'from-left', 
                options: [
                    'from-left',
                    'from-right', 
                    'from-top',
                    'from-bottom'
                ], 
                label: 'Translate In Direction',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Translate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Translate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDistance: { 
                value: 200, 
                min: 50, 
                max: 1000, 
                step: 10, 
                label: 'Translate In Distance (px)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
        };
            } else if (element.type === 'background-video') {
        return {
            ...controlsSchema,
            cropToCircleEffect: { value: false, label: 'Enable Circle Crop & Shrink' },
            circleEffectCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Circle Effect Curve' },
            circleInitialRadius: { value: 150, min: 50, max: 200, step: 1, label: 'Circle Initial Radius (%)' },
            circleFinalRadius: { value: 0, min: 0, max: 100, step: 1, label: 'Circle Final Radius (%)' },
            bgImageInitialScale: { value: 1, min: 0.1, max: 3, step: 0.01, label: 'BG Initial Scale' },
            bgImageFinalScale: { value: 0.1, min: 0, max: 3, step: 0.01, label: 'BG Final Scale' },
            startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
            endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
            // Video-specific controls for background videos
            autoplay: { value: true, label: 'Autoplay Video' },
            loop: { value: true, label: 'Loop Video' },
            muted: { value: true, label: 'Muted (required for autoplay)' },
            showControls: { value: false, label: 'Show Video Controls' },
            // Rotate In Animation Controls
            rotateInEffect: { value: false, label: 'Enable Rotate In Effect' },
            rotateInType: { 
                value: 'vertical-90', 
                options: [
                    'vertical-15',
                    'vertical-30',
                    'vertical-45',
                    'vertical-90', 
                    'vertical-180', 
                    'vertical-270', 
                    'horizontal-15',
                    'horizontal-30',
                    'horizontal-45',
                    'horizontal-90', 
                    'horizontal-180', 
                    'horizontal-270',
                    'clockwise-15',
                    'clockwise-30',
                    'clockwise-45',
                    'clockwise-90',
                    'clockwise-180',
                    'clockwise-270',
                    'counter-clockwise-15',
                    'counter-clockwise-30',
                    'counter-clockwise-45',
                    'counter-clockwise-90',
                    'counter-clockwise-180',
                    'counter-clockwise-270'
                ], 
                label: 'Rotate In Type',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Rotate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            rotateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Rotate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.rotateInEffect`);
                }
            },
            // Translate In Animation Controls
            translateInEffect: { value: false, label: 'Enable Translate In Effect' },
            translateInDirection: { 
                value: 'from-left', 
                options: [
                    'from-left',
                    'from-right', 
                    'from-top',
                    'from-bottom'
                ], 
                label: 'Translate In Direction',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInCurve: { 
                value: 'linear', 
                options: ['disabled', ...Object.keys(animationCurves)], 
                label: 'Translate In Curve',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDuration: { 
                value: 0.5, 
                min: 0, 
                max: 1, 
                step: 0.01, 
                label: 'Translate In Duration (% of element duration)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
            translateInDistance: { 
                value: 200, 
                min: 50, 
                max: 1000, 
                step: 10, 
                label: 'Translate In Distance (px)',
                render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.translateInEffect`);
                }
            },
        };
    } else if (element.type === 'component') {
        // Include component-specific controls based on component name
        let componentSpecificControls = {};
        let baseComponentControls = {
            landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
            landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
            lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
        };
        
        if (element.name === 'RSVP Form') {
            componentSpecificControls = getElementSpecificRsvpControls(element);
            // RSVP Form needs some basic text controls for form styling
            return {
                ...controlsSchema,
                ...baseComponentControls,
                ...componentSpecificControls,
                textColor: { value: '#333333', label: 'Text Color' },
                fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
                fontSizeAtStart: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ Start (px)' },
                fontSizeAtEnd: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ End (px)' },
                fontSizeAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Font Size Curve' },
                lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
                paddingLeft: { value: 0, min: 0, max: 200, step: 1, label: 'Padding Left (px)' },
                paddingRight: { value: 0, min: 0, max: 200, step: 1, label: 'Padding Right (px)' },
                enableParentContainer: { value: false, label: 'Enable Parent Container' },
                containerSize: { value: 400, min: 100, max: 1200, step: 10, label: 'Container Size (px)', render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.enableParentContainer`);
                }},
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
        } else if (element.name === 'Prompt Form') {
            componentSpecificControls = getElementSpecificPromptFormControls(element);
            // Prompt Form needs some basic text controls for form styling
            return {
                ...controlsSchema,
                ...baseComponentControls,
                ...componentSpecificControls,
                textColor: { value: '#333333', label: 'Text Color' },
                fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
                fontSizeAtStart: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ Start (px)' },
                fontSizeAtEnd: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ End (px)' },
                fontSizeAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Font Size Curve' },
                lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
                paddingLeft: { value: 0, min: 0, max: 200, step: 1, label: 'Padding Left (px)' },
                paddingRight: { value: 0, min: 0, max: 200, step: 1, label: 'Padding Right (px)' },
                enableParentContainer: { value: false, label: 'Enable Parent Container' },
                containerSize: { value: 400, min: 100, max: 1200, step: 10, label: 'Container Size (px)', render: (get) => {
                    const folderName = generateElementFolderName(element);
                    return get(`${folderName}.enableParentContainer`);
                }},
                spreadAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Spread Curve' },
                yOffsetAtAnimStart: { value: 20, step: 1, label: 'Y Offset @ Anim Start (px)' },
                yOffsetAtAnimEnd: { value: 0, step: 1, label: 'Y Offset @ Anim End (px)' },
            };
        } else if (element.name === 'Scrapbook') {
            componentSpecificControls = getScrapbookLayoutControlsSchema();
            // Scrapbook doesn't need text controls, just its own layout controls
            return {
                ...controlsSchema,
                ...baseComponentControls,
                ...componentSpecificControls,
            };
        } else if (element.name === 'Bottom Navbar') {
            // Bottom Navbar specific controls
            const schema = {
                ...controlsSchema,
                navbarHeight: { value: '20vh', options: ['5vh', '7.5vh', '10vh', '15vh', '20vh', '25vh', '30vh', '35vh', '40vh'], label: 'Navbar Height' },
                backgroundColor: { value: '#000000', label: 'Background Color' },
                startingOpacity: { value: 0.8, min: 0, max: 1, step: 0.01, label: 'Starting Opacity' },
                endingOpacity: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Ending Opacity' },
                springConfig: { value: 'default', options: Object.keys(springConfigPresets), label: 'Animation Config' },
                textContent: { value: 'Bottom Navigation', label: 'Text Content' },
                textColor: { value: '#ffffff', label: 'Text Color' },
                buttonColor: { value: '#333333', label: 'Button Color' },
                buttonFontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Button Font Family' },
                contentFontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Content Font Family' },
                buttonFontSize: { value: 16, min: 8, max: 40, step: 1, label: 'Button Font Size (px)' },
                modalContentFontSize: { value: 16, min: 8, max: 40, step: 1, label: 'Modal Content Font Size (px)' },
                fontWeight: { value: 'normal', options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'], label: 'Font Weight' },
                // Item dimensions and spacing
                itemWidth: { value: 120, min: 60, max: 200, step: 5, label: 'Item Width (px)' },
                itemHeight: { value: 50, min: 15, max: 100, step: 5, label: 'Item Height (px)' },
                itemSpacing: { value: 20, min: 0, max: 60, step: 5, label: 'Item Spacing (px)' },
                topPadding: { value: 0, min: 0, max: 50, step: 5, label: 'Top Padding (px)' },
                bottomPadding: { value: 0, min: 0, max: 50, step: 5, label: 'Bottom Padding (px)' },
            };
            
            // DEBUG: Log schema to verify buttonColor is included
            // console.log(`🔧 Schema: Bottom Navbar schema generated`, {
            //     timestamp: Date.now(),
            //     elementId: element.id,
            //     hasButtonColor: 'buttonColor' in schema,
            //     buttonColorValue: schema.buttonColor?.value,
            //     schemaKeys: Object.keys(schema)
            // });
            
            return schema;
        }

        // For unknown component types, just return basic controls
        return {
            ...controlsSchema,
            ...baseComponentControls,
        };
    }
    return controlsSchema;
}; 