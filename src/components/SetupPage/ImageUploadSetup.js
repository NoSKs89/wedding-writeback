import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios'; // Import axios
import { Crc32 } from '@aws-crypto/crc32'; // <--- ADD THIS IMPORT
import { useParams } from 'react-router-dom'; // Import useParams to get weddingId
import { getApiBaseUrl } from '../../config/apiConfig'; // Import centralized API config
// import { useSetupAuth } from './SetupLayout'; // If you need auth status here

const IMAGE_TYPES = {
  INTRO_COUPLE: 'introCouple',
  INTRO_BACKGROUND: 'introBackground',
  SCRAPBOOK: 'scrapbook'
};

const ImageUploadSetup = () => {
  const { weddingId } = useParams(); // Get weddingId from URL parameters
  const [currentWeddingData, setCurrentWeddingData] = useState(null);
  const [selectedImageType, setSelectedImageType] = useState(IMAGE_TYPES.SCRAPBOOK); // Default to scrapbook
  const [uploadedScrapbookImages, setUploadedScrapbookImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({}); // To track progress for multiple files
  const [uploadError, setUploadError] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [successMessage, setSuccessMessage] = useState(''); // New state for success messages

  // Moved handleUpload above onDrop
  const handleUpload = async (file, imageTypeToUpload, captionForScrapbook) => {
    if (!weddingId) {
      setUploadError('Wedding ID is missing. Cannot upload file.');
      return;
    }
    if (!imageTypeToUpload) {
      setUploadError('Image type not selected. Cannot upload file.');
      return;
    }
    setUploadError('');
    const progressKey = `${imageTypeToUpload}-${file.name}-${Date.now()}`;
    setUploadProgress(prev => ({ ...prev, [progressKey]: { name: file.name, progress: 0, status: 'Starting...' } }));

    try {
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Getting upload URL...' } }));
      const apiBase = getApiBaseUrl(); // Use centralized config
      const presignedUrlResponse = await axios.post(`${apiBase}/s3/presigned-url`, {
        fileName: file.name,
        fileType: file.type,
        weddingId: weddingId,
        imageType: imageTypeToUpload // Pass the selected image type
      });
      
      const { presignedUrl, publicUrl, key: s3Key } = presignedUrlResponse.data;
      console.log('[ImageUploadSetup] Generated S3 Presigned URL:', presignedUrl);

      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Uploading to S3...' } }));

      // Convert file to ArrayBuffer
      const fileBuffer = await file.arrayBuffer();

      console.log('[ImageUploadSetup] Uploading to:', presignedUrl);
      console.log('[ImageUploadSetup] With Content-Type:', file.type);

      await axios.put(presignedUrl, fileBuffer, {
        headers: { 
          'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], progress: percentCompleted } }));
        }
      });
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Processing on server...', progress: 100 } }));

      let captionToSave = '';
      if (imageTypeToUpload === IMAGE_TYPES.SCRAPBOOK) {
        captionToSave = captionForScrapbook; // Use the caption passed in
      } // For INTRO images, caption is not typically used or handled differently

      const saveImageResponse = await axios.post(`${apiBase}/weddings/${weddingId}/images`, {
        imageUrl: publicUrl,
        caption: captionToSave, // Use the determined caption
        s3Key: s3Key,
        imageType: imageTypeToUpload
      });

      // Update local state to reflect changes
      const updatedWeddingData = saveImageResponse.data.weddingData;
      setCurrentWeddingData(updatedWeddingData);
      if (imageTypeToUpload === IMAGE_TYPES.SCRAPBOOK) {
         // Repopulate scrapbook images from the potentially updated weddingData
        if (updatedWeddingData && updatedWeddingData.scrapbookImages) {
            setUploadedScrapbookImages(updatedWeddingData.scrapbookImages.map(img => ({ 
                name: img.fileName.substring(img.fileName.lastIndexOf('/') + 1),
                preview: img.fileName,
                s3Url: img.fileName,
                caption: img.caption,
                _id: img._id, // Ensure _id is mapped
                s3Key: img.s3Key
            })));
        }
      }

      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Upload successful! 🎉'} }));

    } catch (error) {
      console.error('[ImageUploadSetup] Error during upload process:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown upload error.';
      setUploadError(`Error uploading ${file.name} for ${imageTypeToUpload}: ${errorMessage}`);
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: `Error: ${errorMessage}`, progress: prev[progressKey]?.progress || 0 } }));
    }
  };

  const onDrop = useCallback(async acceptedFiles => {
    if (!selectedImageType) {
      setUploadError('Please select an image type first.');
      return;
    }

    let commonCaption = '';
    if (selectedImageType === IMAGE_TYPES.SCRAPBOOK && acceptedFiles.length > 0) {
      // Prompt for caption once if uploading scrapbook images
      commonCaption = prompt("Enter a caption for the uploaded scrapbook image(s) (optional):");
      if (commonCaption === null) commonCaption = ''; // Handle cancel on prompt
    }

    for (const file of acceptedFiles) {
      await handleUpload(file, selectedImageType, commonCaption); // Pass commonCaption
    }
  }, [weddingId, selectedImageType, handleUpload]);

  // Fetch current wedding data to display existing images
  useEffect(() => {
    const fetchWeddingData = async () => {
      if (!weddingId) return;
      setIsLoadingData(true);
      try {
        const apiBase = getApiBaseUrl(); // Use centralized config
        const response = await axios.get(`${apiBase}/weddings/${weddingId}`);
        setCurrentWeddingData(response.data);
        // Populate scrapbook images if they exist
        if (response.data && response.data.scrapbookImages) {
          setUploadedScrapbookImages(response.data.scrapbookImages.map(img => ({ 
            name: img.fileName.substring(img.fileName.lastIndexOf('/') + 1),
            preview: img.fileName, // This is the full S3 URL
            s3Url: img.fileName,
            caption: img.caption,
            _id: img._id, // Store the MongoDB _id
            s3Key: img.s3Key // Store s3Key if needed for display or other ops
          })));
        }
      } catch (err) {
        console.error('[ImageUploadSetup] Error fetching wedding data:', err);
        setUploadError('Could not load existing wedding data. ' + (err.response?.data?.message || err.message));
      }
      setIsLoadingData(false);
    };
    fetchWeddingData();
  }, [weddingId]);

  const handleDeleteScrapbookImage = async (imageIdToDelete) => {
    if (!weddingId || !imageIdToDelete) {
      setUploadError('Cannot delete image: Missing wedding ID or image ID.');
      return;
    }
    setUploadError('');
    setSuccessMessage(''); // Clear previous success messages
    try {
      const apiBase = getApiBaseUrl(); // Use centralized config
      const response = await axios.delete(`${apiBase}/weddings/${weddingId}/images/${imageIdToDelete}`);
      const updatedWeddingData = response.data.weddingData;
      setCurrentWeddingData(updatedWeddingData);
      // Refresh scrapbook images from the updated weddingData
      if (updatedWeddingData && updatedWeddingData.scrapbookImages) {
        setUploadedScrapbookImages(updatedWeddingData.scrapbookImages.map(img => ({
          name: img.fileName.substring(img.fileName.lastIndexOf('/') + 1),
          preview: img.fileName,
          s3Url: img.fileName,
          caption: img.caption,
          _id: img._id,
          s3Key: img.s3Key
        })));
      } else {
        setUploadedScrapbookImages([]); // If array is now empty
      }
      setSuccessMessage('Scrapbook image deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 5000); // Clear after 5 seconds
    } catch (error) {
      console.error('[ImageUploadSetup] Error deleting scrapbook image:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error deleting image.';
      setUploadError(`Error deleting image: ${errorMessage}`);
    }
  };

  const handleClearScrapbook = async () => {
    if (!weddingId) {
      setUploadError('Wedding ID is missing. Cannot clear scrapbook.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete ALL scrapbook images for this wedding? This cannot be undone.')) {
      return;
    }
    setUploadError('');
    try {
      const apiBase = getApiBaseUrl(); // Use centralized config
      const response = await axios.delete(`${apiBase}/weddings/${weddingId}/scrapbook-images`);
      setCurrentWeddingData(response.data.weddingData);
      setUploadedScrapbookImages([]); // Clear local state too
      alert('Scrapbook images cleared successfully!');
    } catch (error) {
      console.error('[ImageUploadSetup] Error clearing scrapbook images:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error clearing scrapbook.';
      setUploadError(`Error clearing scrapbook: ${errorMessage}`);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true, // We will trigger open manually for specific uploaders
    noKeyboard: true,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'image/webp': []
    }
  });

  const renderImageTypeSelector = () => (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h4>Select Image Type to Upload:</h4>
      {Object.values(IMAGE_TYPES).map(type => (
        <label key={type} style={{ marginRight: '15px' }}>
          <input 
            type="radio" 
            name="imageType"
            value={type} 
            checked={selectedImageType === type} 
            onChange={() => setSelectedImageType(type)} 
          /> {type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} {/* Prettify name */}
        </label>
      ))}
      {selectedImageType === IMAGE_TYPES.INTRO_COUPLE && <p style={{fontSize: '0.9em', color: 'gray'}}><em>Recommended: PNG with transparent background.</em></p>}
    </div>
  );

  const renderImageSection = (title, imageType, currentImageUrl, note) => (
    <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>{title}</h4>
      {note && <p style={{ fontSize: '0.9em', color: 'gray' }}><em>{note}</em></p>}
      {currentImageUrl ? (
        <img src={currentImageUrl} alt={title} style={{ maxWidth: '200px', maxHeight: '200px', marginBottom: '10px', border: '1px solid #eee' }}/>
      ) : (
        <p>No image set.</p>
      )}
      <button type="button" onClick={() => { setSelectedImageType(imageType); openFileDialog(); }}>
        Upload / Replace {title}
      </button>
    </div>
  );

  const scrapbookPreviews = uploadedScrapbookImages.map(fileInfo => (
    <div key={fileInfo._id || fileInfo.s3Url} style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #eaeaea', marginBottom: 8, marginRight: 8, width: 150, padding: 4, boxSizing: 'border-box', textAlign: 'center' }}>
      <img
        src={fileInfo.preview} 
        style={{ display: 'block', width: '100%', height: '100px', objectFit: 'cover', marginBottom: '5px' }}
        alt={`Preview of ${fileInfo.name}`}
      />
      <p style={{fontSize: '0.8em', margin:0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={fileInfo.name}>{fileInfo.name}</p>
      {fileInfo.caption && <p style={{fontSize: '0.7em', margin:'2px 0', color: 'gray'}}>{fileInfo.caption}</p>}
      {fileInfo._id && (
        <button 
          onClick={() => handleDeleteScrapbookImage(fileInfo._id)}
          title="Delete this image"
          style={{
            position: 'absolute', top: '5px', right: '5px', background: 'rgba(255,0,0,0.7)', color: 'white', 
            border: 'none', borderRadius: '50%', width: '20px', height: '20px', 
            fontSize: '12px', lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0
          }}
        >
          X
        </button>
      )}
    </div>
  ));

  const currentUploadsDisplay = Object.entries(uploadProgress).map(([key, statusObj]) => {
    // Avoid re-rendering completed scrapbook items if already in uploadedScrapbookImages
    if (statusObj.status === 'Upload successful! 🎉' && 
        key.startsWith(IMAGE_TYPES.SCRAPBOOK) && 
        uploadedScrapbookImages.some(f => statusObj.name && f.name === statusObj.name)) {
            return null; 
    }
    // Avoid re-rendering completed main/bg images if currentWeddingData reflects the change (less direct to check by name)
    // We rely on the overall section re-rendering for main/bg images.

    return (
      <div key={key} style={{border: '1px solid #eee', padding: '5px', margin:'5px 0', fontSize:'0.9em'}}>
        <span>{statusObj.name || key}: {statusObj.status} {statusObj.progress !== undefined ? `(${statusObj.progress}%)` : ''}</span>
        {statusObj.progress !== undefined &&
            <div style={{width: '100%', backgroundColor: '#e0e0e0', borderRadius: '2px', marginTop:'3px'}}>
                <div style={{width: `${statusObj.progress}%`, backgroundColor: '#4caf50', height:'5px', borderRadius: '2px'}}></div>
            </div>
        }
      </div>
    );
  }).filter(Boolean);
  
  if (isLoadingData) {
    return <p>Loading image setup for {weddingId}...</p>;
  }

  return (
    <section className="container">
      <h3>Image Management for: {currentWeddingData?.eventName || weddingId}</h3>

      {renderImageSection(
        'Intro Couple Image',
        IMAGE_TYPES.INTRO_COUPLE,
        currentWeddingData?.introCouple,
        'Recommended: PNG with transparent background for best parallax effect.'
      )}

      {renderImageSection(
        'Intro Background Image',
        IMAGE_TYPES.INTRO_BACKGROUND,
        currentWeddingData?.introBackground
      )}
      
      <div style={{ marginTop:'20px', marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h4>Scrapbook Images</h4>
        {successMessage && <p style={{ color: 'green', fontWeight: 'bold' }}>{successMessage}</p>} {/* Display success message */}
        <div {...getRootProps({
          style: {
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px', borderWidth: 2, borderRadius: 2, borderColor: '#eeeeee',
            borderStyle: 'dashed', backgroundColor: '#fafafa', color: '#bdbdbd',
            outline: 'none', transition: 'border .24s ease-in-out',
            cursor: 'pointer',
            marginBottom: '10px'
          }
        })} onClick={() => {setSelectedImageType(IMAGE_TYPES.SCRAPBOOK); openFileDialog(); }}>
          <input {...getInputProps()} />
          {isDragActive ?
            <p>Drop scrapbook images here ...</p> :
            <p>Drag 'n' drop scrapbook images here, or click to select files</p>
          }
          <em>(JPEG, PNG, GIF, WEBP images will be accepted)</em>
          <em style={{display: 'block', marginTop: '5px', fontSize: '0.8em'}}>(Recommended: 30 images or less for optimal performance and to avoid visual clutter.)</em>
        </div>
        {scrapbookPreviews.length > 0 ? scrapbookPreviews : <p>No scrapbook images uploaded yet.</p>}
        {uploadedScrapbookImages.length > 0 && 
          <button 
            type="button" 
            onClick={handleClearScrapbook} 
            style={{marginTop: '10px', padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
          >
            Clear All Scrapbook Images
          </button>
        }
      </div>

      {(currentUploadsDisplay.length > 0 || uploadError) &&
        <aside style={{ marginTop: '20px', padding:'10px', border:'1px solid #eee', background:'#f9f9f9' }}>
          {currentUploadsDisplay.length > 0 && <h5>Upload Progress:</h5>}
          {currentUploadsDisplay}
          {uploadError && <p style={{ color: 'red', marginTop: '15px', fontWeight:'bold' }}>{uploadError}</p>}
        </aside>
      }

      {/* General Dropzone for fallback - can be removed or refined if specific uploaders are preferred */}
      {/* <div {...getRootProps()} style={{border: '1px dashed gray', padding: '20px', marginTop: '20px', textAlign: 'center'}}>
        <input {...getInputProps()} />
        <p>Or drop any file type here (will use selected type above)</p>
      </div> */}
      
      <div style={{marginTop: '30px', padding: '15px', background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '4px'}}>
        <p><strong>Image Upload Instructions:</strong></p>
        <ol>
          <li>Use the sections above to upload or replace specific images (Intro Couple, Intro Background, or Scrapbook).</li>
          <li>Files are uploaded to AWS S3 and references are saved in MongoDB.</li>
        </ol>
      </div>
    </section>
  );
};

export default ImageUploadSetup; 