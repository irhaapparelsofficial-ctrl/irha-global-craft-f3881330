export type OperationQueueResult = {
  count: number | null;
  error: string | null;
  checked: boolean;
};

export type OperationQueueState = "loading" | "pending" | "attention" | "clear";

export function operationQueueState(result: OperationQueueResult): OperationQueueState {
  if (!result.checked) return "loading";
  if (result.error || result.count === null) return "pending";
  return result.count > 0 ? "attention" : "clear";
}

export function summarizeOperationQueues(queues: Record<string, OperationQueueResult>) {
  const values = Object.values(queues);
  const readable = values.filter((queue) => queue.checked && queue.error === null && queue.count !== null);
  return {
    attention: readable.reduce((total, queue) => total + (queue.count ?? 0), 0),
    available: readable.length,
    pendingSources: values.filter((queue) => queue.checked && (queue.error !== null || queue.count === null)).length,
    total: values.length,
  };
}
