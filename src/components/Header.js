import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="container header-container">
        <Link to="/" className="logo">
          PCAP Админ-панель
        </Link>
      </div>
    </header>
  );
};

export default Header; 