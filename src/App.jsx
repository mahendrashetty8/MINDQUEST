// src/App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LandingPage from './pages/LandingPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import AdminLogin from './pages/Admin/AdminLogin.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import { api, getAdminToken } from './utils/api.js';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'quiz' | 'result' | 'leaderboard' | 'admin'
  const [quizInfo, setQuizInfo] = useState(null);
  const [examSession, setExamSession] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(Boolean(getAdminToken()));
  const [loading, setLoading] = useState(true);

  // Check URL path or hash on startup
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path.includes('/admin') || hash === '#admin') {
      setCurrentView('admin');
    } else if (hash === '#leaderboard') {
      setCurrentView('leaderboard');
    }
  }, []);

  const refreshQuizInfo = async () => {
    try {
      const info = await api.getQuizInfo();
      setQuizInfo(info);
      return info;
    } catch (err) {
      console.error('Failed to load quiz info:', err);
    }
  };

  // Fetch Quiz Info and check active session
  useEffect(() => {
    const initialize = async () => {
      try {
        const info = await refreshQuizInfo();

        // Check if there is an existing candidate session in storage
        const savedAttemptId = localStorage.getItem('mindquest_active_attempt') || localStorage.getItem('pragyan_active_attempt');
        const sessionToken = localStorage.getItem('mindquest_session_token');

        if (savedAttemptId) {
          try {
            const restored = await api.restoreSession(savedAttemptId);
            if (['submitted', 'auto_submitted'].includes(restored.status) && restored.result) {
              setExamResult(restored.result);
              setCurrentView('result');
              localStorage.removeItem('mindquest_active_attempt');
              localStorage.removeItem('pragyan_active_attempt');
            } else if (restored.questions && restored.questions.length > 0) {
              setExamSession(restored);
              setCurrentView('quiz');
            }
          } catch (sessionErr) {
            console.warn('Could not restore session:', sessionErr);
            localStorage.removeItem('mindquest_active_attempt');
            localStorage.removeItem('pragyan_active_attempt');
          }
        }
      } catch (err) {
        console.error('Initial load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Start exam session
  const handleStartExam = (sessionData) => {
    if (sessionData.alreadyCompleted) {
      api.getResult(sessionData.attemptId).then(res => {
        setExamResult(res.result);
        setCurrentView('result');
      });
      return;
    }

    setExamSession(sessionData);
    localStorage.setItem('mindquest_active_attempt', sessionData.attemptId);
    if (sessionData.sessionToken) {
      localStorage.setItem('mindquest_session_token', sessionData.sessionToken);
      document.cookie = `mindquest_session_token=${sessionData.sessionToken}; max-age=86400; path=/; SameSite=Lax`;
    }
    setCurrentView('quiz');
  };

  // Exam completed
  const handleExamCompleted = (resultData) => {
    setExamResult(resultData);
    localStorage.removeItem('mindquest_active_attempt');
    localStorage.removeItem('mindquest_session_token');
    document.cookie = 'mindquest_session_token=; max-age=0; path=/; SameSite=Lax';
    setCurrentView('result');
  };

  // Return to landing
  const handleReturnHome = () => {
    refreshQuizInfo();
    setCurrentView('landing');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-mono)',
        fontSize: '1.1rem',
        color: 'var(--text-ink)'
      }}>
        Initializing Examination Environment...
      </div>
    );
  }

  return (
    <div className="app-container">
      {currentView !== 'quiz' && (
        <Header
          currentView={currentView}
          setCurrentView={setCurrentView}
          isQuizActive={quizInfo?.settings?.isQuizActive}
        />
      )}

      <main className="main-content">
        {currentView === 'landing' && (
          <LandingPage
            quizInfo={quizInfo}
            onStartQuiz={handleStartExam}
          />
        )}

        {currentView === 'quiz' && examSession && (
          <QuizPage
            session={examSession}
            onCompleted={handleExamCompleted}
          />
        )}

        {currentView === 'result' && examResult && (
          <ResultPage
            result={examResult}
            quizInfo={quizInfo}
            onReturnHome={handleReturnHome}
            onViewLeaderboard={() => setCurrentView('leaderboard')}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardPage
            quizInfo={quizInfo}
            onReturnHome={handleReturnHome}
          />
        )}

        {currentView === 'admin' && (
          isAdminLoggedIn ? (
            <AdminDashboard
              onLogout={() => setIsAdminLoggedIn(false)}
              onReturnHome={handleReturnHome}
              quizInfo={quizInfo}
              onSettingsChanged={refreshQuizInfo}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={() => setIsAdminLoggedIn(true)}
              onCancel={handleReturnHome}
            />
          )
        )}
      </main>

      {currentView !== 'quiz' && <Footer />}
    </div>
  );
}
