import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  Navigate,
  useLocation
} from 'react-router-dom';
import { ParallaxProvider } from 'react-scroll-parallax';
import './App.css';
import WeddingJourney from './components/WeddingJourney';
// import weddingDataJson from './testData.json'; // No longer directly import testData.json
import axios from 'axios'; // Import axios
import SetupLayout from './components/SetupPage/SetupLayout'; // Import SetupLayout
import ImageUploadSetup from './components/SetupPage/ImageUploadSetup'; // Import ImageUploadSetup
import { SetupModeProvider, useSetupMode } from './contexts/SetupModeContext'; // UPDATED: Added useSetupMode
import { useLevaStore } from './stores/levaStore'; // Ensure useLevaStore is imported
import { getApiBaseUrl } from './config/apiConfig'; // Import the centralized helper

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

// This component will decide whether to show Intro or Main content for a wedding
const WeddingPageController = ({ /*setShowGuideLines REMOVED*/ }) => {
  const { weddingId } = useParams();
  const [currentWeddingData, setCurrentWeddingData] = useState(null);
  const [resolvedScrapbookImages, setResolvedScrapbookImages] = useState([]);
  const [error, setError] = useState(null); // State for API errors
  const [fallbackId, setFallbackId] = useState('erickson2025'); // Default fallback ID

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
          const transformedData = {
            id: sourceData.customId,
            eventName: sourceData.eventName,
            brideName: sourceData.brideName,
            groomName: sourceData.groomName,
            weddingDate: formatDate(sourceData.weddingDate),
            // Removing fallbacks: if these are not in sourceData, they will be undefined
            introBackground: sourceData.introBackground,
            introCouple: sourceData.introCouple,
            scrapbookImageFolder: sourceData.scrapbookImageFolder,
            scrapbookImageFileNames: sourceData.scrapbookImages ? sourceData.scrapbookImages.map(img => img.fileName) : [],
            // The RSVP endpoint will be constructed by RSVPForm using this base and weddingId
            // FOR MOBILE TESTING: Ensure this also uses your computer's IP address if computerIpAddress above is changed.
            // rsvpEndpoint: `http://${computerIpAddress}:5000/api/rsvp/${sourceData.customId}`, 
            rsvpEndpoint: `${getApiBaseUrl()}/rsvp/${sourceData.customId}`, // Use imported getApiBaseUrl()
            isPlated: sourceData.isPlated,
            platedOptions: sourceData.platedOptions || [],
            eventAddress: sourceData.eventAddress
          };
          console.log('[App.js] Transformed data for WeddingJourney:', transformedData);
          if (transformedData.scrapbookImageFileNames) {
            console.log('[App.js] Transformed scrapbookImageFileNames:', JSON.stringify(transformedData.scrapbookImageFileNames));
          }
          setCurrentWeddingData(transformedData);
          setError(null); // Clear any previous errors
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
  }, [weddingId]);

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
  return <WeddingJourney weddingData={currentWeddingData} resolvedScrapbookImages={resolvedScrapbookImages} /*setShowGuideLines={setShowGuideLines} REMOVED*/ />;
};

// Define MainAppContent to use useLocation
const MainAppContent = () => {
  const location = useLocation(); // Get location here
  // const [showGuideLines, setShowGuideLines] = useState(true); // REMOVED: This state is controlled by WeddingJourney
  const [defaultWeddingIdToUse, setDefaultWeddingIdToUse] = useState('erickson2025');

  // Get showGuideLines from Zustand store
  const showGuideLinesFromStore = useLevaStore(state => state.controlValues.overallControls?.showGuideLines);

  useEffect(() => {
    // Placeholder for fetching default ID
  }, []);

  // Determine if guide lines should be potentially visible based on route
  const isSetupLayoutPage = location.pathname.endsWith('/setup/layout');

  return (
    <div className="App">
      {isSetupLayoutPage && showGuideLinesFromStore && ( // Only show on /setup/layout AND if Leva toggle is on
        <>
          <div style={{
            position: 'fixed',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '1px',
            backgroundColor: 'red',
            zIndex: 9999,
            transform: 'translateX(-50%)'
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: 'blue',
            zIndex: 9999,
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
          <Route path="layout" element={<WeddingJourneyWrapperForSetup />} />
          <Route path="images" element={<ImageUploadSetup />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ParallaxProvider>
      <SetupModeProvider>
        <Router>
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
  const { setIsSetupMode } = useSetupMode();
  const { weddingId } = useParams();
  const [weddingData, setWeddingData] = useState(null);
  const [resolvedScrapbookImages, setResolvedScrapbookImages] = useState([]);
  const [showGuideLines, setShowGuideLines] = useState(true); // This could be driven by Leva state too eventually
  const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
  const [error, setError] = useState(null); // New error state

  useEffect(() => {
    setIsSetupMode(true);
    let isMounted = true;

    // Reset states when weddingId changes to ensure fresh loading for the new ID
    setInitialLayoutLoaded(false);
    setWeddingData(null);
    setError(null);

    const fetchCoreDataAndLayout = async () => {
      if (!weddingId) {
        if (isMounted) {
          setError("Wedding ID is missing in URL for setup.");
          setInitialLayoutLoaded(true);
        }
        return;
      }

      try {
        const apiBase = getApiBaseUrl();
        console.log(`[App.js] WeddingJourneyWrapper: Fetching core data for ${weddingId}`);
        const response = await axios.get(`${apiBase}/weddings/${weddingId}`);
        const sourceData = response.data;

        if (!isMounted) return;

        if (sourceData && sourceData.customId) {
          const transformedData = {
            id: sourceData.customId,
            eventName: sourceData.eventName,
            brideName: sourceData.brideName,
            groomName: sourceData.groomName,
            weddingDate: formatDate(sourceData.weddingDate),
            introBackground: sourceData.introBackground,
            introCouple: sourceData.introCouple,
            scrapbookImageFolder: sourceData.scrapbookImageFolder,
            scrapbookImageFileNames: sourceData.scrapbookImages ? sourceData.scrapbookImages.map(img => img.fileName) : [],
            rsvpEndpoint: `${apiBase}/rsvp/${sourceData.customId}`,
            isPlated: sourceData.isPlated,
            platedOptions: sourceData.platedOptions || [],
            eventAddress: sourceData.eventAddress
          };
          setWeddingData(transformedData);
          if (transformedData.scrapbookImageFileNames) {
            const imagePaths = transformedData.scrapbookImageFileNames.map(fileName => {
               if (fileName && (fileName.startsWith('http://') || fileName.startsWith('https://'))) {
                   return fileName;
               }
               const folder = transformedData.scrapbookImageFolder.endsWith('/') ? transformedData.scrapbookImageFolder : transformedData.scrapbookImageFolder + '/';
               const name = fileName.startsWith('/') ? fileName.substring(1) : fileName;
               return folder + name;
           });
           setResolvedScrapbookImages(imagePaths);
         }
          setError(null); // Clear any previous error from a different weddingId load

          // Attempt to load layout settings
          try {
            console.log(`[App.js] WeddingJourneyWrapper: Attempting to load layout settings for ${weddingId}`);
            await useLevaStore.getState().loadSettingsFromServer(weddingId);
            if (!isMounted) return;
            console.log(`[App.js] WeddingJourneyWrapper: Layout settings load attempt complete for ${weddingId}`);
            // Non-critical error for layout settings, don't set main error state
            // setError(null); // Already cleared above, or layout specific error handling could go here
          } catch (layoutError) {
            if (!isMounted) return;
            console.error(`[App.js] WeddingJourneyWrapper: Error loading layout settings for ${weddingId}:`, layoutError);
            // Optionally set a non-critical error message for the user, e.g., using a toast notification
            // For now, we just log it and proceed with default layout if WeddingJourney handles it.
          }
        } else {
          setWeddingData(null);
          setError(`Wedding data for "${weddingId}" not found or is malformed.`);
        }
      } catch (coreErr) {
        if (!isMounted) return;
        console.error(`[App.js] WeddingJourneyWrapper: Error fetching core wedding data for ${weddingId}:`, coreErr);
        setWeddingData(null);
        setError(`Failed to load wedding data for "${weddingId}". ${coreErr.message || ''}`);
      } finally {
        if (isMounted) {
          setInitialLayoutLoaded(true);
        }
      }
    };

    fetchCoreDataAndLayout();

    return () => {
      isMounted = false;
      setIsSetupMode(false); 
    };
  }, [weddingId, setIsSetupMode]); // Dependency array updated

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
  if (weddingData) {
    return <WeddingJourney weddingData={weddingData} resolvedScrapbookImages={resolvedScrapbookImages} setShowGuideLines={setShowGuideLines} />;
  }

  // Default fallback (should ideally not be reached if logic above is complete)
  return <div style={{ padding: '20px', textAlign: 'center' }}>An unexpected issue occurred in setup mode.</div>;
};

export default App; 