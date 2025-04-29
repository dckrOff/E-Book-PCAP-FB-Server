# Структура базы данных Firestore

## Коллекции и документы

### 1. Главы (chapters)
Коллекция `chapters` содержит документы с информацией о главах учебника.

**Поля документа:**
- `title` (string) - название главы
- `order` (number) - порядок отображения главы
- `sectionsCount` (number, опционально) - количество разделов в главе

### 2. Разделы (sections)
Вложенная коллекция `chapters/{chapterId}/sections` содержит документы с информацией о разделах главы.

**Поля документа:**
- `title` (string) - название раздела
- `description` (string) - описание раздела
- `order` (number) - порядок отображения раздела
- `progress` (number) - прогресс выполнения (0-100%)
- `contentUrl` (string, опционально) - ссылка на контент в формате `content/{chapterId}/{sectionId}`
- `chapterId` (string) - ID родительской главы

### 3. Контент (content)
Контент хранится в иерархической структуре:
- `content/{chapterId}` - документ главы с полем `hasContent: true`
- `content/{chapterId}/sections/{sectionId}` - документы с контентом разделов

**Поля документа контента раздела:**
- `id` (string) - ID раздела
- `title` (string) - заголовок раздела
- `content` (array) - массив элементов контента разных типов

**Структура элемента контента:**
```javascript
{
  id: string,            // уникальный идентификатор элемента
  type: string,          // тип элемента: 'text', 'code', 'formula', 'table', 'image', 'video', 'diagram'
  
  // Для type: 'text'
  content: string,       // текстовое содержимое
  isHighlighted: boolean, // выделенный текст (true/false)
  
  // Для type: 'code'
  content: string,       // код
  language: string,      // язык программирования
  caption: string,       // подпись
  
  // Для type: 'formula'
  content: string,       // формула в формате LaTeX
  caption: string,       // подпись
  isInline: boolean,     // встроенная формула (true/false)
  
  // Для type: 'table'
  headers: string[],     // массив заголовков столбцов
  rows: string[][],      // массив строк таблицы (массив массивов ячеек)
  caption: string        // подпись к таблице

  // Для type: 'image'
  url: string,           // URL изображения
  caption: string,       // подпись к изображению
  description: string,   // альтернативный текст (alt) для изображения

  // Для type: 'video'
  url: string,           // URL видео (YouTube, Vimeo и т.д.)
  caption: string,       // подпись к видео

  // Для type: 'diagram'
  elements: [            // массив элементов диаграммы
    {
      id: string,        // уникальный идентификатор элемента
      type: string,      // тип элемента: 'block', 'connector', 'decision', etc.
      text: string,      // текст элемента
      x: number,         // координата X
      y: number,         // координата Y
      width: number,     // ширина
      height: number,    // высота
      connections: string[]  // ID связанных элементов
    }
  ],
  caption: string        // подпись к диаграмме
}
```

### 4. Тесты (quizzes)
Коллекция `quizzes` содержит документы с тестами.

**Поля документа:**
- `title` (string) - название теста
- `description` (string, опционально) - описание теста
- `topic` (string, опционально) - тема теста
- `difficulty` (string) - сложность: 'easy', 'medium', 'hard'
- `timeLimit` (number) - ограничение времени в минутах
- `questions` (array) - массив объектов с вопросами

**Структура объекта вопроса:**
```javascript
{
  id: string,                 // уникальный идентификатор вопроса
  text: string,               // текст вопроса
  questionType: string,       // тип вопроса: 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'
  options: string[],          // массив вариантов ответов
  correctOptions: number[],   // массив индексов правильных ответов (для поддержки множественного выбора)
  explanation: string         // пояснение к правильному ответу (опционально)
}
```

### Типы вопросов

- `SINGLE_CHOICE` - выбор одного варианта ответа
- `MULTIPLE_CHOICE` - выбор нескольких вариантов ответа
- `TRUE_FALSE` - вопрос типа "правда/ложь"

### Примечания:

1. Для вопросов с одним правильным ответом (`SINGLE_CHOICE` и `TRUE_FALSE`), массив `correctOptions` будет содержать только один элемент.
2. Для типа `TRUE_FALSE`, массив `options` обычно содержит только два элемента: ["Правда", "Ложь"].
3. Массив `correctOptions` заменяет устаревшее поле `correctOption`, которое использовалось ранее для вопросов с одним правильным ответом.

### 5. Глоссарий (glossary)
Коллекция `glossary` содержит документы с терминами.

**Поля документа:**
- `term` (string) - термин
- `definition` (string) - определение термина
- `category` (string, опционально) - категория термина
- `relatedTerms` (array, опционально) - массив связанных терминов
- `relatedSections` (array) - массив связанных разделов

**Структура объекта связанного раздела:**
```javascript
{
  id: string,     // ID раздела
  title: string   // название раздела (chapterId)
}
```

## Особенности и зависимости

1. **Вложенные коллекции:**
   - Разделы хранятся как вложенная коллекция внутри документа главы
   - Контент разделов хранится как вложенная коллекция внутри документа главы в коллекции `content`

2. **Важные зависимости:**
   - Перед созданием раздела должна существовать соответствующая глава
   - Перед сохранением контента раздела должен существовать документ `content/{chapterId}`
   - Вопросы хранятся внутри документа теста, а не в отдельной коллекции

3. **Примечания по запросам:**
   - При получении всех разделов без фильтрации по главе требуется выполнить запрос ко всем вложенным коллекциям sections всех глав
   - Для обновления вопросов теста требуется обновить весь массив `questions` в документе теста

## Пример запросов для работы с данными

```javascript
// Получение всех глав, отсортированных по порядку
const chaptersQuery = query(collection(db, 'chapters'), orderBy('order', 'asc'));

// Получение разделов конкретной главы
const sectionsRef = collection(db, `chapters/${chapterId}/sections`);
const sectionsQuery = query(sectionsRef, orderBy('order', 'asc'));

// Получение контента раздела
const contentRef = doc(db, 'content', chapterId, 'sections', sectionId);
const contentDoc = await getDoc(contentRef);

// Сохранение контента раздела (с созданием родительского документа)
const batch = writeBatch(db);
const chapterContentRef = doc(db, 'content', chapterId);
const sectionContentRef = doc(db, 'content', chapterId, 'sections', sectionId);
batch.set(chapterContentRef, { hasContent: true }, { merge: true });
batch.set(sectionContentRef, contentData);
await batch.commit();
```
