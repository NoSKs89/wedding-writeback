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
import weddingDataJson from './testData.json'; // Import from testData.json

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

  useEffect(() => {
    const sourceData = weddingDataJson; // Use the imported JSON directly
    console.log('[App.js] WeddingPageController - useEffect (data loading) triggered.');
    console.log('[App.js] weddingId from URL params:', weddingId);
    console.log('[App.js] sourceData (from testData.json):', sourceData);

    if (sourceData && sourceData.customId) {
      console.log('[App.js] sourceData.customId:', sourceData.customId);
      console.log('[App.js] Comparison (sourceData.customId === weddingId):', sourceData.customId === weddingId);
    } else {
      console.log('[App.js] sourceData or sourceData.customId is missing.');
    }

    if (sourceData && sourceData.customId === weddingId) {
      const transformedData = {
        id: sourceData.customId,
        eventName: sourceData.eventName,
        brideName: sourceData.brideName,
        groomName: sourceData.groomName,
        weddingDate: formatDate(sourceData.weddingDate),
        introBackground: '/tempImages/mainImages/intro-background.jpg',
        introCouple: '/tempImages/mainImages/intro-main-image.png',
        scrapbookImageFolder: '/tempImages/scrapbookImages/',
        scrapbookImageFileNames: sourceData.scrapbookImages.map(img => img.fileName),
        rsvpEndpoint: `/api/rsvp/${sourceData.customId}`,
        isPlated: sourceData.isPlated,
        platedOptions: sourceData.platedOptions || [],
        eventAddress: sourceData.eventAddress
      };
      console.log('[App.js] Transformed data for WeddingJourney:', transformedData);
      setCurrentWeddingData(transformedData);
    } else {
      console.log('[App.js] Setting currentWeddingData to null (no match or missing data).');
      setCurrentWeddingData(null); 
    }
  }, [weddingId]);

  useEffect(() => {
    // This effect runs AFTER the one above, once currentWeddingData is set (or remains null)
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
    } else {
      document.title = 'Wedding WriteBack';
    }
  }, [currentWeddingData]);

  if (!currentWeddingData) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Loading wedding details or not found...</div>;
  }

  return <WeddingJourney weddingData={currentWeddingData} resolvedScrapbookImages={resolvedScrapbookImages} setShowGuideLines={setShowGuideLines} />;
};

function App() {
  const [showGuideLines, setShowGuideLines] = useState(true);

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
            {/* Fallback route to the wedding defined in testData.json */}
            <Route path="/" element={<Navigate to={`/${weddingDataJson.customId}`} replace />} />
          </Routes>
        </div>
      </Router>
    </ParallaxProvider>
  );
}

export default App; 