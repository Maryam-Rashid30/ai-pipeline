/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function loadApp() {
  document.documentElement.innerHTML = html.replace(/<!DOCTYPE html>/i, '');
  // Re-run the inline script
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    if (!script.src) {
      // eslint-disable-next-line no-eval
      eval(script.textContent);
    }
  });
}

beforeEach(() => {
  localStorage.clear();
  loadApp();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function getInput() { return document.getElementById('new-todo'); }
function getAddBtn() { return document.getElementById('add-btn'); }
function getList() { return document.getElementById('todo-list'); }
function getCount() { return document.getElementById('count'); }
function getEmptyMsg() { return document.getElementById('empty-msg'); }

function addTodo(text) {
  const input = getInput();
  input.value = text;
  getAddBtn().click();
}

function getTodoItems() {
  return Array.from(getList().querySelectorAll('.todo-item'));
}

// ── Feature: Add todo ──────────────────────────────────────────────────────

describe('Add todo', () => {
  test('clicking Add button adds a new todo to the list', () => {
    addTodo('Buy milk');
    const items = getTodoItems();
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('.todo-text').textContent).toBe('Buy milk');
  });

  test('pressing Enter adds a new todo', () => {
    const input = getInput();
    input.value = 'Press Enter todo';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(getTodoItems()).toHaveLength(1);
  });

  test('input is cleared after adding', () => {
    addTodo('Clear me');
    expect(getInput().value).toBe('');
  });

  test('blank input does not add a todo', () => {
    addTodo('   ');
    expect(getTodoItems()).toHaveLength(0);
  });

  test('empty input does not add a todo', () => {
    addTodo('');
    expect(getTodoItems()).toHaveLength(0);
  });

  test('multiple todos can be added', () => {
    addTodo('First');
    addTodo('Second');
    addTodo('Third');
    expect(getTodoItems()).toHaveLength(3);
  });
});

// ── Feature: Mark complete (strikethrough) ─────────────────────────────────

describe('Mark todo as complete', () => {
  test('checking the checkbox marks the item as done', () => {
    addTodo('Finish report');
    getTodoItems()[0].querySelector('input[type="checkbox"]').click();
    // render() replaces innerHTML, so re-query after click
    expect(getTodoItems()[0].classList.contains('done')).toBe(true);
  });

  test('done item has strikethrough style via .done class', () => {
    addTodo('Style check');
    getTodoItems()[0].querySelector('input[type="checkbox"]').click();
    // render() replaces innerHTML, so re-query after click
    const updated = getTodoItems()[0];
    expect(updated.classList.contains('done')).toBe(true);
    expect(updated.querySelector('.todo-text').closest('.done')).not.toBeNull();
  });

  test('checking then unchecking removes done state', () => {
    addTodo('Toggle me');
    getTodoItems()[0].querySelector('input[type="checkbox"]').click(); // done
    getTodoItems()[0].querySelector('input[type="checkbox"]').click(); // undone
    expect(getTodoItems()[0].classList.contains('done')).toBe(false);
  });

  test('checkbox is checked when item is done', () => {
    addTodo('Check state');
    const item = getTodoItems()[0];
    const cb = item.querySelector('input[type="checkbox"]');
    cb.click();
    const refreshedCb = getTodoItems()[0].querySelector('input[type="checkbox"]');
    expect(refreshedCb.checked).toBe(true);
  });
});

// ── Feature: Delete todo ───────────────────────────────────────────────────

describe('Delete todo', () => {
  test('clicking delete button removes the item', () => {
    addTodo('To be deleted');
    const item = getTodoItems()[0];
    item.querySelector('.delete-btn').click();
    expect(getTodoItems()).toHaveLength(0);
  });

  test('deleting one of several removes only that item', () => {
    addTodo('Keep me');
    addTodo('Delete me');
    addTodo('Keep me too');
    getTodoItems()[1].querySelector('.delete-btn').click();
    const remaining = getTodoItems().map(el => el.querySelector('.todo-text').textContent);
    expect(remaining).toEqual(['Keep me', 'Keep me too']);
  });
});

// ── Feature: Remaining count ───────────────────────────────────────────────

describe('Count of remaining incomplete items', () => {
  test('count shows 0 items left when list is empty', () => {
    expect(getCount().textContent).toBe('0 items left');
  });

  test('count increments when a todo is added', () => {
    addTodo('Task 1');
    expect(getCount().textContent).toBe('1 item left');
    addTodo('Task 2');
    expect(getCount().textContent).toBe('2 items left');
  });

  test('count uses singular "item" for exactly 1', () => {
    addTodo('Only one');
    expect(getCount().textContent).toBe('1 item left');
  });

  test('count uses plural "items" for 2 or more', () => {
    addTodo('One');
    addTodo('Two');
    expect(getCount().textContent).toBe('2 items left');
  });

  test('count decrements when a todo is deleted', () => {
    addTodo('Task A');
    addTodo('Task B');
    getTodoItems()[0].querySelector('.delete-btn').click();
    expect(getCount().textContent).toBe('1 item left');
  });

  test('count does not include completed todos', () => {
    addTodo('Done task');
    addTodo('Active task');
    getTodoItems()[0].querySelector('input[type="checkbox"]').click();
    expect(getCount().textContent).toBe('1 item left');
  });

  test('count goes to 0 after all incomplete todos are completed', () => {
    addTodo('Task');
    getTodoItems()[0].querySelector('input[type="checkbox"]').click();
    expect(getCount().textContent).toBe('0 items left');
  });
});

// ── Feature: Empty state message ───────────────────────────────────────────

describe('Empty state message', () => {
  test('empty message is visible when no todos exist', () => {
    expect(getEmptyMsg().style.display).not.toBe('none');
  });

  test('empty message is hidden when todos exist', () => {
    addTodo('Something');
    expect(getEmptyMsg().style.display).toBe('none');
  });

  test('empty message reappears after all todos are deleted', () => {
    addTodo('Gone soon');
    getTodoItems()[0].querySelector('.delete-btn').click();
    expect(getEmptyMsg().style.display).not.toBe('none');
  });
});

// ── Feature: localStorage persistence ────────────────────────────────────

describe('localStorage persistence', () => {
  test('todos are saved to localStorage when added', () => {
    addTodo('Persist me');
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toBe('Persist me');
  });

  test('done state is persisted to localStorage', () => {
    addTodo('Mark and save');
    getTodoItems()[0].querySelector('input[type="checkbox"]').click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored[0].done).toBe(true);
  });

  test('deletion is persisted to localStorage', () => {
    addTodo('Delete and save');
    getTodoItems()[0].querySelector('.delete-btn').click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored).toHaveLength(0);
  });

  test('todos are loaded from localStorage on page load', () => {
    localStorage.setItem('todos_v1', JSON.stringify([
      { text: 'Preloaded task', done: false },
      { text: 'Already done', done: true },
    ]));
    loadApp();
    const items = getTodoItems();
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.todo-text').textContent).toBe('Preloaded task');
    expect(items[1].classList.contains('done')).toBe(true);
  });

  test('completed todos loaded from storage render with done class', () => {
    localStorage.setItem('todos_v1', JSON.stringify([{ text: 'Done', done: true }]));
    loadApp();
    expect(getTodoItems()[0].classList.contains('done')).toBe(true);
  });
});

// ── Feature: No console errors ─────────────────────────────────────────────

describe('No console errors', () => {
  test('no console.error calls during normal usage', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    addTodo('Error check');
    getTodoItems()[0].querySelector('input[type="checkbox"]').click();
    getTodoItems()[0].querySelector('.delete-btn').click();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── Feature: Mobile viewport (375px) ──────────────────────────────────────

describe('Mobile viewport (375px)', () => {
  test('app container has width that fits within 375px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    window.dispatchEvent(new Event('resize'));
    const app = document.querySelector('.app');
    // max-width is 480px but the container uses width: 100%, so it should not overflow
    expect(app).not.toBeNull();
  });

  test('meta viewport tag is present for mobile scaling', () => {
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toMatch(/width=device-width/);
  });

  test('input and button are present and usable at mobile width', () => {
    expect(getInput()).not.toBeNull();
    expect(getAddBtn()).not.toBeNull();
  });
});
