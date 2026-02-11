use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::error::AppError;

#[derive(Deserialize)]
pub struct AiRequest {
    pub url: String,
    pub method: String,
    pub headers: Vec<(String, String)>,
    pub body: String,
}

#[derive(Serialize)]
pub struct AiResponse {
    pub status: u16,
    pub body: String,
}

/// 60-second timeout for AI requests.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

#[tauri::command]
pub async fn ai_request(request: AiRequest) -> Result<AiResponse, AppError> {
    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| AppError::Network(format!("Failed to create HTTP client: {}", e)))?;

    let mut req_builder = match request.method.to_uppercase().as_str() {
        "POST" => client.post(&request.url),
        "GET" => client.get(&request.url),
        _ => return Err(AppError::Other(format!("Unsupported method: {}", request.method))),
    };

    for (key, value) in &request.headers {
        req_builder = req_builder.header(key.as_str(), value.as_str());
    }

    if !request.body.is_empty() {
        req_builder = req_builder
            .header("Content-Type", "application/json")
            .body(request.body);
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| AppError::Network(format!("HTTP request failed: {}", e)))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| AppError::Network(format!("Failed to read response: {}", e)))?;

    Ok(AiResponse { status, body })
}
