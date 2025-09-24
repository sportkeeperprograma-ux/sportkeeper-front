[build]
  command = "npm ci && npm run build"
  publish = "dist"         # Vite/React/Vue usan 'dist'
                           # Angular suele ser: dist/tu-app

# SPA: evita 404 en rutas /dashboard, /login, etc.
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# (Opcional) Fuerza Node 20 si tu build lo necesita
[build.environment]
  NODE_VERSION = "20"
