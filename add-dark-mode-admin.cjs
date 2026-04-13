const fs = require('fs');

const file = 'src/AdminPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  { regex: /\bbg-white\b/g, replacement: 'bg-white dark:bg-gray-800' },
  { regex: /\btext-gray-900\b/g, replacement: 'text-gray-900 dark:text-gray-100' },
  { regex: /\btext-gray-500\b/g, replacement: 'text-gray-500 dark:text-gray-400' },
  { regex: /\bborder-gray-200\b/g, replacement: 'border-gray-200 dark:border-gray-700' },
  { regex: /\bbg-gray-50\b/g, replacement: 'bg-gray-50 dark:bg-gray-900' },
  { regex: /\btext-gray-600\b/g, replacement: 'text-gray-600 dark:text-gray-300' },
  { regex: /\bbg-gray-100\b/g, replacement: 'bg-gray-100 dark:bg-gray-800' },
  { regex: /\bborder-gray-100\b/g, replacement: 'border-gray-100 dark:border-gray-800' },
  { regex: /\btext-gray-800\b/g, replacement: 'text-gray-800 dark:text-gray-200' },
  { regex: /\bbg-gray-200\b/g, replacement: 'bg-gray-200 dark:bg-gray-700' },
  { regex: /\btext-gray-700\b/g, replacement: 'text-gray-700 dark:text-gray-300' },
  { regex: /\btext-gray-400\b/g, replacement: 'text-gray-400 dark:text-gray-500' },
];

replacements.forEach(({ regex, replacement }) => {
  content = content.replace(regex, (match, offset, string) => {
    const nextChars = string.substring(offset + match.length, offset + match.length + 15);
    if (nextChars.includes('dark:')) {
      return match;
    }
    return replacement;
  });
});

fs.writeFileSync(file, content);
console.log('AdminPanel.tsx updated with dark mode classes');
