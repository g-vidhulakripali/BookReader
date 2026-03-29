import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, LogOut, Loader2, FileText, Trash2 } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker securely 
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface Book {
  id: string;
  title: string;
  file_path: string;
  cover_url: string | null;
  created_at: string;
}

export function Library({ onOpenBook }: { onOpenBook: (book: Book, pdfDoc: PDFDocumentProxy) => void }) {
  const { user, signOut } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingBookId, setOpeningBookId] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, [user]);

  const fetchBooks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBooks(data || []);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
      alert('Must be a PDF file');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const title = file.name.replace('.pdf', '');

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 1.5 Generate Cover Thumbnail
      let coverBase64 = null;
      try {
        const fileUrl = URL.createObjectURL(file);
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 }); // Low res for cover
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          // IMPORTANT: PDFs are transparent by default. JPEG has no alpha.
          // We must paint the canvas solid white first to avoid solid black uploads.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          await page.render({ canvasContext: ctx, viewport, canvas: tempCanvas }).promise;
          coverBase64 = tempCanvas.toDataURL('image/jpeg', 0.5);
        }
        URL.revokeObjectURL(fileUrl);
      } catch (err) {
        console.warn('Failed to generate cover thumbnail:', err);
      }

      // 2. Insert record into database
      const { error: dbError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: title,
          file_path: fileName,
          cover_url: coverBase64
        });

      if (dbError) throw dbError;

      fetchBooks(); // Refresh list
    } catch (err: any) {
      console.error('Error uploading:', err);
      alert(err.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const [deletingBook, setDeletingBook] = useState<Book | null>(null);

  const confirmDelete = async () => {
    if (!deletingBook) return;
    try {
      // Delete from storage
      await supabase.storage.from('pdfs').remove([deletingBook.file_path]);
      
      // Delete from DB
      await supabase.from('books').delete().eq('id', deletingBook.id);
      
      fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
    } finally {
      setDeletingBook(null);
    }
  };

  const handleOpenBook = async (book: Book) => {
    if (openingBookId) return;
    setOpeningBookId(book.id);
    try {
      // 1. Generate secure streaming URL (valid for 1 hour) instead of downloading entire Blob
      const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(book.file_path, 3600);
      if (error || !data) throw error || new Error('Failed to generate secure URL for streaming.');

      // 2. Load PDF document via HTTP URL allowing pdf.js to natively utilize Range Requests and load instantly
      const loadingTask = pdfjsLib.getDocument(data.signedUrl);
      const pdf = await loadingTask.promise;
      
      onOpenBook(book, pdf);
    } catch (err: any) {
      console.error('Error opening book:', err);
      alert('Error opening book: ' + err.message);
    } finally {
      setOpeningBookId(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1121',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Custom Deletion Modal */}
      {deletingBook && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(11, 17, 33, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#131B2F', padding: '2rem', borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)', maxWidth: '400px', width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', textAlign: 'center'
          }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' 
            }}>
              <Trash2 size={32} />
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Delete this book?</h2>
            <p style={{ margin: '0 0 2rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Are you sure you want to permanently remove "{deletingBook.title}"? Your bookmarks and highlights will also be lost forever.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setDeletingBook(null)}
                style={{ flex: 1, padding: '0.85rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ flex: 1, padding: '0.85rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
        backgroundColor: '#131B2F'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/icon.png" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }} />
          <h1 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 600 }}>BookReader Pro</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{user?.email}</span>
          <button 
            onClick={signOut}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', color: '#ef4444', 
              cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      <main style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>Saved Books</h2>
          
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: '#6366f1', color: '#fff', padding: '0.6rem 1.25rem',
            borderRadius: '12px', cursor: uploading ? 'wait' : 'pointer', fontWeight: 600,
            opacity: uploading ? 0.7 : 1, transition: 'all 0.2s',
            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)'
          }}>
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '6rem 2rem', border: '2px dashed rgba(255,255,255,0.1)', 
            borderRadius: '24px', backgroundColor: 'rgba(0,0,0,0.2)' 
          }}>
            <FileText size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>Your library is empty</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Upload your first PDF to sync it across all your devices.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {books.map(book => (
              <div 
                key={book.id} 
                onClick={() => handleOpenBook(book)}
                style={{ 
                  backgroundColor: '#131B2F', borderRadius: '16px', overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column'
                }}
                onMouseOver={(e) => {
                   e.currentTarget.style.transform = 'translateY(-4px)';
                   e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(0,0,0,0.5)';
                }}
                onMouseOut={(e) => {
                   e.currentTarget.style.transform = 'translateY(0)';
                   e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ 
                  height: '240px', backgroundColor: 'rgba(255,255,255,0.02)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative'
                }}>
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FileText size={48} color="rgba(255,255,255,0.2)" />
                  )}

                  {/* Loading Overlay */}
                  {openingBookId === book.id && (
                    <div style={{
                      position: 'absolute', inset: 0, 
                      backgroundColor: 'rgba(11, 17, 33, 0.8)', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(4px)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <Loader2 size={32} color="#6366f1" className="animate-spin" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Streaming...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                  }} title={book.title}>
                    {book.title}
                  </h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(book.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingBook(book);
                      }}
                      style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
