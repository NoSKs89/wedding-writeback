import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';
import PromptResponsesModal from './PromptResponsesModal';

// Define the structure for prompt questions
interface PromptQuestion {
  id: string;
  question: string;
  placeholder?: string;
  maxLength: number;
  required: boolean;
  position: number; // Order position in the form
}

// Define the structure for prompt form settings
interface PromptFormSettings {
  questions: PromptQuestion[];
  formTitle: string;
  formDescription: string;
  submitButtonText: string;
  allowAnonymous: boolean; // If true, don't require name/email
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
}

const PromptFormSetupPage: React.FC = () => {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [promptFormSettings, setPromptFormSettings] = useState<PromptFormSettings>({
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showResponsesModal, setShowResponsesModal] = useState(false);

  // Derive editingQuestion from promptFormSettings instead of keeping separate state
  const editingQuestion = useMemo(() => {
    if (!editingQuestionId) return null;
    return promptFormSettings.questions.find(question => question.id === editingQuestionId) || null;
  }, [editingQuestionId, promptFormSettings.questions]);

  // Load prompt form settings from server
  useEffect(() => {
    if (weddingId) {
      loadPromptFormSettings();
    }
  }, [weddingId]);

  const loadPromptFormSettings = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await axios.get(`${apiBase}/weddings/${weddingId}/prompt-form-settings`);
      if (response.data && response.data.data) {
        setPromptFormSettings(response.data.data);
      }
    } catch (error) {
      console.warn('No prompt form settings found, using defaults');
      // Initialize with default question
      setPromptFormSettings(prev => ({
        ...prev,
        questions: [{
          id: Date.now().toString(),
          question: 'What is your favorite memory with the couple?',
          placeholder: 'Share your favorite memory...',
          maxLength: 500,
          required: true,
          position: 1,
        }],
      }));
    }
    setIsLoading(false);
  };

  const savePromptFormSettings = async () => {
    if (!weddingId) return;
    
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Clean the data before saving - ensure no empty questions are saved
      const cleanedSettings = {
        ...promptFormSettings,
        questions: promptFormSettings.questions.filter(question => {
          const hasQuestion = question.question && question.question.trim();
          return hasQuestion;
        }),
      };

      const apiBase = getApiBaseUrl();
      await axios.post(`${apiBase}/weddings/${weddingId}/prompt-form-settings`, cleanedSettings);
      setSaveMessage('Prompt form settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving prompt form settings:', error);
      setSaveMessage('Failed to save prompt form settings.');
      setTimeout(() => setSaveMessage(null), 5000);
    }
    setIsSaving(false);
  };

  const addNewQuestion = () => {
    const newQuestionId = Date.now().toString();
    const newQuestion: PromptQuestion = {
      id: newQuestionId,
      question: '',
      placeholder: '',
      maxLength: 300,
      required: false,
      position: promptFormSettings.questions.length + 1,
    };
    setPromptFormSettings(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    setEditingQuestionId(newQuestionId);
  };

  const updateQuestion = (updatedQuestion: PromptQuestion) => {
    setPromptFormSettings(prev => ({
      ...prev,
      questions: prev.questions.map(question => 
        question.id === updatedQuestion.id ? updatedQuestion : question
      ),
    }));
  };

  const deleteQuestion = (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    
    setPromptFormSettings(prev => ({
      ...prev,
      questions: prev.questions.filter(question => question.id !== questionId),
    }));
    
    if (editingQuestionId === questionId) {
      setEditingQuestionId(null);
    }
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const questions = [...promptFormSettings.questions];
    const currentIndex = questions.findIndex(q => q.id === questionId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    // Swap questions
    [questions[currentIndex], questions[newIndex]] = [questions[newIndex], questions[currentIndex]];
    
    // Update positions
    questions.forEach((question, index) => {
      question.position = index + 1;
    });
    
    setPromptFormSettings(prev => ({
      ...prev,
      questions,
    }));
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading prompt form settings...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Prompt Form Setup</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => setShowResponsesModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            View Answers
          </button>
          <button
            onClick={savePromptFormSettings}
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

      <div style={{ display: 'flex', gap: '30px' }}>
        {/* Left Panel - Questions List */}
        <div style={{ flex: '0 0 400px', borderRight: '1px solid #ddd', paddingRight: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Questions</h3>
            <button
              onClick={addNewQuestion}
              style={{
                padding: '8px 15px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              + Add Question
            </button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 80px)' }}>
            {promptFormSettings.questions.map((question, index) => (
              <div
                key={question.id}
                style={{
                  padding: '15px',
                  marginBottom: '10px',
                  border: editingQuestionId === question.id ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: editingQuestionId === question.id ? '#f8f9fa' : 'white',
                }}
                onClick={() => setEditingQuestionId(question.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '0.9rem' }}>
                      Question {question.position}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                      {question.question || 'No question text'}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#888' }}>
                      <span>{question.required ? 'Required' : 'Optional'}</span>
                      <span>Max: {question.maxLength} chars</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginLeft: '10px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveQuestion(question.id, 'up');
                      }}
                      disabled={index === 0}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        backgroundColor: index === 0 ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveQuestion(question.id, 'down');
                      }}
                      disabled={index === promptFormSettings.questions.length - 1}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        backgroundColor: index === promptFormSettings.questions.length - 1 ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: index === promptFormSettings.questions.length - 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(question.id);
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Form Settings and Question Editor */}
        <div style={{ flex: 1 }}>
          {/* Form Settings */}
          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Form Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>


              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Form Title:
                </label>
                <input
                  type="text"
                  value={promptFormSettings.formTitle}
                  onChange={(e) => setPromptFormSettings(prev => ({ ...prev, formTitle: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                  placeholder="Form title that appears at the top"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Form Description:
                </label>
                <textarea
                  value={promptFormSettings.formDescription}
                  onChange={(e) => setPromptFormSettings(prev => ({ ...prev, formDescription: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    minHeight: '60px',
                  }}
                  placeholder="Optional description text"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Submit Button Text:
                </label>
                <input
                  type="text"
                  value={promptFormSettings.submitButtonText}
                  onChange={(e) => setPromptFormSettings(prev => ({ ...prev, submitButtonText: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                  placeholder="Submit"
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    checked={promptFormSettings.allowAnonymous}
                    onChange={(e) => setPromptFormSettings(prev => ({ ...prev, allowAnonymous: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>Allow Anonymous Submissions</span>
                </label>
                <div style={{ fontSize: '0.8em', color: '#6c757d', marginLeft: '24px' }}>
                  When checked, users can submit without providing their name or email
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Background Color:
                  </label>
                  <input
                    type="color"
                    value={promptFormSettings.backgroundColor}
                    onChange={(e) => setPromptFormSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Text Color:
                  </label>
                  <input
                    type="color"
                    value={promptFormSettings.textColor}
                    onChange={(e) => setPromptFormSettings(prev => ({ ...prev, textColor: e.target.value }))}
                    style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Button Color:
                  </label>
                  <input
                    type="color"
                    value={promptFormSettings.buttonColor}
                    onChange={(e) => setPromptFormSettings(prev => ({ ...prev, buttonColor: e.target.value }))}
                    style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Button Text Color:
                  </label>
                  <input
                    type="color"
                    value={promptFormSettings.buttonTextColor}
                    onChange={(e) => setPromptFormSettings(prev => ({ ...prev, buttonTextColor: e.target.value }))}
                    style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Question Editor */}
          {editingQuestion && (
            <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0 }}>Edit Question {editingQuestion.position}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Question Text:
                  </label>
                  <textarea
                    value={editingQuestion.question}
                    onChange={(e) => updateQuestion({ ...editingQuestion, question: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      minHeight: '80px',
                    }}
                    placeholder="Enter your question here..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Placeholder Text (Optional):
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.placeholder || ''}
                    onChange={(e) => updateQuestion({ ...editingQuestion, placeholder: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                    placeholder="Placeholder text for the input field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Maximum Character Length:
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    value={editingQuestion.maxLength}
                    onChange={(e) => updateQuestion({ ...editingQuestion, maxLength: parseInt(e.target.value, 10) || 300 })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editingQuestion.required}
                      onChange={(e) => updateQuestion({ ...editingQuestion, required: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>Required Question</span>
                  </label>
                  <div style={{ fontSize: '0.8em', color: '#6c757d', marginLeft: '24px', marginTop: '5px' }}>
                    Users must answer this question before submitting
                  </div>
                </div>
              </div>
            </div>
          )}

          {!editingQuestion && promptFormSettings.questions.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed #ddd', borderRadius: '8px', color: '#666' }}>
              No questions yet. Click "Add Question" to get started.
            </div>
          )}

          {!editingQuestion && promptFormSettings.questions.length > 0 && (
            <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed #ddd', borderRadius: '8px', color: '#666' }}>
              Select a question from the left to edit its details.
            </div>
          )}
        </div>
      </div>

      {/* Prompt Responses Modal */}
      <PromptResponsesModal
        isOpen={showResponsesModal}
        onClose={() => setShowResponsesModal(false)}
        weddingId={weddingId || ''}
      />
    </div>
  );
};

export default PromptFormSetupPage; 