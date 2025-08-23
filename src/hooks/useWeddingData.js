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

        // Find scrapbook element settings
        const scrapbookElement = experienceSettingsRes.data.data?.elements?.find(
          el => el.type === 'component' && el.name === 'Scrapbook'
        );

        const scrapbookSettings = scrapbookElement?.content || {};
        const { maxImages, disableS3 } = scrapbookSettings;

        // Process wedding data based on scrapbook settings
        const processedData = { ...weddingDataRes.data };
        
        if (processedData.scrapbookImages && Array.isArray(processedData.scrapbookImages)) {
          if (disableS3) {
            // If S3 is disabled, replace with broken links
            processedData.scrapbookImages = Array(maxImages || 8).fill(null).map((_, i) => ({
              fileName: `https://broken-link-${i}.jpg`,
              caption: `Placeholder Image ${i + 1}`,
              id: `placeholder-${i}`
            }));
          } else if (maxImages && maxImages > 0) {
            // If maxImages is set, limit the number of images
            processedData.scrapbookImages = processedData.scrapbookImages.slice(0, maxImages);
          }
        }

        setWeddingData(processedData);
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