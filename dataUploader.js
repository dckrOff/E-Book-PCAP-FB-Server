// import-firebase-data.js
const fs = require('fs');
const admin = require('firebase-admin');
const path = require('path');

// Инициализация Firebase
// Для работы скрипта вам понадобится скачать serviceAccountKey.json из консоли Firebase 
// Project settings -> Service accounts -> Generate new private key
const serviceAccount = require('./fb-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'YOUR_STORAGE_BUCKET_URL' // например: 'your-project-id.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function importData(jsonFilePath) {
  try {
    // Считываем JSON-файл
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log('JSON файл успешно прочитан');
    
    // Обработка коллекций Firestore
    await importFirestoreCollections(jsonData);
    
    // Обработка контента для Firebase Storage
    if (jsonData.content) {
      await importStorageContent(jsonData.content);
    }
    
    console.log('Импорт данных завершен успешно');
  } catch (error) {
    console.error('Ошибка при импорте данных:', error);
  }
}

async function importFirestoreCollections(data) {
  // Импорт глав (chapters)
  if (data.chapters) {
    console.log('Импорт глав...');
    const chaptersPromises = data.chapters.map(async (chapter) => {
      const chapterRef = db.collection('chapters').doc(chapter.id);
      
      // Создаем копию объекта главы без sections
      const chapterData = { ...chapter };
      const sections = chapterData.sections || [];
      delete chapterData.sections;
      
      // Записываем данные главы
      await chapterRef.set(chapterData);
      
      // Записываем разделы (sections) как подколлекцию
      if (sections.length > 0) {
        const sectionPromises = sections.map(section => 
          chapterRef.collection('sections').doc(section.id).set(section)
        );
        await Promise.all(sectionPromises);
      }
    });
    
    await Promise.all(chaptersPromises);
    console.log(`Импортировано ${data.chapters.length} глав с разделами`);
  }
  
  // Импорт глоссария (glossary)
  if (data.glossary) {
    console.log('Импорт глоссария...');
    const glossaryPromises = data.glossary.map(term => 
      db.collection('glossary').doc(term.id).set(term)
    );
    await Promise.all(glossaryPromises);
    console.log(`Импортировано ${data.glossary.length} терминов глоссария`);
  }
  
  // Импорт тестов (quizzes)
  if (data.quizzes) {
    console.log('Импорт тестов...');
    const quizzesPromises = data.quizzes.map(quiz => 
      db.collection('quizzes').doc(quiz.id).set(quiz)
    );
    await Promise.all(quizzesPromises);
    console.log(`Импортировано ${data.quizzes.length} тестов`);
  }
  
  // Импорт результатов тестов (quiz_results)
  if (data.quiz_results) {
    console.log('Импорт результатов тестов...');
    const resultsPromises = data.quiz_results.map(result => 
      db.collection('quiz_results').doc(result.id).set(result)
    );
    await Promise.all(resultsPromises);
    console.log(`Импортировано ${data.quiz_results.length} результатов тестов`);
  }
  
  // Импорт пользователей (users)
  if (data.users) {
    console.log('Импорт пользователей...');
    const usersPromises = data.users.map(user => 
      db.collection('users').doc(user.id).set(user)
    );
    await Promise.all(usersPromises);
    console.log(`Импортировано ${data.users.length} пользователей`);
  }
  
  // Импорт закладок (bookmarks)
  if (data.bookmarks) {
    console.log('Импорт закладок...');
    const bookmarksPromises = data.bookmarks.map(bookmark => 
      db.collection('bookmarks').doc(bookmark.id).set(bookmark)
    );
    await Promise.all(bookmarksPromises);
    console.log(`Импортировано ${data.bookmarks.length} закладок`);
  }
}

async function importStorageContent(content) {
  console.log('Импорт контента в Storage...');
  
  // Для каждой главы
  for (const chapterId in content) {
    const chapterContent = content[chapterId];
    
    // Для каждого раздела в главе
    for (const sectionId in chapterContent) {
      const sectionContent = chapterContent[sectionId];
      
      // Создаем JSON-файл для контента раздела
      const contentFilePath = `./temp/content/${chapterId}/${sectionId}.json`;
      
      // Убедимся, что директория существует
      const dirPath = path.dirname(contentFilePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Записываем JSON в файл
      fs.writeFileSync(contentFilePath, JSON.stringify(sectionContent, null, 2));
      
      // Загружаем файл в Firebase Storage
      const destination = `content/${chapterId}/${sectionId}.json`;
      await bucket.upload(contentFilePath, {
        destination: destination,
        metadata: {
          contentType: 'application/json',
        }
      });
      
      console.log(`Загружен контент раздела: ${destination}`);
      
      // Обработка и загрузка медиафайлов, если они есть
      await processMediaContent(sectionContent.content, chapterId, sectionId);
    }
  }
  
  // Удаляем временные файлы
  if (fs.existsSync('./temp')) {
    fs.rmSync('./temp', { recursive: true, force: true });
  }
  console.log('Импорт контента завершен');
}

// Функция для обработки и загрузки медиафайлов
async function processMediaContent(contentItems, chapterId, sectionId) {
  if (!contentItems || !Array.isArray(contentItems)) return;
  
  // Создаем каталог для Firestore контента
  const contentRef = db.collection('content').doc(chapterId).collection('sections').doc(sectionId);
  const contentData = {
    id: sectionId,
    content: contentItems
  };
  
  // Загружаем контент в Firestore
  await contentRef.set(contentData);
  
  // Обрабатываем каждый элемент контента для импорта медиафайлов
  for (const item of contentItems) {
    if (!item) continue;
    
    // Обработка изображений
    if (item.type === 'image' && item.url && !item.url.startsWith('http')) {
      const imagePath = item.url;
      try {
        // Проверяем существует ли файл
        if (fs.existsSync(imagePath)) {
          const filename = path.basename(imagePath);
          const destination = `images/${chapterId}/${sectionId}/${filename}`;
          
          // Загружаем изображение в Storage
          await bucket.upload(imagePath, {
            destination,
            metadata: {
              contentType: getContentType(filename)
            }
          });
          
          // Обновляем URL в Firestore
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
          await contentRef.update({
            [`content.${contentItems.indexOf(item)}.url`]: publicUrl
          });
          
          console.log(`Загружено изображение: ${destination}`);
        }
      } catch (error) {
        console.error(`Ошибка при загрузке изображения ${imagePath}:`, error);
      }
    }
    
    // Обработка видео (только если локальные файлы)
    if (item.type === 'video' && item.url && !item.url.startsWith('http')) {
      const videoPath = item.url;
      try {
        // Проверяем существует ли файл
        if (fs.existsSync(videoPath)) {
          const filename = path.basename(videoPath);
          const destination = `videos/${chapterId}/${sectionId}/${filename}`;
          
          // Загружаем видео в Storage
          await bucket.upload(videoPath, {
            destination,
            metadata: {
              contentType: getContentType(filename)
            }
          });
          
          // Обновляем URL в Firestore
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
          await contentRef.update({
            [`content.${contentItems.indexOf(item)}.url`]: publicUrl
          });
          
          console.log(`Загружено видео: ${destination}`);
        }
      } catch (error) {
        console.error(`Ошибка при загрузке видео ${videoPath}:`, error);
      }
    }
    
    // Для диаграммы не требуется загрузка файлов, так как данные уже в JSON
  }
}

// Функция для определения типа файла по расширению
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  // Изображения
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  
  // Видео
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.ogg') return 'video/ogg';
  if (ext === '.mov') return 'video/quicktime';
  
  // По умолчанию
  return 'application/octet-stream';
}

// Запуск импорта данных
const jsonFilePath = process.argv[2] || './db_sample.json';
importData(jsonFilePath);