/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/i);
const scriptContent = scriptMatch ? scriptMatch[1] : '';

const bodyMatch = htmlContent.match(/<body>([\s\S]*)<\/body>/i);
const rawBodyHTML = bodyMatch ? bodyMatch[1] : '';
const bodyHTML = rawBodyHTML.replace(/<script[\s\S]*?<\/script>/gi, '');

const headMatch = htmlContent.match(/<head>([\s\S]*?)<\/head>/i);
const headHTML = headMatch ? headMatch[1] : '';

function setupDOM() {
  document.head.innerHTML = headHTML;
  document.body.innerHTML = bodyHTML;
}

function runScript() {
  // eslint-disable-next-line no-eval
  eval(scriptContent);
}

function loadApp() {
  localStorage.clear();
  setupDOM();
  runScript();
}

function addTodo(text) {
  document.getElementById('new-todo').value = text;
  document.getElementById('add-btn').click();
}

const getItems = () => Array.from(document.querySelectorAll('.todo-item'));
const $ = (id) => document.getElementById(id);

let consoleErrorSpy;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  loadApp();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('Initial state', () => {
  test('shows "0 items left" on fresh load', () => {
    expect($('count').textContent).toBe('0 items left');
  });

  test('todo list is empty on fresh load', () => {
    expect(getItems()).toHaveLength(0);
  });

  test('empty-state message is visible on fresh load', () => {
    expect($('empty-msg').style.display).not.toBe('none');
  });

  test('input field starts empty', () => {
    expect($('new-todo').value).toBe('');
  });
});

// ─── Feature: Add a new todo via text input and button ───────────────────────

describe('Add a new todo item via text input and button', () => {
  test('adds a todo when the Add button is clicked', () => {
    addTodo('Buy groceries');
    expect(getItems()).toHaveLength(1);
    expect(getItems()[0].querySelector('.todo-text').textContent).toBe('Buy groceries');
  });

  test('adds a todo when Enter is pressed in the input', () => {
    $('new-todo').value = 'Walk the dog';
    $('new-todo').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(getItems()).toHaveLength(1);
    expect(getItems()[0].querySelector('.todo-text').textContent).toBe('Walk the dog');
  });

  test('clears the input field after a todo is added', () => {
    addTodo('Clean the house');
    expect($('new-todo').value).toBe('');
  });

  test('does not add a todo when input is empty', () => {
    addTodo('');
    expect(getItems()).toHaveLength(0);
  });

  test('does not add a todo when input is whitespace only', () => {
    addTodo('   ');
    expect(getItems()).toHaveLength(0);
  });

  test('can add multiple todos sequentially', () => {
    addTodo('First');
    addTodo('Second');
    addTodo('Third');
    expect(getItems()).toHaveLength(3);
    const texts = getItems().map((el) => el.querySelector('.todo-text').textContent);
    expect(texts).toEqual(['First', 'Second', 'Third']);
  });

  test('hides empty-state message after first todo is added', () => {
    addTodo('Something');
    expect($('empty-msg').style.display).toBe('none');
  });

  test('new todo starts as incomplete (no done class)', () => {
    addTodo('Fresh todo');
    expect(getItems()[0].classList.contains('done')).toBe(false);
  });

  test('new todo checkbox starts unchecked', () => {
    addTodo('Unchecked');
    expect(getItems()[0].querySelector('input[type="checkbox"]').checked).toBe(false);
  });
});

// ─── Feature: Mark a todo as complete with strikethrough ─────────────────────

describe('Mark a todo as complete with a strikethrough', () => {
  test('clicking the checkbox adds the "done" class to the item', () => {
    addTodo('Finish report');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    expect(getItems()[0].classList.contains('done')).toBe(true);
  });

  test('checkbox reflects checked state after marking complete', () => {
    addTodo('Check me');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    expect(getItems()[0].querySelector('input[type="checkbox"]').checked).toBe(true);
  });

  test('clicking the checkbox again toggles the todo back to incomplete', () => {
    addTodo('Toggle me');
    getItems()[0].querySelector('input[type="checkbox"]').click(); // complete
    getItems()[0].querySelector('input[type="checkbox"]').click(); // undo
    expect(getItems()[0].classList.contains('done')).toBe(false);
    expect(getItems()[0].querySelector('input[type="checkbox"]').checked).toBe(false);
  });

  test('.done class is applied to the list item (enables strikethrough via CSS)', () => {
    addTodo('Style check');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    const item = getItems()[0];
    expect(item.classList.contains('done')).toBe(true);
    expect(item.querySelector('.todo-text')).not.toBeNull();
  });

  test('only the clicked item is marked done when multiple todos exist', () => {
    addTodo('Alpha');
    addTodo('Beta');
    addTodo('Gamma');
    getItems()[1].querySelector('input[type="checkbox"]').click();
    expect(getItems()[0].classList.contains('done')).toBe(false);
    expect(getItems()[1].classList.contains('done')).toBe(true);
    expect(getItems()[2].classList.contains('done')).toBe(false);
  });
});

// ─── Feature: Delete a todo item ─────────────────────────────────────────────

describe('Delete a todo item', () => {
  test('clicking the delete button removes the todo from the list', () => {
    addTodo('Delete me');
    getItems()[0].querySelector('.delete-btn').click();
    expect(getItems()).toHaveLength(0);
  });

  test('removes the correct todo when multiple exist', () => {
    addTodo('Keep A');
    addTodo('Remove B');
    addTodo('Keep C');
    getItems()[1].querySelector('.delete-btn').click();
    const texts = getItems().map((el) => el.querySelector('.todo-text').textContent);
    expect(texts).toEqual(['Keep A', 'Keep C']);
  });

  test('list is empty after deleting the only todo', () => {
    addTodo('Solo');
    getItems()[0].querySelector('.delete-btn').click();
    expect(getItems()).toHaveLength(0);
  });

  test('shows empty-state message after the last todo is deleted', () => {
    addTodo('Last one');
    getItems()[0].querySelector('.delete-btn').click();
    expect($('empty-msg').style.display).not.toBe('none');
  });

  test('count resets to "0 items left" after all todos are deleted', () => {
    addTodo('One');
    addTodo('Two');
    getItems()[0].querySelector('.delete-btn').click();
    getItems()[0].querySelector('.delete-btn').click();
    expect($('count').textContent).toBe('0 items left');
  });
});

// ─── Feature: Count of remaining incomplete items ────────────────────────────

describe('Show a count of remaining incomplete items', () => {
  test('shows "0 items left" on fresh load', () => {
    expect($('count').textContent).toBe('0 items left');
  });

  test('shows "1 item left" after adding one todo', () => {
    addTodo('Solo');
    expect($('count').textContent).toBe('1 item left');
  });

  test('uses singular "item" (not "items") for a count of 1', () => {
    addTodo('Solo');
    expect($('count').textContent).toBe('1 item left');
  });

  test('uses plural "items" when count is greater than 1', () => {
    addTodo('First');
    addTodo('Second');
    expect($('count').textContent).toBe('2 items left');
  });

  test('count decrements when a todo is marked complete', () => {
    addTodo('One');
    addTodo('Two');
    addTodo('Three');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    expect($('count').textContent).toBe('2 items left');
  });

  test('completed todos are excluded from the remaining count', () => {
    addTodo('One');
    addTodo('Two');
    addTodo('Three');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    getItems()[1].querySelector('input[type="checkbox"]').click();
    expect($('count').textContent).toBe('1 item left');
  });

  test('count goes to "0 items left" after all todos are completed', () => {
    addTodo('One');
    addTodo('Two');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    getItems()[1].querySelector('input[type="checkbox"]').click();
    expect($('count').textContent).toBe('0 items left');
  });

  test('count decrements when a todo is deleted', () => {
    addTodo('One');
    addTodo('Two');
    getItems()[0].querySelector('.delete-btn').click();
    expect($('count').textContent).toBe('1 item left');
  });

  test('completed todos do not contribute to count even after adding more', () => {
    addTodo('Done item');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    addTodo('Active item');
    expect($('count').textContent).toBe('1 item left');
  });
});

// ─── Feature: Persist todos in localStorage ──────────────────────────────────

describe('Persist todos in localStorage', () => {
  test('saves a new todo to localStorage', () => {
    addTodo('Remember this');
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toBe('Remember this');
    expect(stored[0].done).toBe(false);
  });

  test('saves the completed state to localStorage', () => {
    addTodo('Complete me');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored[0].done).toBe(true);
  });

  test('reflects deletion in localStorage', () => {
    addTodo('Delete me');
    getItems()[0].querySelector('.delete-btn').click();
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored).toHaveLength(0);
  });

  test('loads persisted todos from localStorage on startup', () => {
    setupDOM();
    localStorage.setItem(
      'todos_v1',
      JSON.stringify([
        { text: 'Persisted todo', done: false },
        { text: 'Done todo', done: true },
      ])
    );
    runScript();

    expect(getItems()).toHaveLength(2);
    expect(getItems()[0].querySelector('.todo-text').textContent).toBe('Persisted todo');
    expect(getItems()[1].querySelector('.todo-text').textContent).toBe('Done todo');
    expect(getItems()[1].classList.contains('done')).toBe(true);
  });

  test('count is correct after loading todos from localStorage', () => {
    setupDOM();
    localStorage.setItem(
      'todos_v1',
      JSON.stringify([
        { text: 'Active', done: false },
        { text: 'Done', done: true },
      ])
    );
    runScript();
    expect($('count').textContent).toBe('1 item left');
  });

  test('empty-msg is hidden when todos are loaded from localStorage', () => {
    setupDOM();
    localStorage.setItem('todos_v1', JSON.stringify([{ text: 'Stored task', done: false }]));
    runScript();
    expect($('empty-msg').style.display).toBe('none');
  });

  test('saves multiple todos to localStorage correctly', () => {
    addTodo('Alpha');
    addTodo('Beta');
    addTodo('Gamma');
    const stored = JSON.parse(localStorage.getItem('todos_v1'));
    expect(stored).toHaveLength(3);
    expect(stored.map((t) => t.text)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});

// ─── No console errors ───────────────────────────────────────────────────────

describe('No console errors during normal usage', () => {
  test('no console.error on a full add → complete → delete flow', () => {
    addTodo('Test task');
    getItems()[0].querySelector('input[type="checkbox"]').click();
    getItems()[0].querySelector('.delete-btn').click();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('no console.error on Enter key submit', () => {
    $('new-todo').value = 'Enter task';
    $('new-todo').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('no console.error when loading from localStorage', () => {
    setupDOM();
    localStorage.setItem('todos_v1', JSON.stringify([{ text: 'Stored', done: false }]));
    runScript();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('no console.error when submitting an empty input', () => {
    addTodo('');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

// ─── Mobile compatibility (375px wide) ──────────────────────────────────────

describe('Page works on mobile (375px wide)', () => {
  test('viewport meta tag is present with width=device-width', () => {
    const vp = document.querySelector('meta[name="viewport"]');
    expect(vp).not.toBeNull();
    expect(vp.getAttribute('content')).toContain('width=device-width');
  });

  test('app container element exists in DOM', () => {
    expect(document.querySelector('.app')).not.toBeNull();
  });

  test('text input is present and interactive', () => {
    const input = $('new-todo');
    expect(input).not.toBeNull();
    expect(input.tagName).toBe('INPUT');
  });

  test('Add button is present and interactive', () => {
    const btn = $('add-btn');
    expect(btn).not.toBeNull();
    expect(btn.tagName).toBe('BUTTON');
  });

  test('todo list container is present in DOM', () => {
    expect($('todo-list')).not.toBeNull();
  });

  test('count element is present and shows remaining items', () => {
    const count = $('count');
    expect(count).not.toBeNull();
    expect(count.textContent).toMatch(/items? left/);
  });

  test('app renders and functions correctly at 375px window width', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      writable: true,
      configurable: true,
    });
    addTodo('Mobile task');
    expect(getItems()).toHaveLength(1);
    expect(getItems()[0].querySelector('.todo-text').textContent).toBe('Mobile task');
  });
});
