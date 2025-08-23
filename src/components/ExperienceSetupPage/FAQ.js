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
          <strong>How does this work?</strong>
          <p>Note the 'Experience Timeline' below. This is a visual representation of the scrolling experience on the page your guests will visit to RSVP and find out more about your wedding. 'Elements' are visual events that occur on this scrolling experience.</p>
        </li>
    )},
    { id: 'faq-q2', content: (
        <li className="faq-item">
          <strong>Do I have to set this up manually?</strong>
          <p>Absolutely not! Feel free to use the 'Restore Defaults' to reset the exerience to the standard design.</p>
        </li>
    )},
    { id: 'faq-q3', content: (
        <li className="faq-item">
          <strong>What are the element types?</strong>
          <p>There are 3 types of elements: 'Text', 'Image', and 'Components'. 'Text' elements display text, 'Image' elements display an image, and 'Components' are built in features such as the RSVP Form and the Scrapbook Images.</p>
        </li>
    )},
    { id: 'faq-q4', content: (
      <li className="faq-item">
        <strong>What is a 'Scrapbook'?</strong>
        <p>It's a collection of images set up in the 'Image Management' page. This is seperate from other images set on the experience page. You can adjust the max amount of images in the Scrapbook Element, and if you have uploaded more than the max it will randomly select the max amount of them on each page load.</p>
      </li>
    )}
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