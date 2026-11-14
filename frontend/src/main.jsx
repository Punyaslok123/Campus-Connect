import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 min
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(15,23,42,0.12), 0 2px 4px rgba(15,23,42,0.06)',
            border: '1px solid #F1F5F9',
            padding: '10px 14px',
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#fff' },
            style: { background: '#fff' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
            style: { background: '#fff' },
            duration: 5000,
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
