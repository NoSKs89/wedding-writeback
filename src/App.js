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
import { weddingDetails, allTempImages } from './components/WeddingData'; // Import from WeddingData.js

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

    // Resolve scrapbook images based on the folder path
    if (data.scrapbookImageFolder === '/tempImages/') {
      setResolvedScrapbookImages(allTempImages);
    } else {
      // Potentially handle other folders or logic here in the future
      setResolvedScrapbookImages([]);
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