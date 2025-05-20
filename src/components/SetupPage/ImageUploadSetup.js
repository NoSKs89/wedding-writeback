import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios'; // Import axios
import { useParams } from 'react-router-dom'; // Import useParams to get weddingId
// import { useSetupAuth } from './SetupLayout'; // If you need auth status here

const ImageUploadSetup = () => {
  const { weddingId } = useParams(); // Get weddingId from URL parameters
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]); // Stores info about uploaded files { name, preview, s3Url, caption }
  const [uploadProgress, setUploadProgress] = useState({}); // To track progress for multiple files
  const [uploadError, setUploadError] = useState('');

  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach(file => {
      handleUpload(file);
    });
  }, [weddingId]); // Add weddingId to dependencies

  const handleUpload = async (file) => {
    if (!weddingId) {
      setUploadError('Wedding ID is missing. Cannot upload file.');
      console.error('Wedding ID is missing.');
      return;
    }
    setUploadError('');
    const progressKey = `${file.name}-${Date.now()}`;
    setUploadProgress(prev => ({ ...prev, [progressKey]: { progress: 0, status: 'Starting...' } }));

    try {
      // 1. Get a pre-signed URL from your backend
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Getting upload URL...' } }));
      const presignedUrlResponse = await axios.post('http://localhost:5000/api/s3/presigned-url', {
        fileName: file.name,
        fileType: file.type,
        weddingId: weddingId
      });
      
      const { presignedUrl, publicUrl, key: s3Key } = presignedUrlResponse.data;
      console.log('[ImageUploadSetup] Got pre-signed URL:', presignedUrl, 'Public URL:', publicUrl);

      // 2. Upload the file to S3 using the pre-signed URL
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Uploading to S3...' } }));
      await axios.put(presignedUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], progress: percentCompleted } }));
        }
      });
      console.log('[ImageUploadSetup] Successfully uploaded to S3:', publicUrl);
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Processing on server...', progress: 100 } }));

      // 3. After successful S3 upload, notify your backend to save the image metadata
      const caption = prompt("Enter a caption for this image (optional):", file.name);
      const saveImageResponse = await axios.post(`http://localhost:5000/api/weddings/${weddingId}/images`, {
        imageUrl: publicUrl,
        caption: caption || '', // Use entered caption or empty string
        s3Key: s3Key // Send the S3 key as well
      });
      console.log('[ImageUploadSetup] Backend response for saving image:', saveImageResponse.data);

      // Add to local state for display
      setUploadedFilesInfo(prevFiles => [...prevFiles, {
        name: file.name,
        preview: publicUrl, // Use the public S3 URL as preview now
        s3Url: publicUrl,
        caption: caption || ''
      }]);
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: 'Upload successful! 🎉'} }));

    } catch (error) {
      console.error('[ImageUploadSetup] Error during upload process:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown upload error.';
      setUploadError(`Error uploading ${file.name}: ${errorMessage}`);
      setUploadProgress(prev => ({ ...prev, [progressKey]: { ...prev[progressKey], status: `Error: ${errorMessage}`, progress: prev[progressKey]?.progress || 0 } }));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'image/webp': []
    }
  });

  const previews = uploadedFilesInfo.map(fileInfo => (
    <div key={fileInfo.s3Url} style={{ display: 'inline-flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #eaeaea', marginBottom: 8, marginRight: 8, width: 150, padding: 4, boxSizing: 'border-box', textAlign: 'center' }}>
      <img
        src={fileInfo.preview} // This will now be the S3 URL
        style={{ display: 'block', width: '100%', height: '100px', objectFit: 'cover', marginBottom: '5px' }}
        alt={`Preview of ${fileInfo.name}`}
      />
      <p style={{fontSize: '0.8em', margin:0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={fileInfo.name}>{fileInfo.name}</p>
      {fileInfo.caption && <p style={{fontSize: '0.7em', margin:'2px 0', color: 'gray'}}>{fileInfo.caption}</p>}
    </div>
  ));

  // Display ongoing uploads
  const currentUploads = Object.entries(uploadProgress).map(([key, statusObj]) => {
    if (statusObj.status === 'Upload successful! 🎉' && uploadedFilesInfo.find(f => f.name === key.split('-')[0])) return null; // Already in previews
    return (
      <div key={key} style={{border: '1px solid #eee', padding: '5px', margin:'5px 0', fontSize:'0.9em'}}>
        <span>{key.split('-').slice(0,-1).join('-')}: {statusObj.status} {statusObj.progress !== undefined ? `(${statusObj.progress}%)` : ''}</span>
        {statusObj.progress !== undefined &&
            <div style={{width: '100%', backgroundColor: '#e0e0e0', borderRadius: '2px', marginTop:'3px'}}>
                <div style={{width: `${statusObj.progress}%`, backgroundColor: '#4caf50', height:'5px', borderRadius: '2px'}}></div>
            </div>
        }
      </div>
    );
  }).filter(Boolean);

  return (
    <section className="container">
      <h4>Image Uploader</h4>
      <div {...getRootProps({
        style: {
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '40px', borderWidth: 2, borderRadius: 2, borderColor: '#eeeeee',
          borderStyle: 'dashed', backgroundColor: '#fafafa', color: '#bdbdbd',
          outline: 'none', transition: 'border .24s ease-in-out',
          cursor: 'pointer'
        }
      })}>
        <input {...getInputProps()} />
        {isDragActive ?
          <p>Drop the files here ...</p> :
          <p>Drag 'n' drop some image files here, or click to select files</p>
        }
        <em>(JPEG, PNG, GIF, WEBP images will be accepted)</em>
      </div>
      <aside style={{ marginTop: '20px' }}>
        <h5>Current Uploads:</h5>
        {currentUploads.length > 0 ? currentUploads : <p>No active uploads.</p>}
        <h5 style={{marginTop: '20px'}}>Successfully Uploaded Files:</h5>
        {previews.length > 0 ? previews : <p>No images uploaded yet.</p>}
      </aside>
      {uploadError && <p style={{ color: 'red', marginTop: '15px', fontWeight:'bold' }}>{uploadError}</p>}
      <div style={{marginTop: '30px', padding: '15px', background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '4px'}}>
        <p><strong>Image Upload to S3:</strong></p>
        <p>This component now attempts to upload files to AWS S3 and record them in MongoDB.</p>
        <ol>
          <li>A pre-signed URL is requested from the backend (`/api/s3/presigned-url`).</li>
          <li>The file is PUT directly to S3 using this URL.</li>
          <li>The backend is notified (`/api/weddings/:weddingId/images`) to save the image's public S3 URL and caption.</li>
        </ol>
        <p>Ensure your backend is running and configured with AWS credentials and S3 bucket details in `.env`.</p>
      </div>
    </section>
  );
};

export default ImageUploadSetup; 