import { useState } from 'react';
import { assignTask } from '../api.js';
import { taskErrorMessage } from '../taskStatus.js';

const EMPTY_FORM = { title: '', description: '', developmentArea: '', dueDate: '' };

// Form for a parent or a linked specialist to assign a task to a child (FR-M4-01).
// Title, development area and due date are required (FR-M4-02).
// onAssigned is called with the new task after the backend saves it.
function AssignTaskForm({ token, childId, onAssigned }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const task = {
      title: form.title.trim(),
      description: form.description.trim(),
      developmentArea: form.developmentArea.trim(),
      dueDate: form.dueDate,
    };
    if (!task.title || !task.developmentArea || !task.dueDate) {
      setError('Başlık, gelişim alanı ve bitiş tarihi zorunludur.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await assignTask(token, childId, task);
      setForm(EMPTY_FORM);
      setSuccess('Görev atandı.');
      onAssigned?.(created);
    } catch (requestError) {
      setError(taskErrorMessage(requestError, 'Görev atanamadı. Lütfen alanları kontrol edip tekrar dene.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>Görev ata</h2>
      <p>
        <label htmlFor="task-title">Başlık</label>
        <input id="task-title" name="title" value={form.title} onChange={handleChange} required />
      </p>
      <p>
        <label htmlFor="task-description">Açıklama</label>
        <textarea
          id="task-description"
          name="description"
          value={form.description}
          onChange={handleChange}
        />
      </p>
      <p>
        <label htmlFor="task-area">Gelişim alanı</label>
        <input
          id="task-area"
          name="developmentArea"
          value={form.developmentArea}
          onChange={handleChange}
          required
        />
      </p>
      <p>
        <label htmlFor="task-due-date">Bitiş tarihi</label>
        <input
          id="task-due-date"
          name="dueDate"
          type="date"
          value={form.dueDate}
          onChange={handleChange}
          required
        />
      </p>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Kaydediliyor...' : 'Görevi ata'}
      </button>
    </form>
  );
}

export default AssignTaskForm;
