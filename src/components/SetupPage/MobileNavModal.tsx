import React from 'react';
import { useTransition, animated, config } from '@react-spring/web';
import { Link, useNavigate } from 'react-router-dom'; // useNavigate for links

interface MobileNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddingId: string | undefined;
}

const navLinks = [
  { label: 'How To', path: '/setup/how-to' },
  { label: 'Experience Setup', path: '/setup/experience' },
  { label: 'Scrapbook Images', path: '/setup/images' },
  { label: 'Guest Share Gallery', path: '/setup/share-gallery' },
  { label: 'Advanced Layout Setup', path: '/setup/layout' },
  { label: 'Mobile Layout Editor', path: '/setup/layoutmobile' },
  { label: 'Account Settings', path: '/setup/account' },
  { label: 'RSVP Setup', path: '/setup/rsvp' },
  { label: 'Navbar Setup', path: '/setup/navbar' },
];

const MobileNavModal: React.FC<MobileNavModalProps> = ({ isOpen, onClose, weddingId }) => {
  const navigate = useNavigate();

  const modalTransition = useTransition(isOpen, {
    from: { opacity: 0, transform: 'translateX(100%)' },
    enter: { opacity: 1, transform: 'translateX(0%)' },
    leave: { opacity: 0, transform: 'translateX(100%)' },
    config: config.gentle,
  });

  const itemsTransition = useTransition(isOpen ? navLinks : [], {
    from: { opacity: 0, transform: 'translateY(20px)' },
    enter: { opacity: 1, transform: 'translateY(0px)' },
    leave: { opacity: 0, transform: 'translateY(20px)', immediate: true },
    trail: 70,
    config: config.stiff,
  });

  const handleLinkClick = (path: string) => {
    if (weddingId) {
      navigate(`/${weddingId}${path}`);
    }
    onClose(); // Close modal after navigation
  };

  return modalTransition(
    (styles, item) =>
      item && (
        <animated.div style={{ opacity: styles.opacity }}>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 10004,
            }}
            onClick={onClose}
          />
          <animated.div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '80%',
              maxWidth: '300px',
              height: '100vh',
              backgroundColor: 'rgba(50, 50, 50, 0.98)',
              boxShadow: '-5px 0px 15px rgba(0,0,0,0.3)',
              zIndex: 10005,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              paddingTop: '60px',
              transform: styles.transform,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '2rem',
                cursor: 'pointer',
                lineHeight: 1,
                zIndex: 10006,
              }}
            >
              &times;
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {itemsTransition((itemStyles, navItem) => (
                <animated.li style={itemStyles} key={navItem.label}>
                  <button
                    onClick={() => handleLinkClick(navItem.path)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '15px 10px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {navItem.label}
                  </button>
                </animated.li>
              ))}
            </ul>
          </animated.div>
        </animated.div>
      )
  );
};

export default MobileNavModal; 