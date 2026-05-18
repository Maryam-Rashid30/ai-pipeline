/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

function loadApp() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  document.documentElement.innerHTML = html;

  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    if (script.textContent) {
      // eslint-disable-next-line no-new-func
      new Function(script.textContent)();
    }
  });
}

beforeEach(() => {
  localStorage.clear();
  loadApp();
});

const getInput = () => document.getElementById('new-todo');
const getAddBtn = () => document.getElementById('add-btn');
const getTodoList = () => document.getElementById('todo-list');
const getCount = () => document.getElementById('count');
const getEmptyMsg = () => document.getElementById('empty-msg');

function addTodoItem(text) {
  const input = getInput();
  const btn = getAddBtn();
  input.value = text;
  btn.click();
}

// ── Add todo ─────────────────────────────────────────────────────────────────

describe('Add todo', () => {
  test('clicking Add button adds a new todo item to the list', () => {
    addTodoItem('Buy groceries');
    const items = getTodoList().querySelectorAll('.todo-item');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Buy groceries');
  });

  test('pressing Enter in the input adds a new todo item', () => {
    const input = getInput();
    input.value = 'Press enter todo';
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    input.dispatchEvent(event);
    const items = getTodoList().querySelectorAll('.todo-item');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Press enter todo');
  });

  test('input is cleared after adding a todo', () => {
    addTodoItem('Clear me');
    expect(getInput().value).toBe('');
  });

  test('whitespace-only input does not add a todo', () => {
    addTodoItem('   ');
    expect(getTodoList().querySelectorAll('.todo-item')).toHaveLength(0);
  });

  test('empty input does not add a todo', () => {
    getAddBtn().click();
    expect(getTodoList().querySelectorAll('.todo-item')).toHaveLength(0);
  });

  test('multiple todos can be added', () => {
    addTodoItem('First');
    addTodoItem('Second');
    addTodoItem('Third');
    expect(getTodoList().querySelectorAll('.todo-item')).toHaveLength(3);
  });
});

// ── Mark complete / strikethrough ─────────────────────────────────────────────

describe('Mark todo as complete', () => {
  test('checking the checkbox adds the done class for strikethrough', () => {
    addTodoItem('Walk the dog');
    const item = getTodoList().querySelector('.todo-item');
    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.click();
    const updated = getTodoList().querySelector('.todo-item');
    expect(updated.classList.contains('done')).toBe(true);
  });

  test('unchecking a completed todo removes the done class', () => {
    addTodoItem('Toggle me');
    const checkbox = getTodoList().querySelector('input[type="checkbox"]');
    checkbox.click();
    const checkbox2 = getTodoList().querySelector('input[type="checkbox"]');
    checkbox2.click();
    expect(getTodoList().querySelector('.todo-item').classList.contains('done')).toBe(false);
  });

  test('completed checkbox is checked', () => {
    addTodoItem('Check me');
    getTodoList().querySelector('input[type="checkbox"]').click();
    expect(getTodoList().querySelector('input[type="checkbox"]').checked).toBe(true);
  });

  test('todo text element is inside .done item (drives CSS line-through)', () => {
    addTodoItem('Style check');
    getTodoList().querySelector('input[type="checkbox"]').click();
    const doneItem = getTodoList().querySelector('.todo-item.done');
    expect(doneItem).not.toBeNull();
    expect(doneItem.querySelector('.todo-text')).not.toBeNull();
  });
});

// ── Delete todo ───────────────────────────────────────────────────────────────

describe('Delete todo', () => {
  test('clicking delete button removes the todo item', () => {
    addTodoItem('Delete me');
    getTodoList().querySelector('.delete-btn').click();
    expect(getTodoList().querySelectorAll('.todo-item')).toHaveLength(0);
  });

  test('deletes the correct item when multiple todos exist', () => {
    addTodoItem('Keep me');
    addTodoItem('Delete me');
    const deleteBtns = getTodoList().querySelectorAll('.delete-btn');
    deleteBtns[1].click();
    const remaining = getTodoList().querySelectorAll('.todo-item');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].textContent).toContain('Keep me');
  });
});

// ── Remaining item count ──────────────────────────────────────────────────────

describe('Remaining item count', () => {
  test('count shows 0 items left when list is empty', () => {
    expect(getCount().textContent).toBe('0 items left');
  });

  test('count updates when a todo is added', () => {
    addTodoItem('Task one');
    expect(getCount().textContent).toBe('1 item left');
  });

  test('count uses singular "item" for exactly 1 item', () => {
    addTodoItem('Single task');
    expect(getCount().textContent).toBe('1 item left');
  });

  test('count uses plural "items" for 2+ items', () => {
    addTodoItem('Task A');
    addTodoItem('Task B');
    expect(getCount().textContent).toBe('2 items left');
  });

  test('count decreases when an item is marked complete', () => {
    addTodoItem('Task');
    getTodoList().querySelector('input[type="checkbox"]').click();
    expect(getCount().textContent).toBe('0 items left');
  });

  test('count only counts incomplete items', () => {
    addTodoItem('Done task');
    addTodoItem('Pending task');
    getTodoList().querySelector('input[type="checkbox"]').click();
    expect(getCount().textContent).toBe('1 item left');
  });

  test('count decreases when a todo is deleted', () => {
    addTodoItem('Remove me');
    getTodoList().querySelector('.delete-btn').click();
    expect(getCount().textContent).toBe('0 items left');
  });
});

// ── Empty state message ───────────────────────────────────────────────────────

describe('Empty state message', () => {
  test('empty message is visible when no todos exist', () => {
    expect(getEmptyMsg().style.display).not.toBe('none');
  });

  test('empty message is hidden when there is at least one todo', () => {
    addTodoItem('Something');
    expect(getEmptyMsg().style.display).toBe('none');
  });

  test('empty message reappears after all todos are deleted', () => {
    addTodoItem('Temp');
    getTodoList().querySelector('.delete-btn').click();
    expect(getEmptyMsg().style.display).not.toBe('none');
  });
});

// ── localStorage persistence ──────────────────────────────────────────────────

describe('localStorage persistence', () => {
  test('todos are saved to localStorage when added', () => {
    addTodoItem('Persist me');
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored).not.toBeNull();
    expect(stored.length).toBe(1);
    expect(stored[0].text).toBe('Persist me');
    expect(stored[0].done).toBe(false);
  });

  test('done state is persisted to localStorage', () => {
    addTodoItem('Mark done');
    getTodoList().querySelector('input[type="checkbox"]').click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored[0].done).toBe(true);
  });

  test('deletion is reflected in localStorage', () => {
    addTodoItem('Delete me');
    getTodoList().querySelector('.delete-btn').click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored.length).toBe(0);
  });

  test('todos are loaded from localStorage on page load', () => {
    localStorage.setItem('todos_v1', JSON.stringify([
      { text: 'Loaded todo', done: false },
      { text: 'Done todo', done: true }
    ]));
    loadApp();
    const items = getTodoList().querySelectorAll('.todo-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Loaded todo');
    expect(items[1].classList.contains('done')).toBe(true);
  });

  test('loaded done todos show as checked', () => {
    localStorage.setItem('todos_v1', JSON.stringify([
      { text: 'Was done', done: true }
    ]));
    loadApp();
    expect(getTodoList().querySelector('input[type="checkbox"]').checked).toBe(true);
  });
});

// ── No console errors ─────────────────────────────────────────────────────────

describe('No console errors', () => {
  test('no console.error calls during normal usage', () => {
    const spy = jest.spyOn(console, 'error');
    addTodoItem('No error task');
    getTodoList().querySelector('input[type="checkbox"]').click();
    getTodoList().querySelector('.delete-btn').click();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── Mobile viewport (375px) ───────────────────────────────────────────────────

describe('Mobile viewport', () => {
  test('viewport meta tag is set for device width', () => {
    const viewport = document.querySelector('meta[name="viewport"]');
    expect(viewport).not.toBeNull();
    expect(viewport.getAttribute('content')).toContain('width=device-width');
  });

  test('responsive CSS media query targets mobile widths', () => {
    const styleContent = Array.from(document.querySelectorAll('style'))
      .map(s => s.textContent).join('');
    expect(styleContent).toMatch(/@media.*max-width.*400px/);
  });

  test('input and Add button are grouped inside the input-row container', () => {
    const inputRow = document.querySelector('.input-row');
    expect(inputRow).not.toBeNull();
    expect(inputRow.querySelector('#new-todo')).not.toBeNull();
    expect(inputRow.querySelector('#add-btn')).not.toBeNull();
  });

  test('app renders todos correctly regardless of viewport size', () => {
    addTodoItem('Mobile todo');
    expect(getTodoList().querySelectorAll('.todo-item')).toHaveLength(1);
  });
});

// ── DOM structure ─────────────────────────────────────────────────────────────

describe('DOM structure', () => {
  test('page has a text input with id new-todo', () => {
    expect(document.getElementById('new-todo')).not.toBeNull();
  });

  test('page has an Add button with id add-btn', () => {
    expect(document.getElementById('add-btn')).not.toBeNull();
  });

  test('page has a todo list element with id todo-list', () => {
    expect(document.getElementById('todo-list')).not.toBeNull();
  });

  test('page has a count element with id count', () => {
    expect(document.getElementById('count')).not.toBeNull();
  });

  test('each todo item has a checkbox, text span, and delete button', () => {
    addTodoItem('Structured item');
    const item = getTodoList().querySelector('.todo-item');
    expect(item.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(item.querySelector('.todo-text')).not.toBeNull();
    expect(item.querySelector('.delete-btn')).not.toBeNull();
  });
});
