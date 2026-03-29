import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { Library } from './components/Library';
import { BookViewer } from './components/BookViewer';
import type { PDFDocumentProxy } from 'pdfjs-dist';

function AppContent() {
  const { session, loading } = useAuth();
  const [activeBook, setActiveBook] = useState<{ id: string, title: string, file_path: string } | null>(null);
  const [activePdfDoc, setActivePdfDoc] = useState<PDFDocumentProxy | null>(null);

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1121', color: '#fff' }}>
        Loading session...
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!session) {
    return <Auth />;
  }

  // Reading a Book -> Show PDF Viewer
  if (activeBook && activePdfDoc) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
         <BookViewer 
           pdf={activePdfDoc} 
           book={activeBook}   // Inject book database mapping
           onClose={() => {
             setActivePdfDoc(null);
             setActiveBook(null);
           }} 
         />
      </div>
    );
  }

  // Dashboard -> Show Cloud Library
  return (
    <Library 
      onOpenBook={(book, pdfDoc) => {
        setActiveBook(book);
        setActivePdfDoc(pdfDoc);
      }} 
    />
  );
}

function App() {
  // Enforce dark mode on root document for crisp app look
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
