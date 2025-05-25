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
import './App.css';
import WeddingJourney from './components/WeddingJourney';
import WeddingJourneyMobile from './components/WeddingJourneyMobile';
// import weddingDataJson from './testData.json'; // No longer directly import testData.json
import axios from 'axios'; // Import axios
import SetupLayout from './components/SetupPage/SetupLayout'; // Import SetupLayout
import ImageUploadSetup from './components/SetupPage/ImageUploadSetup'; // Ensure this is the correct path and component name
import { SetupModeProvider, useSetupMode } from './contexts/SetupModeContext'; // UPDATED: Added useSetupMode
import { useLevaStore } from './stores/levaStore'; // Ensure useLevaStore is imported
import { getApiBaseUrl } from './config/apiConfig'; // Import the centralized helper
import { useIsMobile } from './utils/deviceDetect'; // ADDED
import FontGrabber from './components/FontGrabber'; // ADDED
import AccountSetupPage from './components/SetupPage/AccountSetupPage';

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
const transformWeddingData = (sourceData) => {
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
  };
};

// This component will decide whether to show Intro or Main content for a wedding
const WeddingPageController = ({ /*setShowGuideLines REMOVED*/ }) => {
  const { weddingId } = useParams();
  const [currentWeddingData, setCurrentWeddingData] = useState(null);
  const [resolvedScrapbookImages, setResolvedScrapbookImages] = useState([]);
  const [error, setError] = useState(null); // State for API errors
  const [fallbackId, setFallbackId] = useState('erickson2025'); // Default fallback ID
  const isMobile = useIsMobile(); // ADDED

  // useEffect(() => {
  //   alert(`WeddingPageController: isMobile = ${isMobile}. Loading ${isMobile ? 'Mobile' : 'Desktop'} version for weddingId: ${weddingId}`);
  // }, [isMobile, weddingId]);

  useEffect(() => {
    const fetchWeddingData = async () => {
      if (!weddingId) return;
      console.log('[App.js] WeddingPageController - useEffect (data loading) triggered for weddingId:', weddingId);
      try {
        // Construct the backend API URL.
        const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}`; // Use imported getApiBaseUrl()
        const response = await axios.get(apiUrl);
        const sourceData = response.data;
        console.log('[App.js] Fetched data from backend:', sourceData);
        if (sourceData && sourceData.scrapbookImages) {
          console.log('[App.js] Raw sourceData.scrapbookImages from backend:', JSON.stringify(sourceData.scrapbookImages));
        }

        if (sourceData && sourceData.customId) {
          const transformedData = transformWeddingData(sourceData);
          console.log('[App.js] Transformed data for WeddingJourney:', transformedData);
          if (transformedData.scrapbookImageFileNames) {
            console.log('[App.js] Transformed scrapbookImageFileNames:', JSON.stringify(transformedData.scrapbookImageFileNames));
          }
          setCurrentWeddingData(transformedData);
          setError(null); // Clear any previous errors

          // ADDED: Attempt to load layout settings for the regular wedding page view
          try {
            console.log(`[App.js] WeddingPageController: Attempting to load ${isMobile ? 'MOBILE' : 'DESKTOP'} layout settings for ${weddingId}`);
            // MODIFIED: Use consolidated loadSettingsFromServer with viewType
            const viewType = isMobile ? 'mobile' : 'desktop';
            await useLevaStore.getState().loadSettingsFromServer(weddingId, viewType);
            console.log(`[App.js] WeddingPageController: Layout settings load attempt complete for ${weddingId}`);
          } catch (layoutError) {
            console.error(`[App.js] WeddingPageController: Error loading ${isMobile ? 'MOBILE' : 'DESKTOP'} layout settings for ${weddingId}:`, layoutError);
            // Non-critical error, just log and continue
          }

        } else {
          console.log('[App.js] No matching wedding data found or data is malformed from API for ID:', weddingId);
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
  }, [weddingId, isMobile]);

  useEffect(() => {
    if (currentWeddingData && currentWeddingData.scrapbookImageFolder && currentWeddingData.scrapbookImageFileNames && currentWeddingData.scrapbookImageFileNames.length > 0) {
      const imagePaths = currentWeddingData.scrapbookImageFileNames.map(fileName => {
        // If fileName is already an absolute URL (e.g., from S3), use it directly.
        if (fileName && (fileName.startsWith('http://') || fileName.startsWith('https://'))) {
          return fileName;
        }
        // Otherwise, construct the path as before (for local fallbacks, though unlikely for S3 setup)
        const folder = currentWeddingData.scrapbookImageFolder.endsWith('/') ? currentWeddingData.scrapbookImageFolder : currentWeddingData.scrapbookImageFolder + '/';
        const name = fileName.startsWith('/') ? fileName.substring(1) : fileName;
        return folder + name;
      });
      console.log('[App.js] Generated imagePaths for scrapbook:', JSON.stringify(imagePaths));
      setResolvedScrapbookImages(imagePaths);
    } else {
      console.log('[App.js] No scrapbook images to resolve or missing folder/filenames. Setting resolvedScrapbookImages to [].');
      setResolvedScrapbookImages([]);
    }
  }, [currentWeddingData]); // This effect depends on the processed currentWeddingData

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

  console.log('[App.js] Passing resolvedScrapbookImages to WeddingJourney:', JSON.stringify(resolvedScrapbookImages));
  const JourneyComponent = isMobile ? WeddingJourneyMobile : WeddingJourney;
  return <JourneyComponent weddingData={currentWeddingData} resolvedScrapbookImages={resolvedScrapbookImages} /*setShowGuideLines={setShowGuideLines} REMOVED*/ />;
};

// Define MainAppContent to use useLocation
const MainAppContent = () => {
  const location = useLocation(); // Get location here
  const isMobile = useIsMobile(); // ADDED: Define isMobile here
  // const [showGuideLines, setShowGuideLines] = useState(true); // REMOVED: This state is controlled by WeddingJourney
  const [defaultWeddingIdToUse, setDefaultWeddingIdToUse] = useState('erickson2025');

  // Get showGuideLines from Zustand store
  const showGuideLinesFromStore = useLevaStore(state => state.controlValues.overallControls?.toggleGuideLines);

  useEffect(() => {
    // Placeholder for fetching default ID
  }, []);

  // Determine if guide lines should be potentially visible based on route
  const isSetupLayoutPage = location.pathname.endsWith('/setup/layout');

  return (
    <div className="App">
      {isSetupLayoutPage && ( // Only show on /setup/layout AND if Leva toggle is on
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
        <Route path="/:weddingId" element={<WeddingPageController /*setShowGuideLines={setShowGuideLines} REMOVED*/ />} />
        {defaultWeddingIdToUse && (
          <Route path="/" element={<Navigate to={`/${defaultWeddingIdToUse}`} replace />} />
        )}
        {!defaultWeddingIdToUse && (
              <Route path="/" element={<div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Loading default wedding...</div>} />
        )}
        <Route path="/:weddingId/setup" element={<SetupLayout />}>
          <Route index element={<Navigate to="images" replace />} />
          <Route path="images" element={<ImageUploadSetup />} />
          <Route path="layout" element={<WeddingJourneyWrapperForSetup />} />
          <Route path="account" element={<AccountSetupPage />} />
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
  return (
    <ParallaxProvider>
      <SetupModeProvider>
        <Router>
          <FontGrabber fonts={googleFontsToLoad} />
          <MainAppContent />
        </Router>
      </SetupModeProvider>
    </ParallaxProvider>
  );
}

// Placeholder wrapper component to set setup mode for WeddingJourney
// This will eventually fetch weddingData similar to WeddingPageController
// or WeddingPageController will be refactored to be more versatile.
const WeddingJourneyWrapperForSetup = () => {
  const { weddingId } = useParams();
  const { setIsSetupMode } = useSetupMode();
  const [weddingData, setWeddingData] = useState(null);
  const [resolvedScrapbookImages, setResolvedScrapbookImages] = useState([]);
  const [showGuideLines, setShowGuideLines] = useState(true); // This could be driven by Leva state too eventually
  const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
  const [error, setError] = useState(null); // New error state
  const isMobile = useIsMobile(); // ADDED

  const fetchCoreDataAndLayout = useCallback(async () => {
    if (!weddingId) return;
    console.log(`[App.js] WeddingJourneyWrapper: Fetching core data for ${weddingId}`);
    setInitialLayoutLoaded(false); // Reset for new weddingId
    setError(null); // Reset error state
    
    try { // ADDED OUTER TRY
      let coreData;
      try {
        const response = await axios.get(`${getApiBaseUrl()}/weddings/${weddingId}`);
        coreData = response.data;
        if (coreData && Object.keys(coreData).length > 0) {
          const transformed = transformWeddingData(coreData);
          setWeddingData(transformed);
          if (transformed && transformed.scrapbookImageFolder && transformed.scrapbookImageFileNames) {
            const imagePaths = transformed.scrapbookImageFileNames.map(fileName => {
              if (fileName && (fileName.startsWith('http://') || fileName.startsWith('https://'))) {
                return fileName;
              }
              const folder = transformed.scrapbookImageFolder.endsWith('/') ? transformed.scrapbookImageFolder : transformed.scrapbookImageFolder + '/';
              const name = fileName.startsWith('/') ? fileName.substring(1) : fileName;
              return folder + name;
            });
            setResolvedScrapbookImages(imagePaths);
          } else {
            setResolvedScrapbookImages([]);
          }
        } else {
          console.error('[App.js] WeddingJourneyWrapper: No core data returned or data is empty');
          setWeddingData(null);
          setError('Wedding data not found or is empty.');
          // Still set initialLayoutLoaded true so we don't hang on loading forever
          setInitialLayoutLoaded(true); 
          return; // Stop if core data fetch failed but indicate loading is done
        }
      } catch (err) {
        console.error('[App.js] WeddingJourneyWrapper: Error fetching core wedding data:', err);
        setError(err.message || 'Failed to fetch wedding data.');
        setWeddingData(null);
        // Still set initialLayoutLoaded true so we don't hang on loading forever
        setInitialLayoutLoaded(true);
        return; // Stop if core data fetch failed but indicate loading is done
      }

      // If core data loaded successfully, proceed to load layout settings
      try {
        console.log(`[App.js] WeddingJourneyWrapper: Attempting to load ${isMobile ? 'MOBILE' : 'DESKTOP'} layout settings for ${weddingId}`);
        // MODIFIED: Use consolidated loadSettingsFromServer with viewType
        const viewType = isMobile ? 'mobile' : 'desktop';
        await useLevaStore.getState().loadSettingsFromServer(weddingId, viewType);
        console.log('[App.js] WeddingJourneyWrapper: Layout settings loaded.');
      } catch (layoutError) {
        console.error(`[App.js] WeddingJourneyWrapper: Error loading ${isMobile ? 'MOBILE' : 'DESKTOP'} layout settings:`, layoutError);
        // Non-critical for initial display, component will use defaults. Logged already.
        // setError('Failed to load layout settings.'); // Optionally set an error message
      }
      setInitialLayoutLoaded(true);
    } catch (overallError) { // ADDED OUTER CATCH
      console.error('[App.js] WeddingJourneyWrapper: Critical error in fetchCoreDataAndLayout:', overallError);
      setError('A critical error occurred while loading setup data.');
      setWeddingData(null);
      setInitialLayoutLoaded(true); // Ensure UI updates out of loading state
    }
  }, [weddingId, isMobile]); // isMobile dependency is correct here

  // useEffect to call fetchCoreDataAndLayout
  useEffect(() => {
    if (weddingId) {
      setIsSetupMode(true); // Set setup mode when this wrapper is active
      fetchCoreDataAndLayout();
    }
    // Cleanup function to reset setup mode when component unmounts or weddingId changes
    return () => {
      setIsSetupMode(false);
    };
  }, [weddingId, fetchCoreDataAndLayout, setIsSetupMode]);

  // Revised render logic
  if (!initialLayoutLoaded && !error) { 
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading wedding and layout data for setup...</div>;
  }

  if (error && !weddingData) { 
    return <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>Error: {error}</div>;
  }
  
  if (initialLayoutLoaded && !weddingData && !error) { // Loaded, no critical error, but no data
    return <div style={{ padding: '20px', textAlign: 'center' }}>Wedding data for "{weddingId}" could not be loaded or was not found.</div>;
  }

  if (!weddingData && !error) { // Fallback if somehow weddingData is null but initialLayoutLoaded is false and no error yet (should be caught by first condition)
    return <div style={{ padding: '20px', textAlign: 'center' }}>Preparing setup mode...</div>;
  }
  
  if (!weddingData && error) { // If there was an error and weddingData ended up null (already handled by second condition, but for clarity)
     return <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>Error: {error}</div>;
  }

  // If weddingData is present, render WeddingJourney. 
  // A non-critical layout error might have occurred but is only logged for now.
  const JourneyComponent = isMobile ? WeddingJourneyMobile : WeddingJourney;
  return <JourneyComponent
    weddingData={weddingData}
    resolvedScrapbookImages={resolvedScrapbookImages} // Use the state variable for resolved images
  />;
};

export default App; 