import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../config/apiConfig';

const useWeddingData = (weddingId) => {
  const [weddingData, setWeddingData] = useState(null);
  const [experienceSettings, setExperienceSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!weddingId) {
      setLoading(false);
      setError("No wedding ID provided.");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const apiBase = getApiBaseUrl();

      try {
        const [weddingDataRes, experienceSettingsRes] = await Promise.all([
          axios.get(`${apiBase}/weddings/${weddingId}`),
          axios.get(`${apiBase}/weddings/${weddingId}/experience-settings`)
        ]);

        setWeddingData(weddingDataRes.data);
        // The experience settings are nested in a `data` property from the backend
        setExperienceSettings(experienceSettingsRes.data.data);

      } catch (err) {
        console.error("Error fetching wedding data:", err);
        setError(err.message || "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [weddingId]);

  // Update document title when wedding data is loaded
  useEffect(() => {
    if (weddingData && weddingId) {
      const displayName = weddingData.instanceDisplayName;
      if (displayName && displayName.trim()) {
        document.title = displayName.trim();
      } else {
        // Fallback to a formatted version of the wedding ID
        const formattedId = weddingId.charAt(0).toUpperCase() + weddingId.slice(1);
        document.title = `${formattedId} Wedding`;
      }
    }
    
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'WeddingWriteback';
    };
  }, [weddingData, weddingId]);

  return { weddingData, experienceSettings, loading, error };
};

export default useWeddingData; 