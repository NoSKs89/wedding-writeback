import React, { useState, useEffect, FormEvent, ChangeEvent, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import axios from 'axios';
import { useSpring, animated, config } from 'react-spring';
import { useSetupMode } from '../contexts/SetupModeContext';
import { useUserInfo } from '../contexts/UserInfoContext';
import { formThemes, defaultThemeName, getThemeByName, FormTheme } from '../config/formThemes';
import { fontFamilyOptions } from '../config/fontConfig';

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number): string => {
  let r = "0", g = "0", b = "0";
  if (hex.length === 4) {
    r = "0x" + hex[1] + hex[1];
    g = "0x" + hex[2] + hex[2];
    b = "0x" + hex[3] + hex[3];
  } else if (hex.length === 7) {
    r = "0x" + hex[1] + hex[2];
    g = "0x" + hex[3] + hex[4];
    b = "0x" + hex[5] + hex[6];
  }
  return `rgba(${+r},${+g},${+b},${opacity})`;
};

// Interface for prompt questions
interface PromptQuestion {
  id: string;
  question: string;
  placeholder?: string;
  maxLength: number;
  required: boolean;
  position: number;
}

// Interface for prompt form settings
interface PromptFormSettings {
  isEnabled: boolean;
  questions: PromptQuestion[];
  formTitle: string;
  formDescription: string;
  submitButtonText: string;
  allowAnonymous: boolean;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
}

// Interface for the weddingData prop
interface WeddingData {
  id?: string | number;
  customId?: string;
  brideName?: string;
  groomName?: string;
  weddingDate?: string;
}

// Interface for saved user info from RSVP
interface SavedUserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

// Interface for the component's props
interface PromptFormProps {
  weddingData: WeddingData;
  backendUrl: string;
  elementName?: string;
  styleControlsFromProp?: any;
}

// Default styles for the form
export const promptFormControlsSchema = {
  formThemeName: { value: defaultThemeName, options: formThemes.map(theme => theme.name), label: 'Form Theme' },
  formTextFontFamily: { value: fontFamilyOptions[0], options: fontFamilyOptions, label: 'Text Font' },
  buttonTextFontFamily: { value: fontFamilyOptions[0], options: fontFamilyOptions, label: 'Button Font' },
  formBackgroundOpacity: { value: 1, min: 0, max: 1, step: 0.01, label: 'Background Opacity' },
  formBorderColor: { value: '#cccccc', label: 'Border Color' },
  formBorderWidth: { value: 1, min: 0, max: 10, step: 1, label: 'Border Width (px)' },
  overwriteFlexWidth: { value: false, label: 'Overwrite Responsive Width' },
  formWidth: { value: 500, min: 300, max: 1200, step: 10, label: 'Form Width (px)', render: (get: any) => get('overwriteFlexWidth') },
  overwriteFlexHeight: { value: false, label: 'Overwrite Flex Height' },
  formHeight: { value: 460, min: 400, max: 1000, step: 10, label: 'Form Height (px)', render: (get: any) => get('overwriteFlexHeight') },
  formPadding: { value: 30, min: 10, max: 50, step: 1, label: 'Padding (px)' },
};

const PromptForm = forwardRef<HTMLDivElement, PromptFormProps>(({ weddingData, backendUrl, elementName = 'Prompt Form', styleControlsFromProp = {} }, ref) => {
  const weddingId = weddingData.customId || weddingData.id;
  const { isSetupMode } = useSetupMode();
  const { userInfo } = useUserInfo();
  
  // Create a default set of values from the schema
  const defaultStyleValues = useMemo(() => Object.entries(promptFormControlsSchema).reduce((acc: any, [key, val]: [string, any]) => {
    acc[key] = val.value;
    return acc;
  }, {}), []);
  
  // The component will now get its values from props, merged with defaults
  const {
    formThemeName,
    formTextFontFamily,
    buttonTextFontFamily,
    formBackgroundOpacity,
    formBorderColor,
    formBorderWidth,
    overwriteFlexWidth,
    formWidth,
    overwriteFlexHeight,
    formHeight,
    formPadding,
  } = useMemo(() => ({
    ...defaultStyleValues,
    ...styleControlsFromProp,
  }), [defaultStyleValues, styleControlsFromProp]);

  const internalFormRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => internalFormRef.current as HTMLDivElement);

  const selectedTheme: FormTheme = useMemo(() => {
    const theme = formThemes.find(t => t.name === formThemeName) || getThemeByName(defaultThemeName);
    return theme || formThemes[0] || { 
      name: 'EmergencyFallback', 
      backgroundColor: '#ffffff', 
      textColor: '#000000', 
      fontFamily: fontFamilyOptions[0],
      borderColor: '#cccccc',
      buttonBackgroundColor: '#007bff',
      buttonTextColor: '#ffffff'
    };
  }, [formThemeName]);

  // Form state
  const [promptFormSettings, setPromptFormSettings] = useState<PromptFormSettings | null>(null);
  const [firstName, setFirstName] = useState<string>(userInfo?.firstName || '');
  const [lastName, setLastName] = useState<string>(userInfo?.lastName || '');
  const [email, setEmail] = useState<string>(userInfo?.email || '');
  const [emailError, setEmailError] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [finalResponse, setFinalResponse] = useState<any>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load prompt form settings
  useEffect(() => {
    const loadPromptFormSettings = async () => {
      try {
        const response = await axios.get(`${backendUrl}/weddings/${weddingId}/prompt-form-settings`);
        if (response.data && response.data.data) {
          setPromptFormSettings(response.data.data);
        }
      } catch (error) {
        console.warn('No prompt form settings found');
        // Use default settings if none found
        setPromptFormSettings({
          isEnabled: false,
          questions: [],
          formTitle: 'Share Your Thoughts',
          formDescription: 'We\'d love to hear from you!',
          submitButtonText: 'Submit',
          allowAnonymous: false,
          backgroundColor: '#ffffff',
          textColor: '#333333',
          buttonColor: '#007bff',
          buttonTextColor: '#ffffff',
        });
      }
      setIsLoading(false);
    };

    if (weddingId) {
      loadPromptFormSettings();
    }
  }, [weddingId, backendUrl]);

  // Update form when shared user info changes
  useEffect(() => {
    if (userInfo) {
      setFirstName(userInfo.firstName || '');
      setLastName(userInfo.lastName || '');
      setEmail(userInfo.email || '');
    }
  }, [userInfo]);

  const validateEmail = (emailInput: string): boolean => {
    if (!emailInput) {
      setEmailError('');
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailInput)) {
      setEmailError('');
      return true;
    } else {
      setEmailError('Please enter a valid email address.');
      return false;
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    validateEmail(newEmail);
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submissionStatus === 'submitting') return;
    setSubmissionStatus('submitting');
    setFormError(null);

    // Validate that we have a wedding ID
    if (!weddingId) {
      setFormError("Wedding ID is missing. Cannot submit responses.");
      setSubmissionStatus('error');
      return;
    }

    // If not allowing anonymous, validate name fields
    if (!promptFormSettings?.allowAnonymous) {
      if (!firstName || !firstName.trim()) {
        setFormError("Please enter your first name.");
        setSubmissionStatus('error');
        return;
      }

      if (!lastName || !lastName.trim()) {
        setFormError("Please enter your last name.");
        setSubmissionStatus('error');
        return;
      }
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      setFormError("Please correct the email address before submitting.");
      setSubmissionStatus('error');
      return;
    }

    // Validate required questions
    if (promptFormSettings?.questions) {
      for (const question of promptFormSettings.questions) {
        if (question.required && (!responses[question.id] || !responses[question.id].trim())) {
          setFormError(`Please answer: ${question.question}`);
          setSubmissionStatus('error');
          return;
        }
      }
    }

    const payload = {
      weddingId,
      firstName: promptFormSettings?.allowAnonymous ? (firstName || 'Anonymous') : firstName,
      lastName: promptFormSettings?.allowAnonymous ? (lastName || 'User') : lastName,
      email: email || null,
      responses,
      isAnonymous: promptFormSettings?.allowAnonymous && (!firstName && !lastName),
    };

    try {
      const response = await axios.post(`${backendUrl}/prompt-responses`, payload);
      setFinalResponse(response.data);
      setSubmissionStatus('submitted');
    } catch (err: any) {
      console.error("Error submitting prompt responses:", err);
      const errorMessage = err.response?.data?.message || 'There was an error submitting your responses. Please try again.';
      setFormError(errorMessage);
      setSubmissionStatus('error');
    }
  };

  // Spring animations for responsive form changes
  const formWidthSpring = useSpring({
    width: overwriteFlexWidth 
      ? `${formWidth}px`
      : '90%',
    maxWidth: overwriteFlexWidth 
      ? '100%'
      : '90%',
    marginLeft: overwriteFlexWidth ? '0px' : 'auto',
    marginRight: overwriteFlexWidth ? '0px' : 'auto',
    config: config.gentle,
  });

  // Styles using values from controls
  const formContainerStyle: React.CSSProperties = {
    backgroundColor: promptFormSettings ? 
      hexToRgba(promptFormSettings.backgroundColor, formBackgroundOpacity) :
      hexToRgba(selectedTheme.backgroundColor, formBackgroundOpacity),
    color: promptFormSettings?.textColor || selectedTheme.textColor,
    border: `${formBorderWidth}px solid ${formBorderColor}`,
    padding: `${formPadding}px`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
    fontFamily: formTextFontFamily,
    transition: 'height 0.4s ease-in-out',
    ...(overwriteFlexHeight 
      ? { 
          height: (submissionStatus === 'submitted' || submissionStatus === 'error') ? 'auto' : `${formHeight}px`
        }
      : { 
          minHeight: 'auto'
        }
    ),
  };

  const contentContainerStyle: React.CSSProperties = {
    flexGrow: 1,
    overflowY: 'auto',
    paddingRight: '15px',
    marginRight: '-15px',
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: `1px solid ${selectedTheme.borderColor || '#ccc'}`,
    background: hexToRgba(selectedTheme.backgroundColor || '#ffffff', 0.8),
    color: promptFormSettings?.textColor || selectedTheme.textColor || '#000000',
    fontFamily: formTextFontFamily,
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 18px',
    border: 'none',
    borderRadius: '5px',
    background: promptFormSettings?.buttonColor || selectedTheme.buttonBackgroundColor || '#007bff',
    color: promptFormSettings?.buttonTextColor || selectedTheme.buttonTextColor || '#ffffff',
    fontFamily: buttonTextFontFamily,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1em',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
  };

  const h2Style: React.CSSProperties = {
    fontSize: '1.2rem',
    fontWeight: 500,
    color: promptFormSettings?.textColor || selectedTheme.textColor,
    fontFamily: formTextFontFamily,
  };

  // Don't render if loading or prompt form is disabled
  if (isLoading) {
    return null;
  }

  if (!promptFormSettings?.isEnabled || promptFormSettings.questions.length === 0) {
    return null;
  }

  const renderContent = () => {
    if (submissionStatus === 'submitted') {
      return (
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <button 
            onClick={() => setIsClosed(true)}
            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: promptFormSettings?.textColor || selectedTheme.textColor }}
          >
            &times;
          </button>
          <h2 style={{...h2Style}}>Thank You{finalResponse?.firstName ? `, ${finalResponse.firstName}` : ''}!</h2>
          <p style={{color: promptFormSettings?.textColor || selectedTheme.textColor, fontFamily: formTextFontFamily}}>
            Your responses have been submitted successfully.
          </p>
        </div>
      );
    } else if (submissionStatus === 'error') {
      return (
        <div style={{ textAlign: 'center', position: 'relative' }}>
           <button 
            onClick={() => setIsClosed(true)}
            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: promptFormSettings?.textColor || selectedTheme.textColor }}
          >
            &times;
          </button>
          <h2 style={{...h2Style}}>Error Submitting Responses</h2>
          <p style={{ color: 'red' }}>{formError}</p>
          <button onClick={() => setSubmissionStatus('idle')} style={{...buttonStyle, marginTop: '1rem'}}>Try Again</button>
        </div>
      );
    }

    // Main form view
    return (
      <form onSubmit={handleSubmit}>
        <h2 style={{...h2Style, textAlign: 'center', marginBottom: '1rem'}}>
          {promptFormSettings?.formTitle}
        </h2>
        {promptFormSettings?.formDescription && (
          <p style={{color: promptFormSettings?.textColor || selectedTheme.textColor, textAlign: 'center', marginBottom: '1.5rem', fontFamily: formTextFontFamily}}>
            {promptFormSettings.formDescription}
          </p>
        )}

        {/* User information fields - only if not allowing anonymous or if user info not already provided */}
        {!promptFormSettings?.allowAnonymous && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              placeholder="First Name" 
              required 
              style={{ ...inputStyle, width: '50%' }} 
            />
            <input 
              type="text" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              placeholder="Last Name" 
              required 
              style={{ ...inputStyle, width: '50%' }} 
            />
          </div>
        )}
        
        {(!promptFormSettings?.allowAnonymous || userInfo) && (
          <>
            <input 
              type="email" 
              value={email} 
              onChange={handleEmailChange} 
              placeholder="Email (Optional)" 
              style={{ ...inputStyle, marginBottom: '1rem' }} 
            />
            {emailError && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>{emailError}</p>}
          </>
        )}

        {/* Prompt questions */}
        {promptFormSettings?.questions.map((question, index) => (
          <div key={question.id} style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: promptFormSettings?.textColor || selectedTheme.textColor, fontFamily: formTextFontFamily }}>
              {question.question}
              {question.required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
            </label>
            <textarea
              value={responses[question.id] || ''}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              placeholder={question.placeholder || 'Type your response here...'}
              maxLength={question.maxLength}
              required={question.required}
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical' as const,
              }}
            />
            <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'right', marginTop: '-10px', marginBottom: '5px' }}>
              {(responses[question.id] || '').length}/{question.maxLength} characters
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button type="submit" style={buttonStyle} disabled={submissionStatus === 'submitting'}>
            {submissionStatus === 'submitting' ? 'Submitting...' : (promptFormSettings?.submitButtonText || 'Submit')}
          </button>
        </div>
        {formError && <p style={{ color: 'red', textAlign: 'center', marginTop: '1rem' }}>{formError}</p>}
      </form>
    );
  };

  if (isClosed) {
    return null; // Hide the entire component if closed
  }
  
  return (
    <animated.div ref={internalFormRef} style={{...formContainerStyle, ...formWidthSpring}}>
      <div style={contentContainerStyle}>
        {renderContent()}
      </div>
    </animated.div>
  );
});

export default PromptForm; 