export type SyncState = {
  configured: boolean;
  status: "setup" | "pending" | "syncing" | "synced" | "error";
  message: string;
  last_synced_at?: string | null;
  commit_url?: string | null;
  version?: number;
  synced_version?: number;
};

export type Contact = {
  id: number;
  name: string;
  email: string;
  message: string;
  project_type: string;
  budget: string;
  created_at: string;
};
