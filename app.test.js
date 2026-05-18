/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

function loadApp() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  document.open();
  document.write(html);
  document.close();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.innerHTML = '';
  loadApp();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function getInput()    { return document.getElementById('new-todo'); }
function getAddBtn()   { return document.getElementById('add-btn'); }
function getList()     { return document.getElementById('todo-list'); }
function getCount()    { return document.getElementById('count'); }
function getEmptyMsg() { return document.getElementById('empty-msg'); }

function addTodo(text) {
  const input = getInput();
  const btn   = getAddBtn();
  input.value = text;
  btn.click();
}

// ─── DOM structure ─────────────────────────────────────────────────────────

describe('DOM structure', () => {
  test('renders text input for new todo', () => {
    expect(getInput()).not.toBeNull();
    expect(getInput().type).toBe('text');
  });

  test('renders Add button', () => {
    expect(getAddBtn()).not.toBeNull();
  });

  test('renders todo list element', () => {
    expect(getList()).not.toBeNull();
  });

  test('renders item count element', () => {
    expect(getCount()).not.toBeNull();
  });
});

// ─── Adding todos ──────────────────────────────────────────────────────────

describe('Adding a todo', () => {
  test('adds a todo item to the list when Add is clicked', () => {
    addTodo('Buy milk');
    expect(getList().querySelectorAll('li').length).toBe(1);
    expect(getList().textContent).toContain('Buy milk');
  });

  test('clears the input after adding', () => {
    addTodo('Buy milk');
    expect(getInput().value).toBe('');
  });

  test('adds a todo when Enter key is pressed', () => {
    const input = getInput();
    input.value = 'Press Enter todo';
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    input.dispatchEvent(event);
    expect(getList().querySelectorAll('li').length).toBe(1);
    expect(getList().textContent).toContain('Press Enter todo');
  });

  test('does not add empty or whitespace-only todos', () => {
    addTodo('   ');
    addTodo('');
    expect(getList().querySelectorAll('li').length).toBe(0);
  });

  test('multiple todos can be added', () => {
    addTodo('First');
    addTodo('Second');
    addTodo('Third');
    expect(getList().querySelectorAll('li').length).toBe(3);
  });
});

// ─── Marking complete (strikethrough) ──────────────────────────────────────

describe('Marking a todo as complete', () => {
  test('checking the checkbox marks the item as done', () => {
    addTodo('Test todo');
    const checkbox = getList().querySelector('input[type="checkbox"]');
    checkbox.click();
    const li = getList().querySelector('li');
    expect(li.classList.contains('done')).toBe(true);
  });

  test('done item has strikethrough on text (via .done class)', () => {
    addTodo('Strike me');
    const checkbox = getList().querySelector('input[type="checkbox"]');
    checkbox.click();
    const li   = getList().querySelector('li');
    const span = getList().querySelector('.todo-text');
    expect(li.classList.contains('done')).toBe(true);
    expect(span).not.toBeNull();
  });

  test('unchecking a done item marks it incomplete again', () => {
    addTodo('Toggle me');
    getList().querySelector('input[type="checkbox"]').click(); // mark done, DOM rebuilds
    getList().querySelector('input[type="checkbox"]').click(); // re-query, mark undone
    const li = getList().querySelector('li');
    expect(li.classList.contains('done')).toBe(false);
  });
});

// ─── Deleting todos ────────────────────────────────────────────────────────

describe('Deleting a todo', () => {
  test('clicking delete removes the item from the list', () => {
    addTodo('Delete me');
    const del = getList().querySelector('.delete-btn');
    del.click();
    expect(getList().querySelectorAll('li').length).toBe(0);
  });

  test('only the correct item is deleted when multiple todos exist', () => {
    addTodo('Keep me');
    addTodo('Delete me');
    const deleteButtons = getList().querySelectorAll('.delete-btn');
    deleteButtons[1].click();
    const items = getList().querySelectorAll('li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Keep me');
  });
});

// ─── Item count ────────────────────────────────────────────────────────────

describe('Remaining item count', () => {
  test('shows 0 items left on initial load', () => {
    expect(getCount().textContent).toMatch(/0 items left/i);
  });

  test('increments count when a todo is added', () => {
    addTodo('One');
    expect(getCount().textContent).toContain('1');
  });

  test('uses singular "item" for exactly one remaining', () => {
    addTodo('Only one');
    expect(getCount().textContent).toMatch(/1 item left/i);
  });

  test('uses plural "items" for more than one remaining', () => {
    addTodo('First');
    addTodo('Second');
    expect(getCount().textContent).toMatch(/2 items left/i);
  });

  test('count decreases when a todo is marked done', () => {
    addTodo('Task');
    const checkbox = getList().querySelector('input[type="checkbox"]');
    checkbox.click();
    expect(getCount().textContent).toMatch(/0 items left/i);
  });

  test('count increases again when a done todo is unchecked', () => {
    addTodo('Task');
    getList().querySelector('input[type="checkbox"]').click(); // mark done, DOM rebuilds
    getList().querySelector('input[type="checkbox"]').click(); // re-query, mark undone
    expect(getCount().textContent).toMatch(/1 item left/i);
  });

  test('count decreases when a todo is deleted', () => {
    addTodo('Delete me');
    const del = getList().querySelector('.delete-btn');
    del.click();
    expect(getCount().textContent).toMatch(/0 items left/i);
  });

  test('completed todos are excluded from count', () => {
    addTodo('Done');
    addTodo('Not done');
    const checkboxes = getList().querySelectorAll('input[type="checkbox"]');
    checkboxes[0].click();
    expect(getCount().textContent).toMatch(/1 item left/i);
  });
});

// ─── Empty message ─────────────────────────────────────────────────────────

describe('Empty state message', () => {
  test('empty message is visible when there are no todos', () => {
    const msg = getEmptyMsg();
    expect(msg.style.display).not.toBe('none');
  });

  test('empty message is hidden when todos exist', () => {
    addTodo('Something');
    const msg = getEmptyMsg();
    expect(msg.style.display).toBe('none');
  });

  test('empty message reappears after all todos are deleted', () => {
    addTodo('Temp');
    getList().querySelector('.delete-btn').click();
    const msg = getEmptyMsg();
    expect(msg.style.display).not.toBe('none');
  });
});

// ─── localStorage persistence ──────────────────────────────────────────────

describe('localStorage persistence', () => {
  test('saves todos to localStorage when added', () => {
    addTodo('Persist me');
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored).not.toBeNull();
    expect(stored.length).toBe(1);
    expect(stored[0].text).toBe('Persist me');
  });

  test('saves done state to localStorage', () => {
    addTodo('Done task');
    const checkbox = getList().querySelector('input[type="checkbox"]');
    checkbox.click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored[0].done).toBe(true);
  });

  test('removes todo from localStorage when deleted', () => {
    addTodo('Gone');
    getList().querySelector('.delete-btn').click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored.length).toBe(0);
  });

  test('loads persisted todos on page load', () => {
    localStorage.setItem('todos_v1', JSON.stringify([
      { text: 'Loaded todo', done: false }
    ]));
    document.documentElement.innerHTML = '';
    loadApp();
    expect(getList().textContent).toContain('Loaded todo');
  });

  test('loads persisted done state on page load', () => {
    localStorage.setItem('todos_v1', JSON.stringify([
      { text: 'Was done', done: true }
    ]));
    document.documentElement.innerHTML = '';
    loadApp();
    const li = getList().querySelector('li');
    expect(li.classList.contains('done')).toBe(true);
  });

  test('handles corrupt localStorage gracefully without throwing', () => {
    localStorage.setItem('todos_v1', 'NOT_JSON{{{');
    expect(() => {
      document.documentElement.innerHTML = '';
      loadApp();
    }).not.toThrow();
    expect(getList().querySelectorAll('li').length).toBe(0);
  });
});

// ─── Mobile viewport (375px) ───────────────────────────────────────────────

describe('Mobile viewport (375px)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    window.dispatchEvent(new Event('resize'));
  });

  test('input and add button are present at 375px width', () => {
    expect(getInput()).not.toBeNull();
    expect(getAddBtn()).not.toBeNull();
  });

  test('app container exists and is visible at 375px', () => {
    const app = document.querySelector('.app');
    expect(app).not.toBeNull();
  });

  test('todos can still be added at mobile width', () => {
    addTodo('Mobile todo');
    expect(getList().querySelectorAll('li').length).toBe(1);
  });

  test('viewport meta tag is set for mobile', () => {
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toContain('width=device-width');
  });
});

// ─── No console errors ─────────────────────────────────────────────────────

describe('No console errors', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('no console errors on initial page load', () => {
    document.documentElement.innerHTML = '';
    loadApp();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('no console errors when adding a todo', () => {
    addTodo('Error-free todo');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('no console errors when toggling a todo', () => {
    addTodo('Toggle me');
    getList().querySelector('input[type="checkbox"]').click();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('no console errors when deleting a todo', () => {
    addTodo('Delete me');
    getList().querySelector('.delete-btn').click();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
