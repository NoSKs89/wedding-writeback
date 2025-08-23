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
import GuestExperience from './components/GuestExperience/GuestExperience'; // New Guest Experience
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
import DesktopLayoutEditor from './components/SetupPage/DesktopLayoutEditor'; // ADDED
import PostUtilityPage from './components/SetupPage/PostUtilityPage';
import useWeddingData from './hooks/useWeddingData'; // Import the new hook
import ShareGallerySetupPage from './components/ShareGallery/ShareGallerySetupPage'; // ADDED
import ShareGalleryGuestPage from './components/ShareGallery/ShareGalleryGuestPage'; // ADDED
import RsvpSetupPage from './components/SetupPage/RsvpSetupPage'; // ADDED
import PromptFormSetupPage from './components/SetupPage/PromptFormSetupPage'; // ADDED
import NavbarSetupPage from './components/SetupPage/NavbarSetupPage'; // ADDED

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
    rsvpEndpoint: `${getApiBaseUrl()}/rsvp`,
    isPlated: sourceData.isPlated,
    allowKids: sourceData.allowKids !== undefined ? sourceData.allowKids : true,
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
  const { weddingData: rawWeddingData, experienceSettings, loading, error } = useWeddingData(weddingId);
  const isMobile = useIsMobile();
  const { setIsSetupMode } = useSetupMode();

  useEffect(() => {
    setIsSetupMode(isSetupMode);
  }, [isSetupMode, setIsSetupMode]);

  // Loading is now handled by the new preloading system in GuestExperience component
  if (loading) {
    return null; // Let GuestExperience handle its own loading
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Error loading wedding data: {error}</div>;
  }

  if (!rawWeddingData || !experienceSettings) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>No wedding data found.</div>;
  }

  // Transform the raw wedding data and populate initialElementLayouts with the correct default slot
  const transformedWeddingData = transformWeddingData(rawWeddingData);
  if (!transformedWeddingData) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Error processing wedding data.</div>;
  }

  // Determine the default layout slot to load based on experience settings and device type
  const defaultSlot = isMobile 
    ? (experienceSettings.defaultLayoutSlotMobile || 1)
    : (experienceSettings.defaultLayoutSlotDesktop || 1);

  // Load the correct layout data for the default slot
  const viewType = isMobile ? 'mobile' : 'desktop';
  const slotData = transformedWeddingData.allLayoutSlots?.[viewType]?.[defaultSlot] || {};
  
  // IMPORTANT: The layout settings in the raw wedding data are stored directly, 
  // but the levaStore expects them to be wrapped in a 'settings' property
  // to match what the /layoutSettings/:viewType endpoint returns
  const formattedSlotData = slotData && Object.keys(slotData).length > 0 
    ? slotData 
    : {};

  // Set the initialElementLayouts to the correct slot data
  transformedWeddingData.initialElementLayouts = formattedSlotData;

  // Render the GuestExperience with properly transformed data
  return (
    <GuestExperience
      weddingDataFromApp={transformedWeddingData}
      experienceSettingsFromApp={experienceSettings}
      weddingIdFromApp={weddingId}
      defaultLayoutSlotToLoad={defaultSlot}
      isSetupModeFromProps={isSetupMode}
    />
  );
};

// Define MainAppContent to use useLocation
const MainAppContent = () => {
  const location = useLocation(); // Get location here
  const isMobile = useIsMobile(); // ADDED: Define isMobile here
  const [defaultWeddingIdToUse, setDefaultWeddingIdToUse] = useState(() => {
    // Use test wedding ID in development, empty string in production
    if (process.env.NODE_ENV === 'development') {
      let testConfig;
      try {
        testConfig = require('../config/secrets');
        return testConfig.TEST_CUSTOM_ID || '';
      } catch (error) {
        return '';
      }
    }
    return '';
  });

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
          <Route path="rsvp" element={<RsvpSetupPage />} />
          <Route path="promptform" element={<PromptFormSetupPage />} />
          <Route path="navbar" element={<NavbarSetupPage />} />
          <Route path="share-gallery" element={<ShareGallerySetupPage />} />
                          <Route path="layout" element={<DesktopLayoutEditor />} />
                <Route path="layoutmobile" element={<MobileLayoutEditor />} />
                <Route path="post" element={<PostUtilityPage />} />
          <Route path="account" element={<AccountSetupPage />} />
          <Route path="experience" element={<ExperienceSetupPage />} />
          <Route path="how-to" element={<HowToPage />} />
        </Route>
        <Route path="/:weddingId/share-gallery/:guid" element={<ShareGalleryGuestPage />} />
        <Route path="/:weddingId/share-gallery" element={<ShareGalleryGuestPage />} />
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
  { name: 'Alex Brush', weights: ['400'] },
  { name: 'Allura', weights: ['400'] },
  { name: 'Cookie', weights: ['400'] },
  { name: 'Kaushan Script', weights: ['400'] },
  { name: 'Pacifico', weights: ['400'] },
  { name: 'Rouge Script', weights: ['400'] },
  { name: 'Tangerine', weights: ['400'] },
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