export async function get(url, params) {
    url = new URL(url);
    url.search = new URLSearchParams(params);

    const request = await fetch(url);
    
    if (!request.ok) throw request;
    return request;
}

export function post(url, data, params) {
    url = new URL(url);
    url.search = new URLSearchParams(params);

    return fetch(url, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
}