import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, User as UserIcon, Lock } from 'lucide-react';

export function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    // If missing keys
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Supabase connection missing. Please configure .env.local with your project keys.');
      setIsLoading(false);
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 alphanumeric characters.');
      setIsLoading(false);
      return;
    }
    
    // Fake email mapping required for Supabase Auth
    const mappedEmail = `${cleanUsername}@bookreader.local`;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: mappedEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: mappedEmail,
          password,
        });
        if (error) throw error;
        // If email confirmations are disabled (which they must be for this to work),
        // Supabase instantly logs in the user and the page will natively refresh!
        setMessage('Account created successfully! If you are not redirected immediately, please ensure "Confirm email" is disabled in your Supabase Dashboard under Authentication -> Providers.');
      }
    } catch (err: any) {
      // Clean up Supabase's email-focused error messages to say "Username" mapping
      const errorMsg = err.message.replace('Invalid login credentials', 'Invalid username or password').replace('email', 'username');
      setError(errorMsg || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#0B1121', color: '#fff', padding: '1rem', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#131b2f', padding: '3rem', borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', width: '100%',
        maxWidth: '400px', border: '1px solid rgba(255,255,255,0.05)'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '16px', 
            backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
          }}>
            <BookOpen size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, fontFamily: 'Outfit' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', textAlign: 'center' }}>
            {isLogin ? 'Sign in with your username' : 'Pick a simple username and password.'}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(34,197,94,0.2)' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <UserIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input 
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', boxSizing: 'border-box',
                backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input 
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', boxSizing: 'border-box',
                backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              padding: '0.85rem', width: '100%', backgroundColor: '#6366f1', color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer', marginTop: '0.5rem',
              opacity: isLoading ? 0.7 : 1, transition: 'all 0.2s',
              boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)'
            }}
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ 
              background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, 
              cursor: 'pointer', padding: 0, textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
