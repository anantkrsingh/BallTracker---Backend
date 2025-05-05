const axios = require('axios');

// Base URL and API key from server configuration
const API_URL = process.env.API_URL || '';
const API_KEY = process.env.API_KEY || '';

// Helper function to append API key to URL
const appendApiKey = (url) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}api_key=${API_KEY}`;
};

// GET request helper
const get = async (endpoint, params = {}) => {
    try {
        const url = appendApiKey(`${API_URL}${endpoint}`);
        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error('GET request failed:', error);
        throw error;
    }
};

// POST request helper
const post = async (endpoint, data = {}) => {
    try {
        const url = appendApiKey(`${API_URL}${endpoint}`);
        const response = await axios.post(url, data);
        return response.data;
    } catch (error) {
        console.error('POST request failed:', error);
        throw error;
    }
};

module.exports = {
    get,
    post
};
