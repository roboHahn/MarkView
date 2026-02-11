use serde::{Deserialize, Serialize};

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

#[tauri::command]
pub async fn ai_request(request: AiRequest) -> Result<AiResponse, String> {
    let client = reqwest::Client::new();

    let mut req_builder = match request.method.to_uppercase().as_str() {
        "POST" => client.post(&request.url),
        "GET" => client.get(&request.url),
        _ => return Err(format!("Unsupported method: {}", request.method)),
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
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok(AiResponse { status, body })
}
