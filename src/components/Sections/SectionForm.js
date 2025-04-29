import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, doc, getDoc, setDoc, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import './SectionForm.css';

// Утилита для получения параметров запроса из URL
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SectionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const urlQuery = useQuery();
  const chapterId = urlQuery.get('chapterId');
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 0,
    progress: 0,
    contentUrl: '', // Ссылка на контент (используется для навигации)
    chapterId: chapterId || '' // Если приходит из URL, используем его
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
    
    // Если режим редактирования, загружаем данные раздела
    if (isEditMode && chapterId) {
      const fetchSection = async () => {
        try {
          const sectionDoc = await getDoc(doc(db, `chapters/${chapterId}/sections`, id));
          
          if (sectionDoc.exists()) {
            setFormData({ 
              ...sectionDoc.data()
            });
          } else {
            setError('Раздел не найден');
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Ошибка при загрузке раздела:', error);
          setError('Произошла ошибка при загрузке раздела. Пожалуйста, попробуйте позже.');
          setLoading(false);
        }
      };
      
      fetchSection();
    } else {
      setLoading(false);
    }
  }, [id, isEditMode, chapterId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'order' || name === 'progress') {
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
      setError('Название раздела обязательно');
      return;
    }
    
    if (!formData.chapterId) {
      setError('Необходимо выбрать главу');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const selectedChapterId = formData.chapterId;
      const sectionData = { ...formData };
      
      // Формируем URL для доступа к контенту (если еще не задан)
      if (!sectionData.contentUrl) {
        sectionData.contentUrl = `content/${selectedChapterId}/${id || 'new'}`;
      }
      
      if (isEditMode) {
        // Обновление существующего раздела
        await setDoc(doc(db, `chapters/${selectedChapterId}/sections`, id), sectionData);
        setSuccess('Раздел успешно обновлен');
      } else {
        // Создание нового раздела
        await addDoc(collection(db, `chapters/${selectedChapterId}/sections`), sectionData);
        setSuccess('Раздел успешно создан');
        // Очистка формы после добавления
        setFormData({
          title: '',
          description: '',
          order: 0,
          progress: 0,
          contentUrl: '',
          chapterId: selectedChapterId // Оставляем текущую главу
        });
      }
      
      setSaving(false);
      
      // Возврат к списку разделов через 1.5 секунды
      setTimeout(() => {
        navigate(`/sections?chapterId=${selectedChapterId}`);
      }, 1500);
    } catch (error) {
      console.error('Ошибка при сохранении раздела:', error);
      setError('Произошла ошибка при сохранении раздела. Пожалуйста, попробуйте позже.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="section-form-container">
      <h1>{isEditMode ? 'Редактирование раздела' : 'Добавление нового раздела'}</h1>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="section-form">
        <div className="form-group">
          <label htmlFor="chapterId">Глава*</label>
          <select
            id="chapterId"
            name="chapterId"
            className="form-control"
            value={formData.chapterId}
            onChange={handleChange}
            required
            disabled={isEditMode} // Нельзя менять главу при редактировании
          >
            <option value="">Выберите главу</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="title">Название раздела*</label>
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
          <label htmlFor="description">Описание раздела</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Введите описание раздела"
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
        
        <div className="form-group">
          <label htmlFor="progress">Прогресс (%)</label>
          <input
            type="number"
            id="progress"
            name="progress"
            className="form-control"
            value={formData.progress}
            onChange={handleChange}
            min={0}
            max={100}
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate(chapterId ? `/sections?chapterId=${chapterId}` : '/sections')}
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

export default SectionForm; 