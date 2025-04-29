import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './GlossaryList.css';

const GlossaryList = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const termsQuery = query(collection(db, 'glossary'), orderBy('term', 'asc'));
        const snapshot = await getDocs(termsQuery);
        
        const termsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTerms(termsData);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке терминов:', error);
        setError('Произошла ошибка при загрузке терминов. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchTerms();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот термин? Это действие нельзя отменить.')) {
      try {
        await deleteDoc(doc(db, 'glossary', id));
        
        // Обновляем список после удаления
        setTerms(terms.filter(term => term.id !== id));
      } catch (error) {
        console.error('Ошибка при удалении термина:', error);
        setError('Произошла ошибка при удалении термина. Пожалуйста, попробуйте позже.');
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
    <div className="glossary-list">
      <div className="list-header">
        <h1>Глоссарий</h1>
        <Link to="/glossary/new" className="btn btn-primary">
          Добавить термин
        </Link>
      </div>

      {terms.length === 0 ? (
        <div className="empty-list">
          <p>Термины отсутствуют. Добавьте первый термин!</p>
        </div>
      ) : (
        <div className="terms-table-container">
          <table className="terms-table">
            <thead>
              <tr>
                <th>Термин</th>
                <th>Определение</th>
                <th>Категория</th>
                <th>Связанные разделы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {terms.map(term => (
                <tr key={term.id}>
                  <td className="term-name">{term.term}</td>
                  <td className="term-definition">
                    {term.definition && term.definition.length > 100 
                      ? term.definition.substring(0, 100) + '...' 
                      : term.definition || ''}
                  </td>
                  <td>{term.category || 'Общая'}</td>
                  <td className="term-sections">
                    {term.relatedSections && term.relatedSections.length > 0 ? (
                      <span className="sections-count">
                        {term.relatedSections.length} разд.
                      </span>
                    ) : (
                      <span className="no-sections">Нет</span>
                    )}
                  </td>
                  <td className="term-actions">
                    <Link 
                      to={`/glossary/edit/${term.id}`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Редактировать
                    </Link>
                    <button
                      onClick={() => handleDelete(term.id)}
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

export default GlossaryList; 