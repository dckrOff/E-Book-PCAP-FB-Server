# Структура базы данных для электронного учебника PCAP

Этот документ описывает структуру базы данных для мобильного приложения "Электронный учебник по дисциплине 'Параллельная архитектура компьютера и программирования'". Структура предназначена для реализации в Firebase Firestore и Firebase Storage.

## Firebase Firestore

### Коллекция: chapters

Описание: Главы учебника

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "order": "number",
  "progress": "number",
  "parentId": "string | null"
}
```

#### Подколлекция: chapters/{chapterId}/sections

Описание: Разделы внутри главы

```json
{
  "id": "string",
  "title": "string",
  "order": "number",
  "progress": "number",
  "contentUrl": "string",
  "chapterId": "string"
}
```

### Коллекция: glossary

Описание: Термины глоссария

```json
{
  "id": "string",
  "term": "string",
  "definition": "string",
  "category": "string",
  "relatedTerms": ["string"], // ID связанных терминов
  "relatedSectionIds": ["string"] // ID связанных разделов
}
```

### Коллекция: quizzes

Описание: Тесты по темам учебника

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "difficulty": "string", // EASY, MEDIUM, HARD
  "timeLimit": "number", // в секундах
  "chapterId": "string", // ID главы/раздела, к которому относится тест
  "questions": [
    {
      "id": "string",
      "text": "string",
      "type": "string", // SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE
      "options": [
        {
          "id": "string",
          "text": "string",
          "isCorrect": "boolean"
        }
      ],
      "explanation": "string" // объяснение правильного ответа
    }
  ]
}
```

### Коллекция: quiz_results

Описание: Результаты прохождения тестов пользователями

```json
{
  "id": "string",
  "quizId": "string",
  "userId": "string",
  "score": "number", // процент правильных ответов
  "timeSpentMillis": "number",
  "completedAt": "timestamp",
  "answers": [
    {
      "questionId": "string",
      "selectedOptionIds": ["string"],
      "isCorrect": "boolean"
    }
  ]
}
```

### Коллекция: users

Описание: Информация о пользователях

```json
{
  "id": "string",
  "displayName": "string",
  "email": "string",
  "progress": {
    "overallProgress": "number", // процент завершения учебника
    "lastAccessedChapterId": "string",
    "lastAccessedSectionId": "string"
  }
}
```

### Коллекция: bookmarks

Описание: Закладки пользователей

```json
{
  "id": "string",
  "userId": "string",
  "sectionId": "string",
  "sectionTitle": "string",
  "chapterId": "string",
  "createdAt": "timestamp",
  "note": "string"
}
```

## Firebase Storage

### Контент разделов

Путь: `content/{chapterId}/{sectionId}.json`

```json
{
  "id": "string",
  "title": "string",
  "content": [
    {
      "type": "text",
      "id": "string",
      "content": "string",
      "isHighlighted": "boolean"
    },
    {
      "type": "image",
      "id": "string",
      "url": "string",
      "caption": "string",
      "description": "string"
    },
    {
      "type": "code",
      "id": "string",
      "content": "string",
      "language": "string",
      "caption": "string"
    },
    {
      "type": "formula",
      "id": "string",
      "content": "string",
      "caption": "string",
      "isInline": "boolean"
    },
    {
      "type": "table",
      "id": "string",
      "headers": ["string"],
      "rows": [["string"]],
      "caption": "string"
    },
    {
      "type": "video",
      "id": "string",
      "url": "string",
      "caption": "string",
      "thumbnailUrl": "string",
      "durationSeconds": "number"
    },
    {
      "type": "diagram",
      "id": "string",
      "elements": [
        {
          "id": "string",
          "type": "string",
          "text": "string",
          "x": "number",
          "y": "number",
          "width": "number",
          "height": "number",
          "connections": ["string"]
        }
      ],
      "caption": "string"
    }
  ]
}
```

### Изображения

- Изображения глав: `images/chapters/{chapterId}.jpg`
- Изображения контента: `images/content/{sectionId}/{imageId}.jpg`
- Превью для видео: `images/thumbnails/{videoId}.jpg`

### Видео

- Видео контент: `videos/{sectionId}/{videoId}.mp4`

## Рекомендации по настройке

1. Настройте правила безопасности Firebase, чтобы контролировать доступ к данным
2. Создайте индексы для оптимизации запросов, особенно для:
   - Запросов по категориям в глоссарии
   - Сортировки глав и разделов по полю `order`
   - Фильтрации тестов по сложности
3. Настройте Firebase Storage Rules для защиты мультимедийного контента
4. Реализуйте кэширование на стороне клиента для повышения производительности
5. Настройте бэкапы данных для предотвращения потери информации