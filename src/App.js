import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Компоненты панели администратора
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Компоненты для разделов
import ChapterList from './components/Chapters/ChapterList';
import ChapterForm from './components/Chapters/ChapterForm';
import SectionList from './components/Sections/SectionList';
import SectionForm from './components/Sections/SectionForm';
import GlossaryList from './components/Glossary/GlossaryList';
import GlossaryForm from './components/Glossary/GlossaryForm';
import QuizList from './components/Quizzes/QuizList';
import QuizForm from './components/Quizzes/QuizForm';
import QuestionForm from './components/Quizzes/QuestionForm';
import UserList from './components/Users/UserList';
import UserForm from './components/Users/UserForm';
import ContentEditor from './components/Content/ContentEditor';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="app">
      <Header toggleSidebar={toggleSidebar} />
      <div className="main-container">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* Маршруты для глав */}
            <Route path="/chapters" element={<ChapterList />} />
            <Route path="/chapters/new" element={<ChapterForm />} />
            <Route path="/chapters/edit/:id" element={<ChapterForm />} />
            
            {/* Маршруты для разделов */}
            <Route path="/sections" element={<SectionList />} />
            <Route path="/sections/new" element={<SectionForm />} />
            <Route path="/sections/edit/:id" element={<SectionForm />} />
            
            {/* Маршрут для редактора контента */}
            <Route path="/content/:chapterId/:sectionId" element={<ContentEditor />} />
            
            {/* Маршруты для глоссария */}
            <Route path="/glossary" element={<GlossaryList />} />
            <Route path="/glossary/new" element={<GlossaryForm />} />
            <Route path="/glossary/edit/:id" element={<GlossaryForm />} />
            
            {/* Маршруты для тестов */}
            <Route path="/quizzes" element={<QuizList />} />
            <Route path="/quizzes/new" element={<QuizForm />} />
            <Route path="/quizzes/edit/:id" element={<QuizForm />} />
            <Route path="/quizzes/:quizId/questions" element={<QuestionForm />} />
            
            {/* Маршруты для пользователей */}
            <Route path="/users" element={<UserList />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/edit/:id" element={<UserForm />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App; 