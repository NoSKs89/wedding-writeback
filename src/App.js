import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  Navigate
} from 'react-router-dom';
import { ParallaxProvider } from 'react-scroll-parallax';
import './App.css';
import WeddingJourney from './components/WeddingJourney';
// import weddingDataJson from './testData.json'; // No longer directly import testData.json
import axios from 'axios'; // Import axios
import SetupLayout from './components/SetupPage/SetupLayout'; // Import SetupLayout
import ImageUploadSetup from './components/SetupPage/ImageUploadSetup'; // Import ImageUploadSetup

//todo:
// -if past wedding date, have the form change to be a comment about the wedding... like a memory
// -perhaps even allow a user to upload a photo from the wedding?

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
    return `${date.toLocaleDateString('en-US', { month: 'long' })} ${dayWithSuffix}, ${date.getFullYear()}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Upcoming Date';
  }
};

// This component will decide whether to show Intro or Main content for a wedding
const WeddingPageController = ({ setShowGuideLines }) => {
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
        // Construct the backend API URL. Ensure your backend is running on port 5000.
        const apiUrl = `http://localhost:5000/api/weddings/${weddingId}`;
        const response = await axios.get(apiUrl);
        const sourceData = response.data;
        console.log('[App.js] Fetched data from backend:', sourceData);

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
            rsvpEndpoint: `http://localhost:5000/api/rsvp/${sourceData.customId}`, 
            isPlated: sourceData.isPlated,
            platedOptions: sourceData.platedOptions || [],
            eventAddress: sourceData.eventAddress
          };
          console.log('[App.js] Transformed data for WeddingJourney:', transformedData);
          setCurrentWeddingData(transformedData);
          setError(null); // Clear any previous errors
        } else {
          console.log('[App.js] No matching wedding data found or data is malformed from API for ID:', weddingId);
          setCurrentWeddingData(null);
          setError(`Wedding data for "${weddingId}" not found.`);
        }
      } catch (err) {
        console.error('[App.js] Error fetching wedding data from backend:', err);
        setCurrentWeddingData(null);
        setError(`Failed to load wedding data for "${weddingId}". ${err.message}`);
      }
    };

    fetchWeddingData();
  }, [weddingId]);

  useEffect(() => {
    if (currentWeddingData && currentWeddingData.scrapbookImageFolder && currentWeddingData.scrapbookImageFileNames && currentWeddingData.scrapbookImageFileNames.length > 0) {
      const imagePaths = currentWeddingData.scrapbookImageFileNames.map(fileName => {
        const folder = currentWeddingData.scrapbookImageFolder.endsWith('/') ? currentWeddingData.scrapbookImageFolder : currentWeddingData.scrapbookImageFolder + '/';
        const name = fileName.startsWith('/') ? fileName.substring(1) : fileName;
        return folder + name;
      });
      setResolvedScrapbookImages(imagePaths);
    } else {
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

  return <WeddingJourney weddingData={currentWeddingData} resolvedScrapbookImages={resolvedScrapbookImages} setShowGuideLines={setShowGuideLines} />;
};

function App() {
  const [showGuideLines, setShowGuideLines] = useState(true);
  // const defaultWeddingId = weddingDataJson.customId; // No longer using weddingDataJson directly here
  // Use a state for defaultWeddingId if it needs to be fetched or is dynamic
  const [defaultWeddingIdToUse, setDefaultWeddingIdToUse] = useState('erickson2025'); // Default or fetch later

  // Placeholder: In a real app, you might fetch this default ID from your backend
  useEffect(() => {
    // async function fetchAndSetDefaultId() {
    //   try {
    //     // const result = await axios.get('http://localhost:5000/api/some-default-wedding-id-endpoint');
    //     // setDefaultWeddingIdToUse(result.data.id);
    //   } catch (e) { console.error("Could not fetch default wedding ID", e); }
    // }
    // fetchAndSetDefaultId();
  }, []);

  return (
    <ParallaxProvider>
      <Router>
        <div className="App">
          {showGuideLines && (
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
            <Route path="/:weddingId" element={<WeddingPageController setShowGuideLines={setShowGuideLines} />} />
            {/* Fallback route to a default wedding ID */}
            {defaultWeddingIdToUse && (
              <Route path="/" element={<Navigate to={`/${defaultWeddingIdToUse}`} replace />} />
            )}
            {!defaultWeddingIdToUse && (
                 <Route path="/" element={<div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Loading default wedding...</div>} />
            )}
            {/* Setup Routes: Changed from /setup/:weddingId to /:weddingId/setup */}
            <Route path="/:weddingId/setup" element={<SetupLayout />}>
              <Route path="images" element={<ImageUploadSetup />} />
              {/* Add other setup sub-routes here if needed */}
            </Route>
          </Routes>
        </div>
      </Router>
    </ParallaxProvider>
  );
}

export default App; 