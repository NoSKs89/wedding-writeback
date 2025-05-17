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
import { weddingDetails } from './components/WeddingData'; // Import from WeddingData.js, allTempImages removed

// Placeholder for where you might fetch wedding-specific data
// const weddingDetails = { ... }; // Removed local weddingDetails

// This component will decide whether to show Intro or Main content for a wedding
const WeddingPageController = () => {
  const { weddingId } = useParams();
  const [currentWeddingData, setCurrentWeddingData] = useState(null);
  const [resolvedScrapbookImages, setResolvedScrapbookImages] = useState([]);

  useEffect(() => {
    const data = weddingDetails[weddingId] || weddingDetails.defaultWedding;
    setCurrentWeddingData(data);

    // Resolve scrapbook images dynamically
    if (data && data.scrapbookImageFolder && data.scrapbookImageFileNames && data.scrapbookImageFileNames.length > 0) {
      const imagePaths = data.scrapbookImageFileNames.map(fileName => {
        // Ensure no double slashes if folder already ends with one, or filename starts with one (though unlikely for filename)
        const folder = data.scrapbookImageFolder.endsWith('/') ? data.scrapbookImageFolder : data.scrapbookImageFolder + '/';
        const name = fileName.startsWith('/') ? fileName.substring(1) : fileName;
        return folder + name;
      });
      setResolvedScrapbookImages(imagePaths);
    } else {
      setResolvedScrapbookImages([]); // Set to empty if no folder or files defined
    }
  }, [weddingId]);

  if (!currentWeddingData) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem' }}>Loading wedding details...</div>;
  }

  // Pass resolvedScrapbookImages to WeddingJourney
  return <WeddingJourney weddingData={currentWeddingData} resolvedScrapbookImages={resolvedScrapbookImages} />;
};

function App() {
  return (
    <ParallaxProvider> { /* ParallaxProvider should wrap the app or relevant part */}
      <Router>
        <div className="App">
          <Routes>
            <Route path="/:weddingId" element={<WeddingPageController />} />
            {/* Fallback route to a default wedding or a landing page listing weddings */}
            <Route path="/" element={<Navigate to="/defaultWedding" replace />} /> 
            {/* You could have a homepage listing weddings if there are many, e.g. <Route path="/" element={<WeddingList />} /> */}
          </Routes>
        </div>
      </Router>
    </ParallaxProvider>
  );
}

export default App; 