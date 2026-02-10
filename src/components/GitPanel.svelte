<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';

  interface GitFileStatus {
    path: string;
    status: string;
  }

  interface GitInfo {
    is_repo: boolean;
    branch: string;
    files: GitFileStatus[];
    has_changes: boolean;
  }

  interface Props {
    currentFolder: string | null;
  }

  let { currentFolder }: Props = $props();

  let gitInfo = $state<GitInfo | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let commitMessage = $state('');
  let committing = $state(false);

  async function fetchStatus() {
    if (!currentFolder) {
      gitInfo = null;
      error = null;
      return;
    }

    loading = true;
    error = null;

    try {
      gitInfo = await invoke<GitInfo>('git_status', { folder: currentFolder });
    } catch (e) {
      error = String(e);
      gitInfo = null;
    } finally {
      loading = false;
    }
  }

  async function handleCommit() {
    if (!currentFolder || !commitMessage.trim()) return;

    committing = true;
    error = null;

    try {
      await invoke<string>('git_commit', {
        folder: currentFolder,
        message: commitMessage.trim()
      });
      commitMessage = '';
      await fetchStatus();
    } catch (e) {
      error = String(e);
    } finally {
      committing = false;
    }
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'M': return 'var(--git-modified, #e5c07b)';
      case 'A': return 'var(--toast-success)';
      case 'D': return 'var(--toast-error)';
      case '?': return 'var(--text-muted)';
      default:  return 'var(--text-secondary)';
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'M': return 'Modified';
      case 'A': return 'Added';
      case 'D': return 'Deleted';
      case '?': return 'Untracked';
      default:  return status;
    }
  }

  $effect(() => {
    // Re-fetch whenever currentFolder changes
    currentFolder;
    fetchStatus();
  });
</script>

<div class="git-panel">
  {#if loading}
    <div class="message">Loading...</div>
  {:else if error}
    <div class="message error">{error}</div>
  {:else if !currentFolder}
    <div class="message">No folder open</div>
  {:else if gitInfo && !gitInfo.is_repo}
    <div class="message">Not a git repository</div>
  {:else if gitInfo}
    <!-- Branch -->
    <div class="branch-bar">
      <span class="branch-icon">{'\u238B'}</span>
      <span class="branch-name">{gitInfo.branch || 'HEAD (detached)'}</span>
      <button class="refresh-btn" onclick={fetchStatus} title="Refresh">
        {'\u21BB'}
      </button>
    </div>

    <!-- File list -->
    <div class="file-list">
      {#if gitInfo.files.length === 0}
        <div class="message">No changes</div>
      {:else}
        {#each gitInfo.files as file (file.path)}
          <div class="file-entry" title="{statusLabel(file.status)}: {file.path}">
            <span class="file-status" style="color: {statusColor(file.status)}">
              {file.status}
            </span>
            <span class="file-path">{file.path}</span>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Commit section -->
    {#if gitInfo.has_changes}
      <div class="commit-section">
        <textarea
          class="commit-input"
          placeholder="Commit message..."
          rows="3"
          bind:value={commitMessage}
          disabled={committing}
        ></textarea>
        <button
          class="commit-btn"
          onclick={handleCommit}
          disabled={committing || !commitMessage.trim()}
        >
          {committing ? 'Committing...' : 'Commit'}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .git-panel {
    height: 100%;
    overflow-y: auto;
    background: var(--bg-sidebar);
    display: flex;
    flex-direction: column;
    font-size: 13px;
    user-select: none;
    -webkit-user-select: none;
  }

  .message {
    padding: 16px 12px;
    color: var(--text-muted);
    text-align: center;
  }

  .message.error {
    color: var(--toast-error);
    font-size: 12px;
    word-break: break-word;
    user-select: text;
    -webkit-user-select: text;
  }

  .branch-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .branch-icon {
    color: var(--accent);
    font-size: 14px;
    flex-shrink: 0;
  }

  .branch-name {
    color: var(--text-primary);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .refresh-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
    padding: 0 2px;
    flex-shrink: 0;
    line-height: 1;
  }

  .refresh-btn:hover {
    color: var(--accent);
  }

  .file-list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .file-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 12px;
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-entry:hover {
    background: var(--hover-bg);
  }

  .file-status {
    flex-shrink: 0;
    width: 14px;
    font-family: monospace;
    font-weight: 600;
    font-size: 12px;
    text-align: center;
  }

  .file-path {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .commit-section {
    flex-shrink: 0;
    padding: 8px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .commit-input {
    width: 100%;
    resize: vertical;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .commit-input::placeholder {
    color: var(--text-muted);
  }

  .commit-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .commit-btn {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    align-self: flex-end;
  }

  .commit-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .commit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
