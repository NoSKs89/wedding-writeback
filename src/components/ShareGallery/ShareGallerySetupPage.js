import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { getApiBaseUrl } from '../../config/apiConfig';
import styles from './ShareGallerySetupPage.module.css';

// --- GUID Generator ---
const generateSecureRandomString = (length = 24) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  // Use crypto.getRandomValues for better randomness if available
  const crypto = window.crypto || window.msCrypto; // for IE 11
  if (crypto && crypto.getRandomValues) {
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += characters.charAt(randomValues[i] % charactersLength);
    }
  } else {
    // Fallback for older browsers
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  }
  return result;
};

// --- Confirmation Modal ---
const ConfirmationModal = ({ onConfirm, onCancel, expectedText }) => {
  const [inputText, setInputText] = useState('');
  const isMatch = inputText === expectedText;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h4>Are you absolutely sure?</h4>
        <p>This will permanently change the gallery link and invalidate any existing QR codes or shared links. This cannot be undone.</p>
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
  const [galleryGuid, setGalleryGuid] = useState('');
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirmingRegen, setIsConfirmingRegen] = useState(false);
  const apiBaseUrl = getApiBaseUrl();

  const shareableLink = useMemo(() => {
    if (!galleryGuid || !weddingId) return '';
    return `${window.location.origin}/${weddingId}/share-gallery/${galleryGuid}`;
  }, [galleryGuid, weddingId]);

  const fetchGalleryData = async (guidToUse) => {
    setIsLoading(true);
    setError('');
    try {
      let finalGuid = guidToUse;
      if (!finalGuid) {
        // --- TODO: Replace with actual API call to get or create a GUID ---
        // const guidResponse = await axios.get(`${apiBaseUrl}/weddings/${weddingId}/share-gallery-guid`);
        // finalGuid = guidResponse.data.guid;
        finalGuid = generateSecureRandomString();
        setGalleryGuid(finalGuid);
      }
      
      // 2. Fetch the images uploaded to this gallery
      // const imagesResponse = await axios.get(`${apiBaseUrl}/share-gallery/${mockGuid}/images`);
      // setImages(imagesResponse.data.images);
      
      // Creating mock images for demonstration
      const generateMockImages = (count) => {
        const sampleImages = [
          'https://images.unsplash.com/photo-1593460369238-356154684128?q=80&w=2970&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1598224194079-13a4de81b504?q=80&w=2970&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1543169863-a583931864a7?q=80&w=2969&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1520854221256-17452cc351df?q=80&w=2970&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1587899932088-939634e9a657?q=80&w=3004&auto=format&fit=crop'
        ];
        const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan'];
        let mocks = [];
        for (let i = 0; i < count; i++) {
          mocks.push({
            id: `img-${i}`,
            url: sampleImages[i % sampleImages.length],
            uploadedBy: names[i % names.length],
          });
        }
        return mocks;
      };
      setImages(generateMockImages(12)); // Generate 12 mock images

    } catch (err) {
      console.error("Error fetching gallery data:", err);
      setError('Failed to fetch gallery data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchGalleryData();
  }, [weddingId, apiBaseUrl]);

  const handleRegenerate = async () => {
    setIsConfirmingRegen(false);
    console.log('(Mock) Regenerating GUID...');
    // --- TODO: Replace with actual API call to generate a new GUID ---
    // const response = await axios.post(`${apiBaseUrl}/weddings/${weddingId}/regenerate-share-gallery-guid`);
    // const newGuid = response.data.newGuid;
    const newGuid = generateSecureRandomString();
    setGalleryGuid(newGuid);
    // Note: In a real app, you might not need to re-fetch images if the backend
    // just associates the existing images with the new GUID.
    fetchGalleryData(newGuid);
  };

  const handleDeleteImage = async (imageId) => {
    // Optimistically remove the image from the UI
    setImages(prevImages => prevImages.filter(img => img.id !== imageId));
    
    try {
      // --- TODO: Replace with actual API call ---
      // await axios.delete(`${apiBaseUrl}/share-gallery/${galleryGuid}/images/${imageId}`);
      console.log(`(Mock) Deleted image ${imageId}`);
    } catch (err) {
      console.error("Error deleting image:", err);
      // If the delete fails, we might want to add the image back to the list
      // and show an error message. For now, we just log it.
      setError('Failed to delete image. It may reappear on refresh.');
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
          <div className={styles.qrCode}>
            {shareableLink ? (
              <QRCodeCanvas value={shareableLink} size={256} />
            ) : (
              <p>Generating QR Code...</p>
            )}
          </div>
          <p className={styles.link}>
            Or share this link: <a href={shareableLink} target="_blank" rel="noopener noreferrer">{shareableLink}</a>
          </p>
          <button onClick={() => setIsConfirmingRegen(true)} className={styles.regenerateButton}>
            Regenerate URL
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