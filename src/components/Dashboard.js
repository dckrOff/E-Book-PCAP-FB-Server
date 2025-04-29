import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    chaptersCount: 0,
    sectionsCount: 0,
    glossaryCount: 0,
    quizzesCount: 0,
    usersCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Получение количества элементов в каждой коллекции
        const chaptersSnapshot = await getCountFromServer(collection(db, 'chapters'));
        const glossarySnapshot = await getCountFromServer(collection(db, 'glossary'));
        const quizzesSnapshot = await getCountFromServer(collection(db, 'quizzes'));
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        
        // Получение всех глав для подсчета разделов
        const chaptersData = await getDocs(collection(db, 'chapters'));
        let sectionsCount = 0;
        
        // Для каждой главы получаем все её разделы и суммируем
        const sectionsPromises = chaptersData.docs.map(doc => 
          getDocs(collection(db, `chapters/${doc.id}/sections`))
            .then(sectionsSnapshot => sectionsSnapshot.size)
        );
        
        const sectionsCounts = await Promise.all(sectionsPromises);
        sectionsCount = sectionsCounts.reduce((acc, count) => acc + count, 0);
        
        setStats({
          chaptersCount: chaptersSnapshot.data().count,
          sectionsCount,
          glossaryCount: glossarySnapshot.data().count,
          quizzesCount: quizzesSnapshot.data().count,
          usersCount: usersSnapshot.data().count
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="dashboard">
      <h1>Панель управления</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Главы</h3>
          <div className="stat-value">{stats.chaptersCount}</div>
          <Link to="/chapters" className="btn btn-primary">Управление</Link>
        </div>
        
        <div className="stat-card">
          <h3>Разделы</h3>
          <div className="stat-value">{stats.sectionsCount}</div>
          <Link to="/sections" className="btn btn-primary">Управление</Link>
        </div>
        
        <div className="stat-card">
          <h3>Термины глоссария</h3>
          <div className="stat-value">{stats.glossaryCount}</div>
          <Link to="/glossary" className="btn btn-primary">Управление</Link>
        </div>
        
        <div className="stat-card">
          <h3>Тесты</h3>
          <div className="stat-value">{stats.quizzesCount}</div>
          <Link to="/quizzes" className="btn btn-primary">Управление</Link>
        </div>
        
        <div className="stat-card">
          <h3>Пользователи</h3>
          <div className="stat-value">{stats.usersCount}</div>
          <Link to="/users" className="btn btn-primary">Управление</Link>
        </div>
      </div>
      
      <div className="quick-actions">
        <h2>Быстрые действия</h2>
        <div className="actions-grid">
          <Link to="/chapters/new" className="btn btn-primary">
            Добавить главу
          </Link>
          <Link to="/sections/new" className="btn btn-primary">
            Добавить раздел
          </Link>
          <Link to="/glossary/new" className="btn btn-primary">
            Добавить термин
          </Link>
          <Link to="/quizzes/new" className="btn btn-primary">
            Создать тест
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 