import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { ElementConfig } from './ExperienceSetupPage'; // Import the interface
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';
import { useParams } from 'react-router-dom';
// No need to import RSVPForm or ScrapbookBackground here if not rendering them directly
// import RSVPForm from '../../RSVPForm';
// import ScrapbookBackground from '../../ScrapbookBackground.js';

// Remove RSVPFormPlaceholder if not used
// const RSVPFormPlaceholder: React.FC = () => <div style={{border: '1px dashed blue', padding: '10px'}}>RSVP Form Component</div>;


interface ElementSlotProps {
  element: ElementConfig;
  onUpdate: (newConfig: Partial<Omit<ElementConfig, 'id' | 'timelineColor'>>) => void;
  onRemove: () => void; // To set element back to 'empty'
  isFocused: boolean; // New prop
  onFocus: (elementId: number) => void; // New prop
  startPositionPercent?: number; // New prop, percentage 0-1
  endPositionPercent?: number; // New prop, percentage 0-1
  onMarkerPositionChangeFromInput: (elementId: number, type: 'start' | 'end', newPosition: number) => void; // New prop
  onReorder: (elementId: number, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
  autoNavigationEnabled: boolean; // Controls whether Auto Nav dropdown is shown
}

const ElementSlot: React.FC<ElementSlotProps> = ({
  element,
  onUpdate,
  onRemove,
  isFocused,
  onFocus,
  startPositionPercent,
  endPositionPercent,
  onMarkerPositionChangeFromInput,
  onReorder,
  isFirst,
  isLast,
  autoNavigationEnabled,
}) => {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [textContent, setTextContent] = useState<string>(element.type === 'text' && typeof element.content === 'string' ? element.content : '');
  const [selectedFile, setSelectedFile] = useState<File | null>(element.type === 'photo' && element.content instanceof File ? element.content : null);
  const [filePreview, setFilePreview] = useState<string | null>(element.type === 'photo' && typeof element.content === 'string' ? element.content : null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [maxScrapbookImages, setMaxScrapbookImages] = useState<number | string>(
    (element.type === 'component' && element.name === 'Scrapbook' && typeof element.content === 'object' && element.content && 'maxImages' in element.content)
      ? (element.content as { maxImages: number }).maxImages
      : ''
  );

  const [disableS3, setDisableS3] = useState<boolean>(
    (element.type === 'component' && element.name === 'Scrapbook' && typeof element.content === 'object' && element.content && 'disableS3' in element.content)
      ? (element.content as { disableS3: boolean }).disableS3
      : false
  );

  // Local state for auto sequence
  const [autoSequenceValue, setAutoSequenceValue] = useState<string>(
    element.autoSequence ? element.autoSequence.toString() : 'none'
  );

  // Local state for input values, initialized from props
  const [startInput, setStartInput] = useState<string>((startPositionPercent !== undefined ? startPositionPercent * 100 : 0).toFixed(1));
  const [endInput, setEndInput] = useState<string>((endPositionPercent !== undefined ? endPositionPercent * 100 : 0).toFixed(1));

  useEffect(() => {
    setStartInput((startPositionPercent !== undefined ? startPositionPercent * 100 : 0).toFixed(1));
  }, [startPositionPercent]);

  useEffect(() => {
    setEndInput((endPositionPercent !== undefined ? endPositionPercent * 100 : 0).toFixed(1));
  }, [endPositionPercent]);

  useEffect(() => {
    // Update local state if element autoSequence changes externally
    setAutoSequenceValue(element.autoSequence ? element.autoSequence.toString() : 'none');
  }, [element.autoSequence]);

  useEffect(() => {
    // Update local state if element content (maxImages) changes externally
    if (element.type === 'component' && element.name === 'Scrapbook') {
      if (typeof element.content === 'object' && element.content && 'maxImages' in element.content) {
        setMaxScrapbookImages((element.content as { maxImages: number }).maxImages);
      } else if (element.content === 'Scrapbook') { // Default case if content is just the string name
        setMaxScrapbookImages(''); // Or a default value like 15
      }
    }
  }, [element.content, element.type, element.name]);

  useEffect(() => {
    // Sync filePreview for photo/background-image
    if ((element.type === 'photo' || element.type === 'background-image')) {
      if (typeof element.content === 'string') {
        setFilePreview(element.content); // Set if content is a string URL
        setSelectedFile(null); // Clear any selected file if content is a URL string
        if (element.content.startsWith('http')) {
          setUploadStatus('idle'); // If it's a URL, the upload is done.
        }
      } else if (element.content instanceof File) {
        // If content is a File object (e.g., newly selected for upload but not yet a URL)
        // This case is mostly handled by handlePhotoUpload directly setting selectedFile and filePreview.
      } else if (element.content === null) {
         setFilePreview(null);
         setSelectedFile(null); // Ensure selectedFile is also cleared
      }
    } else {
      // If type is not photo/background-image, ensure preview is cleared
      setFilePreview(null);
      setSelectedFile(null);
      setUploadStatus('idle');
    }
  }, [element.type, element.content]);

  const handleSlotClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent click from bubbling to document listener
    onFocus(element.id);
  };

  const handlePositionInputChange = (type: 'start' | 'end', value: string) => {
    const numericValue = parseFloat(value);
    if (type === 'start') {
      setStartInput(value);
      if (!isNaN(numericValue)) {
        onMarkerPositionChangeFromInput(element.id, 'start', numericValue / 100);
      }
    } else {
      setEndInput(value);
      if (!isNaN(numericValue)) {
        onMarkerPositionChangeFromInput(element.id, 'end', numericValue / 100);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!weddingId) {
      setUploadError('Wedding ID is missing.');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadError(null);

    // Determine the correct imageType based on the element's configuration
    let imageTypeForUpload = 'scrapbook'; // Default
    if (element.type === 'photo') {
      imageTypeForUpload = 'introCouple';
    } else if (element.type === 'background-image') {
      imageTypeForUpload = 'introBackground';
    } else if (element.type === 'video') {
      imageTypeForUpload = 'video'; // New imageType for video files
    } else if (element.type === 'background-video') {
      imageTypeForUpload = 'backgroundVideo'; // New imageType for background video files
    }

    try {
      const apiBase = getApiBaseUrl();
      const presignedUrlResponse = await axios.post(`${apiBase}/s3/presigned-url`, {
        fileName: file.name,
        fileType: file.type,
        weddingId: weddingId,
        imageType: imageTypeForUpload 
      });

      const { presignedUrl, publicUrl } = presignedUrlResponse.data;

      const fileBuffer = await file.arrayBuffer();

      await axios.put(presignedUrl, fileBuffer, {
        headers: { 'Content-Type': file.type }
      });

      // After successful upload, update the element with the public S3 URL
      onUpdate({ content: publicUrl, name: file.name });
      setUploadStatus('success');

    } catch (error: any) {
      console.error('Error during image upload:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown upload error.';
      setUploadError(errorMessage);
      setUploadStatus('error');
    }
  };

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newTypeValue = e.target.value;
    setTextContent('');
    setSelectedFile(null);
    setFilePreview(null);
    setMaxScrapbookImages(''); // Reset max images input
    setUploadStatus('idle');
    setUploadError(null);

    if (newTypeValue === 'empty') {
        onRemove();
    } else if (newTypeValue === 'component-rsvp') {
        onUpdate({ type: 'component', content: 'RSVP Form', name: 'RSVP Form' });
    } else if (newTypeValue === 'component-prompt') {
        onUpdate({ type: 'component', content: 'Prompt Form', name: 'Prompt Form' });
    } else if (newTypeValue === 'component-scrapbook') {
        // For scrapbook, content could be an object { maxImages: number }
        // Initialize with a default or existing value if switching to scrapbook
        const currentMax = (typeof element.content === 'object' && element.content && 'maxImages' in element.content)
                           ? (element.content as { maxImages: number }).maxImages
                           : 15; // Default to 15
        setMaxScrapbookImages(currentMax);
        onUpdate({ type: 'component', content: { maxImages: currentMax }, name: 'Scrapbook' });
    } else if (newTypeValue === 'component-bottom-navbar') {
        // Legacy bottom navbar support
        onUpdate({ type: 'component', content: 'Bottom Navbar', name: 'Bottom Navbar' });
    } else if (newTypeValue === 'navbar') {
        // Initialize navbar with default type 'bottom' - save as component type like other components
        onUpdate({ 
          type: 'component', 
          content: { 
            navbarType: 'bottom',
            items: [] 
          }, 
          name: 'Navbar' 
        });
    } else if (newTypeValue === 'photo' || newTypeValue === 'text' || newTypeValue === 'background-image' || newTypeValue === 'video' || newTypeValue === 'background-video') {
        onUpdate({ type: newTypeValue as 'photo' | 'text' | 'background-image' | 'video' | 'background-video', content: null, name: undefined });
    } else {
        onUpdate({ type: 'empty', content: null, name: undefined });
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Show local preview immediately for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        // For videos, we could show a video icon or the first frame
        // For now, we'll just clear the preview and show the filename
        setFilePreview(null);
      }

      // Start the actual upload process
      handleFileUpload(file);
    }
  };

  const handleTextSubmit = () => {
    if (textContent.trim()) {
      onUpdate({ type: 'text', content: textContent, name: 'Text' });
    }
  };

  const handleRemoveContent = () => {
    onRemove();
    setTextContent('');
    setSelectedFile(null);
    setFilePreview(null);
    setMaxScrapbookImages('');
  };

  const handleMaxImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxScrapbookImages(value); // Keep as string for input field flexibility
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onUpdate({ content: { maxImages: numValue, disableS3 } as { maxImages: number, disableS3: boolean } });
    } else if (value === '') { // Allow clearing the input
      onUpdate({ content: { maxImages: undefined, disableS3 } as { maxImages?: number, disableS3: boolean } }); // Or some other way to signify "no limit" or "default"
    }
  };

  const handleDisableS3Change = (e: ChangeEvent<HTMLInputElement>) => {
    const newDisableS3 = e.target.checked;
    setDisableS3(newDisableS3);
    if (element.type === 'component' && element.name === 'Scrapbook') {
      const maxImages = typeof element.content === 'object' && element.content && 'maxImages' in element.content
        ? (element.content as { maxImages?: number }).maxImages
        : undefined;
      onUpdate({ content: { maxImages, disableS3: newDisableS3 } });
    }
  };

  const handleAutoSequenceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setAutoSequenceValue(value);
    
    if (value === 'none') {
      onUpdate({ autoSequence: null });
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue > 0) {
        onUpdate({ autoSequence: numValue });
      }
    }
  };

  const baseStyle: React.CSSProperties = {
    padding: '17px',
    paddingRight: '20px',
    minHeight: '120px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'box-shadow 0.3s ease, border-top 0.3s ease, border-right 0.3s ease, border-bottom 0.3s ease, border-left 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    // Explicit borders for unfocused state
    borderTop: '1px solid #e0e0e0',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    borderLeft: `5px solid ${element.timelineColor === '#FFFFFF' ? '#DDDDDD' : element.timelineColor}`,
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  };

  const focusedStyleObj: React.CSSProperties = {
    boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
    // Explicit, thicker borders for focused state
    borderTop: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
    borderRight: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
    borderBottom: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
    borderLeft: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
  };
  
  const focusedStyle: React.CSSProperties = isFocused ? focusedStyleObj : {};

  // Styles for the input controls
  const inputControlStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    alignItems: 'center'
  };

  const numberInputStyle: React.CSSProperties = {
    width: '70px',
    padding: '5px',
    textAlign: 'right',
    border: '1px solid #ccc',
    borderRadius: '4px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: '#555'
  }

  const selectContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    padding: '6px 30px 6px 10px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    minWidth: '120px',
    maxWidth: '160px',
    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '8px',
    color: '#333',
    outline: 'none',
  };

  const recommendedTextStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#777',
    fontStyle: 'italic',
    marginTop: '5px',
  };

  let recommendedText = null;
  if (element.id === 1) {
    recommendedText = "Recommended: Bride Name";
  } else if (element.id === 2) {
    recommendedText = "Recommended: Groom Name";
  } else if (element.id === 3) {
    recommendedText = "Recommended: Wedding Date";
  } else if (element.id === 4) {
    recommendedText = "Recommended: Transparent Couple Intro Image";
  } else if (element.id === 5) {
    recommendedText = "Recommended: Background Scene Image";
  } else if (element.id === 6) {
    recommendedText = "Recommended: RSVP Form";
  } else if (element.id === 7) {
    recommendedText = "Recommended: Image Scrapbook";
  } else if (element.id === 8) {
    recommendedText = "Recommended: Bottom Navbar";
  }

  let dropdownValue: string = element.type;
  if (element.type === 'component') {
    if (element.name === 'RSVP Form') {
      dropdownValue = 'component-rsvp';
    } else if (element.name === 'Prompt Form') {
      dropdownValue = 'component-prompt';
    } else if (element.name === 'Scrapbook') {
      dropdownValue = 'component-scrapbook';
    } else if (element.name === 'Bottom Navbar') {
      dropdownValue = 'component-bottom-navbar';
    } else if (element.name === 'Navbar') {
      dropdownValue = 'navbar';
    } else {
      dropdownValue = 'empty';
    }
  } else if (element.type === 'background-image') {
    dropdownValue = 'background-image';
  } else if (element.type === 'navbar') {
    // Handle legacy navbar type
    dropdownValue = 'navbar';
  } else {
    dropdownValue = element.type;
  }

  const [navbarType, setNavbarType] = useState<'bottom' | 'top' | 'hamburger'>(
    ((element.type === 'component' && element.name === 'Navbar') || (element.type === 'navbar' && element.name === 'Navbar')) && typeof element.content === 'object' && element.content && 'navbarType' in element.content
      ? (element.content as { navbarType: 'bottom' | 'top' | 'hamburger' }).navbarType
      : element.type === 'component' && element.content === 'Bottom Navbar'
      ? 'bottom' // Legacy support
      : 'bottom'
  );

  const handleNavbarTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'bottom' | 'top' | 'hamburger';
    setNavbarType(newType);
    if (((element.type === 'component' && element.name === 'Navbar') || (element.type === 'navbar' && element.name === 'Navbar')) && typeof element.content === 'object' && element.content) {
      onUpdate({
        content: {
          ...element.content,
          navbarType: newType,
          items: 'items' in element.content ? element.content.items : []
        }
      });
    }
  };

  return (
    <div 
      style={{ ...baseStyle, ...focusedStyle }} 
      onClick={handleSlotClick} 
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div> {/* Content wrapper div for flex layout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h5 style={{ margin: 0, fontSize: '1.1em' }}>Element Slot {element.id}</h5>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {element.type !== 'empty' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onReorder(element.id, 'up'); }}
                  disabled={isFirst}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', opacity: isFirst ? 0.3 : 1 }}
                  title="Move element up"
                >
                  ▲
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReorder(element.id, 'down'); }}
                  disabled={isLast}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', opacity: isLast ? 0.3 : 1 }}
                  title="Move element down"
                >
                  ▼
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleRemoveContent(); }} style={{marginLeft: '10px', color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem'}}>Clear</button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{fontSize: '0.9rem'}}>Type:</label>
          <div style={selectContainerStyle}>
            <select value={dropdownValue} onChange={handleTypeChange} style={selectStyle}>
              <option value="empty"> - inactive - </option>
              <option value="photo">Photo</option>
              <option value="video">Video</option>
              <option value="text">Text</option>
              <option value="component-rsvp">RSVP Form</option>
              <option value="component-prompt">Prompt Form</option>
              <option value="component-scrapbook">Scrapbook</option>
              <option value="navbar">Navbar</option>
              <option value="background-image">Background Image</option>
              <option value="background-video">Background Video</option>
            </select>
          </div>
        </div>

        {((element.type === 'component' && element.name === 'Navbar') || (element.type === 'navbar' && element.name === 'Navbar')) && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{fontSize: '0.9rem'}}>Navbar Type:</label>
            <div style={selectContainerStyle}>
              <select 
                value={navbarType} 
                onChange={handleNavbarTypeChange} 
                style={selectStyle}
              >
                <option value="bottom">Bottom</option>
                <option value="top">Top</option>
                <option value="hamburger">Hamburger</option>
              </select>
            </div>
          </div>
        )}

        {element.type !== 'empty' && autoNavigationEnabled && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{fontSize: '0.9rem'}}>Auto Nav:</label>
            <div style={selectContainerStyle}>
              <select value={autoSequenceValue} onChange={handleAutoSequenceChange} style={selectStyle}>
                <option value="none"> - none - </option>
                <option value="1">Auto 1</option>
                <option value="2">Auto 2</option>
                <option value="3">Auto 3</option>
                <option value="4">Auto 4</option>
                <option value="5">Auto 5</option>
                <option value="6">Auto 6</option>
                <option value="7">Auto 7</option>
                <option value="8">Auto 8</option>
                <option value="9">Auto 9</option>
                <option value="10">Auto 10</option>
              </select>
            </div>
          </div>
        )}

        {recommendedText && <p style={recommendedTextStyle}>{recommendedText}</p>}
        {element.type === 'empty' && <p style={{color: '#888'}}>Placeholder: Pick Element {element.id}</p>}
        {(element.type === 'photo' || element.type === 'background-image' || element.type === 'video' || element.type === 'background-video') && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '10px' }}>
            {filePreview && 
              <img 
                src={filePreview} 
                alt={element.name || "Preview"} 
                style={{ 
                  maxWidth: '80px', 
                  maxHeight: '80px', 
                  objectFit: 'cover',
                  border: '1px solid #ddd', 
                  borderRadius: '4px' 
                }} 
              />
            }
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <input 
                type="file" 
                accept={element.type === 'video' || element.type === 'background-video' ? 'video/*' : 'image/*'} 
                onChange={handleFileInputChange} 
                style={{ fontSize: '14px', padding: '4px', width: '200px' }}
              />
              {uploadStatus === 'uploading' && <p style={{fontSize: '0.8em', color: '#007bff'}}>Uploading...</p>}
              {uploadStatus === 'success' && element.content && <p style={{fontSize: '0.8em', color: 'green'}}>Saved!</p>}
              {uploadStatus === 'error' && <p style={{fontSize: '0.8em', color: 'red'}}>Error: {uploadError}</p>}
              {element.name && !filePreview && element.content && 
                <p style={{fontSize: '0.8em', color: '#555', margin: '0'}}>File: {element.name}</p>
              }
               {filePreview && element.name && uploadStatus !== 'uploading' &&
                <p style={{fontSize: '0.8em', color: '#555', margin: '0'}}>File: {element.name}</p>
              }
            </div>
          </div>
        )}

        {element.type === 'text' && (
          <div>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your text"
              rows={3}
              style={{width: '90%', marginBottom: '5px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px'}}
            />
            <button onClick={handleTextSubmit} style={{padding: '5px 10px', fontSize: '0.8rem'}}>Submit Text</button>
            {element.content && typeof element.content === 'string' && <p style={{fontSize: '0.8em', color: '#555'}}>Saved: {element.content.substring(0,50)}...</p>}
          </div>
        )}

        {element.type === 'component' && element.name === 'Scrapbook' && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <label htmlFor={`max-images-${element.id}`} style={{...labelStyle, marginRight: '5px'}}>Max Images:</label>
              <input
                type="number"
                id={`max-images-${element.id}`}
                value={maxScrapbookImages}
                onChange={handleMaxImagesChange}
                min="1"
                style={{...numberInputStyle, width: '60px'}}
                placeholder="e.g. 15"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{...labelStyle, cursor: 'pointer', userSelect: 'none'}}>
                <input
                  type="checkbox"
                  checked={disableS3}
                  onChange={handleDisableS3Change}
                  style={{ marginRight: '5px' }}
                />
                Disable S3 Loading
              </label>
            </div>
            <p style={{...recommendedTextStyle, fontSize: '0.7rem', margin: '3px 0 0 0'}}>Recommends &lt; 15 for Load Times</p>
          </div>
        )}
      </div>

      {isFocused && element.type !== 'empty' && (
        <div style={inputControlStyle}>
          <div style={{flex: 1}}>
            <label htmlFor={`start-pos-${element.id}`} style={labelStyle}>Start (%):</label>
            <input
              type="number"
              id={`start-pos-${element.id}`}
              value={startInput}
              onChange={(e) => handlePositionInputChange('start', e.target.value)}
              step="0.1" // User requested 0.1 step
              min="0"
              max="100"
              style={numberInputStyle}
            />
          </div>
          <div style={{flex: 1}}>
            <label htmlFor={`end-pos-${element.id}`} style={labelStyle}>End (%):</label>
            <input
              type="number"
              id={`end-pos-${element.id}`}
              value={endInput}
              onChange={(e) => handlePositionInputChange('end', e.target.value)}
              step="0.1" // User requested 0.1 step
              min="0"
              max="100"
              style={numberInputStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ElementSlot; 