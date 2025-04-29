import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-toggle" onClick={toggleSidebar}>
        {collapsed ? '›' : '‹'}
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">📊</span>
              <span className="text">Обзор</span>
            </NavLink>
          </li>
          
          <li className="sidebar-section">Структура</li>
          
          <li>
            <NavLink to="/chapters" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">📚</span>
              <span className="text">Главы</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/sections" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">📝</span>
              <span className="text">Разделы</span>
            </NavLink>
          </li>
          
          <li className="sidebar-section">Контент</li>
          
          <li>
            <NavLink to="/glossary" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">📖</span>
              <span className="text">Глоссарий</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/quizzes" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">✅</span>
              <span className="text">Тесты</span>
            </NavLink>
          </li>
          
          <li className="sidebar-section">Пользователи</li>
          
          <li>
            <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">👤</span>
              <span className="text">Пользователи</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 