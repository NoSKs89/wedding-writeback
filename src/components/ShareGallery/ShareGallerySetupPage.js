import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { getApiBaseUrl } from '../../config/apiConfig';
import styles from './ShareGallerySetupPage.module.css';

// --- Confirmation Modal ---
const ConfirmationModal = ({ onConfirm, onCancel, expectedText }) => {
  const [inputText, setInputText] = useState('');
  const isMatch = inputText === expectedText;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h4>Are you absolutely sure?</h4>
        <p>
          This will permanently change the gallery link, <strong>delete all images currently in the gallery</strong>,
          and invalidate any existing QR codes or shared links. This action cannot be undone.
        </p>
        <p>To confirm, please type "<strong>{expectedText}</strong>" in the box below.</p>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className={styles.modalInput}
        />
        <div className={styles.modalActions}>
          <button onClick={onCancel} className={styles.modalButtonCancel}>Cancel</button>
          <button onClick={onConfirm} disabled={!isMatch} className={styles.modalButtonConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

const ShareGallerySetupPage = () => {
  const { weddingId } = useParams();
  const [galleryGuid, setGalleryGuid] = useState(null);
  const [urlMode, setUrlMode] = useState('guid'); // 'guid' or 'easy'
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirmingRegen, setIsConfirmingRegen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const apiBaseUrl = getApiBaseUrl();

  const shareableLink = useMemo(() => {
    if (!weddingId) return '';
    if (urlMode === 'easy') {
      return `${window.location.origin}/${weddingId}/share-gallery`;
    } else {
      if (!galleryGuid || galleryGuid === 'easy-mode') return '';
      return `${window.location.origin}/${weddingId}/share-gallery/${galleryGuid}`;
    }
  }, [galleryGuid, weddingId, urlMode]);

  const fetchGalleryData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${apiBaseUrl}/weddings/${weddingId}/share-gallery`);
      setGalleryGuid(response.data.galleryGuid);
      setUrlMode(response.data.urlMode || 'guid'); // Set URL mode from response
      setImages(response.data.images.map(img => ({
          id: img._id,
          url: img.fileName,
          uploadedBy: img.uploadedBy || 'N/A',
      })));
    } catch (err) {
      console.error("Error fetching gallery data:", err);
      setError('Failed to fetch gallery data. Please try again.');
      // If the error is 404 because a GUID hasn't been made, the backend now auto-creates it,
      // so a simple retry might work, but for now we just show error.
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (weddingId) {
      fetchGalleryData();
    }
  }, [weddingId]);

  const handleUrlModeChange = async (newMode) => {
    try {
      await axios.put(`${apiBaseUrl}/weddings/${weddingId}/share-gallery/url-mode`, {
        urlMode: newMode
      });
      setUrlMode(newMode);
      
      // If switching to easy mode and we have a GUID, we might need to regenerate to get the easy-mode marker
      // If switching to guid mode and we only have easy-mode marker, we'll need to regenerate to get a real GUID
      if ((newMode === 'easy' && galleryGuid && galleryGuid !== 'easy-mode') ||
          (newMode === 'guid' && galleryGuid === 'easy-mode')) {
        // The backend handles this logic, so we just refresh the data
        await fetchGalleryData();
      }
    } catch (err) {
      console.error("Error updating URL mode:", err);
      setError('Failed to update URL mode. Please try again.');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const response = await axios.post(`${apiBaseUrl}/weddings/${weddingId}/share-gallery/generate-guid`);
      setGalleryGuid(response.data.galleryGuid || response.data.newGuid);
      if (response.data.urlMode) {
        setUrlMode(response.data.urlMode);
      }
    } catch (err) {
      console.error("Error generating GUID:", err);
      setError('Failed to generate the URL. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setIsConfirmingRegen(false);
    setIsGenerating(true);
    setError('');
    try {
      const response = await axios.post(`${apiBaseUrl}/weddings/${weddingId}/share-gallery/regenerate-guid`);
      setGalleryGuid(response.data.galleryGuid || response.data.newGuid);
      if (response.data.urlMode) {
        setUrlMode(response.data.urlMode);
      }
      setImages([]); // Clear images from UI as they are deleted on the backend
    } catch (err) {
      console.error("Error regenerating GUID:", err);
      setError('Failed to update the URL. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleButtonClick = () => {
    const hasGallery = galleryGuid && galleryGuid !== null;
    if (hasGallery) {
      // If gallery exists, show confirmation before regenerating
      setIsConfirmingRegen(true);
    } else {
      // If no gallery, generate it immediately without confirmation
      handleGenerate();
    }
  };

  const handleDeleteImage = async (imageId) => {
    // Optimistically remove the image from the UI
    setImages(prevImages => prevImages.filter(img => img.id !== imageId));
    
    try {
      await axios.delete(`${apiBaseUrl}/weddings/${weddingId}/share-gallery/images/${imageId}`);
      // On success, the image is already removed from the UI.
    } catch (err) {
      console.error("Error deleting image:", err);
      setError('Failed to delete image. It may reappear on refresh.');
      // Re-fetch to get the correct state from the server on failure
      fetchGalleryData(); 
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading Shareable Gallery...</div>;
  }

  if (error) {
    return <div className={`${styles.error} ${styles.container}`}>Error: {error}</div>;
  }

  return (
    <>
      {isConfirmingRegen && (
        <ConfirmationModal 
          onConfirm={handleRegenerate}
          onCancel={() => setIsConfirmingRegen(false)}
          expectedText="Yes I am sure"
        />
      )}
      <div className={styles.container}>
        <div className={styles.qrSection}>
          <h2>Share Your Gallery</h2>
          <p>Guests can scan this QR code to upload and view photos from your event.</p>
          
          {/* URL Mode Toggle */}
          <div className={styles.urlModeSection}>
            <h3>Gallery URL Type</h3>
            <div className={styles.urlModeToggle}>
              <label 
                className={`${styles.urlModeOption} ${urlMode === 'guid' ? styles.active : ''}`}
                title="Generates a secure link with a random ID that's harder for strangers to guess"
              >
                <input
                  type="radio"
                  name="urlMode"
                  value="guid"
                  checked={urlMode === 'guid'}
                  onChange={() => handleUrlModeChange('guid')}
                />
                <span className={styles.optionContent}>
                  <strong>Use GUID (Safe)</strong>
                  <small>Secure random link</small>
                </span>
              </label>
              
              <label 
                className={`${styles.urlModeOption} ${urlMode === 'easy' ? styles.active : ''}`}
                title="Creates a simple, predictable link that anyone who knows your wedding ID can access"
              >
                <input
                  type="radio"
                  name="urlMode"
                  value="easy"
                  checked={urlMode === 'easy'}
                  onChange={() => handleUrlModeChange('easy')}
                />
                <span className={styles.optionContent}>
                  <strong>Easy URL</strong>
                  <small>Simple, predictable link</small>
                </span>
              </label>
            </div>
          </div>
          <div className={styles.qrCode}>
            {(galleryGuid && galleryGuid !== null && shareableLink) ? (
              <QRCodeCanvas value={shareableLink} size={256} />
            ) : (
              <div className={styles.noQrCode}>
                {isGenerating ? 'Generating...' : 'No Share Gallery Exists, Generate Below'}
              </div>
            )}
          </div>
          {(galleryGuid && galleryGuid !== null && shareableLink) && (
            <p className={styles.link}>
              Or share this link: <a href={shareableLink} target="_blank" rel="noopener noreferrer">{shareableLink}</a>
            </p>
          )}
          <button onClick={handleButtonClick} className={styles.regenerateButton} disabled={isGenerating}>
            {(galleryGuid && galleryGuid !== null) ? 'Regenerate URL' : 'Generate'}
          </button>
        </div>
        
        <div className={styles.gallerySection}>
          <h3>Uploaded Photos</h3>
          <div className={styles.imageGrid}>
            {images.map((image) => (
              <div key={image.id} className={styles.imageContainer}>
                <img src={image.url} alt={`Uploaded by ${image.uploadedBy}`} />
                <div className={styles.imageOverlay}>
                  <span>Uploaded by: {image.uploadedBy}</span>
                  <button 
                    className={styles.deleteButton} 
                    onClick={() => handleDeleteImage(image.id)}
                    title="Delete Image"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
          {images.length === 0 && <p>No images have been uploaded by guests yet.</p>}
        </div>
      </div>
    </>
  );
};

export default ShareGallerySetupPage; 