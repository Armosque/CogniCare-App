# 📋 Análisis de Arquitectura - CogniCare App

## 🎯 Descripción General

**CogniCare** es una aplicación web asistida por IA diseñada para reducir la carga cognitiva en personas neurodiversas (ADHD, Autismo, Dislexia). La aplicación permite a los usuarios interactuar con un asistente inteligente que organiza tareas, simplifica procesos complejos y proporciona respuestas adaptadas a su nivel de lectura y tono preferido.

**Idioma Principal:** Español  
**Plataforma:** Web (Next.js)  
**Objetivo:** Accesibilidad y simplificación cognitiva

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 CLIENTE (Browser)                      │
│          ┌──────────────────────────────────────┐            │
│          │   React 19 + Next.js 16 (App Router)│            │
│          │  - UI interactiva con Framer Motion │            │
│          │  - Gestión de estado local (useState)│            │
│          └──────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           ↕️
                   (API + Server Actions)
                           ↕️
┌─────────────────────────────────────────────────────────────┐
│                   🖥️  SERVIDOR (Next.js)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  NextAuth + Azure AD                                 │   │
│  │  - Autenticación y sesiones                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Server Actions ("use server")                       │   │
│  │  - extractTextFromFile()                             │   │
│  │  - persistMessage/fetchUserHistory()                 │   │
│  │  - persistPreferences/fetchUserPreferences()         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Procesamiento de IA                                 │   │
│  │  - processWithAgent() → Azure AI API                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↕️                    ↕️                    ↕️
    ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
    │ Azure AD    │    │ Azure Cosmos │    │ Azure AI Services│
    │ (Auth)      │    │ DB           │    │ (Phi-4 Model)    │
    │             │    │ (Messages,   │    │ (Chat Completion)│
    │             │    │  Preferences)│    │                  │
    └─────────────┘    └──────────────┘    └──────────────────┘
         ↕️                                        ↕️
    ┌─────────────┐                    ┌──────────────────────┐
    │ MSAL Node   │                    │ Immersive Reader SDK │
    │ (MSAL Auth) │                    │ (Lector Inmersivo)   │
    └─────────────┘                    └──────────────────────┘
```

---

## 📦 Stack Técnico

### Frontend
- **React 19.2.4** - Framework UI
- **Next.js 16.2.1** - Metaframework para React (App Router)
- **TypeScript 5** - Tipado estático
- **Tailwind CSS 4** - Estilos
- **Framer Motion 12.38.0** - Animaciones
- **Lucide React 0.577** - Iconos
- **react-markdown 10.1.0** - Renderizado de Markdown
- **canvas-confetti 1.9.4** - Efectos visuales

### Backend / Middleware
- **NextAuth 4.24.13** - Autenticación
- **@azure/msal-node 5.1.1** - Autenticación Microsoft
- **Node.js** - Runtime

### Bases de Datos
- **Azure Cosmos DB** - Base de datos NoSQL (documentos)

### Servicios Azure
- **Azure Cosmos DB** - Almacenamiento de mensajes y preferencias
- **Azure AI Services** - LLM (Phi-4 en Azure AI Foundry)
- **Azure AD** - Autenticación empresarial
- **Immersive Reader** - Herramienta de accesibilidad

### Parsing de Documentos
- **mammoth 1.12.0** - Parseo de archivos Word (.docx)
- **pdf-parse 2.4.5** - Parseo de archivos PDF

### Herramientas de Desarrollo
- **ESLint 9** - Linting
- **PostCSS 4** - Procesamiento de CSS

---

## 📂 Estructura de Carpetas

```
CogniCare-App/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Layout raíz (HTML, Metadata)
│   │   ├── page.tsx                  # Página principal (App)
│   │   ├── globals.css               # Estilos globales
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts      # Configuración NextAuth
│   │   └── auth/
│   │       └── signin/
│   │           └── page.tsx          # Página de login
│   │
│   ├── components/                   # Componentes React reutilizables
│   │   ├── ImmersiveReaderButton.tsx # Botón del Lector Inmersivo
│   │   └── Providers.tsx             # SessionProvider wrapper
│   │
│   └── lib/                          # Lógica/utilidades
│       ├── actions.ts                # Server Actions (persistencia)
│       ├── ai-agent.ts               # Lógica del agente IA
│       ├── cosmos.ts                 # Cliente Cosmos DB
│       ├── immersive-reader.ts       # Token para Lector Inmersivo
│       └── utils.ts                  # Utilidades globales
│
├── public/                           # Archivos estáticos
├── .env.local                        # Variables de entorno (local)
├── next.config.ts                    # Configuración de Next.js
├── tsconfig.json                     # Configuración de TypeScript
├── postcss.config.mjs                # Configuración de PostCSS
├── eslint.config.mjs                 # Configuración de ESLint
├── package.json                      # Dependencias
└── README.md                         # Documentación

```

---

## 🔐 Autenticación

### Flujo de Autenticación

```
┌─────────────────┐
│  Usuario        │
│  No autenticado │
└────────┬────────┘
         │
         ↓
    Hace clic en
  "Iniciar Sesión"
         │
         ↓
   ┌─────────────────────────────────┐
   │ Página: /auth/signin/page.tsx   │
   │ - Verifica config de Azure AD   │
   │ - Muestra mensajes de error     │
   └────────┬────────────────────────┘
            │
            ↓
   Redirige a Azure AD
   (signIn('azure-ad'))
            │
            ↓
  ┌───────────────────────────────────┐
  │ Azure AD (Microsoft Entra ID)     │
  │ - Usuario ingresa credenciales    │
  │ - Validación de MFA (si aplica)   │
  └────────┬────────────────────────┘
           │
           ↓
    ┌──────────────────────────────────────┐
    │ NextAuth Callback (route.ts)         │
    │ - Valida token JWT                   │
    │ - Crea sesión                        │
    │ - Extrae userId del token            │
    └────────┬─────────────────────────────┘
             │
             ↓
    ┌──────────────────────────────────────┐
    │ Redirecciona a / (App)               │
    │ Sesión establecida                   │
    └──────────────────────────────────────┘
```

### Archivos de Autenticación

**[src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/%5B...nextauth%5D/route.ts#L1)**
- Configuración de NextAuth
- Proveedor: Azure AD
- Estrategia de sesión: JWT
- Callbacks: `session()`, `jwt()`

### Variables de Entorno Requeridas

```bash
# NextAuth Secrets
NEXTAUTH_SECRET=<random-string>
NEXTAUTH_URL=http://localhost:3000  # Para desarrollo

# Azure AD Configuration
AZURE_AD_CLIENT_ID=<id-from-azure>
AZURE_AD_CLIENT_SECRET=<secret-from-azure>
AZURE_AD_TENANT_ID=<tenant-id>

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
AZURE_COSMOS_KEY=<cosmos-primary-key>
AZURE_COSMOS_DATABASE_ID=CogniCareDB

# Azure AI Services
AZURE_AI_AGENT_KEY=<api-key>
AZURE_AI_AGENT_ENDPOINT=https://<region>.api.cognitive.microsoft.com/
AZURE_AI_DEPLOYMENT_NAME=Phi-4

# Azure Immersive Reader
READER_TENANT_ID=<tenant-id>
READER_CLIENT_ID=<client-id>
READER_CLIENT_SECRET=<client-secret>
```

---

## 💾 Base de Datos (Azure Cosmos DB)

### Modelado de Datos

**Base de Datos:** `CogniCareDB`

#### Contenedor 1: `Messages`
```json
{
  "id": "uuid",
  "userId": "user@example.com",  // Partition Key
  "timestamp": "2024-03-25T10:30:00Z",
  "role": "user|assistant",
  "content": "Texto del mensaje",
  "image": "base64-image-url?",
  "documentText": "Texto extraído de PDF/Word?",
  "type": "text|task-list|summary",
  "steps": [
    {
      "title": "Paso 1",
      "duration": "5 min",
      "bullets": ["acción 1", "acción 2"]
    }
  ],
  "explanation": "Explicación interna del porqué de la respuesta"
}
```

#### Contenedor 2: `Users`
```json
{
  "id": "user@example.com",
  "userId": "user@example.com",  // Partition Key
  "updatedAt": "2024-03-25T10:30:00Z",
  "preferences": {
    "readingLevel": "simple|intermedio|avanzado",
    "tone": "motivador|directo|empatico",
    "highContrast": false,
    "textToSpeech": true
  }
}
```

### Funciones Principales

**[src/lib/cosmos.ts](src/lib/cosmos.ts#L1)**

| Función | Descripción |
|---------|-------------|
| `getContainer()` | Inicializa cliente y crea contenedores si no existen |
| `saveMessage()` | Guarda un mensaje en `Messages` |
| `deleteMessage()` | Elimina un mensaje (por userId + messageId) |
| `getUserHistory()` | Obtiene últimos 50 mensajes de un usuario |
| `saveUserPreferences()` | Upsert de preferencias en `Users` |
| `getUserPreferences()` | Lee preferencias del usuario |

---

## 🤖 Agente IA (Azure AI Services)

### Vista General

El agente de IA es el corazón de CogniCare. Utiliza un modelo LLM (Phi-4) alojado en Azure para procesar consultas del usuario y generar respuestas adaptadas.

### Flujo de Procesamiento

```
┌──────────────────────┐
│ Usuario escribe      │
│ mensaje              │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│ Validaciones en Cliente:                  │
│ - No vacío                                │
│ - Máximo 2000 caracteres                 │
│ - Si hay archivo, lo parsea               │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│ Envía a Server Action                     │
│ (con historial completo)                 │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│ processWithAgent() → Azure AI API         │
│ - Construye System Prompt                 │
│ - Ajusta level de lectura                 │
│ - Ajusta tono                             │
│ - Incluye historial (últimos 6 msgs)      │
│ - Multimodal (texto + imagen)             │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│ Azure AI retorna respuesta                │
│ (JSON + texto formateado)                 │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│ Parsea respuesta:                         │
│ - Extrae JSON_START...JSON_END            │
│ - Identifica "steps"                      │
│ - Limpia emojis                           │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│ Persiste en Cosmos DB                     │
│ - Mensaje del usuario                     │
│ - Respuesta del asistente                 │
│ - Preferencias (si cambió)                │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│ Renderiza en UI:                          │
│ - Texto markdown                          │
│ - Pasos (task-list)                       │
│ - Botones de acciones                     │
└──────────────────────────────────────────┘
```

### System Prompt

**Archivo:** [src/lib/ai-agent.ts](src/lib/ai-agent.ts#L1)

El system prompt incluye:
- **Rol:** CogniCare, asistente para reducir carga cognitiva
- **Regla de Idioma:** Detecta idioma del usuario y responde en el mismo
- **Nivel de Lectura:**
  - `simple`: Palabras básicas, frases de máx. 10-15 palabras
  - `intermedio`: Lenguaje claro sin jerga excesiva
  - `avanzado`: Lenguaje estándar con términos técnicos
- **Tono:**
  - `motivador`: Entusiasta, elogios
  - `directo`: Conciso, lógico
  - `empatico`: Empático, tranquilo, validante

- **Clasificación de Respuestas:**
  - **TYPE A (Producción):** El usuario quiere hacer algo
    - Formato: JSON con pasos + explicación textual
  - **TYPE B (Consulta):** Usuario requiere respuesta rápida
    - Formato: Texto estructurado, sin pasos JSON

### Detalles Técnicos

```typescript
// Endpoint: Azure AI Services (compatible con OpenAI API)
// Modelo: Phi-4
// Temperature: 0.3 (respuestas consistentes)
// Max Tokens: 2000

// Multimodal:
// - Texto + Imagen (Base64)
// - Extracto de documentos (PDF/Word)

// Historial: Últimos 6 mensajes para contexto
```

---

## 📊 Servidor de Acciones (Server Actions)

**Archivo:** [src/lib/actions.ts](src/lib/actions.ts#L1)

### Funciones Principales

| Función | Tipo | Descripción |
|---------|------|-------------|
| `extractTextFromFile()` | Server Action | Parsea PDF, Word, TXT a texto |
| `persistMessage()` | Server Action | Guarda mensaje en Cosmos DB |
| `deleteUserMessageLog()` | Server Action | Elimina un mensaje |
| `fetchUserHistory()` | Server Action | Obtiene historial desde DB |
| `persistPreferences()` | Server Action | Guarda preferencias del usuario |
| `fetchUserPreferences()` | Server Action | Carga preferencias al iniciar |

### Flujo de Persistencia

```
Cliente (page.tsx)
       ↓
  persistMessage(msg)
       ↓
  Server Action
       ↓
  Obtiene sesión NextAuth
       ↓
  Extrae userId
       ↓
  saveToCosmos(userId, msg)
       ↓
  Cosmos DB
```

---

## 🎨 Componentes Principales

### 1. **Página Principal** ([src/app/page.tsx](src/app/page.tsx#L1))

**Tipo:** Client Component ("use client")

**Funcionalidades:**
- Chat interactivo con el asistente IA
- Gestión de historial local y en DB
- Timer de Pomodoro (Focus Mode)
- Preferencias de accesibilidad
- Upload de imágenes y documentos
- Síntesis de voz (Text-to-Speech)
- Efectos visuales (confetti)

**Estado Principal:**
```typescript
interface AppState {
  messages: AgentMessage[];
  input: string;                    // Campo de texto
  isProcessing: boolean;            // Enviando a IA
  focusMode: boolean;               // Modo concentración
  timerActive: boolean;             // Timer en ejecución
  timeLeft: number;                 // Segundos restantes
  settingsOpen: boolean;            // Panel de configuración
  historyOpen: boolean;             // Panel de historial
  savedHistory: AgentMessage[];     // Historial desde DB
  preferences: UserPreferences;     // Configuración del usuario
  completedSteps: Set<string>;      // Pasos completados
  speakingId: number | null;        // ID del mensaje siendo leído
  selectedImage: string | null;     // Imagen seleccionada
  selectedFile: File | null;        // Documento seleccionado
}
```

**Workflows:**
1. **Envío de mensaje:**
   - Usuario escribe → Click enviar
   - Valida que no esté vacío
   - Llama a `processWithAgent()`
   - Renderiza respuesta
   - Persiste en DB

2. **Carga de archivo:**
   -Usuario hace click en icono de clip
   - Selecciona PDF, Word o imagen
   - Si es texto: `extractTextFromFile()`
   - Se adjunta al mensaje siguiente

3. **Preferencias:**
   - Usuario abre Settings
   - Cambia nivel, tono, contraste, TTS
   - Se persisten en Cosmos DB
   - Aplicadas automáticamente en próximas respuestas

### 2. **Inmersive Reader** ([src/components/ImmersiveReaderButton.tsx](src/components/ImmersiveReaderButton.tsx#L1))

**Tipo:** Client Component

**Funcionalidad:** Abre el Lector Inmersivo (herramienta de accesibilidad de Microsoft)

**Flujo:**
```
Click botón
    ↓
getImmersiveReaderToken() → Server
    ↓
Obtiene token JWT corta duración
    ↓
Carga SDK de JavaScript
    ↓
Limpia Markdown
    ↓
Lanza ImmersiveReader.launchAsync()
    ↓
Usuario puede:
  - Cambiar velocidad de lectura
  - Ajustar tamaño de fuente
  - Cambiar tema (dark/light)
  - Escuchar audio
  - Usar diccionario/traducción
```

### 3. **Providers** ([src/components/Providers.tsx](src/components/Providers.tsx#L1))

**Tipo:** Client Component

Wrapper que proporciona `SessionProvider` de NextAuth a toda la app.

### 4. **Página de SignIn** ([src/app/auth/signin/page.tsx](src/app/auth/signin/page.tsx#L1))

**Funcionalidades:**
- Verifica si Azure AD está configurado
- Botón "Iniciar Sesión con Microsoft"
- Mensajes de error si falta configuración
- UI amigable y accesible

---

## 🎯 Vistas (Pages)

### 1. `/` - Aplicación Principal (Autenticado)
- Chat interactivo
- Panel de historial
- Panel de configuración
- TTS y Inmersive Reader

### 2. `/auth/signin` - Página de Login
- Autenticación con Azure AD
- Validación de configuración
- Mensajes de error

---

## 🔄 Flujos Principales

### Flujo 1: Nuevo Usuario

```
1. Usuario accede a https://cognicare.app
2. Redirección a /auth/signin (sin sesión)
3. Hace click "Iniciar Sesión con Microsoft"
4. NextAuth redirige a Azure AD
5. Usuario ingresa credenciales
6. Azure AD devuelve token
7. NextAuth crea sesión JWT
8. Usuario redirigido a /
9. Layout obtiene sesión y renderiza página principal
10. Se cargan preferencias desde Cosmos DB
   - Si no existen, se crean con valores por defecto
```

### Flujo 2: Envío de Mensaje

```
1. Usuario escribe mensaje y presiona Enter/Enviar
2. UI valida que no esté vacío
3. Agrega mensaje del usuario a estado local
4. Llama a processWithAgent(history)
   ↓ (Server Action)
5. Construye system prompt con preferencias
6. Envía a Azure AI API con:
   - Historial completo (últimos 6 msgs)
   - Imagen si existe
   - Texto extraído de documento si existe
7. Azure retorna respuesta con posibles pasos JSON
8. parsea respuesta para extraer:
   - Pasos (task-list)
   - Explicación
   - Texto limpio
9. Llama persistMessage() para guardar en DB
10. Renderiza respuesta en UI:
    - Si hay pasos: muestra como task-list
    - Si hay explicación: la oculta con toggle
    - Si hay imagen: la renderiza
11. Opcional: síntesis de voz si TTS activado
```

### Flujo 3: Cambio de Preferencias

```
1. Usuario abre Settings (panel derecha)
2. Modifica: nivel de lectura, tono, contraste, TTS
3. Click "Guardar"
4. localStorage actualizado localmente
5. persistPreferences() llamado
   ↓ (Server Action)
6. Guarda en Cosmos DB bajo userId
7. Próximas respuestas usan nuevas preferencias
```

### Flujo 4: Upload de Documento

```
1. Usuario hace click en icono de clip
2. Selecciona PDF, .docx, .txt o imagen
3. Archivo procesado:
   - Si PDF/Word/Txt: extractTextFromFile()
     ↓ (Server Action)
     - Parsea contenido
     - Retorna texto limpio
   - Si Imagen: convierte a Base64
4. Texto/imagen se adjunta al próximo mensaje
5. Se envía junto a la consulta al agente IA
```

---

## 🎨 Características UI/UX

### Accesibilidad
- **Alto contraste:** Toggle en settings
- **Nivel de lectura:** simple/intermedio/avanzado
- **Tono adaptable:** motivador/directo/empático
- **Síntesis de voz:** Lee respuestas en voz alta
- **Lector Inmersivo:** Herramienta Microsoft Entra
- **Animaciones:** Framer Motion (respetas prefers-reduced-motion)

### Visual
- **Tema:** Sky blue + tonos calmes
- **Animaciones:** Microinteracciones suaves
- **Responsive:** Mobile-first design
- **Iconos:** Lucide React
- **Efectos:** Canvas Confetti para celebraciones

### Componentes Interactivos
- Text input con auto-expand
- Botones con hover states
- Modales (Settings, History)
- Progress visual del timer
- Markdown renderizado
- Task lists interactivas

---

## 📱 Dispositivos Soportados

- Desktop (1920px+)
- Tablet (768px-1024px)
- Mobile (320px-767px)

Responsive con Tailwind CSS

---

## 🔧 Configuración de Desarrollo

### Variables de Entorno (.env.local)

```bash
# NextAuth
NEXTAUTH_SECRET=generated-secret-key
NEXTAUTH_URL=http://localhost:3000

# Azure AD
AZURE_AD_CLIENT_ID=xxx
AZURE_AD_CLIENT_SECRET=xxx
AZURE_AD_TENANT_ID=xxx

# Cosmos DB
AZURE_COSMOS_ENDPOINT=https://xxx.documents.azure.com:443/
AZURE_COSMOS_KEY=xxx
AZURE_COSMOS_DATABASE_ID=CogniCareDB

# Azure AI
AZURE_AI_AGENT_KEY=xxx
AZURE_AI_AGENT_ENDPOINT=https://xxx.api.cognitive.microsoft.com/
AZURE_AI_DEPLOYMENT_NAME=Phi-4

# Immersive Reader
READER_TENANT_ID=xxx
READER_CLIENT_ID=xxx
READER_CLIENT_SECRET=xxx
```

### Comandos

```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev

# Build
npm run build

# Iniciar en producción
npm start

# Linting
npm run lint
```

---

## 🚀 Despliegue

### Prerrequisitos Azure
✅ Azure Subscription  
✅ Tenant Azure AD  
✅ Cosmos DB (CogniCareDB)  
✅ Azure AI Services (Phi-4)  
✅ Immersive Reader  
✅ App Registration en Azure AD  

### Hosting
- **Opción 1:** Vercel (recomendado para Next.js)
- **Opción 2:** Azure App Service
- **Opción 3:** Azure Container Apps

---

## 📊 Diagrama de Relaciones

```
┌─────────────────────────┐
│     Usuario (Azure AD)  │
└────────────┬────────────┘
             │
             ↓
    ┌────────────────────┐
    │  Sesión NextAuth   │
    │  (JWT + userId)    │
    └────────┬───────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
┌─────────────┐  ┌──────────────┐
│  Mensajes   │  │ Preferencias │
│  (Cosmos DB)│  │  (Cosmos DB) │
└─────────────┘  └──────────────┘
```

---

## 🎓 Flujo de Aprendizaje del Código

### Para Principiantes:
1. Comienza en `layout.tsx` (estructura HTML)
2. Luego `page.tsx` (UI principal)
3. Entiende los hooks básicos (useState, useEffect)
4. Lee el flujo en `actions.ts`

### Para Nivel Intermedio:
1. Analiza `ai-agent.ts` (system prompt, parsing JSON)
2. Entiende NextAuth en `route.ts`
3. Estudia el flujo multimodal (imagen + texto)

### Para Avanzados:
1. Arquitectura completa de componentes
2. Optimización de persisten

cia
3. Escalabilidad de Cosmos DB
4. Integración con Azure AI Services

---

## 📈 Métricas y Monitoreo

### Datos Rastreados en Cosmos DB
- ✅ Historial de mensajes por usuario
- ✅ Preferencias de cada usuario
- ✅ Timestamp de cada interacción
- ✅ Tokens/preguntas procesadas

### Oportunidades de Monitoreo
- Application Insights (Azure)
- Logs de NextAuth
- Errores de Azure AI
- Latencia de Cosmos DB

---

## 🐛 Manejo de Errores

| Error | Ubicación | Manejo |
|-------|-----------|--------|
| Azure AD no configurado | `/auth/signin` | Modal de error con instrucciones |
| Cosmos DB no disponible | `cosmos.ts` | Console.warn + fallback a localStorage |
| IA no responde | `ai-agent.ts` | try-catch + mensaje al usuario |
| Archivo no se parsea | `actions.ts` | Error message específico |
| Token JWT expirado | NextAuth | Redirección a `/auth/signin` |

---

## 🔐 Seguridad

✅ **Autenticación:** Azure AD + JWT  
✅ **Sesiones:** Seguras con NextAuth  
✅ **Variables sensibles:** .env.local (nunca en Git)  
✅ **CORS:** Configurado para Azure services  
✅ **API Keys:** Protegidas en servidor (no enviadas al cliente)  
✅ **Server Actions:** Protegidas con sesión verificada  

---

## 📝 Convenciones del Código

- Archivos: **camelCase** (ai-agent.ts, immersive-reader.ts)
- Componentes: **PascalCase** (ImmersiveReaderButton.tsx)
- Funciones: **camelCase** (processWithAgent)
- Interfaces: **PascalCase** (AgentMessage)
- Constantes: **SCREAMING_SNAKE_CASE** (DATABASE_ID)

---

## 🎯 Próximas Mejoras Potenciales

- [ ] Sincronización en tiempo real con WebSockets
- [ ] Exportar historial a PDF
- [ ] Compartir sesiones con facilitadores
- [ ] Integración con calendario
- [ ] Recordatorios personalizados
- [ ] Analytics dashboard
- [ ] Múltiples modelos de IA
- [ ] Offline mode con sync
- [ ] Gamification (badges, streaks)

---

## 📞 Soporte y Recursos

**Documentación oficial:**
- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth Docs](https://next-auth.js.org/)
- [Azure Cosmos DB](https://learn.microsoft.com/es-es/azure/cosmos-db/)
- [Azure AI Services](https://learn.microsoft.com/es-es/azure/ai-services/)

---

**Última actualización:** Marzo 25, 2025  
**Versión de la App:** 0.1.0  
**Última revisión:** Copilot Assistant
