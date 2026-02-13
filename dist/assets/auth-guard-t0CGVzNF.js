const h=["/signin.html","/signup.html","/index-2.html","/404.html","/coming-soon.html"];function i(){const e=window.location.pathname;return h.some(t=>e.endsWith(t))}function a(){const e=window.location.pathname+window.location.search;sessionStorage.setItem("intended_url",e)}function f(){const e=sessionStorage.getItem("intended_url");sessionStorage.removeItem("intended_url"),window.location.href=e||"/index.html"}async function s(){try{return window.supabaseClient||(console.warn("Esperando inicialización de Supabase..."),await new Promise(t=>setTimeout(t,500))),window.supabaseAuthReady&&(console.log("⏳ Esperando a que Supabase auth esté listo..."),await window.supabaseAuthReady,console.log("✅ Supabase auth listo")),await window.checkAuth()?(console.log("✅ Usuario autenticado, acceso permitido"),!0):(console.log("⚠️ Usuario no autenticado, redirigiendo al login..."),a(),window.location.href="/signin.html",!1)}catch(e){return console.error("Error en auth guard:",e),window.location.href="/signin.html",!1}}async function c(){if(i()){console.log("📄 Página pública, no requiere autenticación");return}g(),await s()&&m()}function g(){if(!document.getElementById("auth-loading")){const e=document.createElement("div");e.id="auth-loading",e.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `,e.innerHTML=`
      <div style="text-align: center;">
        <svg class="animate-spin h-12 w-12 mx-auto text-success-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-bgray-600 dark:text-white">Verificando autenticación...</p>
      </div>
    `,document.body.appendChild(e)}}function m(){const e=document.getElementById("auth-loading");e&&e.remove()}async function l(){try{return(await window.getCurrentUser()).user}catch(e){return console.error("Error al obtener info del usuario:",e),null}}function u(e){if(!e)return;document.querySelectorAll(".user-email").forEach(n=>{n.textContent=e.email});const t=e.user_metadata?.full_name||e.email.split("@")[0];document.querySelectorAll(".user-name").forEach(n=>{n.textContent=t});const r=w(t);document.querySelectorAll(".user-avatar").forEach(n=>{n.tagName==="IMG"?n.src=e.user_metadata?.avatar_url||`https://ui-avatars.com/api/?name=${encodeURIComponent(t)}&background=10b981&color=fff`:n.textContent=r})}function w(e){if(!e)return"??";const t=e.trim().split(" ");return t.length===1?t[0].substring(0,2).toUpperCase():(t[0][0]+t[t.length-1][0]).toUpperCase()}function d(){document.querySelectorAll('.logout-button, [data-action="logout"]').forEach(e=>{e.addEventListener("click",async t=>{if(t.preventDefault(),!!confirm("¿Estás seguro de que quieres cerrar sesión?"))try{(await window.signOut()).success?window.location.href="/signin.html":alert("Error al cerrar sesión")}catch(n){console.error("Error al cerrar sesión:",n),alert("Error al cerrar sesión")}})})}async function o(){if(await c(),!i()){const e=await l();e&&(u(e),d())}}window.authGuard={protectPage:s,checkAuthOnLoad:c,getUserInfo:l,displayUserInfo:u,setupLogoutButtons:d,initAuthGuard:o,isPublicPage:i,redirectToIntended:f,saveIntendedUrl:a};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o):o();console.log("✅ Auth guard module loaded");
