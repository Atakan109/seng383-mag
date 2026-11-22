import { useEffect, useState } from 'react';
import { getChildTasks, markTaskDone } from '../api.js';
import { statusLabel, taskErrorMessage } from '../taskStatus.js';

// The child's own task list (FR-M4-03). The child can mark a pending task
// as done (FR-M4-04). token and childId come from the logged-in child.
function ChildTasksPage({ token, childId }) {
  const [tasks, setTasks] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let ignore = false;

    getChildTasks(token, childId)
      .then((data) => {
        if (!ignore) {
          setTasks(data);
          setLoadState('ready');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setLoadError(taskErrorMessage(error, 'Görevler yüklenemedi.'));
          setLoadState('error');
        }
      });

    return () => {
      ignore = true;
    };
  }, [token, childId]);

  async function handleMarkDone(taskId) {
    setSavingId(taskId);
    setSaveError('');
    try {
      const updated = await markTaskDone(token, childId, taskId);
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
    } catch (error) {
      setSaveError(taskErrorMessage(error, 'Görev güncellenemedi. Lütfen tekrar dene.'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main>
      <h1>Görevlerim</h1>
      {loadState === 'loading' && <p>Yükleniyor...</p>}
      {loadState === 'error' && <p role="alert">{loadError}</p>}
      {loadState === 'ready' && tasks.length === 0 && <p>Henüz görevin yok.</p>}
      {saveError && <p role="alert">{saveError}</p>}
      {loadState === 'ready' && tasks.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Açıklama</th>
              <th>Gelişim alanı</th>
              <th>Bitiş tarihi</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.description}</td>
                <td>{task.developmentArea}</td>
                <td>{task.dueDate}</td>
                <td>
                  {task.status === 'done' ? (
                    statusLabel(task.status)
                  ) : (
                    <>
                      {statusLabel(task.status)}{' '}
                      <button
                        type="button"
                        onClick={() => handleMarkDone(task.id)}
                        disabled={savingId !== null}
                        aria-label={`${task.title} görevini tamamlandı olarak işaretle`}
                      >
                        {savingId === task.id ? 'Kaydediliyor...' : 'Tamamlandı olarak işaretle'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default ChildTasksPage;
