import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AssignTaskForm from './AssignTaskForm.jsx';

const TOKEN = 'test-token';
const CHILD_ID = 7;

const filledForm = {
  Başlık: 'Draw a family picture',
  Açıklama: 'Use at least three colours.',
  'Gelişim alanı': 'Motor',
  'Bitiş tarihi': '2026-11-27',
};

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function fillForm(values) {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Görevi ata' }));
}

describe('AssignTaskForm', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('sends the task to the API and reports the new task (FR-M4-01)', async () => {
    const created = { id: 10, status: 'pending', title: 'Draw a family picture' };
    const fetchMock = vi.fn(() => jsonResponse(created, 201));
    vi.stubGlobal('fetch', fetchMock);
    const onAssigned = vi.fn();

    render(<AssignTaskForm token={TOKEN} childId={CHILD_ID} onAssigned={onAssigned} />);
    fillForm(filledForm);
    submit();

    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Görev atandı.');
    expect(fetchMock).toHaveBeenCalledWith(`/api/children/${CHILD_ID}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Draw a family picture',
        description: 'Use at least three colours.',
        developmentArea: 'Motor',
        dueDate: '2026-11-27',
      }),
    });
    expect(onAssigned).toHaveBeenCalledWith(created);
    expect(screen.getByLabelText('Başlık').value).toBe('');
  });

  test.each(['Başlık', 'Gelişim alanı', 'Bitiş tarihi'])(
    'shows an error and sends nothing when %s is empty (FR-M4-02)',
    (label) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      render(<AssignTaskForm token={TOKEN} childId={CHILD_ID} />);
      fillForm({ ...filledForm, [label]: label === 'Bitiş tarihi' ? '' : '   ' });
      submit();

      expect(screen.getByRole('alert').textContent).toBe(
        'Başlık, gelişim alanı ve bitiş tarihi zorunludur.'
      );
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  test('keeps the values and shows an error when the API rejects the task', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ error: 'Bad request' }, 400)));
    const onAssigned = vi.fn();

    render(<AssignTaskForm token={TOKEN} childId={CHILD_ID} onAssigned={onAssigned} />);
    fillForm(filledForm);
    submit();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Görev atanamadı. Lütfen alanları kontrol edip tekrar dene.'
    );
    expect(screen.getByLabelText('Başlık').value).toBe('Draw a family picture');
    expect(onAssigned).not.toHaveBeenCalled();
  });

  test('tells a specialist who is no longer linked that they have no access', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ error: 'No access' }, 403)));

    render(<AssignTaskForm token={TOKEN} childId={CHILD_ID} />);
    fillForm(filledForm);
    submit();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Bu çocuğun görevlerine erişim iznin yok.'
    );
  });

  test('disables the button while the task is being saved', async () => {
    let finish;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            finish = () => resolve(jsonResponse({ id: 1 }, 201));
          })
      )
    );

    render(<AssignTaskForm token={TOKEN} childId={CHILD_ID} />);
    fillForm(filledForm);
    submit();

    const button = await screen.findByRole('button', { name: 'Kaydediliyor...' });
    expect(button.disabled).toBe(true);

    finish();
    expect(await screen.findByRole('button', { name: 'Görevi ata' })).toBeTruthy();
  });
});
