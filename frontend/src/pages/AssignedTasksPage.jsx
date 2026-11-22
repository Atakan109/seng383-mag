import { useEffect, useState } from 'react';
import { getChildTasks } from '../api.js';
import { statusLabel, taskErrorMessage } from '../taskStatus.js';
import AssignTaskForm from '../components/AssignTaskForm.jsx';

// Page for a parent or a linked specialist: assign a task to the child (FR-M4-01)
// and follow the status of the tasks they assigned (FR-M4-05).
// token, childId and userId come from the logged-in user and the selected child.
function AssignedTasksPage({ token, childId, userId }) {
  const [tasks, setTasks] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState('');

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

  const myTasks = tasks.filter((task) => task.assignedBy?.id === userId);

  function handleAssigned(task) {
    setTasks((current) => [...current, task]);
  }

  return (
    <main>
      <h1>Görevler</h1>
      <AssignTaskForm token={token} childId={childId} onAssigned={handleAssigned} />

      <h2>Atadığım görevler</h2>
      {loadState === 'loading' && <p>Yükleniyor...</p>}
      {loadState === 'error' && <p role="alert">{loadError}</p>}
      {loadState === 'ready' && myTasks.length === 0 && <p>Henüz görev atamadın.</p>}
      {loadState === 'ready' && myTasks.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Gelişim alanı</th>
              <th>Bitiş tarihi</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {myTasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.developmentArea}</td>
                <td>{task.dueDate}</td>
                <td>{statusLabel(task.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default AssignedTasksPage;
