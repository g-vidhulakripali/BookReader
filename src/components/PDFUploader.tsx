import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { loadPDF } from '../lib/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PDFUploaderProps {
  onPDFLoaded: (pdf: PDFDocumentProxy, file: File) => void;
}

export function PDFUploader({ onPDFLoaded }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setStatus('error');
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }

    try {
      setStatus('loading');
      const pdf = await loadPDF(file);
      setStatus('success');
      setTimeout(() => {
        onPDFLoaded(pdf, file);
      }, 500); // Small delay to show success state
    } catch (err) {
      setStatus('error');
      setErrorMessage('Failed to parse the PDF document.');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="glass-panel uploader-container" style={{
      padding: '3rem 2rem', textAlign: 'center', maxWidth: '650px', width: '100%',
      display: 'flex', flexDirection: 'column', gap: '1.5rem',
      border: `2px dashed ${isDragging ? 'var(--accent-color)' : 'var(--glass-border)'}`,
      transition: 'all 0.3s ease',
      transform: isDragging ? 'scale(1.02)' : 'scale(1)',
      backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--glass-bg)',
      cursor: 'pointer'
    }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
        {status === 'idle' && (
          <>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'var(--selection-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Upload color="var(--accent-color)" size={40} />
            </div>
            <h2 style={{ fontSize: '2.2rem', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Step into your reading space</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '420px', lineHeight: 1.6 }}>
              Drag and drop your PDF here, or click to select a file from your device.
            </p>
          </>
        )}

        {status === 'loading' && (
          <>
            <div className="flex-center animate-fade-in" style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'var(--selection-bg)',
              animation: 'spin 2s linear infinite'
            }}>
              <FileText color="var(--accent-color)" size={40} />
            </div>
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
            <h2 style={{ fontSize: '1.8rem' }}>Processing Document...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Extracting pages and formatting for reading.</p>
          </>
        )}

        {status === 'success' && (
          <div className="animate-fade-in flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle color="#22c55e" size={44} />
            </div>
            <h2 style={{ fontSize: '1.8rem' }}>Ready to Read!</h2>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertCircle color="#ef4444" size={44} />
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#ef4444' }}>Error reading file</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{errorMessage}</p>
            <button className="glass-pill" style={{
              background: 'var(--glass-bg)', padding: '0.5rem 1.5rem', marginTop: '1rem'
            }} onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
