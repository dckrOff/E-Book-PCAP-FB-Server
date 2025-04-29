import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './SectionList.css';

// Утилита для получения параметров запроса из URL
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SectionList = () => {
  const [sections, setSections] = useState([]);
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Получаем chapterId из параметров запроса
  const urlQuery = useQuery();
  const chapterId = urlQuery.get('chapterId');

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        
        // Если указан chapterId, загружаем разделы только этой главы
        if (chapterId) {
          // Загружаем информацию о главе
          const chapterDocRef = doc(db, 'chapters', chapterId);
          const chapterSnapshot = await getDoc(chapterDocRef);
          
          if (chapterSnapshot.exists()) {
            setChapter({
              id: chapterSnapshot.id,
              ...chapterSnapshot.data()
            });
          }
          
          // Загружаем разделы главы
          const sectionsRef = collection(db, `chapters/${chapterId}/sections`);
          const sectionsQuery = query(sectionsRef, orderBy('order', 'asc'));
          const snapshot = await getDocs(sectionsQuery);
          
          const sectionsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            chapterId: chapterId // Добавляем chapterId к каждому разделу
          }));
          
          setSections(sectionsList);
        } else {
          // Если chapterId не указан, загружаем все разделы из всех глав
          // (это может быть неэффективно при большом количестве данных)
          const chaptersSnapshot = await getDocs(collection(db, 'chapters'));
          
          const sectionsPromises = chaptersSnapshot.docs.map(async chapterDoc => {
            const sectionsRef = collection(db, `chapters/${chapterDoc.id}/sections`);
            const sectionsQuery = query(sectionsRef, orderBy('order', 'asc'));
            const sectionsSnapshot = await getDocs(sectionsQuery);
            
            return sectionsSnapshot.docs.map(sectionDoc => ({
              id: sectionDoc.id,
              ...sectionDoc.data(),
              chapterId: chapterDoc.id,
              chapterTitle: chapterDoc.data().title
            }));
          });
          
          const sectionsArrays = await Promise.all(sectionsPromises);
          const allSections = sectionsArrays.flat();
          
          setSections(allSections);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке разделов:', error);
        setError('Произошла ошибка при загрузке разделов. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchSections();
  }, [chapterId]);

  const handleDelete = async (sectionId, chapterId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот раздел? Это действие нельзя отменить.')) {
      try {
        const sectionRef = doc(db, `chapters/${chapterId}/sections`, sectionId);
        await deleteDoc(sectionRef);
        
        // Обновляем список разделов после удаления
        setSections(sections.filter(section => section.id !== sectionId));
      } catch (error) {
        console.error('Ошибка при удалении раздела:', error);
        setError('Произошла ошибка при удалении раздела. Пожалуйста, попробуйте позже.');
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
    <div className="section-list">
      <div className="list-header">
        {chapter ? (
          <>
            <h1>Разделы главы: {chapter.title}</h1>
            <div className="header-actions">
              <Link to="/chapters" className="btn btn-secondary">
                Назад к главам
              </Link>
              <Link to={`/sections/new?chapterId=${chapterId}`} className="btn btn-primary">
                Добавить раздел
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1>Все разделы учебника</h1>
            <Link to="/sections/new" className="btn btn-primary">
              Добавить раздел
            </Link>
          </>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="empty-list">
          <p>Разделы отсутствуют. Добавьте первый раздел!</p>
        </div>
      ) : (
        <div className="sections-table-container">
          <table className="sections-table">
            <thead>
              <tr>
                <th>Порядок</th>
                <th>Название</th>
                {!chapter && <th>Глава</th>}
                <th>Прогресс</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <tr key={section.id}>
                  <td>{section.order}</td>
                  <td>{section.title}</td>
                  {!chapter && <td>{section.chapterTitle}</td>}
                  <td>{section.progress || 0}%</td>
                  <td className="section-actions">
                    <Link 
                      to={`/sections/edit/${section.id}?chapterId=${section.chapterId}`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Редактировать
                    </Link>
                    <Link 
                      to={`/content/${section.chapterId}/${section.id}`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Контент
                    </Link>
                    <button
                      onClick={() => handleDelete(section.id, section.chapterId)}
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

export default SectionList; 