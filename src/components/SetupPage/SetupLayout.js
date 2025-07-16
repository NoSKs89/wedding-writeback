import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSpring, animated } from 'react-spring';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig'; // Import the centralized helper
import { useIsMobile } from '../../utils/deviceDetect'; // ADDED
import styles from './SetupLayout.module.css';
import NavigationModal from './NavigationModal'; // Import generic NavigationModal

// Create a context for setup authentication
const SetupAuthContext = createContext(null);

export const useSetupAuth = () => useContext(SetupAuthContext);

// Helper function for API base URL (can be moved to a shared util if used in more places)
// const getApiBaseUrl = () => {
//   // Assuming 'development' environment implies local backend.
//   // process.env.NODE_ENV is typically 'development', 'production', or 'test'.
//   const useLocalBackend = process.env.NODE_ENV === 'development';
//   const localApiBaseUrl = 'http://localhost:5000/api';
//   const awsApiBaseUrl = 'https://dzqec1uyx0.execute-api.us-east-1.amazonaws.com/dev/api'; // Ensure this is your correct AWS URL
//   return useLocalBackend ? localApiBaseUrl : awsApiBaseUrl;
// };

// Simple Password Modal (can be styled better or moved to its own file)
const PasswordModal = ({ weddingId, onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    console.log('[PasswordModal] Verifying password for weddingId:', weddingId);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await axios.post(`${apiBaseUrl}/weddings/${weddingId}/verify-setup-password`, { password });
      if (response.data.success) {
        onAuthenticated();
      } else {
        setError(response.data.message || 'Invalid password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error verifying password. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
        <h3>Setup Access for {weddingId}</h3>
        <p>Please enter the setup password:</p>
        <input 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', margin: '10px 0', width: '200px' }}
          disabled={isLoading}
        />
        <br />
        <button type="submit" disabled={isLoading} style={{ padding: '10px 20px' }}>
          {isLoading ? 'Verifying...' : 'Submit'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>
    </div>
  );
};

const SetupLayout = () => {
  const { weddingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktopLayoutPage = location.pathname.endsWith('/setup/layout');
  const isMobileLayoutPage = location.pathname.endsWith('/setup/layoutmobile');
  const isExperienceSetupPage = location.pathname.includes('/setup/experience') || location.pathname.includes('/setup/how-to'); // Include how-to page for full width background
  const isMobile = useIsMobile(); // ADDED
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false); // State for mobile nav modal

  // Hover navbar state for mobile layout page
  const [isNavbarVisible, setIsNavbarVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState(null);

  // Store auth per weddingId. In a real app, consider more robust session/token management.
  const [isAuthenticatedForWedding, setIsAuthenticatedForWedding] = useState(() => {
    const storedAuth = sessionStorage.getItem(`setupAuth_${weddingId}`);
    return storedAuth === 'true';
  });

  // Update page title based on current route
  useEffect(() => {
    if (weddingId) {
      const pathname = location.pathname;
      const formattedWeddingId = weddingId.charAt(0).toUpperCase() + weddingId.slice(1);
      
      let pageTitle = `${formattedWeddingId} Setup`;
      
      if (pathname.includes('/setup/layout')) {
        pageTitle = `${formattedWeddingId} - Desktop Layout Editor`;
      } else if (pathname.includes('/setup/layoutmobile')) {
        pageTitle = `${formattedWeddingId} - Mobile Layout Editor`;
      } else if (pathname.includes('/setup/experience')) {
        pageTitle = `${formattedWeddingId} - Experience Setup`;
      } else if (pathname.includes('/setup/account')) {
        pageTitle = `${formattedWeddingId} - Account Settings`;
      } else if (pathname.includes('/setup/rsvp')) {
        pageTitle = `${formattedWeddingId} - RSVP Setup`;
      } else if (pathname.includes('/setup/promptform')) {
        pageTitle = `${formattedWeddingId} - Prompt Form Setup`;
      } else if (pathname.includes('/setup/navbar')) {
        pageTitle = `${formattedWeddingId} - Navbar Setup`;
      } else if (pathname.includes('/setup/images')) {
        pageTitle = `${formattedWeddingId} - Image Management`;
      } else if (pathname.includes('/setup/share-gallery')) {
        pageTitle = `${formattedWeddingId} - Share Gallery`;
      } else if (pathname.includes('/setup/post')) {
        pageTitle = `${formattedWeddingId} - POST Utility`;
      } else if (pathname.includes('/setup/how-to')) {
        pageTitle = `${formattedWeddingId} - How To Guide`;
      }
      
      document.title = pageTitle;
    }
    
    // Cleanup function to reset title
    return () => {
      document.title = 'WeddingWriteback';
    };
  }, [weddingId, location.pathname]);

  useEffect(() => {
    // If weddingId changes, re-evaluate auth from sessionStorage
    const storedAuth = sessionStorage.getItem(`setupAuth_${weddingId}`);
    setIsAuthenticatedForWedding(storedAuth === 'true');
  }, [weddingId]);

  // Spring animation for navbar
  const navbarSpring = useSpring({
    opacity: isNavbarVisible ? 1 : 0,
    transform: isNavbarVisible ? 'translateY(0%)' : 'translateY(-100%)',
    config: { tension: 300, friction: 30 }
  });

  // Mouse move handler for mobile layout page
  useEffect(() => {
    if (!isMobileLayoutPage) return;

    const clearHideTimeout = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        setHideTimeout(null);
      }
    };

    const scheduleHide = () => {
      clearHideTimeout();
      const timeout = setTimeout(() => {
        setIsNavbarVisible(false);
        setHideTimeout(null);
      }, 500); // 0.5 second delay
      setHideTimeout(timeout);
    };

    const handleMouseMove = (e) => {
      const hoverZone = window.innerHeight * 0.0001; // Show navbar when mouse is within 0.01% of viewport height from top
      const isInTopZone = e.clientY < hoverZone;
      
      // Also check if mouse is over the navbar itself (when it's visible)
      const navbarElement = document.querySelector('.navbar-hover-area');
      const isOverNavbar = navbarElement && navbarElement.contains(e.target);
      
      const shouldShowNavbar = isInTopZone || isOverNavbar;
      
      if (shouldShowNavbar) {
        clearHideTimeout();
        setIsNavbarVisible(true);
      } else if (isNavbarVisible && !shouldShowNavbar) {
        // Only start hide timer if navbar is currently visible and mouse is not in valid zones
        scheduleHide();
      }
    };

    const handleMouseLeave = () => {
      if (isNavbarVisible) {
        scheduleHide();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearHideTimeout();
    };
  }, [isMobileLayoutPage, isNavbarVisible, hideTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  const handleAuthentication = () => {
    sessionStorage.setItem(`setupAuth_${weddingId}`, 'true');
    setIsAuthenticatedForWedding(true);
  };

  if (!weddingId) {
    // Should not happen if routes are set up correctly, but as a fallback.
    return <p>No wedding ID specified for setup.</p>;
  }

  // Placeholder for fetching wedding data to check if setupPassword is even configured
  // This is important because if no password is set, you might not want to show the modal,
  // or show a different message.
  // For now, we assume a password is required for any setup page.

  if (!isAuthenticatedForWedding) {
    return <PasswordModal weddingId={weddingId} onAuthenticated={handleAuthentication} />;
  }

  // Provide auth context to children if needed (though simple sessionStorage is used here)
  const authContextValue = { isAuthenticated: isAuthenticatedForWedding, weddingId };

  return (
    <SetupAuthContext.Provider value={authContextValue}>
      <div className="setup-page-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {!isDesktopLayoutPage && (
          isMobileLayoutPage ? (
            <animated.header 
              className={`${styles.header} navbar-hover-area`} 
              style={{
                ...navbarSpring,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                pointerEvents: isNavbarVisible ? 'auto' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <h2 style={{ paddingLeft: '10px' }}>Setup: {weddingId}</h2>
                {isMobile && (
                  <button 
                    className={styles.hamburgerButton} 
                    onClick={() => setIsMobileNavOpen(true)}
                    aria-label="Open navigation menu"
                    disabled={isMobileNavOpen}
                  >
                    <div />
                    <div />
                    <div />
                  </button>
                )}
              </div>
              <nav className={styles.nav}>
                {!isMobile && (
                  <>
                    <button onClick={() => navigate(`/${weddingId}/setup/how-to`)} className={styles.navButton}>How To</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/experience`)} className={styles.navButton}>Experience Setup</button>
                    
                    <div className={styles.dropdown}>
                      <button className={styles.navButton}>Image Management</button>
                      <div className={styles.dropdownContent}>
                        <Link to={`/${weddingId}/setup/images`}>Scrapbook Images</Link>
                        <Link to={`/${weddingId}/setup/share-gallery`}>Guest Share Gallery</Link>
                      </div>
                    </div>

                    <button onClick={() => navigate(`/${weddingId}/setup/layout`)} className={styles.navButton}>Advanced Layout Setup</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/layoutmobile`)} className={styles.navButton}>Mobile Layout Editor</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/post`)} className={styles.navButton}>POST Utility</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/account`)} className={styles.navButton}>Account Settings</button>
                    
                    <hr style={{margin: '15px 0', width: '100%' }} />
                    <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px', textAlign: 'center' }}>Components</div>
                    <button onClick={() => navigate(`/${weddingId}/setup/rsvp`)} className={styles.navButton}>RSVP Setup</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/promptform`)} className={styles.navButton}>Prompt Form Setup</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/navbar`)} className={styles.navButton}>Navbar Setup</button>
                    <hr style={{margin: '15px 0', width: '100%' }} /> {/* Ensure hr takes full width when visible */}
                  </>
                )}
                {/* Conditionally render hr OR ensure nav itself has no height when empty on mobile */}
              </nav>
            </animated.header>
          ) : (
            <header className={styles.header}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <h2 style={{ paddingLeft: '10px' }}>Setup: {weddingId}</h2>
                {isMobile && (
                  <button 
                    className={styles.hamburgerButton} 
                    onClick={() => setIsMobileNavOpen(true)}
                    aria-label="Open navigation menu"
                    disabled={isMobileNavOpen}
                  >
                    <div />
                    <div />
                    <div />
                  </button>
                )}
              </div>
              <nav className={styles.nav}>
                {!isMobile && (
                  <>
                    <button onClick={() => navigate(`/${weddingId}/setup/how-to`)} className={styles.navButton}>How To</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/experience`)} className={styles.navButton}>Experience Setup</button>
                    
                    <div className={styles.dropdown}>
                      <button className={styles.navButton}>Image Management</button>
                      <div className={styles.dropdownContent}>
                        <Link to={`/${weddingId}/setup/images`}>Scrapbook Images</Link>
                        <Link to={`/${weddingId}/setup/share-gallery`}>Guest Share Gallery</Link>
                      </div>
                    </div>

                    <button onClick={() => navigate(`/${weddingId}/setup/layout`)} className={styles.navButton}>Advanced Layout Setup</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/layoutmobile`)} className={styles.navButton}>Mobile Layout Editor</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/post`)} className={styles.navButton}>POST Utility</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/account`)} className={styles.navButton}>Account Settings</button>
                    
                    <hr style={{margin: '15px 0', width: '100%' }} />
                    <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px', textAlign: 'center' }}>Components</div>
                    <button onClick={() => navigate(`/${weddingId}/setup/rsvp`)} className={styles.navButton}>RSVP Setup</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/promptform`)} className={styles.navButton}>Prompt Form Setup</button>
                    <button onClick={() => navigate(`/${weddingId}/setup/navbar`)} className={styles.navButton}>Navbar Setup</button>
                    <hr style={{margin: '15px 0', width: '100%' }} /> {/* Ensure hr takes full width when visible */}
                  </>
                )}
                {/* Conditionally render hr OR ensure nav itself has no height when empty on mobile */}
              </nav>
            </header>
          )
        )}
        {(isDesktopLayoutPage || isMobileLayoutPage) && (
          <div style={{ 
            position: 'fixed', 
            top: '10px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 10002, // Above Leva and Save button
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '0.9em'
          }}>
            Editing: {isMobileLayoutPage ? 'Mobile View' : 'Desktop View'}
          </div>
        )}
        <main 
          className={isExperienceSetupPage ? styles.mainContentFullWidth : styles.mainContent}
          style={isExperienceSetupPage ? { flexGrow: 1, display: 'flex' } : { flexGrow: 1 }} // Ensure main content can grow, and set display flex for ExperiencePage parent
        >
          <Outlet />
        </main>
        {isMobile && 
          <NavigationModal 
            isOpen={isMobileNavOpen} 
            onClose={() => setIsMobileNavOpen(false)} 
            weddingId={weddingId} 
            isMobile={true}
          />
        }
      </div>
    </SetupAuthContext.Provider>
  );
};

export default SetupLayout; 