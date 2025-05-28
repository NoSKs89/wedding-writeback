import React from 'react';
import { Link, useParams } from 'react-router-dom';

const HowToPage: React.FC = () => {
  const { weddingId } = useParams<{ weddingId: string }>();

  const pageStyle: React.CSSProperties = {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
  };

  const headingStyle: React.CSSProperties = {
    borderBottom: '2px solid #eee',
    paddingBottom: '10px',
    marginBottom: '20px',
    color: '#333',
    textAlign: 'center',
  };

  const listItemStyle: React.CSSProperties = {
    marginBottom: '15px',
  };

  const linkStyle: React.CSSProperties = {
    color: '#007bff',
    textDecoration: 'none',
  };

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>How to Set Up Your WriteBack Experience</h1>
      <ol>
        <li style={listItemStyle}>
          Set up your 'Experience' first (<Link to={`/${weddingId}/setup/experience`} style={linkStyle}>Experience Setup Page</Link>).
          You should have the default photos uploaded during your sign up experience. However, you can always check out the FAQ button on this page for recommended settings.
        </li>
        <li style={listItemStyle}>
          Configure your scrapbook images under the <Link to={`/${weddingId}/setup/images`} style={linkStyle}>Image Management page</Link>.
          The scrapbook is a gallery of images that you can place anywhere on the parallax experience.
        </li>
        <li style={listItemStyle}>
          (Optional) Navigate to the '<Link to={`/${weddingId}/setup/layout`} style={linkStyle}>Advanced Layout</Link>' page to fine tune additional settings for your experience.
          Remember, if at any point you end up overwriting something incorrectly, that you can restore the defaults in the 'Experience Setup' page.
        </li>
        <li style={listItemStyle}>
          Make sure to fully set your RSVP settings, menu items, and other wedding details in the <Link to={`/${weddingId}/setup/account`} style={linkStyle}>Account Settings page</Link>.
        </li>
      </ol>
    </div>
  );
};

export default HowToPage; 