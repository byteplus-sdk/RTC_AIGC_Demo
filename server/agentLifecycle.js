const STOP_ACTIONS = {
  StartVoiceChat: 'StopVoiceChat',
  StartVoiceChatWithRealtimeAPI: 'StopVoiceChatWithRealtimeAPI',
};

function createAgentLifecycle(invoke) {
  const active = new Map();
  const pending = new Set();
  const queues = new Map();
  let closing = false;
  let shutdown;

  async function stopTask(key, task) {
    const response = await invoke(task.action, task.body);
    if (response?.ResponseMetadata?.Error) throw new Error('Agent stop was rejected');
    active.delete(key);
  }

  function request(action, body) {
    if (closing) {
      return Promise.reject(Object.assign(new Error('The server is shutting down'), { status: 503 }));
    }
    const { AppId, RoomId, TaskId } = body || {};
    const key = AppId && RoomId && TaskId ? JSON.stringify([AppId, RoomId, TaskId]) : undefined;
    const previous = key && queues.get(key);
    const operation = (async () => {
      if (previous) await previous.catch(() => {});
      let response;
      try {
        response = await invoke(action, body);
      } catch (error) {
        if (key && Object.hasOwn(STOP_ACTIONS, action)) {
          const task = { action: STOP_ACTIONS[action], body: { AppId, RoomId, TaskId } };
          active.set(key, task);
          await stopTask(key, task).catch(() => {});
        }
        throw error;
      }
      if (key && !response?.ResponseMetadata?.Error) {
        if (Object.hasOwn(STOP_ACTIONS, action)) {
          active.set(key, { action: STOP_ACTIONS[action], body: { AppId, RoomId, TaskId } });
        } else {
          active.delete(key);
        }
      }
      return response;
    })();
    pending.add(operation);
    if (key) queues.set(key, operation);
    const release = () => {
      pending.delete(operation);
      if (key && queues.get(key) === operation) queues.delete(key);
    };
    operation.then(release, release);
    return operation;
  }

  function stop() {
    if (shutdown) return shutdown;
    closing = true;
    shutdown = (async () => {
      await Promise.allSettled([...pending]);
      const results = await Promise.allSettled([...active].map(([key, task]) => stopTask(key, task)));
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed) throw new Error(`Failed to stop ${failed} active agent task(s)`);
    })();
    return shutdown;
  }

  return { request, stop };
}

module.exports = { createAgentLifecycle };
