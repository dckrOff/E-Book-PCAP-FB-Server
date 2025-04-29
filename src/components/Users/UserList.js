import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './UserList.css';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(db, 'users'), orderBy('displayName', 'asc'));
        const snapshot = await getDocs(usersQuery);
        
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsers(usersList);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        setError('Произошла ошибка при загрузке пользователей. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        
        // Обновляем список после удаления
        setUsers(users.filter(user => user.id !== id));
      } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        setError('Произошла ошибка при удалении пользователя. Пожалуйста, попробуйте позже.');
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
    <div className="user-list">
      <div className="list-header">
        <h1>Пользователи</h1>
      </div>

      {users.length === 0 ? (
        <div className="empty-list">
          <p>Пользователи отсутствуют.</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Прогресс</th>
                <th>Дата регистрации</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.displayName || 'Не указано'}</td>
                  <td>{user.email}</td>
                  <td>{user.progress || 0}%</td>
                  <td>{user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Не указано'}</td>
                  <td className="user-actions">
                    <Link 
                      to={`/users/edit/${user.id}`} 
                      className="btn btn-secondary btn-sm"
                    >
                      Подробнее
                    </Link>
                    <button
                      onClick={() => handleDelete(user.id)}
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

export default UserList; 