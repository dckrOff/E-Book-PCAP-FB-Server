import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './ChapterList.css';

const ChapterList = () => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const chaptersQuery = query(collection(db, 'chapters'), orderBy('order', 'asc'));
        const snapshot = await getDocs(chaptersQuery);
        
        const chaptersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setChapters(chaptersData);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке глав:', error);
        setError('Произошла ошибка при загрузке глав. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchChapters();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту главу? Это также удалит все её разделы. Это действие нельзя отменить.')) {
      try {
        await deleteDoc(doc(db, 'chapters', id));
        
        // Обновляем список после удаления
        setChapters(chapters.filter(chapter => chapter.id !== id));
      } catch (error) {
        console.error('Ошибка при удалении главы:', error);
        setError('Произошла ошибка при удалении главы. Пожалуйста, попробуйте позже.');
      }
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="chapter-list">
      <div className="list-header">
        <h1>Главы учебника</h1>
        <Link to="/chapters/new" className="btn btn-primary">
          Добавить главу
        </Link>
      </div>

      {chapters.length === 0 ? (
        <div className="empty-list">
          <p>Главы отсутствуют. Добавьте первую главу!</p>
        </div>
      ) : (
        <div className="chapters-table-container">
          <table className="chapters-table">
            <thead>
              <tr>
                <th>Порядок</th>
                <th>Название</th>
                <th>Разделы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map(chapter => (
                <tr key={chapter.id}>
                  <td>{chapter.order}</td>
                  <td>{chapter.title}</td>
                  <td>
                    <Link to={`/sections?chapterId=${chapter.id}`} className="btn btn-secondary btn-sm">
                      Разделы ({chapter.sectionsCount || 0})
                    </Link>
                  </td>
                  <td className="chapter-actions">
                    <Link 
                      to={`/chapters/edit/${chapter.id}`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Редактировать
                    </Link>
                    <button
                      onClick={() => handleDelete(chapter.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChapterList; 