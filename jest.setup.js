import '@testing-library/jest-dom';

// Мокаем localStorage для тестов
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    removeItem: function(key) {
      delete store[key];
    },
    clear: function() {
      store = {};
    },
    length: 0,
    key: function(i) { return Object.keys(store)[i] || null; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Мокаем requestAnimationFrame
window.requestAnimationFrame = function(callback) {
  return setTimeout(callback, 0);
};

window.cancelAnimationFrame = function(id) {
  clearTimeout(id);
};

// Подавляем ошибки консоли в тестах
console.error = jest.fn();
console.warn = jest.fn();
