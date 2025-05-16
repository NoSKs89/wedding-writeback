import React, { useState, useEffect } from 'react';
import ScrapbookBackground from './ScrapbookBackground';
import RSVPForm from './RSVPForm';

const MainPage = ({ weddingData }) => {
  // introCompleted state is no longer needed here as App.js/WeddingPageController handles it
  const [showRSVP, setShowRSVP] = useState(true); 

  const mainPageStyle = {
    paddingTop: '0px', // No padding needed if intro is fully gone
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", // Example font
    position: 'relative', // For z-indexing context if scrapbook is absolute
    zIndex: 1,
  };

  const contentStyle = {
    maxWidth: '900px',
    margin: '50px auto', // Give some space from top
    padding: '30px',
    backgroundColor: 'rgba(255,255,255,0.85)', 
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    position: 'relative', 
    zIndex: 10, 
  };

  // Use scrapbookImages from weddingData, or provide a default array if it's missing/empty
  const scrapbookImages = weddingData?.scrapbookImages?.length > 0 
    ? weddingData.scrapbookImages 
    : [
        '/tempImages/1E5A0814.jpg', // Example default image
        '/tempImages/1E5A0812.jpg', // Example default image
        // Add more default paths if needed
      ];

  return (
    <div style={mainPageStyle} className="main-page-container">
      {scrapbookImages.length > 0 && (
        <ScrapbookBackground images={scrapbookImages} />
      )}

      <div style={contentStyle} className="main-content">
        <h2>Welcome to Our Wedding Celebration!</h2>
        <p>
          We're so excited to celebrate with you. Find all the details you need on this page.
          More information about the venue, schedule, and other festivities will be shared here.
        </p>
        {/* You might add more sections here like Our Story, Photos, Registry, etc. */}
      </div>

      {showRSVP && <RSVPForm weddingId={weddingData?.id} backendUrl={weddingData?.rsvpEndpoint} />}
    </div>
  );
};

export default MainPage;