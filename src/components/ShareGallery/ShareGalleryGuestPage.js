import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSpring, animated, config } from 'react-spring';
import InteractiveImageGrid from './InteractiveImageGrid';
import { getApiBaseUrl } from '../../config/apiConfig';
import styles from './ShareGalleryGuestPage.module.css';
import { createPortal } from 'react-dom';
import SparklesBackground from '../SparklesBackground';

const UploadIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 11h-3v3c0 .55-.45 1-1 1s-1-.45-1-1v-3H8c-.55 0-1-.45-1-1s.45-1 1-1h3V8c0-.55.45-1 1-1s1 .45 1 1v3h3c.55 0 1 .45 1 1s-.45 1-1 1z" fill="currentColor"/>
    </svg>
);

const uploadFile = async ({ file, weddingId, uploaderName, guid, urlMode }) => {
    const apiBaseUrl = getApiBaseUrl();
    try {
        const presignedUrlResponse = await axios.post(`${apiBaseUrl}/s3/presigned-url`, {
            fileName: file.name,
            fileType: file.type,
            weddingId: weddingId,
            imageType: 'shareGallery'
        });
        const { presignedUrl, publicUrl, key: s3Key } = presignedUrlResponse.data;

        const fileBuffer = await file.arrayBuffer();
        await axios.put(presignedUrl, fileBuffer, {
            headers: { 'Content-Type': file.type }
        });

        // Choose the right endpoint based on URL mode
        let saveImageResponse;
        if (urlMode === 'easy') {
            saveImageResponse = await axios.post(`${apiBaseUrl}/weddings/${weddingId}/share-gallery/images`, {
                imageUrl: publicUrl,
                s3Key: s3Key,
                uploadedBy: uploaderName
            });
        } else {
            saveImageResponse = await axios.post(`${apiBaseUrl}/share-gallery/${guid}/images`, {
                imageUrl: publicUrl,
                s3Key: s3Key,
                uploadedBy: uploaderName
            });
        }
        
        return saveImageResponse.data.image;
    } catch (error) {
        console.error(`[ShareGalleryGuestPage] Upload failed for ${file.name}`, error);
        // Re-throw the error to be caught by Promise.allSettled
        throw error;
    }
};

// FocusedImagePortal renders the focused image in a portal at the document body level
function FocusedImagePortal({
  visible,
  imageUrl,
  uploader,
  startRect,
  startTransform,
  endRect,
  onClose,
  onAnimationEnd,
}) {
  const [spring, api] = useSpring(() => ({
    opacity: 0,
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    transform: 'scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
    config: { ...config.wobbly, tension: 220, friction: 22 },
  }));

  // Freeze animation props at open
  const [frozen, setFrozen] = useState(null);
  useEffect(() => {
    if (visible && startRect && endRect && !frozen) {
      setFrozen({
        startRect: { ...startRect },
        startTransform,
        endRect: { ...endRect },
      });
    }
    if (!visible) {
      setFrozen(null);
    }
  }, [visible, startRect, endRect, startTransform, frozen]);

  // Only animate in when frozen values are set
  useEffect(() => {
    if (visible && frozen) {
      console.log('[PORTAL] Opening animation (frozen)', frozen);
      api.start({
        immediate: false,
        from: {
          top: frozen.startRect.top,
          left: frozen.startRect.left,
          width: frozen.startRect.width,
          height: frozen.startRect.height,
          transform: frozen.startTransform,
          opacity: 1,
        },
        to: {
          top: frozen.endRect.top,
          left: frozen.endRect.left,
          width: frozen.endRect.width,
          height: frozen.endRect.height,
          transform: 'scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
          opacity: 1,
        },
        onRest: () => {
          console.log('[PORTAL] Opening animation finished');
          if (onAnimationEnd) onAnimationEnd();
        },
      });
    }
  }, [visible, frozen, api, onAnimationEnd]);

  // Closing animation
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    if (isClosing && visible && frozen) {
      api.start({
        immediate: false,
        from: {
          top: frozen.endRect.top,
          left: frozen.endRect.left,
          width: frozen.endRect.width,
          height: frozen.endRect.height,
          transform: 'scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
          opacity: 1,
        },
        to: {
          top: frozen.startRect.top,
          left: frozen.startRect.left,
          width: frozen.startRect.width,
          height: frozen.startRect.height,
          transform: frozen.startTransform,
          opacity: 1,
        },
        onRest: () => {
          setIsClosing(false);
          if (onClose) onClose();
        },
      });
    }
  }, [isClosing, visible, frozen, api, onClose]);

  // Always mount the portal, only render content when visible && frozen
  return createPortal(
    <>
      {visible && frozen && (
        <>
          <animated.div
            className={styles.backdrop}
            style={{
              opacity: spring.opacity.to(o => o > 0.1 ? 1 : 0),
              pointerEvents: visible ? 'auto' : 'none',
            }}
            onClick={() => setIsClosing(true)}
          />
          <animated.div
            className={styles.focusedImageWrapper}
            style={{
              top: spring.top,
              left: spring.left,
              width: spring.width,
              height: spring.height,
              transform: spring.transform,
              opacity: spring.opacity,
              position: 'fixed',
              zIndex: 1001,
              pointerEvents: 'auto',
            }}
            onClick={() => setIsClosing(true)}
          >
            <img src={imageUrl} alt={`Uploaded by ${uploader}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <div className={styles.focusedUploaderInfo}>Uploaded by: {uploader || 'Anonymous'}</div>
          </animated.div>
        </>
      )}
    </>,
    document.body
  );
}

const ShareGalleryGuestPage = () => {
    const { weddingId, guid } = useParams();
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
    const [uploaderName, setUploaderName] = useState('');
    const fileInputRef = useRef(null);
    const apiBaseUrl = getApiBaseUrl();
    const [eventName, setEventName] = useState('');
    const [urlMode, setUrlMode] = useState('guid'); // Track URL mode for upload logic
    const [focusedImage, setFocusedImage] = useState(null); // { url, uploader, startRect, startTransform, endRect, index }
    const [portalVisible, setPortalVisible] = useState(false);

    useEffect(() => {
        const savedName = localStorage.getItem('uploaderName');
        if (savedName) {
          setUploaderName(savedName);
        }

        const fetchGalleryData = async () => {
            if (!weddingId) return;
            setIsLoading(true);
            setError('');
            let isRedirecting = false;
            
            try {
                let response;
                // If we have a GUID in the URL, use the GUID endpoint
                if (guid) {
                    response = await axios.get(`${apiBaseUrl}/weddings/${weddingId}/share-gallery/${guid}`);
                    setUrlMode('guid'); // This is definitely GUID mode
                } else {
                    // If no GUID, try the easy URL mode endpoint
                    response = await axios.get(`${apiBaseUrl}/weddings/${weddingId}/share-gallery`);
                    setUrlMode(response.data.urlMode || 'easy'); // Set from response or default to easy
                }
                
                setEventName(response.data.eventName);
                setImages(response.data.images.map(img => ({
                    id: img._id,
                    url: img.fileName,
                    uploadedBy: img.uploadedBy,
                })));
            } catch (err) {
                console.error("Error fetching gallery data:", err);
                if (err.response?.status === 409 && err.response?.data?.correctGuid) {
                    const correctGuid = err.response.data.correctGuid;
                    console.log(`Stale GUID detected. Redirecting to: ${correctGuid}`);
                    isRedirecting = true;
                    navigate(`/${weddingId}/share-gallery/${correctGuid}`, { replace: true });
                    // The component will remount and re-fetch with the new, correct GUID.
                    // No need to set error or stop loading indicator.
                } else if (err.response?.status === 403 && err.response?.data?.requiresGuid) {
                    setError('This gallery requires a secure access link. Please use the link provided by the couple.');
                } else {
                    setError(err.response?.data?.message || 'Could not load this gallery. The link may be invalid or expired.');
                }
            } finally {
                // Only set loading to false if we are not redirecting
                if (!isRedirecting) {
                    setIsLoading(false);
                }
            }
        };
        fetchGalleryData();
    }, [guid, weddingId, apiBaseUrl, navigate]);

    const handleNameChange = (e) => {
        const name = e.target.value;
        setUploaderName(name);
        localStorage.setItem('uploaderName', name);
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (!uploaderName.trim()) {
            setUploadMessage({ text: 'Please enter your name before uploading.', type: 'error' });
            if(fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setUploadMessage({ text: `Uploading ${files.length} photo(s)...`, type: 'info' });

        const uploadPromises = files.map(file => 
            uploadFile({ file, weddingId, uploaderName, guid, urlMode })
        );
        
        const results = await Promise.allSettled(uploadPromises);
        
        const successfulUploads = results
            .filter(res => res.status === 'fulfilled')
            .map(res => res.value);
        
        const failedUploadsCount = results.filter(res => res.status === 'rejected').length;

        if (successfulUploads.length > 0) {
            const newImages = successfulUploads.map(img => ({
                id: img._id,
                url: img.fileName,
                uploadedBy: img.uploadedBy,
            }));
            setImages(prev => [...newImages, ...prev]);
        }

        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = '';

        if (failedUploadsCount > 0) {
            setUploadMessage({ text: `Uploaded ${successfulUploads.length} photos. ${failedUploadsCount} failed.`, type: 'error' });
        } else {
            setUploadMessage({ text: `Successfully uploaded ${successfulUploads.length} photo(s)! Thank you!`, type: 'success' });
        }
        setTimeout(() => setUploadMessage({ text: '', type: '' }), 5000);
    };

    // Handler for grid tile click
    const handleFocusImage = (data) => {
        setFocusedImage(data);
        setPortalVisible(true);
    };

    // Handler for closing the portal
    const handlePortalClose = () => {
        setPortalVisible(false);
        setTimeout(() => setFocusedImage(null), 300); // Wait for animation to finish
    };

    if (isLoading) {
        return <div className={styles.statusMessage}>Loading Gallery...</div>;
    }
      
    if (error) {
        return <div className={`${styles.statusMessage} ${styles.error}`}>{error}</div>;
    }

    return (
        <div className={styles.pageContainer}>
            <SparklesBackground />
            <div className={styles.uploadSection}>
                <h2>{eventName}</h2>
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
                        <span>{isUploading ? 'Uploading...' : 'Upload Photos'}</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        multiple // Allow multiple files
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

            {images.length > 0 ? (
                <>
                    <FocusedImagePortal
                        visible={portalVisible && focusedImage}
                        imageUrl={focusedImage?.url}
                        uploader={focusedImage?.uploader}
                        startRect={focusedImage?.startRect}
                        startTransform={focusedImage?.startTransform}
                        endRect={focusedImage?.endRect}
                        onClose={handlePortalClose}
                        onAnimationEnd={() => {}}
                    />
                    <InteractiveImageGrid
                        images={images}
                        onFocusImage={handleFocusImage}
                        // Hide the focused tile by passing focusedIndex
                        focusedIndex={portalVisible && focusedImage ? focusedImage.index : null}
                        cancelFocus={handlePortalClose}
                    />
                </>
            ) : (
                <div className={styles.emptyGalleryMessage}>
                    <h2>Be the first to upload a photo!</h2>
                    <p>Your photos will appear here for everyone to see.</p>
                </div>
            )}
        </div>
    );
};

export default ShareGalleryGuestPage; 