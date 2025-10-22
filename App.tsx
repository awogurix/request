
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { RequestProvider } from './hooks/useSongRequests';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import TodaysRequestsPage from './pages/TodaysRequestsPage';
import AdminPage from './pages/AdminPage';
import ReadmePage from './pages/ReadmePage';

function App() {
  return (
    <RequestProvider>
      <HashRouter>
        <div className="flex flex-col min-h-screen font-sans text-gray-800">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/requests" element={<TodaysRequestsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/readme" element={<ReadmePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </RequestProvider>
  );
}

export default App;
