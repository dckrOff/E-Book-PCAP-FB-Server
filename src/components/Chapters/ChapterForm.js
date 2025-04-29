import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, setDoc, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import './ChapterForm.css';

const ChapterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 0,
    sectionsCount: 0
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    // Загрузка списка глав для выбора родительской главы
    const fetchChapters = async () => {
      try {
        const chaptersQuery = query(collection(db, 'chapters'), orderBy('order', 'asc'));
        const snapshot = await getDocs(chaptersQuery);
        
        const chaptersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setChapters(chaptersList);
      } catch (error) {
        console.error('Ошибка при загрузке глав:', error);
      }
    };
    
    fetchChapters();
    
    // Если режим редактирования, загружаем данные главы
    if (isEditMode) {
      const fetchChapter = async () => {
        try {
          const chapterDoc = await getDoc(doc(db, 'chapters', id));
          
          if (chapterDoc.exists()) {
            setFormData(chapterDoc.data());
          } else {
            setError('Глава не найдена');
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Ошибка при загрузке главы:', error);
          setError('Произошла ошибка при загрузке главы. Пожалуйста, попробуйте позже.');
          setLoading(false);
        }
      };
      
      fetchChapter();
    } else {
      setLoading(false);
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'order' || name === 'sectionsCount') {
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
      setError('Название главы обязательно');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      if (isEditMode) {
        // Обновление существующей главы
        await setDoc(doc(db, 'chapters', id), formData);
        setSuccess('Глава успешно обновлена');
      } else {
        // Создание новой главы
        await addDoc(collection(db, 'chapters'), formData);
        setSuccess('Глава успешно создана');
        // Очистка формы после добавления
        setFormData({
          title: '',
          description: '',
          order: 0,
          sectionsCount: 0
        });
      }
      
      setSaving(false);
      
      // Возврат к списку глав через 1.5 секунды
      setTimeout(() => {
        navigate('/chapters');
      }, 1500);
    } catch (error) {
      console.error('Ошибка при сохранении главы:', error);
      setError('Произошла ошибка при сохранении главы. Пожалуйста, попробуйте позже.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="chapter-form-container">
      <h1>{isEditMode ? 'Редактирование главы' : 'Добавление новой главы'}</h1>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="chapter-form">
        <div className="form-group">
          <label htmlFor="title">Название главы*</label>
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
        
        <div className="form-group">
          <label htmlFor="order">Порядок отображения</label>
          <input
            type="number"
            id="order"
            name="order"
            className="form-control"
            value={formData.order}
            onChange={handleChange}
            min={0}
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/chapters')}
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

export default ChapterForm; 