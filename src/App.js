import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { ParallaxProvider } from 'react-scroll-parallax';
import { LevaStoreProvider, useCreateStore } from 'leva'; // IMPORT THE PROVIDER AND HOOK
import './App.css';
import WeddingJourney from './components/WeddingJourney'; // Original Journey - RE-ADDED
import GuestExperience from './components/GuestExperience/GuestExperience'; // New Guest Experience
import axios from 'axios'; // Import axios
import { debounce } from 'lodash'; // ADD THIS IMPORT
import SetupLayout from './components/SetupPage/SetupLayout'; // Import SetupLayout
import ImageUploadSetup from './components/SetupPage/ImageUploadSetup'; // Ensure this is the correct path and component name
import { SetupModeProvider, useSetupMode } from './contexts/SetupModeContext'; // UPDATED: Added useSetupMode
import { useLevaStore } from './stores/levaStore'; // Ensure useLevaStore is imported
import { getApiBaseUrl } from './config/apiConfig'; // Import the centralized helper
import { useIsMobile } from './utils/deviceDetect'; // ADDED
import FontGrabber from './components/FontGrabber'; // ADDED
import AccountSetupPage from './components/SetupPage/AccountSetupPage';
import ExperienceSetupPage from './components/ExperienceSetupPage/ExperienceSetupPage'; // Added import
import HowToPage from './components/SetupPage/HowToPage'; // Added import for HowToPage
import MobileLayoutEditor from './components/SetupPage/MobileLayoutEditor'; // ADDED
import MobileLayoutPreview from './components/SetupPage/MobileLayoutPreview'; // ADDED

// --- Backend Configuration --- MOVED TO src/config/apiConfig.js ---
// const useLocalBackend = true; 
// const localApiBaseUrl = 'http://localhost:5000/api';
// const awsApiBaseUrl = 'https://dzqec1uyx0.execute-api.us-east-1.amazonaws.com/dev/api';
// const apiBaseUrl = useLocalBackend ? localApiBaseUrl : awsApiBaseUrl;
// --- End Backend Configuration ---

// Helper function to format ISO date to a more readable string
const formatDate = (isoDateString) => {
  if (!isoDateString) return 'Upcoming Date';
  try {
    const date = new Date(isoDateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    // Add 'th', 'st', 'nd', 'rd' to day
    const day = date.getDate();
    let dayWithSuffix;
    if (day > 3 && day < 21) dayWithSuffix = day + 'th';
    else {
      switch (day % 10) {
        case 1:  dayWithSuffix = day + "st"; break;
        case 2:  dayWithSuffix = day + "nd"; break;
        case 3:  dayWithSuffix = day + "rd"; break;
        default: dayWithSuffix = day + "th"; break;
      }
    }
    // getDate() returns day of month, getDay() returns day of week.
    // Manually construct string to ensure suffix is on the day with full month name.
    return `${date.toLocaleDateString('en-US', { month: 'long' })} ${dayWithSuffix} ${date.getFullYear()}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Upcoming Date';
  }
};

// ADDED: transformWeddingData function
export const transformWeddingData = (sourceData) => {
  if (!sourceData || !sourceData.customId) {
    console.warn('[App.js] transformWeddingData: sourceData is null or missing customId. Returning null.');
    return null;
  }
  return {
    id: sourceData.customId,
    eventName: sourceData.eventName,
    brideName: sourceData.brideName,
    groomName: sourceData.groomName,
    weddingDate: formatDate(sourceData.weddingDate),
    introBackground: sourceData.introBackground,
    introCouple: sourceData.introCouple,
    scrapbookImageFolder: sourceData.scrapbookImageFolder,
    // scrapbookImageFileNames: sourceData.scrapbookImages ? sourceData.scrapbookImages.map(img => img.fileName) : [],
    // Ensure scrapbookImages is an array before mapping, and handle null/undefined fileName
    scrapbookImageFileNames: Array.isArray(sourceData.scrapbookImages)
      ? sourceData.scrapbookImages.map(img => img && img.fileName ? img.fileName : null).filter(name => name !== null)
      : [],
    rsvpEndpoint: `${getApiBaseUrl()}/rsvp/${sourceData.customId}`,
    isPlated: sourceData.isPlated,
    platedOptions: sourceData.platedOptions || [],
    eventAddress: sourceData.eventAddress,
    // Pass through the raw scrapbookImages array as well, as WeddingJourneyWrapperForSetup uses it for resolvedScrapbookImages
    scrapbookImages: sourceData.scrapbookImages || [], 
    experienceSettings: sourceData.experienceSettings || { elements: [], markers: [], timelineLength: 1000, defaultLayoutSlotDesktop: 1, defaultLayoutSlotMobile: 1 }, // Include experienceSettings and defaultLayoutSlot
    // IMPORTANT: initialElementLayouts will be populated by the caller (WeddingPageController) based on the default slot
    initialElementLayouts: {}, 
    // Store all layout slots from sourceData directly for WeddingPageController to pick from
    allLayoutSlots: {
      desktop: {
        1: sourceData.layoutSettingsSlot1 || {},
        2: sourceData.layoutSettingsSlot2 || {},
        3: sourceData.layoutSettingsSlot3 || {},
        4: sourceData.layoutSettingsSlot4 || {},
        5: sourceData.layoutSettingsSlot5 || {},
      },
      mobile: {
        1: sourceData.layoutSettingsMobileSlot1 || {},
        2: sourceData.layoutSettingsMobileSlot2 || {},
        3: sourceData.layoutSettingsMobileSlot3 || {},
        4: sourceData.layoutSettingsMobileSlot4 || {},
        5: sourceData.layoutSettingsMobileSlot5 || {},
      }
    }
  };
};

// This component will decide whether to show Intro or Main content for a wedding
const WeddingPageController = ({ isSetupMode = false }) => {
  const { weddingId } = useParams();
  const [currentWeddingData, setCurrentWeddingData] = useState(null);
  const [error, setError] = useState(null); // State for API errors
  const isMobile = useIsMobile();
  const store = useLevaStore(); // Zustand store, not Leva store

  // --- ADDED: Auto-save logic for setup mode ---
  const debouncedSave = useCallback(debounce((settings) => {
    if (!isSetupMode) return;
    if (!settings || Object.keys(settings).length === 0) {
        console.log('Auto-save skipped: No settings to save.');
        return;
    }
    const viewType = isMobile ? 'mobile' : 'desktop';
    const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/${viewType}`;
    axios.post(apiUrl, { settings })
        .then(response => console.log(`${viewType} preview auto-saved.`, response.data.message))
        .catch(err => console.error(`Error auto-saving ${viewType} preview:`, err.response?.data?.message || err.message));
  }, 500), [weddingId, isMobile, isSetupMode]);

  const handleControlChange = useCallback(() => {
    if (!isSetupMode) return;
    setTimeout(() => {
      // getSettingsForSave now comes from the zustand store
      const newSettings = store.getSettingsForSave();
      debouncedSave(newSettings);
    }, 100);
  }, [store, debouncedSave, isSetupMode]);
  // --- END ADDED ---

  useEffect(() => {
    const fetchWeddingData = async () => {
      if (!weddingId) return;
      // console.log('[App.js] WeddingPageController - useEffect (data loading) triggered for weddingId:', weddingId);
      try {
        // Construct the backend API URL.
        const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}`; // Use imported getApiBaseUrl()
        const response = await axios.get(apiUrl);
        const sourceData = response.data;
        // console.log('[App.js] Fetched data from backend:', sourceData);
        if (sourceData && sourceData.scrapbookImages) {
          // console.log('[App.js] Raw sourceData.scrapbookImages from backend:', JSON.stringify(sourceData.scrapbookImages));
        }

        if (sourceData && sourceData.customId) {
          const transformedData = transformWeddingData(sourceData);
          // console.log('[App.js] Transformed data for GuestExperience:', transformedData);
          
          // Explicitly set initialElementLayouts based on view type AND default slot AFTER base transformation
          if (transformedData && transformedData.experienceSettings && transformedData.allLayoutSlots) {
            const viewType = isMobile ? 'mobile' : 'desktop';
            let initialLayout = {};

            // If in setup mode, try loading from preview endpoint first
            if (isSetupMode) {
              const previewApiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/${viewType}`;
              try {
                const previewResponse = await axios.get(previewApiUrl);
                if (previewResponse.data.settings && Object.keys(previewResponse.data.settings).length > 0) {
                  initialLayout = previewResponse.data.settings;
                  console.log(`[WeddingPageController] Loaded ${viewType} settings from PREVIEW.`);
                }
              } catch (previewErr) {
                console.warn(`[WeddingPageController] Could not fetch ${viewType} preview settings, will load from slot.`, previewErr.message);
              }
            }

            // If no preview data (or not in setup mode), load from default slot
            if (Object.keys(initialLayout).length === 0) {
              const defaultSlot = isMobile 
                ? (transformedData.experienceSettings.defaultLayoutSlotMobile || 1)
                : (transformedData.experienceSettings.defaultLayoutSlotDesktop || 1);
              
              const slotData = isMobile 
                ? transformedData.allLayoutSlots.mobile[defaultSlot] 
                : transformedData.allLayoutSlots.desktop[defaultSlot];
              
              initialLayout = slotData || {};
              console.log(`[WeddingPageController] Populating initialElementLayouts with ${viewType.toUpperCase()} settings for SLOT ${defaultSlot}:`, initialLayout);
              transformedData.defaultLayoutSlotToLoad = defaultSlot;
            } else {
              // If we loaded from preview, still tell Leva which slot is the "active" one
               const defaultSlot = isMobile 
                ? (transformedData.experienceSettings.defaultLayoutSlotMobile || 1)
                : (transformedData.experienceSettings.defaultLayoutSlotDesktop || 1);
              transformedData.defaultLayoutSlotToLoad = store.getState().currentPreviewingSlot || defaultSlot;
            }

            transformedData.initialElementLayouts = initialLayout;
            // Pass the default slot to GuestExperience so it can initialize its controls
            // transformedData.defaultLayoutSlotToLoad = defaultSlot; 

          } else {
            console.warn('[App.js] WeddingPageController: Missing experienceSettings or allLayoutSlots in transformedData. Cannot set initial layouts.');
            transformedData.initialElementLayouts = {};
            transformedData.defaultLayoutSlotToLoad = 1;
          }

          setCurrentWeddingData(transformedData);
          setError(null); // Clear any previous errors

          // Leva store loading can be handled inside GuestExperience if needed or removed if controls are local
          // try {
          //   console.log(`[App.js] WeddingPageController: Attempting to load ${isMobile ? 'MOBILE' : 'DESKTOP'} layout settings for ${weddingId}`);
          //   const viewType = isMobile ? 'mobile' : 'desktop';
          //   await useLevaStore.getState().loadSettingsFromServer(weddingId, viewType);
          //   console.log(`[App.js] WeddingPageController: Layout settings load attempt complete for ${weddingId}`);
          // } catch (layoutError) {
          //   console.error(`[App.js] WeddingPageController: Error loading ${isMobile ? 'MOBILE' : 'DESKTOP'} layout settings for ${weddingId}:`, layoutError);
          // }

        } else {
          // console.log('[App.js] No matching wedding data found or data is malformed from API for ID:', weddingId);
          setCurrentWeddingData(null);
          setError(`Wedding data for "${weddingId}" not found or is malformed.`);
        }
      } catch (err) {
        console.error('[App.js] Error fetching wedding data from backend:', err);
        setCurrentWeddingData(null);
        setError(`Failed to load wedding data for "${weddingId}". ${err.message}`);
        // Show an alert, which is more noticeable on mobile
        alert(`Error fetching wedding data for ${weddingId}: ${err.message}. Please check your network connection and ensure the backend server is accessible.`);
      }
    };

    fetchWeddingData();
  }, [weddingId, isMobile, isSetupMode]); // Added isSetupMode to dependencies

  useEffect(() => {
    if (currentWeddingData && currentWeddingData.eventName) {
      document.title = `${currentWeddingData.eventName} - Wedding WriteBack`;
    } else if (weddingId) {
      document.title = `Wedding ${weddingId} - Wedding WriteBack`;
    } else {
      document.title = 'Wedding WriteBack';
    }
  }, [currentWeddingData, weddingId]);

  // Fetch a fallback ID from a simple backend endpoint if needed (e.g., for the root path)
  // This is a placeholder, actual logic might involve fetching a list or a default wedding.
  useEffect(() => {
    const fetchFallbackId = async () => {
        try {
            // Example: fetch the first wedding or a specifically designated default wedding
            // For now, we'll assume a way to get a default ID if no weddingId is in URL.
            // This could be an endpoint like /api/weddings/default or fetching all and picking one.
            // const response = await axios.get('http://localhost:5000/api/some-default-wedding-id-endpoint');
            // setFallbackId(response.data.defaultId);
            // For now, keeping it simple with a hardcoded fallbackId if needed for root navigation.
        } catch (err) {
            console.error("Could not fetch fallback wedding ID", err);
        }
    };
    // fetchFallbackId(); // Uncomment and implement if you have a default wedding ID endpoint
  }, []);

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: 'red' }}>Error: {error}</div>;
  }

  if (!currentWeddingData) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Loading wedding details for "{weddingId}"...</div>;
  }

  // Now rendering GuestExperience instead of WeddingJourney
  return <GuestExperience 
    weddingDataFromApp={currentWeddingData} 
    experienceSettingsFromApp={currentWeddingData.experienceSettings} 
    weddingIdFromApp={weddingId}
    defaultLayoutSlotToLoad={currentWeddingData.defaultLayoutSlotToLoad}
    isSetupMode={isSetupMode}
    onControlChange={isSetupMode ? handleControlChange : () => {}}
  />;
};

// Define MainAppContent to use useLocation
const MainAppContent = () => {
  const location = useLocation(); // Get location here
  const isMobile = useIsMobile(); // ADDED: Define isMobile here
  const [defaultWeddingIdToUse, setDefaultWeddingIdToUse] = useState('erickson2025');

  // Get showGuideLines from Zustand store, but now pass it our central store
  const showGuideLinesFromStore = useLevaStore(state => state.controlValues.overallControls?.toggleGuideLines);

  useEffect(() => {
    // Placeholder for fetching default ID
  }, []);

  // Determine if guide lines should be potentially visible based on route
  const isSetupLayoutPage = location.pathname.endsWith('/setup/layout');

  return (
    <div className="App">
      {isSetupLayoutPage && showGuideLinesFromStore && (
        <>
          <div style={{
            position: 'fixed',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '1px',
            backgroundColor: 'red',
            zIndex: 10003,
            transform: 'translateX(-50%)'
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: 'blue',
            zIndex: 10003,
            transform: 'translateY(-50%)'
          }} />
        </>
      )}
      <Routes>
        <Route path="/:weddingId" element={<WeddingPageController isSetupMode={false} />} />
        <Route path="/:weddingId/mobile-preview" element={<MobileLayoutPreview />} />
        {defaultWeddingIdToUse && (
          <Route path="/" element={<Navigate to={`/${defaultWeddingIdToUse}`} replace />} />
        )}
        {!defaultWeddingIdToUse && (
              <Route path="/" element={<div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Loading default wedding...</div>} />
        )}
        <Route path="/:weddingId/setup" element={<SetupLayout />}>
          <Route index element={<Navigate to="images" replace />} />
          <Route path="images" element={<ImageUploadSetup />} />
          <Route path="layout" element={<WeddingPageController isSetupMode={true} />} />
          <Route path="layoutmobile" element={<MobileLayoutEditor />} />
          <Route path="account" element={<AccountSetupPage />} />
          <Route path="experience" element={<ExperienceSetupPage />} />
          <Route path="how-to" element={<HowToPage />} />
        </Route>
      </Routes>
    </div>
  );
}

const googleFontsToLoad = [
  { name: 'Roboto', weights: ['400', '700'] },
  { name: 'Open Sans', weights: ['400', '700'] },
  { name: 'Lato', weights: ['400', '700'] },
  { name: 'Montserrat', weights: ['400', '700'] },
  { name: 'Poppins', weights: ['400', '700'] },
  { name: 'Inter', weights: ['400', '700'] },
  { name: 'Source Sans 3', weights: ['400', '700'] },
  { name: 'Oswald', weights: ['400', '700'] },
  { name: 'Raleway', weights: ['400', '700'] },
  { name: 'Merriweather', weights: ['400', '700'] },
];

function App() {
  // Create the single, global Leva store here. This is the key to the fix.
  const levaStore = useCreateStore();
  const initializeLevaStore = useLevaStore((state) => state.initializeLevaStore);

  // On initial mount, pass the created Leva store instance to our Zustand store.
  useEffect(() => {
    if (initializeLevaStore) {
      initializeLevaStore(levaStore);
    }
  }, [initializeLevaStore, levaStore]);

  return (
    // Provide the store to the entire application.
    <LevaStoreProvider store={levaStore}>
      <ParallaxProvider>
        <SetupModeProvider>
          <Router>
            <FontGrabber fonts={googleFontsToLoad} />
            <MainAppContent />
          </Router>
        </SetupModeProvider>
      </ParallaxProvider>
    </LevaStoreProvider>
  );
}

export default App; 