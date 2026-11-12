# 🔑 Credenciales y Cuentas de Acceso — Gavify SaaS

Este documento contiene las cuentas preconfiguradas para pruebas de roles (**RBAC**), control de acceso y evaluación de planes en **Gavify SaaS**.

---

## 👥 Cuentas de Prueba Preconfiguradas

> **🔑 Contraseña universal para todos los usuarios:** `123456`

| # | Nombre | Correo Electrónico | Rol | Plan | Descripción y Alcance |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Sebastian Gavilan** | `sebastian@gavify.io` | `super_admin` | **SebaGod Prime** | **Creador / Super Admin:** Control total sobre organizaciones, administradores y planes. Acceso a todas las funciones y pruebas del sistema. |
| **2** | **Valentina Ruiz** | `valentina@gavify.io` | `admin` | **SebaGod** | **Administradora:** Gestiona los usuarios y playlists de su propia organización (*Sebas Music Hub*). |
| **3** | **Camila Romero** | `camila@gavify.io` | `usuario` | **Gratis** | **Plan Gratis ($0.00):** Biblioteca básica, búsqueda en APIs de streaming y reproducción de música. |
| **4** | **Mateo López** | `mateo@gavify.io` | `usuario` | **Provilan Pro** | **Plan Provilan Pro ($3.99):** Playlists ilimitadas y estadísticas semanales de ritmo de escucha sincronizadas. |
| **5** | **Lucía Martínez** | `lucia@gavify.io` | `usuario` | **SebaGod** | **Plan SebaGod ($7.99):** Detección activa de canciones repetidas en playlists y audio en alta fidelidad. |
| **6** | **Julián Torres** | `julian@gavify.io` | `usuario` | **SebaGod Prime** | **Plan SebaGod Prime ($12.99):** Acceso total multi-plataforma, reproductor de video completo, letras en vivo y soporte prioritario. |

---

## ⚡ Acceso Rápido en la Interfaz (1 Clic)

En la pantalla de inicio de sesión (`/login`), se encuentran botones de **acceso rápido** para cada uno de estos 6 perfiles. Al hacer clic en cualquiera de ellos:
1. Se autocompletan las credenciales.
2. Se inicia sesión automáticamente.
3. El sistema carga el contexto del usuario (`usuario_id`, `organizacion_id`, `rol` y `plan_id`) en `localStorage`.

---

## 🏢 Organizaciones de Prueba (Multi-Tenancy)

| Organización | Slug | ID en Base de Datos | Tipo | Usuarios Pertenecientes |
| :--- | :--- | :--- | :--- | :--- |
| **Sebas Music Hub** | `sebas-music-hub` | `11111111-1111-1111-1111-111111111111` | Estudio | Sebastian, Valentina, Camila, Mateo, Lucía, Julián |
| **Radio Urbana Records** | `radio-urbana` | `22222222-2222-2222-2222-222222222222` | Radio | Organización secundaria para pruebas de aislamiento RLS |

---

## 🛡️ Pruebas de Permisos Recomendadas

1. **Prueba como Usuario Común (`camila@gavify.io`):**
   - Comprueba que la barra lateral **no** muestra la opción de administrar usuarios.
   - Si intentas escribir directamente en la barra de direcciones `http://localhost:5173/seguridad`, Vue Router Navigation Guard te redirige automáticamente al Dashboard.

2. **Prueba como Administrador (`valentina@gavify.io`):**
   - Comprueba que sí aparece el panel de administración de usuarios.
   - Comprueba que solo puede administrar a los usuarios de *Sebas Music Hub* y no los de *Radio Urbana Records*.

3. **Prueba como Super Admin (`sebastian@gavify.io`):**
   - Acceso global a todas las métricas, usuarios y funciones del sistema.

