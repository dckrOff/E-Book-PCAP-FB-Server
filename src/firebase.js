import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Замените на ваши данные из Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDS-rB4RKOf6Ksqln5Hx7qUbijEhpNBtfg",
    authDomain: "e-book-pcap-test.firebaseapp.com",
    projectId: "e-book-pcap-test",
    storageBucket: "e-book-pcap-test.firebasestorage.app",
    messagingSenderId: "572969779437",
    appId: "1:572969779437:web:42304d31c9e4cb37bd0ce4",
    measurementId: "G-8RJYZLTYC0"
  };

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db }; 