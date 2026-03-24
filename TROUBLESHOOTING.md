# 🛠 Solución de Problemas (Troubleshooting)

Si la aplicación no arranca o muestra errores al ejecutar `npm run dev`, sigue estos pasos en orden:

### 1. Verificar Versión de Node.js
Este proyecto usa **Next.js 16** y **React 19**, que requieren una versión moderna de Node.
- Ejecuta: `node -v`
- Debe ser **v18.17.0** o superior (recomendado **v20.x** o **v22.x**).
- Si es inferior, descarga la versión LTS en [nodejs.org](https://nodejs.org).

### 2. Verificar el archivo .env.local
- Asegúrate de que el archivo se llame exactamente `.env.local`.
- Si Windows oculta las extensiones, asegúrate de que no se llame `.env.local.txt`.
- Debe estar en la **raíz** de la carpeta `cognicare` (al mismo nivel que `package.json`).

### 3. Limpieza de Instalación
A veces la instalación falla silenciosamente. Intenta esto:
```bash
# Borrar módulos y carpetas de cache
rm -rf node_modules .next
# Reinstalar
npm install
```

### 4. Errores de Construcción
Prueba a compilar el proyecto manualmente para ver errores detallados:
```bash
npm run build
```
Si esto falla, copia y pega el error exacto que aparece en la terminal.

### 5. Puerto en Uso
Si el error dice `EADDRINUSE`, es que ya tienes algo corriendo en el puerto 3000.
Intenta correrlo en otro puerto:
```bash
npx next dev -p 3001
```
