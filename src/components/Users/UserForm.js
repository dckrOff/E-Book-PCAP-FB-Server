import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './UserForm.css';

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setError('Пользователь не найден');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
        setError('Произошла ошибка при загрузке пользователя. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [id]);

  const handleNoteChange = (e) => {
    setUserData({
      ...userData,
      adminNotes: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Обновляем только примечания администратора
      await updateDoc(doc(db, 'users', id), {
        adminNotes: userData.adminNotes
      });
      
      setSuccess('Информация о пользователе успешно обновлена');
      setSaving(false);
    } catch (error) {
      console.error('Ошибка при сохранении информации о пользователе:', error);
      setError('Произошла ошибка при сохранении информации. Пожалуйста, попробуйте позже.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!userData) {
    return <div className="alert alert-error">Пользователь не найден</div>;
  }

  return (
    <div className="user-form-container">
      <div className="form-header">
        <h1>Информация о пользователе</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/users')}
        >
          Назад к списку
        </button>
      </div>
      
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="user-details">
        <div className="detail-section">
          <h2>Основная информация</h2>
          <div className="detail-row">
            <div className="detail-label">Имя:</div>
            <div className="detail-value">{userData.displayName || 'Не указано'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Email:</div>
            <div className="detail-value">{userData.email}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Дата регистрации:</div>
            <div className="detail-value">
              {userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleString() : 'Не указано'}
            </div>
          </div>
        </div>
        
        <div className="detail-section">
          <h2>Статистика</h2>
          <div className="detail-row">
            <div className="detail-label">Общий прогресс:</div>
            <div className="detail-value">{userData.progress || 0}%</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Пройдено тестов:</div>
            <div className="detail-value">{userData.completedQuizzes?.length || 0}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Последний визит:</div>
            <div className="detail-value">
              {userData.lastLogin ? new Date(userData.lastLogin.seconds * 1000).toLocaleString() : 'Не указано'}
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="admin-notes">
          <h2>Примечания администратора</h2>
          <div className="form-group">
            <textarea
              value={userData.adminNotes || ''}
              onChange={handleNoteChange}
              className="form-control"
              rows={4}
              placeholder="Добавьте примечания о пользователе здесь..."
            />
          </div>
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить примечания'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm; 