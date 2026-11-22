// Error for a failed API call. status is the HTTP status code (0 if there was no answer).
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Calls the backend API with the login token and returns the JSON answer.
// Throws ApiError when the request fails or the answer is not 2xx.
export async function apiRequest(path, { token, method = 'GET', body } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Network error');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

export function getChildTasks(token, childId) {
  return apiRequest(`/children/${childId}/tasks`, { token });
}

export function markTaskDone(token, childId, taskId) {
  return apiRequest(`/children/${childId}/tasks/${taskId}`, {
    token,
    method: 'PATCH',
    body: { status: 'done' },
  });
}
