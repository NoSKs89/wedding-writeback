import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';

// Define the structure for navbar content items
interface NavbarContentItem {
  id: string;
  title: string;
  textContent: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  position: number; // Order position on navbar
  showTitleWhenOpened: boolean; // Whether to show title in modal
  shrinkToFitContent: boolean; // Whether modal should shrink to fit content or use fixed size
}

// Define the structure for navbar settings
interface NavbarSettings {
  items: NavbarContentItem[];
}

// Utility function to detect URLs and convert them to clickable links
const renderTextWithLinks = (text: string, style: React.CSSProperties) => {
  // Enhanced URL regex that catches more URL patterns including www, ftp, etc.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+|[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
  
  // Split text by URLs while preserving the URLs
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      // Reset regex lastIndex for next test
      urlRegex.lastIndex = 0;
      
      // Ensure the URL has a protocol
      let href = part;
      if (!part.startsWith('http') && !part.startsWith('ftp')) {
        href = part.startsWith('www.') ? `https://${part}` : `https://${part}`;
      }
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...style,
            textDecoration: 'underline',
            color: 'inherit', // Inherit color from parent
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent any parent click handlers
          }}
        >
          {part}
        </a>
      );
    } else {
      // Regular text
      return <span key={index} style={style}>{part}</span>;
    }
  });
};

const NavbarSetupPage: React.FC = () => {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [navbarSettings, setNavbarSettings] = useState<NavbarSettings>({
    items: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive editingItem from navbarSettings instead of keeping separate state
  const editingItem = useMemo(() => {
    if (!editingItemId) return null;
    return navbarSettings.items.find(item => item.id === editingItemId) || null;
  }, [editingItemId, navbarSettings.items]);

  // Load navbar settings from server
  useEffect(() => {
    if (weddingId) {
      loadNavbarSettings();
    }
  }, [weddingId]);

  const loadNavbarSettings = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await axios.get(`${apiBase}/weddings/${weddingId}/navbar-settings`);
      if (response.data && response.data.data) {
        // Handle backward compatibility for showTitleWhenOpened and shrinkToFitContent fields
        const settings = {
          ...response.data.data,
          items: response.data.data.items.map((item: any) => ({
            ...item,
            showTitleWhenOpened: item.showTitleWhenOpened ?? true, // Default to true for existing items
            shrinkToFitContent: item.shrinkToFitContent ?? false, // Default to false (fixed size) for existing items
          })),
        };
        setNavbarSettings(settings);
      }
    } catch (error) {
      console.warn('No navbar settings found, using defaults');
      // Initialize with default item
      setNavbarSettings({
        items: [{
          id: Date.now().toString(),
          title: 'Info',
          textContent: 'Welcome to our special day!',
          backgroundColor: '#333333',
          textColor: '#ffffff',
          position: 1,
          showTitleWhenOpened: true,
          shrinkToFitContent: false, // Default to fixed size
        }],
      });
    }
    setIsLoading(false);
  };

  const saveNavbarSettings = async () => {
    if (!weddingId) return;
    
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Clean the data before saving - ensure no empty content is saved
      const cleanedSettings = {
        ...navbarSettings,
        items: navbarSettings.items.filter(item => {
          const hasTitle = item.title && item.title.trim();
          const hasContent = item.textContent && item.textContent.trim();
          return hasTitle || hasContent || item.imageUrl;
        }),
      };

      const apiBase = getApiBaseUrl();
      await axios.post(`${apiBase}/weddings/${weddingId}/navbar-settings`, cleanedSettings);
      setSaveMessage('Navbar settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving navbar settings:', error);
      setSaveMessage('Failed to save navbar settings.');
      setTimeout(() => setSaveMessage(null), 5000);
    }
    setIsSaving(false);
  };

  const addNewItem = () => {
    const newItemId = Date.now().toString();
    const newItem: NavbarContentItem = {
      id: newItemId,
      title: '',
      textContent: '',
      backgroundColor: '#333333',
      textColor: '#ffffff',
      position: navbarSettings.items.length + 1,
      showTitleWhenOpened: true,
      shrinkToFitContent: false, // Default to fixed size
    };
    setNavbarSettings(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setEditingItemId(newItemId);
    setUploadStatus('idle');
    setUploadError(null);
    // Clear the file input when adding new item
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateItem = (updatedItem: NavbarContentItem) => {
    setNavbarSettings(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ),
    }));
  };

  const deleteItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setNavbarSettings(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId),
      }));
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setUploadStatus('idle');
        setUploadError(null);
      }
    }
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    setNavbarSettings(prev => {
      const items = [...prev.items];
      const index = items.findIndex(item => item.id === itemId);
      if (index === -1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return prev;

      // Swap items
      [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
      
      // Update positions
      items.forEach((item, idx) => {
        item.position = idx + 1;
      });

      return { ...prev, items };
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!weddingId || !editingItem) {
      setUploadError('Wedding ID or editing item is missing.');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadError(null);

    try {
      const apiBase = getApiBaseUrl();
      const presignedUrlResponse = await axios.post(`${apiBase}/s3/presigned-url`, {
        fileName: file.name,
        fileType: file.type,
        weddingId: weddingId,
        imageType: 'navbar'
      });

      const { presignedUrl, publicUrl } = presignedUrlResponse.data;

      const fileBuffer = await file.arrayBuffer();

      await axios.put(presignedUrl, fileBuffer, {
        headers: { 'Content-Type': file.type }
      });

      // Update the editing item with the new image URL
      // For navbar items, we store the image URL directly in the navbar settings
      // No need to save to the /images endpoint since navbar settings handle storage
      const updatedItem = { ...editingItem, imageUrl: publicUrl };
      updateItem(updatedItem);
      setUploadStatus('success');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
      }, 3000);

    } catch (error: any) {
      console.error('Error during image upload:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown upload error.';
      setUploadError(errorMessage);
      setUploadStatus('error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    if (editingItem) {
      const updatedItem = { ...editingItem, imageUrl: undefined };
      updateItem(updatedItem);
      setUploadStatus('idle');
      setUploadError(null);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading navbar settings...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Navbar Setup</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={saveNavbarSettings}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: saveMessage.includes('Failed') ? '#f8d7da' : '#d4edda',
          color: saveMessage.includes('Failed') ? '#721c24' : '#155724',
          border: `1px solid ${saveMessage.includes('Failed') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '5px',
        }}>
          {saveMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '30px', height: 'calc(100vh - 200px)' }}>
        {/* Left Panel - Items List */}
        <div style={{ flex: '0 0 400px', borderRight: '1px solid #ddd', paddingRight: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Navbar Items</h3>
            <button
              onClick={addNewItem}
              style={{
                padding: '8px 15px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              + Add Item
            </button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 80px)' }}>
            {navbarSettings.items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: '15px',
                  marginBottom: '10px',
                  border: editingItemId === item.id ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: editingItemId === item.id ? '#f8f9fa' : 'white',
                }}
                onClick={() => {
                  setEditingItemId(item.id);
                  setUploadStatus('idle');
                  setUploadError(null);
                  // Clear the file input when switching items
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {item.imageUrl ? (
                    // Two-column layout when image is present
                    <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
                      {/* Left column: Image preview + Position */}
                      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <img
                          src={item.imageUrl}
                          alt="Preview"
                          style={{
                            width: '50px',
                            height: '50px',
                            objectFit: 'cover',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div style={{ fontSize: '0.7em', color: '#999', textAlign: 'center' }}>
                          Pos: {item.position}
                        </div>
                      </div>
                      {/* Right column: Title + Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {!item.title.trim() ? (
                            <span style={{ fontStyle: 'italic', color: '#999' }}>Click to add title...</span>
                          ) : (
                            item.title
                          )}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          {!item.textContent.trim() ? (
                            <span style={{ fontStyle: 'italic', color: '#999' }}>Click to add content...</span>
                          ) : (
                            <>
                              {item.textContent.substring(0, 45)}
                              {item.textContent.length > 45 ? '...' : ''}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Original single-column layout when no image
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {!item.title.trim() ? (
                          <span style={{ fontStyle: 'italic', color: '#999' }}>Click to add title...</span>
                        ) : (
                          item.title
                        )}
                      </div>
                      <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                        {!item.textContent.trim() ? (
                          <span style={{ fontStyle: 'italic', color: '#999' }}>Click to add content...</span>
                        ) : (
                          <>
                            {item.textContent.substring(0, 60)}
                            {item.textContent.length > 60 ? '...' : ''}
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8em', color: '#999' }}>
                        Position: {item.position}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'up'); }}
                      disabled={index === 0}
                      style={{
                        padding: '3px 6px',
                        fontSize: '12px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        backgroundColor: 'white',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        opacity: index === 0 ? 0.5 : 1,
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'down'); }}
                      disabled={index === navbarSettings.items.length - 1}
                      style={{
                        padding: '3px 6px',
                        fontSize: '12px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        backgroundColor: 'white',
                        cursor: index === navbarSettings.items.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: index === navbarSettings.items.length - 1 ? 0.5 : 1,
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                      style={{
                        padding: '3px 6px',
                        fontSize: '12px',
                        border: '1px solid #dc3545',
                        borderRadius: '3px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Edit Form */}
        <div style={{ flex: 1, paddingLeft: '20px' }}>
          {editingItem ? (
            <div>
              <h3>Edit Item: {!editingItem.title.trim() ? 'Untitled Item' : editingItem.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Title (Button Text):
                  </label>
                  <input
                    type="text"
                    value={editingItem.title}
                    onChange={(e) => updateItem({ ...editingItem, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                    placeholder="Button text that appears on navbar"
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '10px' }}>
                    <input
                      type="checkbox"
                      checked={editingItem.showTitleWhenOpened ?? true}
                      onChange={(e) => updateItem({ ...editingItem, showTitleWhenOpened: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>Show When Opened</span>
                  </label>
                  <div style={{ fontSize: '0.8em', color: '#6c757d', marginLeft: '24px', marginBottom: '10px' }}>
                    When checked, the title will appear at the top of the modal when opened
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '10px' }}>
                    <input
                      type="checkbox"
                      checked={editingItem.shrinkToFitContent ?? false}
                      onChange={(e) => updateItem({ ...editingItem, shrinkToFitContent: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>Shrink Modal to Fit Content</span>
                  </label>
                  <div style={{ fontSize: '0.8em', color: '#6c757d', marginLeft: '24px', marginBottom: '10px' }}>
                    When checked, the modal will shrink to fit the content size. When unchecked, the modal uses a fixed size (better for images)
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Content Text:
                  </label>
                  <textarea
                    value={editingItem.textContent}
                    onChange={(e) => updateItem({ ...editingItem, textContent: e.target.value })}
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'vertical',
                    }}
                    placeholder="Add your content here... URLs will automatically become clickable links!"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Image (Optional):
                  </label>
                  
                  {/* Current image status */}
                  <div style={{ 
                    marginBottom: '10px', 
                    padding: '8px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}>
                    {editingItem.imageUrl ? (
                      <span style={{ color: '#28a745' }}>✓ Image uploaded and saved</span>
                    ) : (
                      <span style={{ color: '#6c757d' }}>No image uploaded</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                    {editingItem.imageUrl && (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={editingItem.imageUrl}
                          alt="Navbar item image"
                          style={{
                            width: '100px',
                            height: '100px',
                            objectFit: 'cover',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{
                          fontSize: '0.9rem',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        disabled={uploadStatus === 'uploading'}
                      />
                      <div style={{ fontSize: '0.8em', color: '#6c757d' }}>
                        {editingItem.imageUrl 
                          ? 'Choose a new file to replace the current image' 
                          : 'Choose an image file to upload'
                        }
                      </div>
                      {uploadStatus === 'uploading' && (
                        <p style={{ fontSize: '0.8em', color: '#007bff', margin: 0 }}>
                          Uploading...
                        </p>
                      )}
                      {uploadStatus === 'success' && (
                        <p style={{ fontSize: '0.8em', color: 'green', margin: 0 }}>
                          Upload successful!
                        </p>
                      )}
                      {uploadStatus === 'error' && uploadError && (
                        <p style={{ fontSize: '0.8em', color: 'red', margin: 0 }}>
                          Error: {uploadError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Background Color:
                    </label>
                    <input
                      type="color"
                      value={editingItem.backgroundColor}
                      onChange={(e) => updateItem({ ...editingItem, backgroundColor: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        height: '40px',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Text Color:
                    </label>
                    <input
                      type="color"
                      value={editingItem.textColor}
                      onChange={(e) => updateItem({ ...editingItem, textColor: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        height: '40px',
                      }}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                    Preview:
                  </label>
                  <div
                    style={{
                      padding: '20px',
                      backgroundColor: editingItem.backgroundColor,
                      color: editingItem.textColor,
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {editingItem.imageUrl && (
                      <img
                        src={editingItem.imageUrl}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100px',
                          marginBottom: '10px',
                          borderRadius: '4px',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {renderTextWithLinks(editingItem.textContent, {
                        color: editingItem.textColor,
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
              <h3>Select an item to edit</h3>
              <p>Click on an item from the left panel to start editing, or add a new item.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavbarSetupPage; 