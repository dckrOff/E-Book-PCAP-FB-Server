import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './QuizList.css';

const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const quizzesQuery = query(collection(db, 'quizzes'), orderBy('title', 'asc'));
        const snapshot = await getDocs(quizzesQuery);
        
        const quizzesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setQuizzes(quizzesList);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке тестов:', error);
        setError('Произошла ошибка при загрузке тестов. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchQuizzes();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот тест? Это действие нельзя отменить.')) {
      try {
        await deleteDoc(doc(db, 'quizzes', id));
        
        // Обновляем список после удаления
        setQuizzes(quizzes.filter(quiz => quiz.id !== id));
      } catch (error) {
        console.error('Ошибка при удалении теста:', error);
        setError('Произошла ошибка при удалении теста. Пожалуйста, попробуйте позже.');
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
    <div className="quiz-list">
      <div className="list-header">
        <h1>Тесты</h1>
        <Link to="/quizzes/new" className="btn btn-primary">
          Создать тест
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="empty-list">
          <p>Тесты отсутствуют. Создайте первый тест!</p>
        </div>
      ) : (
        <div className="quizzes-table-container">
          <table className="quizzes-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Вопросов</th>
                <th>Тема</th>
                <th>Сложность</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map(quiz => (
                <tr key={quiz.id}>
                  <td>{quiz.title}</td>
                  <td>{quiz.questions?.length || 0}</td>
                  <td>{quiz.topic || 'Не указана'}</td>
                  <td>{getDifficultyLabel(quiz.difficulty)}</td>
                  <td className="quiz-actions">
                    <Link 
                      to={`/quizzes/edit/${quiz.id}`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Редактировать
                    </Link>
                    <button
                      onClick={() => handleDelete(quiz.id)}
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

// Вспомогательная функция для отображения сложности теста
function getDifficultyLabel(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'Легкий';
    case 'medium':
      return 'Средний';
    case 'hard':
      return 'Сложный';
    default:
      return 'Не указана';
  }
}

export default QuizList; 