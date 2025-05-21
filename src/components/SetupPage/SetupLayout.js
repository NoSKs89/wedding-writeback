import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig'; // Import the centralized helper

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

  // Store auth per weddingId. In a real app, consider more robust session/token management.
  const [isAuthenticatedForWedding, setIsAuthenticatedForWedding] = useState(() => {
    const storedAuth = sessionStorage.getItem(`setupAuth_${weddingId}`);
    return storedAuth === 'true';
  });

  useEffect(() => {
    // If weddingId changes, re-evaluate auth from sessionStorage
    const storedAuth = sessionStorage.getItem(`setupAuth_${weddingId}`);
    setIsAuthenticatedForWedding(storedAuth === 'true');
  }, [weddingId]);

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

  // Determine if the current path is the specific layout editing page
  // Path will be /:weddingId/setup/layout
  const isLayoutEditPage = location.pathname.endsWith('/setup/layout');

  return (
    <SetupAuthContext.Provider value={authContextValue}>
      <div className="setup-page-layout">
        {!isLayoutEditPage && (
          <header style={{ padding: '20px', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
            <h2>Wedding Setup: {weddingId}</h2>
            <nav>
              <button onClick={() => navigate(`/${weddingId}/setup/images`)} style={{marginRight: '10px'}}>Image Management</button>
              {/* Add other general setup navigation links here if needed */}
              <hr style={{margin: '15px 0'}} />
            </nav>
          </header>
        )}
        <main style={isLayoutEditPage ? { padding: 0 } : { padding: '20px' }}>
          <Outlet /> {/* This is where nested routes like ImageUploadSetup or WeddingJourneyWrapperForSetup will render */}
        </main>
      </div>
    </SetupAuthContext.Provider>
  );
};

export default SetupLayout; 