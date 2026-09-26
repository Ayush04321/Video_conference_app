let IS_PROD = true;

const server = IS_PROD 
  ? import.meta.env.VITE_BACKEND_URL 
  : "http://localhost:8000";

export default server;
