export interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  try {
    const adminToken = sessionStorage.getItem("creatorhub-risk-admin-token") || "";
    if (adminToken) {
      headers.set("X-CreatorHub-Admin-Token", adminToken);
    }
  } catch (e) {
    // Ignore sessionStorage errors
  }

  headers.set("X-CreatorHub-Actor", "creatorhub-web");
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorMessage;
    } catch {
      // Failed to parse JSON error
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
