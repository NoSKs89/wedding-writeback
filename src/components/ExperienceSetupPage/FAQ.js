import React from 'react';
import { useTransition, animated, config, useSpringRef } from '@react-spring/web';
import './FAQ.css'; // We'll create this CSS file next

const FAQ = ({ isFaqOpen, onClose, faqTransRef }) => {
  // Create local ref if external ref not provided (though it should be)
  const localTransRef = useSpringRef();
  const transitionRef = faqTransRef || localTransRef;

  // Prepare FAQ content for transition
  const faqItems = [
    { id: 'faq-title', content: <h2 className="faq-title">FAQ</h2> },
    { id: 'faq-q1', content: (
        <li className="faq-item">
          <strong>Why sign a waiver?</strong>
          <p>We don't expect any issues. The waiver is to ensure so we are covered in the event that a customer claims we damaged their record that was already in that condition.</p>
        </li>
    )},
    { id: 'faq-q2', content: (
        <li className="faq-item">
          <strong>My digital files are not as loud as other media?</strong>
          <p>This is because the process of recording the output of the record leaves the dynamic range intact. Look up the 'loudness wars' and what compression is. Upon request, I can add a mastering limiter to bring the overall level up but doing so reduces the dynamic range.</p>
        </li>
    )},
    { id: 'faq-q3', content: (
        <li className="faq-item">
          <strong>Why so expensive?</strong>
          <p>This is our side hustle, and operates after our regular careers. Digitizing a record takes time to record, then splice, organize the files and export differing versions.</p>
        </li>
    )},
    { id: 'faq-q4', content: (
        <li className="faq-item">
          <strong>My record still has pops or clicks?</strong>
          <p>Dirt and dust are just one of the many things that can cause pops or clicks. We can clean the record for you, but it won't fix scratches or other irritants.</p>
        </li>
    )},
  ];

  // Use the provided ref for transitions
  const transitions = useTransition(isFaqOpen ? faqItems : [], {
      ref: transitionRef,
      keys: item => item.id,
      from: { opacity: 0, transform: 'translateY(15px)' },
      enter: { opacity: 1, transform: 'translateY(0px)' },
      leave: { opacity: 0, transform: 'translateY(-15px)' }, // Position absolute removed here too
      trail: 80, // Slightly different trail
      config: config.stiff, // Maybe a stiffer config?
  });

  // If the FAQ is not open, don't render anything
  if (!isFaqOpen) {
    return null;
  }

  return (
    <div
      className="faq-container"
      onClick={(e) => {
        // Prevent clicks inside the FAQ content from closing it via the backdrop
        e.stopPropagation();
      }}
    >
      {/* Close button */}
      <button onClick={(e) => {
        e.stopPropagation(); // Prevent backdrop click
        onClose();
      }} className="faq-close-button" aria-label="Close FAQ">
        &times;
      </button>

      {/* Animate the content */}
      <div className="faq-content">
        {/* Render title separately */}
        {transitions((style, item) => 
          item && item.id === 'faq-title' ? (
            <animated.div style={{...style, width: '100%'}} onClick={(e) => e.stopPropagation()}>
              {item.content}
            </animated.div>
          ) : null
        )}
        {/* Render list items within a UL */}
        <ul>
          {transitions((style, item) => 
            item && item.id !== 'faq-title' && item.id.startsWith('faq-q') ? (
              <animated.li style={style} onClick={(e) => e.stopPropagation()}>
                {/* Render the content of the li directly */}
                {/* The content is already wrapped in an <li> in the faqItems definition, access its children */} 
                {item.content.props.children}
              </animated.li>
            ) : null
          )}
        </ul>
      </div>
    </div>
  );
};

export default FAQ; 