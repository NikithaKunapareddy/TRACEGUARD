const BASE_URL = '/';

export async function fetchTasks(): Promise<any> {
  return fetch('/tasks');
}

export async function deleteTask(id: number): Promise<any> {
  return fetch('/tasks/' + id, { method: 'DELETE' });
}
