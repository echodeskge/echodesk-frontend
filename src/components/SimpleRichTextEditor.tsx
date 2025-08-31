'use client';

import React, { useRef, useEffect, useState } from 'react';

interface SimpleRichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function SimpleRichTextEditor({
  value = '',
  onChange,
  placeholder = 'Enter text...',
  autoFocus = false,
  disabled = false
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize editor with value
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value || '';
      setIsInitialized(true);
      
      if (autoFocus) {
        editorRef.current.focus();
      }
    }
  }, [value, autoFocus, isInitialized]);

  // Update content when value changes externally
  useEffect(() => {
    if (editorRef.current && isInitialized && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, isInitialized]);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current && onChange) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // Handle paste to preserve some formatting but clean up messy HTML
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    if (html) {
      // Allow basic HTML but strip out complex formatting
      const cleanHtml = html
        .replace(/<(?!\/?(?:b|i|u|strong|em|p|br|ul|ol|li|h[1-6])\b)[^>]*>/gi, '')
        .replace(/style="[^"]*"/gi, '')
        .replace(/class="[^"]*"/gi, '');
      
      document.execCommand('insertHTML', false, cleanHtml);
    } else {
      document.execCommand('insertText', false, text);
    }
    
    // Trigger change after paste
    setTimeout(handleInput, 0);
  };

  // Toolbar command handler
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div style={{
      border: '2px solid #e1e5e9',
      borderRadius: '6px',
      background: 'white'
    }}>
      {/* Toolbar */}
      {!disabled && (
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '8px',
          borderBottom: '1px solid #e1e5e9',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('bold')}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            title="Bold"
          >
            B
          </button>
          
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('italic')}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontStyle: 'italic'
            }}
            title="Italic"
          >
            I
          </button>
          
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('underline')}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
            title="Underline"
          >
            U
          </button>
          
          <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }}></div>
          
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertUnorderedList')}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Bullet List"
          >
            • List
          </button>
          
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertOrderedList')}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Numbered List"
          >
            1. List
          </button>
          
          <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }}></div>
          
          <select
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => {
              if (e.target.value) {
                execCommand('formatBlock', e.target.value);
                e.target.value = '';
              }
            }}
            style={{
              padding: '4px 6px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            defaultValue=""
          >
            <option value="">Format</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="p">Paragraph</option>
          </select>
          
          <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }}></div>
          
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) {
                execCommand('createLink', url);
              }
            }}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Add Link"
          >
            🔗
          </button>
          
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('unlink')}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Remove Link"
          >
            🔗❌
          </button>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onPaste={handlePaste}
        style={{
          minHeight: '120px',
          padding: '12px',
          outline: 'none',
          fontSize: '14px',
          lineHeight: '1.5',
          color: disabled ? '#6c757d' : '#333',
          background: disabled ? '#f8f9fa' : 'white'
        }}
        data-placeholder={placeholder}
      />

      <style jsx>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #999;
          pointer-events: none;
          position: absolute;
        }
        
        [contenteditable] h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 16px 0 8px 0;
        }
        
        [contenteditable] h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 14px 0 7px 0;
        }
        
        [contenteditable] h3 {
          font-size: 18px;
          font-weight: bold;
          margin: 12px 0 6px 0;
        }
        
        [contenteditable] p {
          margin: 8px 0;
        }
        
        [contenteditable] ul, [contenteditable] ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        [contenteditable] li {
          margin: 4px 0;
        }
        
        [contenteditable] a {
          color: #007bff;
          text-decoration: underline;
        }
        
        [contenteditable] strong {
          font-weight: bold;
        }
        
        [contenteditable] em {
          font-style: italic;
        }
        
        [contenteditable] u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}