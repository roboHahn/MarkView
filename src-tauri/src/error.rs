use serde::Serialize;

/// Typed error enum for all Tauri commands.
///
/// Serializes to a plain string so the frontend receives human-readable messages
/// while the backend can match on variants for programmatic handling.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("File not found: {0}")]
    NotFound(String),

    #[error("File already exists: {0}")]
    AlreadyExists(String),

    #[error("Not a directory: {0}")]
    NotDirectory(String),

    #[error("Path traversal detected: {0}")]
    PathTraversal(String),

    #[error("{0}")]
    Io(#[from] std::io::Error),

    #[error("Git error: {0}")]
    Git(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("{0}")]
    Other(String),
}

// Tauri 2.x requires the error type to implement `Serialize` so it can be
// sent across the IPC boundary.  We serialize every variant as a plain string
// which keeps the frontend backward-compatible (it already expects strings).
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
