import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import './GlossaryForm.css';

const GlossaryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    term: '',
    definition: '',
    category: '',
    relatedTerms: [],
    relatedSections: []
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Состояние для нового связанного термина
  const [newRelatedTerm, setNewRelatedTerm] = useState('');
  
  // Состояния для работы с разделами
  const [allChapters, setAllChapters] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [filteredSections, setFilteredSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    // Загружаем главы и разделы при инициализации
    const fetchChaptersAndSections = async () => {
      try {
        setLoadingSections(true);
        
        // Загружаем главы
        const chaptersQuery = query(collection(db, 'chapters'), orderBy('order', 'asc'));
        const chaptersSnapshot = await getDocs(chaptersQuery);
        const chaptersData = chaptersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllChapters(chaptersData);
        
        // Загружаем все разделы из всех глав
        const sectionsPromises = chaptersSnapshot.docs.map(async chapterDoc => {
          const sectionsRef = collection(db, `chapters/${chapterDoc.id}/sections`);
          const sectionsQuery = query(sectionsRef, orderBy('order', 'asc'));
          const sectionsSnapshot = await getDocs(sectionsQuery);
          
          return sectionsSnapshot.docs.map(sectionDoc => ({
            id: sectionDoc.id,
            chapterId: chapterDoc.id,
            chapterTitle: chapterDoc.data().title,
            ...sectionDoc.data()
          }));
        });
        
        const sectionsArrays = await Promise.all(sectionsPromises);
        const allSectionsData = sectionsArrays.flat();
        setAllSections(allSectionsData);
        
        setLoadingSections(false);
      } catch (error) {
        console.error('Ошибка при загрузке глав и разделов:', error);
        setLoadingSections(false);
      }
    };
    
    fetchChaptersAndSections();
    
    if (isEditMode) {
      const fetchTerm = async () => {
        try {
          const termDoc = await getDoc(doc(db, 'glossary', id));
          
          if (termDoc.exists()) {
            setFormData(termDoc.data());
          } else {
            setError('Термин не найден');
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Ошибка при загрузке термина:', error);
          setError('Произошла ошибка при загрузке термина. Пожалуйста, попробуйте позже.');
          setLoading(false);
        }
      };
      
      fetchTerm();
    } else {
      setLoading(false);
    }
  }, [id, isEditMode]);
  
  // Фильтруем разделы при изменении выбранной главы
  useEffect(() => {
    if (selectedChapter) {
      const filtered = allSections.filter(section => section.chapterId === selectedChapter);
      setFilteredSections(filtered);
    } else {
      setFilteredSections(allSections);
    }
  }, [selectedChapter, allSections]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleAddRelatedTerm = () => {
    if (newRelatedTerm.trim() && !formData.relatedTerms.includes(newRelatedTerm.trim())) {
      setFormData({
        ...formData,
        relatedTerms: [...formData.relatedTerms, newRelatedTerm.trim()]
      });
      setNewRelatedTerm('');
    }
  };
  
  const handleRemoveRelatedTerm = (index) => {
    const updatedTerms = [...formData.relatedTerms];
    updatedTerms.splice(index, 1);
    
    setFormData({
      ...formData,
      relatedTerms: updatedTerms
    });
  };
  
  const handleChapterChange = (e) => {
    setSelectedChapter(e.target.value);
    setSelectedSection(''); // Сбрасываем выбранный раздел
  };
  
  const handleAddRelatedSection = () => {
    if (!selectedSection) return;
    
    // Проверяем, не добавлен ли уже этот раздел
    const alreadyAdded = formData.relatedSections.some(section => section.id === selectedSection);
    
    if (alreadyAdded) {
      return; // Раздел уже добавлен
    }
    
    // Находим выбранный раздел в списке
    const selectedSectionObj = allSections.find(section => section.id === selectedSection);
    
    if (selectedSectionObj) {
      // Добавляем раздел в список связанных разделов
      setFormData({
        ...formData,
        relatedSections: [
          ...formData.relatedSections, 
          {
            id: selectedSectionObj.id,
            title: selectedSectionObj.title,
            chapterId: selectedSectionObj.chapterId
          }
        ]
      });
      
      // Сбрасываем выбранные значения
      setSelectedSection('');
    }
  };
  
  const handleRemoveRelatedSection = (index) => {
    const updatedSections = [...formData.relatedSections];
    updatedSections.splice(index, 1);
    
    setFormData({
      ...formData,
      relatedSections: updatedSections
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.term) {
      setError('Термин обязателен');
      return;
    }
    
    if (!formData.definition) {
      setError('Определение обязательно');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      if (isEditMode) {
        // Обновление существующего термина
        await setDoc(doc(db, 'glossary', id), formData);
        setSuccess('Термин успешно обновлен');
      } else {
        // Создание нового термина
        await addDoc(collection(db, 'glossary'), formData);
        setSuccess('Термин успешно добавлен');
        // Очистка формы после добавления
        setFormData({
          term: '',
          definition: '',
          category: '',
          relatedTerms: [],
          relatedSections: []
        });
      }
      
      setSaving(false);
      
      // Возврат к списку терминов через 1.5 секунды
      setTimeout(() => {
        navigate('/glossary');
      }, 1500);
    } catch (error) {
      console.error('Ошибка при сохранении термина:', error);
      setError('Произошла ошибка при сохранении термина. Пожалуйста, попробуйте позже.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="glossary-form-container">
      <h1>{isEditMode ? 'Редактирование термина' : 'Добавление нового термина'}</h1>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="glossary-form">
        <div className="form-group">
          <label htmlFor="term">Термин*</label>
          <input
            type="text"
            id="term"
            name="term"
            className="form-control"
            value={formData.term}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="definition">Определение*</label>
          <textarea
            id="definition"
            name="definition"
            className="form-control"
            value={formData.definition}
            onChange={handleChange}
            rows={5}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Категория</label>
          <input
            type="text"
            id="category"
            name="category"
            className="form-control"
            value={formData.category}
            onChange={handleChange}
            placeholder="Например: Сети, Программирование, Безопасность и т.д."
          />
        </div>
        
        <div className="form-group">
          <label>Связанные термины</label>
          
          <div className="related-terms-input">
            <input
              type="text"
              value={newRelatedTerm}
              onChange={(e) => setNewRelatedTerm(e.target.value)}
              className="form-control"
              placeholder="Введите связанный термин"
            />
            <button
              type="button"
              onClick={handleAddRelatedTerm}
              className="btn btn-secondary"
            >
              Добавить
            </button>
          </div>
          
          {formData.relatedTerms.length > 0 && (
            <div className="related-terms-list">
              {formData.relatedTerms.map((term, index) => (
                <div key={index} className="related-term-item">
                  <span>{term}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRelatedTerm(index)}
                    className="btn-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Связанные разделы</label>
          
          <div className="related-sections-selection">
            <div className="form-row">
              <div className="form-group">
                <label>Глава</label>
                <select 
                  className="form-control"
                  value={selectedChapter}
                  onChange={handleChapterChange}
                >
                  <option value="">Все главы</option>
                  {allChapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Раздел</label>
                <select 
                  className="form-control"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={loadingSections}
                >
                  <option value="">Выберите раздел</option>
                  {filteredSections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="button"
                className="btn btn-secondary btn-add-section"
                onClick={handleAddRelatedSection}
                disabled={!selectedSection || loadingSections}
              >
                Добавить раздел
              </button>
            </div>
          </div>
          
          {formData.relatedSections && formData.relatedSections.length > 0 && (
            <div className="related-sections-list">
              <h4>Выбранные разделы:</h4>
              <ul className="sections-list">
                {formData.relatedSections.map((section, index) => (
                  <li key={index} className="section-item">
                    <div className="section-info">
                      <span className="section-title">{section.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRelatedSection(index)}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/glossary')}
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

export default GlossaryForm; 