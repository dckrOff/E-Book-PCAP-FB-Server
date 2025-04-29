import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import './QuizForm.css';

const QuizForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    difficulty: 'medium',
    timeLimit: 30,
    questions: []
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [quizSaved, setQuizSaved] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      const fetchQuiz = async () => {
        try {
          const quizDoc = await getDoc(doc(db, 'quizzes', id));
          
          if (quizDoc.exists()) {
            setFormData(quizDoc.data());
          } else {
            setError('Тест не найден');
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Ошибка при загрузке теста:', error);
          setError('Произошла ошибка при загрузке теста. Пожалуйста, попробуйте позже.');
          setLoading(false);
        }
      };
      
      fetchQuiz();
    } else {
      setLoading(false);
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseInt(value, 10) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      setError('Название теста обязательно');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      let quizId = id;
      
      if (isEditMode) {
        // Обновление существующего теста
        await setDoc(doc(db, 'quizzes', id), formData);
        setSuccess('Тест успешно обновлен');
      } else {
        // Создание нового теста
        const docRef = await addDoc(collection(db, 'quizzes'), formData);
        quizId = docRef.id;
        setSuccess('Тест успешно создан');
        
        // Сохраняем ID, чтобы разблокировать кнопку управления вопросами
        setQuizSaved(true);
      }
      
      setSaving(false);
      
      if (!isEditMode) {
        // Обновляем URL для доступа к управлению вопросами
        navigate(`/quizzes/edit/${quizId}`, { replace: true });
      }
    } catch (error) {
      console.error('Ошибка при сохранении теста:', error);
      setError('Произошла ошибка при сохранении теста. Пожалуйста, попробуйте позже.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="quiz-form-container">
      <h1>{isEditMode ? 'Редактирование теста' : 'Создание нового теста'}</h1>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="quiz-form">
        <div className="form-group">
          <label htmlFor="title">Название теста*</label>
          <input
            type="text"
            id="title"
            name="title"
            className="form-control"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            value={formData.description}
            onChange={handleChange}
            rows={3}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="topic">Тема</label>
            <input
              type="text"
              id="topic"
              name="topic"
              className="form-control"
              value={formData.topic}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="difficulty">Сложность</label>
            <select
              id="difficulty"
              name="difficulty"
              className="form-control"
              value={formData.difficulty}
              onChange={handleChange}
            >
              <option value="easy">Легкий</option>
              <option value="medium">Средний</option>
              <option value="hard">Сложный</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="timeLimit">Ограничение времени (мин)</label>
            <input
              type="number"
              id="timeLimit"
              name="timeLimit"
              className="form-control"
              value={formData.timeLimit}
              onChange={handleChange}
              min={1}
              max={120}
            />
          </div>
        </div>
        
        <div className="questions-section">
          <h2>Вопросы</h2>
          
          {formData.questions.length === 0 ? (
            <div className="empty-questions">
              <p>Вопросы не добавлены. Добавьте вопросы, используя панель управления вопросами.</p>
            </div>
          ) : (
            <div className="questions-preview">
              <p>Тест содержит {formData.questions.length} вопр. {formData.questions.length > 0 ? `(первый вопрос: "${formData.questions[0].text}")` : ""}</p>
            </div>
          )}
          
          {(isEditMode || quizSaved) ? (
            <div className="questions-actions">
              <Link to={`/quizzes/${id}/questions`} className="btn btn-primary">
                Управление вопросами
              </Link>
            </div>
          ) : (
            <p className="hint">
              Для добавления вопросов сначала сохраните основную информацию о тесте.
            </p>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/quizzes')}
          >
            Отмена
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizForm; 