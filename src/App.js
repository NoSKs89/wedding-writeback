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

import ParallaxScrollIntro from './components/ParallaxScrollIntro';
import MainPage from './components/MainPage';
// Placeholder for where you might fetch wedding-specific data
const weddingDetails = {
  erickson2025: {
    id: 'erickson2025',
    brideName: 'Jane',
    groomName: 'John Erickson',
    weddingDate: 'October 26, 2025',
    introBackground: '/tempImages/intro-background.jpg', // Using conventional name
    introCouple: '/tempImages/intro-main-image.png', // Corrected to .png
    scrapbookImages: [
      '/tempImages/1E5A0847.jpg',
      '/tempImages/1E5A0839-Edit.jpg',
      '/tempImages/1E5A0833.jpg',
    ],
    rsvpEndpoint: '/api/rsvp/erickson2025', // Example endpoint specific to this wedding
  },
  defaultWedding: {
    id: 'default',
    brideName: 'Bride Name',
    groomName: 'Groom Name',
    weddingDate: 'Upcoming Date',
    introBackground: '/tempImages/intro-background.jpg', // Using conventional name
    introCouple: '/tempImages/intro-main-image.png', // Corrected to .png
    scrapbookImages: [
      '/tempImages/1E5A0814.jpg',
      '/tempImages/1E5A0812.jpg',
      '/tempImages/1E5A0808.jpg',
    ],
    rsvpEndpoint: '/api/rsvp/default',
  },
  // ... more weddings
};

// This component will decide whether to show Intro or Main content for a wedding
const WeddingPageController = () => {
  const { weddingId } = useParams();
  const [currentWeddingData, setCurrentWeddingData] = useState(null);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const data = weddingDetails[weddingId] || weddingDetails.defaultWedding;
    setCurrentWeddingData(data);
    // Reset intro visibility if weddingId changes - useful for SPA navigation
    // or decide if intro should only play once per session regardless of weddingId
    setShowIntro(true); 
  }, [weddingId]);

  const handleIntroComplete = () => {
    console.log('Intro completed, showing main page.');
    setShowIntro(false);
  };

  if (!currentWeddingData) {
    return <div>Loading wedding details...</div>;
  }

  if (showIntro) {
    return (
      <ParallaxScrollIntro
        brideName={currentWeddingData.brideName}
        groomName={currentWeddingData.groomName}
        weddingDate={currentWeddingData.weddingDate}
        bgImage={currentWeddingData.introBackground}
        coupleImage={currentWeddingData.introCouple}
        onIntroComplete={handleIntroComplete} // Pass the callback
      />
    );
  }

  return <MainPage weddingData={currentWeddingData} />;
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