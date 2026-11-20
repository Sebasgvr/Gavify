<template>
  <main class="privacy-page">
    <div class="privacy-card">
      <div class="privacy-head">
        <span class="badge">GAVIFY · POLÍTICA DE PRIVACIDAD</span>
        <h1>Política de Privacidad</h1>
        <p class="updated">Última actualización: 19 de noviembre de 2026</p>
      </div>

      <section class="privacy-section">
        <h2>1. Información que recopilamos</h2>
        <p>
          Gavify únicamente solicita acceso a la información estrictamente necesaria cuando decides vincular tu
          cuenta de <strong>Spotify</strong> o <strong>Google / YouTube Music</strong>:
        </p>
        <ul>
          <li>Tu nombre de perfil y correo electrónico asociados a la cuenta conectada.</li>
          <li>Tus listas de reproducción (playlists) y las canciones incluidas en ellas (solo lectura).</li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>2. Cómo usamos tus datos</h2>
        <p>
          Usamos los permisos otorgados (como <code>youtube.readonly</code> en Google o lectura de playlists en Spotify)
          exclusivamente para importar, sincronizar, detectar canciones repetidas y organizar tus playlists dentro de
          tu cuenta de Gavify.
        </p>
        <p>
          <strong>No vendemos, alquilamos ni compartimos</strong> tus datos personales ni tu historial musical con
          terceros.
        </p>
      </section>

      <section class="privacy-section">
        <h2>3. Almacenamiento y revocación de acceso</h2>
        <p>
          Los tokens de acceso se guardan únicamente en tu navegador para mantener tu sesión conectada. Puedes
          desvincular tus cuentas en cualquier momento desde la sección <strong>Apps Conectadas</strong> de Gavify o
          revocar los permisos directamente desde la configuración de seguridad de tu cuenta de Google o Spotify.
        </p>
      </section>

      <section class="privacy-section">
        <h2>4. Contacto</h2>
        <p>
          Si tienes preguntas sobre esta Política de Privacidad o deseas solicitar la eliminación de tus datos, puedes
          escribirnos a <a href="mailto:gavilansebastian777@gmail.com">gavilansebastian777@gmail.com</a>.
        </p>
      </section>

      <div class="privacy-actions">
        <button class="btn-back" @click="$router.push('/')">Volver a Gavify</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.privacy-page {
  min-height: 100vh;
  padding: 48px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: radial-gradient(circle at top, rgba(29, 185, 84, 0.1), #0b0b0e 55%);
  color: #f3f4f6;
}

.privacy-card {
  width: 100%;
  max-width: 760px;
  background: rgba(20, 20, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 36px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.privacy-head {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 20px;
  margin-bottom: 24px;
}

.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #1ed760;
  margin-bottom: 10px;
}

h1 {
  margin: 0 0 6px;
  font-size: 2rem;
  font-weight: 800;
}

.updated {
  margin: 0;
  font-size: 0.88rem;
  color: #9ca3af;
}

.privacy-section {
  margin-bottom: 22px;
}

.privacy-section h2 {
  font-size: 1.12rem;
  margin: 0 0 8px;
  color: #ffffff;
}

.privacy-section p,
.privacy-section li {
  color: #d1d5db;
  line-height: 1.65;
  font-size: 0.96rem;
}

.privacy-section ul {
  padding-left: 20px;
  margin: 8px 0;
}

code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.88rem;
}

a {
  color: #1ed760;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.privacy-actions {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.btn-back {
  background: #1ed760;
  color: #08110b;
  border: none;
  border-radius: 999px;
  padding: 10px 22px;
  font-weight: 700;
  cursor: pointer;
}

.btn-back:hover {
  filter: brightness(1.06);
}
</style>
