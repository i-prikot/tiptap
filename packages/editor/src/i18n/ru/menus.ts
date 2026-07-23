import type { EditorMessageTree } from '../types'

export const menus = {
  groups: { ai: 'ИИ', style: 'Стиль', insert: 'Вставка', upload: 'Загрузка' },
  slash: {
    continueWriting: {
      title: 'Продолжить писать',
      description: 'Продолжить писать с текущего места',
      keywords: 'продолжить|писать|продолжить писать|ии',
    },
    askAi: {
      title: 'Спросить ИИ',
      description: 'Попросить ИИ создать текст',
      keywords: 'ии|спросить|создать|генерировать',
    },
    text: {
      title: 'Текст',
      description: 'Обычный текстовый абзац',
      keywords: 'текст|абзац|параграф',
    },
    heading1: {
      title: 'Заголовок 1',
      description: 'Заголовок верхнего уровня',
      keywords: 'заголовок1|з1|h1',
    },
    heading2: {
      title: 'Заголовок 2',
      description: 'Ключевой заголовок раздела',
      keywords: 'заголовок2|з2|подзаголовок|h2',
    },
    heading3: {
      title: 'Заголовок 3',
      description: 'Заголовок подраздела и группы',
      keywords: 'заголовок3|з3|подзаголовок|h3',
    },
    bulletList: {
      title: 'Маркированный список',
      description: 'Список с неупорядоченными пунктами',
      keywords: 'список|маркированный|пункты|ul|li',
    },
    orderedList: {
      title: 'Нумерованный список',
      description: 'Список с упорядоченными пунктами',
      keywords: 'список|нумерованный|пункты|ol|li',
    },
    taskList: {
      title: 'Список задач',
      description: 'Список с задачами',
      keywords: 'задачи|список задач|чеклист|todo',
    },
    quote: { title: 'Цитата', description: 'Блок цитаты', keywords: 'цитата|blockquote' },
    codeBlock: {
      title: 'Блок кода',
      description: 'Блок кода с подсветкой синтаксиса',
      keywords: 'код|блок кода|pre',
    },
    mention: {
      title: 'Упоминание',
      description: 'Упомянуть пользователя или элемент',
      keywords: 'упоминание|пользователь|элемент|тег',
    },
    emoji: { title: 'Эмодзи', description: 'Вставить эмодзи', keywords: 'эмодзи|смайлик|emoji' },
    table: {
      title: 'Таблица',
      description: 'Вставить таблицу',
      keywords: 'таблица|вставить таблицу',
    },
    divider: {
      title: 'Разделитель',
      description: 'Горизонтальная линия для разделения содержимого',
      keywords: 'линия|разделитель|hr',
    },
    toc: {
      title: 'Оглавление',
      description: 'Вставить оглавление',
      keywords: 'оглавление|содержание|toc',
    },
    image: {
      title: 'Изображение',
      description: 'Изменяемое изображение с подписью',
      keywords: 'изображение|картинка|загрузить|фото|url',
    },
  },
} as const satisfies EditorMessageTree['menus']
