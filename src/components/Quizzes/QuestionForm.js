import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import './QuestionForm.css';

// Перечисление типов вопросов
const QuestionType = {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE'
};

const QuestionForm = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Состояние для нового вопроса
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    questionType: QuestionType.SINGLE_CHOICE,
    options: ['', '', '', ''],
    correctOptions: [0], // Теперь массив для поддержки множественного выбора
    explanation: ''
  });
  
  // Состояние для редактируемого вопроса
  const [editingIndex, setEditingIndex] = useState(-1);
  
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        
        if (quizDoc.exists()) {
          setQuiz({
            id: quizDoc.id,
            ...quizDoc.data()
          });
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
  }, [quizId]);
  
  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    
    // Обработка изменения типа вопроса
    if (name === 'questionType') {
      let updatedQuestion = {
        ...newQuestion,
        [name]: value
      };
      
      // Настройка опций и правильных ответов в зависимости от типа вопроса
      if (value === QuestionType.TRUE_FALSE) {
        updatedQuestion.options = ['Правда', 'Ложь'];
        updatedQuestion.correctOptions = [0]; // По умолчанию "Правда"
      } else if (value === QuestionType.SINGLE_CHOICE) {
        // Если старый тип был MULTIPLE_CHOICE, оставляем только первый правильный ответ
        if (newQuestion.questionType === QuestionType.MULTIPLE_CHOICE) {
          updatedQuestion.correctOptions = newQuestion.correctOptions.length > 0 
            ? [newQuestion.correctOptions[0]] 
            : [0];
        }
      }
      
      setNewQuestion(updatedQuestion);
    } else {
      setNewQuestion({
        ...newQuestion,
        [name]: value
      });
    }
  };
  
  const handleOptionChange = (index, value) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = value;
    
    setNewQuestion({
      ...newQuestion,
      options: updatedOptions
    });
  };
  
  const handleCorrectOptionChange = (index, isChecked) => {
    let updatedCorrectOptions = [...newQuestion.correctOptions];
    
    if (newQuestion.questionType === QuestionType.SINGLE_CHOICE || 
        newQuestion.questionType === QuestionType.TRUE_FALSE) {
      // Для одиночного выбора, просто устанавливаем новый индекс
      updatedCorrectOptions = [index];
    } else if (newQuestion.questionType === QuestionType.MULTIPLE_CHOICE) {
      // Для множественного выбора добавляем или удаляем индекс
      if (isChecked) {
        if (!updatedCorrectOptions.includes(index)) {
          updatedCorrectOptions.push(index);
        }
      } else {
        updatedCorrectOptions = updatedCorrectOptions.filter(item => item !== index);
      }
    }
    
    setNewQuestion({
      ...newQuestion,
      correctOptions: updatedCorrectOptions
    });
  };
  
  const handleAddOption = () => {
    if (newQuestion.questionType !== QuestionType.TRUE_FALSE) {
      setNewQuestion({
        ...newQuestion,
        options: [...newQuestion.options, '']
      });
    }
  };
  
  const handleRemoveOption = (index) => {
    if (newQuestion.options.length <= 2) {
      setError('Вопрос должен иметь как минимум два варианта ответа');
      return;
    }
    
    const updatedOptions = newQuestion.options.filter((_, i) => i !== index);
    
    // Обновляем массив correctOptions, удаляя удаленный вариант и корректируя индексы
    let updatedCorrectOptions = newQuestion.correctOptions
      .filter(optionIndex => optionIndex !== index)
      .map(optionIndex => optionIndex > index ? optionIndex - 1 : optionIndex);
    
    setNewQuestion({
      ...newQuestion,
      options: updatedOptions,
      correctOptions: updatedCorrectOptions
    });
  };
  
  const handleAddQuestion = async () => {
    // Проверка валидности вопроса
    if (!newQuestion.text.trim()) {
      setError('Текст вопроса обязателен');
      return;
    }
    
    if (newQuestion.options.some(option => !option.trim())) {
      setError('Все варианты ответов должны быть заполнены');
      return;
    }
    
    if (newQuestion.correctOptions.length === 0) {
      setError('Выберите хотя бы один правильный ответ');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const questionToAdd = {
        ...newQuestion,
        id: Date.now().toString() // Простой уникальный ID для вопроса
      };
      
      if (editingIndex >= 0) {
        // Обновляем существующий вопрос
        const updatedQuestions = [...quiz.questions];
        updatedQuestions[editingIndex] = questionToAdd;
        
        await updateDoc(doc(db, 'quizzes', quizId), {
          questions: updatedQuestions
        });
        
        setSuccess('Вопрос успешно обновлен');
        setEditingIndex(-1);
      } else {
        // Добавляем новый вопрос
        await updateDoc(doc(db, 'quizzes', quizId), {
          questions: arrayUnion(questionToAdd)
        });
        
        setSuccess('Вопрос успешно добавлен');
      }
      
      // Обновляем локальное состояние теста
      const updatedQuiz = await getDoc(doc(db, 'quizzes', quizId));
      setQuiz({
        id: updatedQuiz.id,
        ...updatedQuiz.data()
      });
      
      // Сбрасываем форму
      setNewQuestion({
        text: '',
        questionType: QuestionType.SINGLE_CHOICE,
        options: ['', '', '', ''],
        correctOptions: [0],
        explanation: ''
      });
      
      setSaving(false);
    } catch (error) {
      console.error('Ошибка при сохранении вопроса:', error);
      setError('Произошла ошибка при сохранении вопроса. Пожалуйста, попробуйте позже.');
      setSaving(false);
    }
  };
  
  const handleEditQuestion = (index) => {
    const questionToEdit = quiz.questions[index];
    
    // Обрабатываем случай, когда вопрос создан до обновления (имеет старый формат)
    const correctOptions = questionToEdit.correctOptions 
      ? [...questionToEdit.correctOptions] 
      : [questionToEdit.correctOption || 0];
    
    const questionType = questionToEdit.questionType || QuestionType.SINGLE_CHOICE;
    
    let options = [...questionToEdit.options];
    if (questionType === QuestionType.TRUE_FALSE && options.length !== 2) {
      options = ['Правда', 'Ложь'];
    }
    
    setNewQuestion({
      text: questionToEdit.text,
      questionType: questionType,
      options: options,
      correctOptions: correctOptions,
      explanation: questionToEdit.explanation || ''
    });
    
    setEditingIndex(index);
  };
  
  const handleDeleteQuestion = async (index) => {
    if (window.confirm('Вы уверены, что хотите удалить этот вопрос?')) {
      try {
        setSaving(true);
        
        // Создаем новый массив вопросов без удаляемого вопроса
        const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
        
        // Обновляем документ в Firestore
        await updateDoc(doc(db, 'quizzes', quizId), {
          questions: updatedQuestions
        });
        
        // Обновляем локальное состояние
        setQuiz({
          ...quiz,
          questions: updatedQuestions
        });
        
        setSuccess('Вопрос успешно удален');
        setSaving(false);
      } catch (error) {
        console.error('Ошибка при удалении вопроса:', error);
        setError('Произошла ошибка при удалении вопроса. Пожалуйста, попробуйте позже.');
        setSaving(false);
      }
    }
  };
  
  const handleCancelEdit = () => {
    setNewQuestion({
      text: '',
      questionType: QuestionType.SINGLE_CHOICE,
      options: ['', '', '', ''],
      correctOptions: [0],
      explanation: ''
    });
    
    setEditingIndex(-1);
  };
  
  // Получение понятного названия типа вопроса для отображения
  const getQuestionTypeName = (type) => {
    switch (type) {
      case QuestionType.SINGLE_CHOICE:
        return 'Одиночный выбор';
      case QuestionType.MULTIPLE_CHOICE:
        return 'Множественный выбор';
      case QuestionType.TRUE_FALSE:
        return 'Правда/Ложь';
      default:
        return 'Неизвестный тип';
    }
  };
  
  if (loading) {
    return <div className="loading"></div>;
  }
  
  if (!quiz) {
    return <div className="alert alert-error">Тест не найден</div>;
  }
  
  return (
    <div className="question-form-container">
      <div className="quiz-header">
        <h1>Вопросы для теста: {quiz.title}</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/quizzes')}
        >
          Назад к списку тестов
        </button>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="questions-list">
        <h2>Существующие вопросы ({quiz.questions?.length || 0})</h2>
        
        {(!quiz.questions || quiz.questions.length === 0) ? (
          <div className="empty-questions">
            <p>В этом тесте еще нет вопросов. Добавьте первый вопрос с помощью формы ниже.</p>
          </div>
        ) : (
          <div className="questions-table-container">
            <table className="questions-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Вопрос</th>
                  <th>Тип</th>
                  <th>Вариантов</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {quiz.questions.map((question, index) => (
                  <tr key={question.id || index}>
                    <td>{index + 1}</td>
                    <td>{question.text}</td>
                    <td>{getQuestionTypeName(question.questionType || QuestionType.SINGLE_CHOICE)}</td>
                    <td>{question.options.length}</td>
                    <td className="question-actions">
                      <button
                        onClick={() => handleEditQuestion(index)}
                        className="btn btn-secondary btn-sm"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(index)}
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
      
      <div className="add-question-form">
        <h2>{editingIndex >= 0 ? 'Редактировать вопрос' : 'Добавить новый вопрос'}</h2>
        
        <div className="form-group">
          <label htmlFor="questionText">Текст вопроса*</label>
          <textarea
            id="questionText"
            name="text"
            className="form-control"
            value={newQuestion.text}
            onChange={handleQuestionChange}
            rows={2}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="questionType">Тип вопроса*</label>
          <select
            id="questionType"
            name="questionType"
            className="form-control"
            value={newQuestion.questionType}
            onChange={handleQuestionChange}
            required
          >
            <option value={QuestionType.SINGLE_CHOICE}>Одиночный выбор</option>
            <option value={QuestionType.MULTIPLE_CHOICE}>Множественный выбор</option>
            <option value={QuestionType.TRUE_FALSE}>Правда/Ложь</option>
          </select>
        </div>
        
        <div className="options-container">
          <div className="options-header">
            <label>Варианты ответов*</label>
            {newQuestion.questionType !== QuestionType.TRUE_FALSE && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddOption}
              >
                Добавить вариант
              </button>
            )}
          </div>
          
          {newQuestion.options.map((option, index) => (
            <div key={index} className="option-group">
              <div className="option-input">
                <input
                  type="text"
                  className="form-control"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Вариант ${index + 1}`}
                  required
                  disabled={newQuestion.questionType === QuestionType.TRUE_FALSE}
                />
              </div>
              <div className="option-correct">
                {newQuestion.questionType === QuestionType.MULTIPLE_CHOICE ? (
                  <input
                    type="checkbox"
                    checked={newQuestion.correctOptions.includes(index)}
                    onChange={(e) => handleCorrectOptionChange(index, e.target.checked)}
                    required
                  />
                ) : (
                  <input
                    type="radio"
                    name="correctOption"
                    value={index}
                    checked={newQuestion.correctOptions.includes(index)}
                    onChange={(e) => handleCorrectOptionChange(index, true)}
                    required
                  />
                )}
                <label>Правильный</label>
              </div>
              {newQuestion.questionType !== QuestionType.TRUE_FALSE && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemoveOption(index)}
                  disabled={newQuestion.options.length <= 2}
                >
                  Удалить
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="form-group">
          <label htmlFor="explanation">Пояснение (необязательно)</label>
          <textarea
            id="explanation"
            name="explanation"
            className="form-control"
            value={newQuestion.explanation}
            onChange={handleQuestionChange}
            rows={2}
            placeholder="Объяснение правильного ответа"
          />
        </div>
        
        <div className="form-actions">
          {editingIndex >= 0 && (
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleCancelEdit}
            >
              Отменить редактирование
            </button>
          )}
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleAddQuestion}
            disabled={saving}
          >
            {saving 
              ? 'Сохранение...' 
              : (editingIndex >= 0 ? 'Обновить вопрос' : 'Добавить вопрос')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm; 