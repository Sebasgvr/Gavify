# 🎵 Gavify SaaS - Guía de Base de Datos y Credenciales de Acceso

Bienvenido a **Gavify**, la plataforma SaaS de gestión musical, unificación de playlists multi-plataforma (**Spotify**, **YouTube Music** y **YouTube**), detección y resolución de canciones repetidas, y análisis de escucha semanal.

---

## 👥 1. Cuentas de Prueba y Credenciales de Acceso

Para evaluar el sistema, la base de datos cuenta con **6 usuarios preconfigurados** (1 Super Admin, 1 Admin y 4 Usuarios con cada uno de los planes de Gavify).

> **Contraseña universal para todas las cuentas de prueba:** `123456` *(o `password123` / `gavify2026`)*

| # | Nombre Completo | Correo Electrónico | Rol RBAC | Plan Asignado | Permisos y Alcance |
|---|---|---|---|---|---|
| **1** | **Sebastian Gavilan** | `sebastian@gavify.io` | `super_admin` *(Super Admin)* | **Plan SebaGod Prime** | Propietario principal de Gavify. Administra a los Administradores y Usuarios (crear, cambiar roles/planes, eliminar). Puede probar toda la plataforma. |
| **2** | **Valentina Ruiz** | `valentina@gavify.io` | `admin` *(Admin)* | **Plan SebaGod** | Administradora de soporte y operaciones. Administra cuentas de Usuarios (`/seguridad`) y puede probar todas las funciones musicales. |
| **3** | **Camila Romero** | `camila@gavify.io` | `usuario` *(Usuario)* | **Plan Gratis** | Usuario activo. Conecta Spotify y YouTube, arma playlists públicas/privadas y limpia canciones repetidas. |
| **4** | **Mateo López** | `mateo@gavify.io` | `usuario` *(Usuario)* | **Plan Provilan Pro** | Usuario activo. Conecta Spotify y YT Music, explora catálogo y organiza playlists. |
| **5** | **Lucía Martínez** | `lucia@gavify.io` | `usuario` *(Usuario)* | **Plan SebaGod** | Usuario avanzado con biblioteca activa y métricas de escucha diaria sincronizadas. |
| **6** | **Julián Torres** | `julian@gavify.io` | `usuario` *(Usuario)* | **Plan SebaGod Prime** | Usuario con suscripción máxima y todas las plataformas conectadas. |

---

## 🏗️ 2. Análisis del Modelo de Datos (¿Qué tablas se conservan y cuáles se simplificaron?)

Al contrastar el informe teórico de la Etapa 5 con el MVP real y el sistema actual de Gavify:

### ✅ Tablas Esenciales (SE CONSERVAN):
1. **`organizaciones`**: Imprescindible para el modelo **Multi-Tenant**. Permite aislar los datos entre diferentes estudios, radios o grupos de trabajo.
2. **`planes`**: Almacena los 4 tiers de suscripción (`gratis`, `provilan`, `sebagod`, `sebagod_prime`).
3. **`usuarios`**: Contiene el perfil, rol (`super_admin`, `admin`, `usuario`), tenant (`organizacion_id`) y estado de conexión OAuth (Spotify, YT Music, YouTube).
4. **`canciones`**: El catálogo centralizado con títulos, artistas, álbumes, géneros, duración, reproducciones e IDs externos de video y audio.
5. **`playlists`**: Listas de reproducción de cada usuario con visibilidad (`es_publica` privada o pública) y plataforma de origen.
6. **`playlist_canciones`**: Relación Muchos a Muchos (N:M) entre playlists y canciones con orden de posición. Permite detectar duplicados si una pista se agregó varias veces en la misma lista.
7. **`metricas_reproduccion`**: Almacena el historial y ritmo de escucha semanal para alimentar el gráfico de actividad por día y porcentajes por género.

### 🧹 Tablas Redundantes o Simplificadas (SE ELIMINAN O REEMPLAZAN):
1. ❌ **`analisis_duplicados_detalle`**: **Eliminada**. El cálculo de duplicados se realiza en tiempo real sobre la tabla `playlist_canciones`. Mantener una tabla estática separada generaba inconsistencias cuando el usuario borraba una canción de su lista.
2. ❌ **`bitacora_accesos`**: **Simplificada / Opcional**. Para el flujo del MVP, la seguridad y aislamiento se garantiza directamente mediante las políticas RLS (*Row Level Security*) de PostgreSQL en Supabase y el Navigation Guard en frontend.
3. ❌ **Roles antiguos y tipos obsoletos**: Se removieron los roles `productor`, `curador`, `propietario` y `miembro_lector`, además de los orígenes `propia` y `manual_admin`. Ahora el sistema opera con **Super Admin**, **Admin** y **Usuario**, conectando directamente con las APIs musicales.

---

## 💾 3. Script SQL Completo para Supabase

El script SQL completo y verificado se encuentra en [`supabase/schema.sql`](file:///c:/Users/gavil/Desktop/Gavify/supabase/schema.sql) (y réplica en [`database/gavify_schema_and_seed.sql`](file:///c:/Users/gavil/Desktop/Gavify/database/gavify_schema_and_seed.sql)).

> **Nota sobre el tipo de ID:**
> En PostgreSQL, el tipo `UUID` solo acepta caracteres hexadecimales (`0-9`, `a-f`). Por ello, las tablas `canciones`, `playlists`, `playlist_canciones` y `metricas_reproduccion` utilizan `VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text`. Esto permite almacenar tanto IDs generados por Supabase/UUID como identificadores de APIs de Spotify (`spotify:track:...`), YouTube (`iawgB2CDCrw`) o identificadores personalizados de prueba (`pc-01`, `p1111111-...`) sin ningún error de conversión de tipos.

> **Instrucciones para Supabase:**
> 1. Ingresa a tu proyecto en [Supabase](https://supabase.com).
> 2. En el menú lateral izquierdo, abre el **SQL Editor**.
> 3. Abre una nueva pestaña de consulta (*New query*).
> 4. Copia y pega el contenido completo de [`supabase/schema.sql`](file:///c:/Users/gavil/Desktop/Gavify/supabase/schema.sql).
> 5. Presiona el botón verde **Run** (o `Ctrl + Enter`). Verás el mensaje `Success. No rows returned`.

---

## 🚀 4. Ejecución en Local

Para levantar el entorno de desarrollo:

```bash
# Instalar dependencias si aún no lo hiciste
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre en tu navegador `http://localhost:5173`. En la pantalla de login podrás presionar cualquiera de los botones de **acceso rápido** con las 6 cuentas o ingresar manualmente con el correo y contraseña `123456`.

