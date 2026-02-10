use serde::Serialize;
use std::process::Command as SysCommand;

#[derive(Serialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Serialize, Clone)]
pub struct GitInfo {
    pub is_repo: bool,
    pub branch: String,
    pub files: Vec<GitFileStatus>,
    pub has_changes: bool,
}

/// Check whether `folder` is inside a git work tree, return the current branch
/// and the list of changed / untracked files.
#[tauri::command]
pub fn git_status(folder: String) -> Result<GitInfo, String> {
    // 1. Check if folder is inside a git repo
    let is_repo = SysCommand::new("git")
        .args(["-C", &folder, "rev-parse", "--is-inside-work-tree"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !is_repo {
        return Ok(GitInfo {
            is_repo: false,
            branch: String::new(),
            files: Vec::new(),
            has_changes: false,
        });
    }

    // 2. Get current branch name
    let branch_output = SysCommand::new("git")
        .args(["-C", &folder, "branch", "--show-current"])
        .output()
        .map_err(|e| format!("Failed to get branch: {}", e))?;

    let branch = String::from_utf8_lossy(&branch_output.stdout)
        .trim()
        .to_string();

    // 3. Get porcelain status
    let status_output = SysCommand::new("git")
        .args(["-C", &folder, "status", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to get status: {}", e))?;

    let status_text = String::from_utf8_lossy(&status_output.stdout);

    let mut files: Vec<GitFileStatus> = Vec::new();

    for line in status_text.lines() {
        if line.len() < 3 {
            continue;
        }

        // Porcelain format: XY <path>
        // X = index status, Y = working-tree status
        let xy = &line[..2];
        let file_path = line[3..].trim().to_string();

        // Derive a single-character status code that is most meaningful:
        //   "?" — untracked
        //   "A" — added (new file staged)
        //   "D" — deleted
        //   "M" — modified (staged or unstaged)
        let status = if xy == "??" {
            "?".to_string()
        } else if xy.contains('D') {
            "D".to_string()
        } else if xy.starts_with('A') {
            "A".to_string()
        } else {
            // Covers "M ", " M", "MM", "R ", etc.
            "M".to_string()
        };

        files.push(GitFileStatus {
            path: file_path,
            status,
        });
    }

    let has_changes = !files.is_empty();

    Ok(GitInfo {
        is_repo: true,
        branch,
        files,
        has_changes,
    })
}

/// Return the diff output for a single file inside the given repo folder.
#[tauri::command]
pub fn git_diff(folder: String, file_path: String) -> Result<String, String> {
    let output = SysCommand::new("git")
        .args(["-C", &folder, "diff", "--", &file_path])
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git diff failed: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Stage all changes and create a commit with the given message.
#[tauri::command]
pub fn git_commit(folder: String, message: String) -> Result<String, String> {
    // Stage everything
    let add_output = SysCommand::new("git")
        .args(["-C", &folder, "add", "-A"])
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !add_output.status.success() {
        let stderr = String::from_utf8_lossy(&add_output.stderr);
        return Err(format!("git add failed: {}", stderr));
    }

    // Commit
    let commit_output = SysCommand::new("git")
        .args(["-C", &folder, "commit", "-m", &message])
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr);
        return Err(format!("git commit failed: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&commit_output.stdout).to_string())
}
