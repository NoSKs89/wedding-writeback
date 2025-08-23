import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';

interface NavbarItem {
  id: string;
  title: string;
  textContent: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  position: number;
  showTitleWhenOpened: boolean;
  shrinkToFitContent: boolean;
}

interface NavbarSettings {
  items: NavbarItem[];
  navbarType: 'bottom' | 'top' | 'hamburger';
  includeAutoNav?: boolean;
}

interface ExperienceSettings {
  autoNavigationEnabled: boolean;
}

const NavbarSetupPage: React.FC = () => {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [items, setItems] = useState<NavbarItem[]>([]);
  const [navbarType, setNavbarType] = useState<'bottom' | 'top' | 'hamburger'>('bottom');
  const [includeAutoNav, setIncludeAutoNav] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [navbarSettings, setNavbarSettings] = useState<NavbarSettings>({ items: [], navbarType: 'bottom' });
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Experience settings state
  const [experienceSettings, setExperienceSettings] = useState<ExperienceSettings | null>(null);
  const [isLoadingExperienceSettings, setIsLoadingExperienceSettings] = useState(true);

  // Fetch experience settings to check if auto navigation is enabled
  useEffect(() => {
    const loadExperienceSettings = async () => {
      if (!weddingId) return;
      try {
        const apiBase = getApiBaseUrl();
        const response = await axios.get(`${apiBase}/weddings/${weddingId}/experience-settings`);
        if (response.data && response.data.data) {
          setExperienceSettings(response.data.data);
        }
      } catch (error) {
        console.error('Error loading experience settings:', error);
        // Set default experience settings if loading fails
        setExperienceSettings({ autoNavigationEnabled: false });
      } finally {
        setIsLoadingExperienceSettings(false);
      }
    };
    loadExperienceSettings();
  }, [weddingId]);

  useEffect(() => {
    const loadNavbarSettings = async () => {
      if (!weddingId) return;
      try {
        const apiBase = getApiBaseUrl();
        const response = await axios.get(`${apiBase}/weddings/${weddingId}/navbar-settings`);
        if (response.data && response.data.data) {
          // Handle both legacy and new data formats
          const data = response.data.data;
          const loadedItems = data.items || [];
          const loadedNavbarType = data.navbarType || 'bottom';
          const loadedIncludeAutoNav = data.includeAutoNav || false;
          
          // Update both states consistently
          setItems(loadedItems);
          setNavbarType(loadedNavbarType);
          setIncludeAutoNav(loadedIncludeAutoNav);
          setNavbarSettings({
            items: loadedItems,
            navbarType: loadedNavbarType,
            includeAutoNav: loadedIncludeAutoNav
          });
        }
      } catch (error) {
        console.error('Error loading navbar settings:', error);
      }
    };
    loadNavbarSettings();
  }, [weddingId]);

  const handleSaveSettings = async () => {
    if (!weddingId) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const apiBase = getApiBaseUrl();
      await axios.post(`${apiBase}/weddings/${weddingId}/navbar-settings`, {
        items,
        navbarType,
        includeAutoNav,
        isEnabled: true // Maintain legacy field
      });
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving navbar settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    const newItem: NavbarItem = {
      id: Date.now().toString(),
      title: 'New Item',
      textContent: 'Enter content here...',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      position: items.length + 1,
      showTitleWhenOpened: true,
      shrinkToFitContent: true
    };
    setItems([...items, newItem]);
    setNavbarSettings(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Update the editingItem derivation to use items instead of navbarSettings.items
  const editingItem = useMemo(() => {
    if (!editingItemId) return null;
    return items.find(item => item.id === editingItemId) || null;
  }, [editingItemId, items]);

  // Update the updateItem function to properly update both states
  const updateItem = (updatedItem: NavbarItem) => {
    const updatedItems = items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    setItems(updatedItems);
    setNavbarSettings(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    setNavbarSettings(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
    if (editingItemId === id) {
      setEditingItemId(null);
      // setEditingItem(null); // This line is no longer needed as editingItem is derived
    }
  };

  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return;

    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < items.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }

    // Update positions
    newItems.forEach((item, i) => {
      item.position = i + 1;
    });

    setItems(newItems);
    setNavbarSettings(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    setUploadError(null);

    try {
      const apiBase = getApiBaseUrl();
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${apiBase}/weddings/${weddingId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.url) {
        updateItem({ ...editingItem!, imageUrl: response.data.url });
        setUploadStatus('success');
      } else {
        throw new Error('Failed to upload image or received no URL.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image. Please try again.');
      setUploadStatus('error');
    }
  };

  const removeImage = () => {
    updateItem({ ...editingItem!, imageUrl: undefined });
    setUploadStatus('idle');
    setUploadError(null);
  };

  const renderTextWithLinks = (text: string, styles: React.CSSProperties) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return (
      <span>
        {parts.map((part, index) => {
          if (part.startsWith('http://') || part.startsWith('https://')) {
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: styles.color, textDecoration: 'underline', fontSize: styles.fontSize, fontFamily: styles.fontFamily }}
              >
                {part}
              </a>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Save Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        width: '100%'
      }}>
        <h2 style={{ margin: 0 }}>Navbar Setup</h2>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer'
          }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Navbar Type Selector and Auto-Nav Checkbox */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        width: '100%'
      }}>
        {/* Auto-Nav Checkbox */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          position: 'relative'
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: experienceSettings?.autoNavigationEnabled ? 'pointer' : 'not-allowed',
            opacity: experienceSettings?.autoNavigationEnabled ? 1 : 0.5,
            position: 'relative'
          }}>
            <input
              type="checkbox"
              checked={includeAutoNav}
              onChange={(e) => {
                if (experienceSettings?.autoNavigationEnabled) {
                  setIncludeAutoNav(e.target.checked);
                  setNavbarSettings(prev => ({
                    ...prev,
                    includeAutoNav: e.target.checked
                  }));
                }
              }}
              disabled={!experienceSettings?.autoNavigationEnabled || isLoadingExperienceSettings}
              style={{
                margin: 0,
                cursor: experienceSettings?.autoNavigationEnabled ? 'pointer' : 'not-allowed'
              }}
            />
            <span style={{ fontWeight: 'bold' }}>Include Auto-Nav</span>
          </label>
          
          {/* Tooltip for disabled state */}
          {!experienceSettings?.autoNavigationEnabled && !isLoadingExperienceSettings && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              backgroundColor: '#333',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              marginTop: '5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              Must Enable In Setup/Experience
            </div>
          )}
        </div>

        {/* Navbar Type Selector */}
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          fontWeight: 'bold'
        }}>
          Navbar Type:
          <select
            value={navbarType}
            onChange={(e) => {
              const newType = e.target.value as 'bottom' | 'top' | 'hamburger';
              setNavbarType(newType);
              setNavbarSettings(prev => ({
                ...prev,
                navbarType: newType
              }));
            }}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '120px'
            }}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
            <option value="hamburger">Hamburger</option>
          </select>
        </label>
      </div>

      {saveMessage && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: saveMessage.includes('Error') ? '#ffebee' : '#e8f5e9',
          color: saveMessage.includes('Error') ? '#c62828' : '#2e7d32',
          borderRadius: '4px',
          width: '100%'
        }}>
          {saveMessage}
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ 
        display: 'flex', 
        gap: '30px',
        width: '100%',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative'
      }}>
        {/* Left Panel - Items List */}
        <div style={{ 
          width: '400px',
          minWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 15px 0' }}>Navbar Items</h3>
            <button
              onClick={handleAddItem}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: 'auto'
              }}
            >
              + Add Item
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            overflowY: 'auto'
          }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: editingItemId === item.id ? '2px solid #007bff' : '1px solid #ddd',
                  padding: '15px',
                  cursor: 'pointer',
                  position: 'relative',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onClick={() => setEditingItemId(item.id)}
              >
                <div style={{ 
                  paddingRight: '40px', // Make room for buttons
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {item.title || 'Untitled'}
                  </div>
                  <div style={{ 
                    fontSize: '0.9em', 
                    color: '#666',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.textContent || 'No content'}
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#999', marginTop: '5px' }}>
                    Position: {item.position}
                  </div>
                </div>

                <div style={{ 
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveItem(item.id, 'up'); }}
                    disabled={index === 0}
                    style={{
                      padding: '2px 6px',
                      fontSize: '12px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      backgroundColor: 'white',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      opacity: index === 0 ? 0.5 : 1
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveItem(item.id, 'down'); }}
                    disabled={index === items.length - 1}
                    style={{
                      padding: '2px 6px',
                      fontSize: '12px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      backgroundColor: 'white',
                      cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: index === items.length - 1 ? 0.5 : 1
                    }}
                  >
                    ▼
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                    style={{
                      padding: '2px 6px',
                      fontSize: '12px',
                      border: 'none',
                      borderRadius: '3px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{
          width: '1px',
          backgroundColor: '#ddd',
          margin: '0 15px'
        }} />

        {/* Right Panel - Edit Form */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {editingItem ? (
            <>
              <h3 style={{ margin: '0' }}>Edit Item: {editingItem.title || 'Untitled'}</h3>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px',
                maxWidth: '800px'
              }}>
                {/* Title Input */}
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
                      borderRadius: '4px'
                    }}
                    placeholder="Button text that appears on navbar"
                  />
                </div>

                {/* Show Title When Opened Checkbox */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editingItem.showTitleWhenOpened}
                      onChange={(e) => updateItem({ ...editingItem, showTitleWhenOpened: e.target.checked })}
                    />
                    Show Title When Opened
                  </label>
                  <div style={{ color: '#666', fontSize: '0.9em', marginTop: '5px' }}>
                    When checked, the title will appear at the top of the modal when opened
                  </div>
                </div>

                {/* Shrink To Fit Content Checkbox */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editingItem.shrinkToFitContent}
                      onChange={(e) => updateItem({ ...editingItem, shrinkToFitContent: e.target.checked })}
                    />
                    Shrink Modal to Fit Content
                  </label>
                  <div style={{ color: '#666', fontSize: '0.9em', marginTop: '5px' }}>
                    When checked, the modal will shrink to fit the content size. When unchecked, the modal uses a fixed size (better for images)
                  </div>
                </div>

                {/* Content Text */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Content Text:
                  </label>
                  <textarea
                    value={editingItem.textContent}
                    onChange={(e) => updateItem({ ...editingItem, textContent: e.target.value })}
                    style={{
                      width: '100%',
                      minHeight: '150px',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                    placeholder="Add your content here... URLs will automatically become clickable links!"
                  />
                </div>

                {/* Colors */}
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Background Color:
                    </label>
                    <input
                      type="color"
                      value={editingItem.backgroundColor}
                      onChange={(e) => updateItem({ ...editingItem, backgroundColor: e.target.value })}
                      style={{ width: '100%', height: '40px' }}
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
                      style={{ width: '100%', height: '40px' }}
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Image (Optional):
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginBottom: '10px'
                    }}
                  />
                  {editingItem.imageUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={editingItem.imageUrl}
                        alt="Preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      <button
                        onClick={removeImage}
                        style={{
                          marginLeft: '10px',
                          padding: '5px 10px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                  {uploadStatus === 'uploading' && <div>Uploading...</div>}
                  {uploadError && <div style={{ color: 'red' }}>{uploadError}</div>}
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
            </>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '50px', 
              color: '#666',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Select an item to edit</h3>
              <p style={{ margin: 0 }}>Click on an item from the left panel to start editing, or add a new item.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavbarSetupPage; 