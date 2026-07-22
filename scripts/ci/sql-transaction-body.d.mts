export type RepositoryMigrationEntry = {
  version?: string;
};

export function transactionBody(
  sql: string,
  entry?: RepositoryMigrationEntry,
): string;

export function sqlCodeOnly(value: string): string;
