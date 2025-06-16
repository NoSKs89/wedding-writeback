import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import InteractiveImageGrid from './InteractiveImageGrid';
import { getApiBaseUrl } from '../../config/apiConfig';
import styles from './ShareGalleryGuestPage.module.css';

// --- Helper Icon ---
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ShareGalleryGuestPage = () => {
  const { guid } = useParams();
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
  const [uploaderName, setUploaderName] = useState('');
  const fileInputRef = useRef(null);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    // Persist the uploader's name in local storage
    const savedName = localStorage.getItem('uploaderName');
    if (savedName) {
      setUploaderName(savedName);
    }
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setError('');
      try {
        // --- TODO: Replace with actual API call ---
        // const response = await axios.get(`${apiBaseUrl}/share-gallery/${guid}/images`);
        // setImages(response.data.images);

        // Mocking the fetch
        console.log(`(Mock) Fetching images for gallery ${guid}`);
        const generateMockImages = (count) => {
          const sampleImages = [
            'https://images.unsplash.com/photo-1593460369238-356154684128?q=80&w=2970&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1598224194079-13a4de81b504?q=80&w=2970&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1543169863-a583931864a7?q=80&w=2969&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1520854221256-17452cc351df?q=80&w=2970&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1587899932088-939634e9a657?q=80&w=3004&auto=format&fit=crop'
          ];
          const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George'];
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
        setImages(generateMockImages(12));

      } catch (err) {
        console.error("Error fetching images:", err);
        setError('Could not load the gallery. The link may be invalid.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, [guid, apiBaseUrl]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    setUploaderName(name);
    localStorage.setItem('uploaderName', name);
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files.length === 0) return;

    if (!uploaderName.trim()) {
        setUploadMessage({ text: 'Please enter your name before uploading.', type: 'error' });
        // Clear the file input so the user can re-trigger the change event
        if(fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setIsUploading(true);
    setUploadMessage({ text: 'Uploading...', type: 'info' });

    // --- Mock Upload Logic ---
    // In a real app, you would use FormData to send the file to the backend.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    
    const newImage = {
        id: `new-${Date.now()}`,
        url: URL.createObjectURL(files[0]),
        uploadedBy: uploaderName,
    };
    
    setImages(prev => [newImage, ...prev]);
    setIsUploading(false);
    setUploadMessage({ text: 'Photo added! Thank you!', type: 'success' });
    if(fileInputRef.current) fileInputRef.current.value = ''; // Clear input

    setTimeout(() => setUploadMessage({ text: '', type: '' }), 4000);
  };

  if (isLoading) {
    return <div className={styles.statusMessage}>Loading Gallery...</div>;
  }
  
  if (error) {
    return <div className={`${styles.statusMessage} ${styles.error}`}>{error}</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.uploadSection}>
        <div className={styles.inputGroup}>
            <input
                type="text"
                placeholder="Your Name"
                value={uploaderName}
                onChange={handleNameChange}
                className={styles.nameInput}
                disabled={isUploading}
            />
            <button 
                className={styles.uploadButton} 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                <UploadIcon />
                <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
                disabled={isUploading}
            />
        </div>
        {uploadMessage.text && (
          <p className={`${styles.uploadMessage} ${styles[uploadMessage.type]}`}>
            {uploadMessage.text}
          </p>
        )}
      </div>
      <InteractiveImageGrid images={images} />
    </div>
  );
};

export default ShareGalleryGuestPage; 