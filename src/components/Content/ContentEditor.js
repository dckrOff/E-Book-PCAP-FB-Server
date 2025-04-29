import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import './ContentEditor.css';

const ContentEditor = () => {
  const { chapterId, sectionId } = useParams();
  const navigate = useNavigate();
  
  const [content, setContent] = useState({
    id: sectionId,
    title: '',
    content: []
  });
  
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchSection = async () => {
      try {
        const sectionRef = doc(db, `chapters/${chapterId}/sections`, sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (sectionDoc.exists()) {
          setSection(sectionDoc.data());
          
          // Пытаемся получить контент из Firestore
          try {
            const contentRef = doc(db, 'content', chapterId, 'sections', sectionId);
            const contentDoc = await getDoc(contentRef);
            
            if (contentDoc.exists()) {
              setContent(contentDoc.data());
            } else {
              // Если контента еще нет, создаем базовую структуру
              setContent({
                id: sectionId,
                title: sectionDoc.data().title,
                content: []
              });
            }
          } catch (contentError) {
            console.error('Ошибка при загрузке контента:', contentError);
            // Если произошла ошибка при загрузке контента, всё равно создаем базовую структуру
            setContent({
              id: sectionId,
              title: sectionDoc.data().title,
              content: []
            });
          }
        } else {
          setError('Раздел не найден');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchSection();
  }, [chapterId, sectionId]);

  const handleContentChange = (e) => {
    const { name, value } = e.target;
    setContent({
      ...content,
      [name]: value
    });
  };

  const addContentItem = (type) => {
    const newItem = {
      id: `item_${Date.now()}`,
      type: type
    };
    
    // Добавляем специфичные поля в зависимости от типа контента
    switch (type) {
      case 'text':
        newItem.content = '';
        newItem.isHighlighted = false;
        break;
      case 'code':
        newItem.content = '';
        newItem.language = 'javascript';
        newItem.caption = '';
        break;
      case 'formula':
        newItem.content = '';
        newItem.caption = '';
        newItem.isInline = false;
        break;
      case 'table':
        newItem.headers = ['Заголовок 1', 'Заголовок 2'];
        newItem.rows = [['Ячейка 1', 'Ячейка 2']];
        newItem.caption = '';
        break;
      case 'image':
        newItem.url = '';
        newItem.caption = '';
        newItem.description = '';
        break;
      case 'video':
        newItem.url = '';
        newItem.caption = '';
        break;
      case 'diagram':
        newItem.elements = [];
        newItem.caption = '';
        break;
      default:
        break;
    }
    
    setContent({
      ...content,
      content: [...content.content, newItem]
    });
  };

  const updateContentItem = (index, field, value) => {
    const updatedContent = [...content.content];
    updatedContent[index] = {
      ...updatedContent[index],
      [field]: value
    };
    
    setContent({
      ...content,
      content: updatedContent
    });
  };

  const deleteContentItem = (index) => {
    const updatedContent = [...content.content];
    updatedContent.splice(index, 1);
    
    setContent({
      ...content,
      content: updatedContent
    });
  };

  const moveContentItem = (index, direction) => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === content.content.length - 1)
    ) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedContent = [...content.content];
    const temp = updatedContent[index];
    updatedContent[index] = updatedContent[newIndex];
    updatedContent[newIndex] = temp;
    
    setContent({
      ...content,
      content: updatedContent
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Создаем пакетное обновление
      const batch = writeBatch(db);
      
      // Убедимся, что существует коллекция для контента главы
      const chapterContentRef = doc(db, 'content', chapterId);
      
      // Создаем/обновляем документ в Firestore для контента раздела
      const contentRef = doc(db, 'content', chapterId, 'sections', sectionId);
      
      // Добавляем в пакет операции
      batch.set(chapterContentRef, { hasContent: true }, { merge: true });
      batch.set(contentRef, content);
      
      // Выполняем пакетное обновление
      await batch.commit();
      
      setSuccess('Контент успешно сохранен');
      setSaving(false);
    } catch (error) {
      console.error('Ошибка при сохранении контента:', error);
      setError('Произошла ошибка при сохранении контента. Пожалуйста, попробуйте позже.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="content-editor">
      <div className="editor-header">
        <h1>Редактор контента: {section?.title}</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate(`/sections?chapterId=${chapterId}`)}
        >
          Назад к разделам
        </button>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Заголовок раздела</label>
          <input
            type="text"
            id="title"
            name="title"
            value={content.title}
            onChange={handleContentChange}
            className="form-control"
          />
        </div>
        
        <div className="content-items">
          <h2>Содержимое раздела</h2>
          
          {content.content.length === 0 ? (
            <div className="empty-content">
              <p>Добавьте элементы контента, используя кнопки ниже</p>
            </div>
          ) : (
            content.content.map((item, index) => (
              <div key={item.id} className="content-item">
                <div className="content-item-header">
                  <h3>{index + 1}. {getContentTypeLabel(item.type)}</h3>
                  <div className="content-item-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => moveContentItem(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => moveContentItem(index, 'down')}
                      disabled={index === content.content.length - 1}
                    >
                      ↓
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteContentItem(index)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                
                {renderContentItemEditor(item, index)}
              </div>
            ))
          )}
          
          <div className="add-content-actions">
            <h3>Добавить контент</h3>
            <div className="add-content-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => addContentItem('text')}>
                Текст
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => addContentItem('code')}>
                Код
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => addContentItem('formula')}>
                Формула
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => addContentItem('table')}>
                Таблица
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => addContentItem('image')}>
                Изображение
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => addContentItem('video')}>
                Видео
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => addContentItem('diagram')}>
                Диаграмма
              </button>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
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

  function getContentTypeLabel(type) {
    switch (type) {
      case 'text':
        return 'Текст';
      case 'code':
        return 'Код';
      case 'formula':
        return 'Формула';
      case 'table':
        return 'Таблица';
      case 'image':
        return 'Изображение';
      case 'video':
        return 'Видео';
      case 'diagram':
        return 'Диаграмма';
      default:
        return 'Контент';
    }
  }

  function renderContentItemEditor(item, index) {
    switch (item.type) {
      case 'text':
        return (
          <div className="text-editor">
            <div className="form-group">
              <label>Текст</label>
              <textarea
                value={item.content}
                onChange={(e) => updateContentItem(index, 'content', e.target.value)}
                className="form-control"
                rows="4"
              />
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                id={`highlight-${item.id}`}
                checked={item.isHighlighted}
                onChange={(e) => updateContentItem(index, 'isHighlighted', e.target.checked)}
                className="form-check-input"
              />
              <label htmlFor={`highlight-${item.id}`} className="form-check-label">
                Выделить текст
              </label>
            </div>
          </div>
        );
      
      case 'code':
        return (
          <div className="code-editor">
            <div className="form-group">
              <label>Код</label>
              <textarea
                value={item.content}
                onChange={(e) => updateContentItem(index, 'content', e.target.value)}
                className="form-control code-area"
                rows="6"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Язык</label>
                <select
                  value={item.language}
                  onChange={(e) => updateContentItem(index, 'language', e.target.value)}
                  className="form-control"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="csharp">C#</option>
                  <option value="php">PHP</option>
                  <option value="ruby">Ruby</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="xml">XML</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="form-group">
                <label>Подпись</label>
                <input
                  type="text"
                  value={item.caption}
                  onChange={(e) => updateContentItem(index, 'caption', e.target.value)}
                  className="form-control"
                  placeholder="Подпись к блоку кода"
                />
              </div>
            </div>
          </div>
        );
      
      case 'formula':
        return (
          <div className="formula-editor">
            <div className="form-group">
              <label>Формула (LaTeX)</label>
              <input
                type="text"
                value={item.content}
                onChange={(e) => updateContentItem(index, 'content', e.target.value)}
                className="form-control"
                placeholder="Введите формулу в формате LaTeX"
              />
            </div>
            <div className="form-group">
              <label>Подпись</label>
              <input
                type="text"
                value={item.caption}
                onChange={(e) => updateContentItem(index, 'caption', e.target.value)}
                className="form-control"
                placeholder="Подпись к формуле"
              />
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                id={`inline-${item.id}`}
                checked={item.isInline}
                onChange={(e) => updateContentItem(index, 'isInline', e.target.checked)}
                className="form-check-input"
              />
              <label htmlFor={`inline-${item.id}`} className="form-check-label">
                Встроенная формула
              </label>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="table-editor">
            <div className="form-group">
              <label>Заголовки столбцов</label>
              <div className="headers-container">
                {item.headers.map((header, headerIndex) => (
                  <div key={headerIndex} className="header-item">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...item.headers];
                        newHeaders[headerIndex] = e.target.value;
                        updateContentItem(index, 'headers', newHeaders);
                      }}
                      className="form-control"
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (item.headers.length > 1) {
                          const newHeaders = [...item.headers];
                          newHeaders.splice(headerIndex, 1);
                          
                          // Удаляем соответствующий столбец из всех строк
                          const newRows = item.rows.map(row => {
                            const newRow = [...row];
                            newRow.splice(headerIndex, 1);
                            return newRow;
                          });
                          
                          const updatedItem = {
                            ...item,
                            headers: newHeaders,
                            rows: newRows
                          };
                          
                          const updatedContent = [...content.content];
                          updatedContent[index] = updatedItem;
                          
                          setContent({
                            ...content,
                            content: updatedContent
                          });
                        }
                      }}
                      disabled={item.headers.length <= 1}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const newHeaders = [...item.headers, `Заголовок ${item.headers.length + 1}`];
                    
                    // Добавляем пустую ячейку во все строки
                    const newRows = item.rows.map(row => [...row, '']);
                    
                    const updatedItem = {
                      ...item,
                      headers: newHeaders,
                      rows: newRows
                    };
                    
                    const updatedContent = [...content.content];
                    updatedContent[index] = updatedItem;
                    
                    setContent({
                      ...content,
                      content: updatedContent
                    });
                  }}
                >
                  Добавить столбец
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Строки таблицы</label>
              <div className="rows-container">
                {item.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="row-item">
                    <div className="row-cells">
                      {row.map((cell, cellIndex) => (
                        <input
                          key={cellIndex}
                          type="text"
                          value={cell}
                          onChange={(e) => {
                            const newRows = [...item.rows];
                            newRows[rowIndex][cellIndex] = e.target.value;
                            updateContentItem(index, 'rows', newRows);
                          }}
                          className="form-control"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (item.rows.length > 1) {
                          const newRows = [...item.rows];
                          newRows.splice(rowIndex, 1);
                          updateContentItem(index, 'rows', newRows);
                        }
                      }}
                      disabled={item.rows.length <= 1}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    // Создаем новую строку с пустыми ячейками для каждого заголовка
                    const newRow = item.headers.map(() => '');
                    const newRows = [...item.rows, newRow];
                    updateContentItem(index, 'rows', newRows);
                  }}
                >
                  Добавить строку
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Подпись</label>
              <input
                type="text"
                value={item.caption}
                onChange={(e) => updateContentItem(index, 'caption', e.target.value)}
                className="form-control"
                placeholder="Подпись к таблице"
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="image-editor">
            <div className="form-group">
              <label>URL изображения</label>
              <input
                type="text"
                value={item.url}
                onChange={(e) => updateContentItem(index, 'url', e.target.value)}
                className="form-control"
                placeholder="Укажите URL изображения"
              />
            </div>
            <div className="form-group">
              <label>Подпись</label>
              <input
                type="text"
                value={item.caption}
                onChange={(e) => updateContentItem(index, 'caption', e.target.value)}
                className="form-control"
                placeholder="Подпись к изображению"
              />
            </div>
            <div className="form-group">
              <label>Описание (alt)</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateContentItem(index, 'description', e.target.value)}
                className="form-control"
                placeholder="Альтернативный текст для изображения"
              />
            </div>
            {item.url && (
              <div className="image-preview">
                <img src={item.url} alt={item.description || 'Preview'} style={{ maxWidth: '100%', maxHeight: '200px' }} />
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="video-editor">
            <div className="form-group">
              <label>URL видео</label>
              <input
                type="text"
                value={item.url}
                onChange={(e) => updateContentItem(index, 'url', e.target.value)}
                className="form-control"
                placeholder="Укажите URL видео (YouTube, Vimeo и т.д.)"
              />
            </div>
            <div className="form-group">
              <label>Подпись</label>
              <input
                type="text"
                value={item.caption}
                onChange={(e) => updateContentItem(index, 'caption', e.target.value)}
                className="form-control"
                placeholder="Подпись к видео"
              />
            </div>
            {item.url && (
              <div className="video-preview">
                <p>URL видео: {item.url}</p>
              </div>
            )}
          </div>
        );

      case 'diagram':
        return (
          <div className="diagram-editor">
            <div className="form-group">
              <label>Элементы диаграммы</label>
              <div className="diagram-elements-container">
                {item.elements.map((element, elementIndex) => (
                  <div key={elementIndex} className="diagram-element">
                    <div className="element-header">
                      <h4>Элемент {elementIndex + 1}</h4>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          const newElements = [...item.elements];
                          newElements.splice(elementIndex, 1);
                          updateContentItem(index, 'elements', newElements);
                        }}
                      >
                        &times;
                      </button>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Тип элемента</label>
                        <select
                          value={element.type}
                          onChange={(e) => {
                            const newElements = [...item.elements];
                            newElements[elementIndex] = {
                              ...newElements[elementIndex],
                              type: e.target.value
                            };
                            updateContentItem(index, 'elements', newElements);
                          }}
                          className="form-control"
                        >
                          <option value="block">Блок</option>
                          <option value="connector">Соединитель</option>
                          <option value="decision">Условие</option>
                          <option value="input">Ввод/Вывод</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Текст</label>
                        <input
                          type="text"
                          value={element.text}
                          onChange={(e) => {
                            const newElements = [...item.elements];
                            newElements[elementIndex] = {
                              ...newElements[elementIndex],
                              text: e.target.value
                            };
                            updateContentItem(index, 'elements', newElements);
                          }}
                          className="form-control"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>X</label>
                        <input
                          type="number"
                          value={element.x}
                          onChange={(e) => {
                            const newElements = [...item.elements];
                            newElements[elementIndex] = {
                              ...newElements[elementIndex],
                              x: parseFloat(e.target.value)
                            };
                            updateContentItem(index, 'elements', newElements);
                          }}
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label>Y</label>
                        <input
                          type="number"
                          value={element.y}
                          onChange={(e) => {
                            const newElements = [...item.elements];
                            newElements[elementIndex] = {
                              ...newElements[elementIndex],
                              y: parseFloat(e.target.value)
                            };
                            updateContentItem(index, 'elements', newElements);
                          }}
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label>Ширина</label>
                        <input
                          type="number"
                          value={element.width}
                          onChange={(e) => {
                            const newElements = [...item.elements];
                            newElements[elementIndex] = {
                              ...newElements[elementIndex],
                              width: parseFloat(e.target.value)
                            };
                            updateContentItem(index, 'elements', newElements);
                          }}
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label>Высота</label>
                        <input
                          type="number"
                          value={element.height}
                          onChange={(e) => {
                            const newElements = [...item.elements];
                            newElements[elementIndex] = {
                              ...newElements[elementIndex],
                              height: parseFloat(e.target.value)
                            };
                            updateContentItem(index, 'elements', newElements);
                          }}
                          className="form-control"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Связи (ID других элементов через запятую)</label>
                      <input
                        type="text"
                        value={element.connections.join(',')}
                        onChange={(e) => {
                          const connectionsArray = e.target.value ? 
                            e.target.value.split(',').map(conn => conn.trim()) : 
                            [];
                          
                          const newElements = [...item.elements];
                          newElements[elementIndex] = {
                            ...newElements[elementIndex],
                            connections: connectionsArray
                          };
                          updateContentItem(index, 'elements', newElements);
                        }}
                        className="form-control"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const newElement = {
                      id: `diag_elem_${Date.now()}`,
                      type: 'block',
                      text: '',
                      x: 0,
                      y: 0,
                      width: 100,
                      height: 50,
                      connections: []
                    };
                    
                    const newElements = [...item.elements, newElement];
                    updateContentItem(index, 'elements', newElements);
                  }}
                >
                  Добавить элемент
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Подпись</label>
              <input
                type="text"
                value={item.caption}
                onChange={(e) => updateContentItem(index, 'caption', e.target.value)}
                className="form-control"
                placeholder="Подпись к диаграмме"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  }
};

export default ContentEditor; 