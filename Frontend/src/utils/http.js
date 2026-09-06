export const get = async (url, params) => {
    const parsedUrl = new URL(url);
    if (params) parsedUrl.search = new URLSearchParams(params);
    const response = await fetch(parsedUrl);
    if (!response.ok) throw response;
    return response;
};