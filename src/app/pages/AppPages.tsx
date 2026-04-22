import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../services/auth/auth.service";
import { getSupabaseClient } from "../../services/supabase/client";
import { businessInfoService, type BusinessInfoInput } from "../../services/business/business-info.service";
import { subscriptionStatusService } from "../../services/subscription/subscription-status.service";
import { subscriptionManagementService } from "../../services/subscription/subscription-management.service";
import type { BillingInterval, BillingPlan } from "../../shared/types/domain";
import { DEFAULT_PLAN_CONFIGS, fetchPlanConfigs, type PlanConfig } from "../../services/plans/plans-config.service";
import { useAuth } from "../providers/AuthProvider";
import { ErrorState } from "../components/states/ErrorState";
import { resolveSafeRedirectPath } from "../routing/route-metadata";
import logoColor from "../../../assets/images/logo/logo-color.svg";
import logoWhite from "../../../assets/images/logo/logo-white.svg";
import { AvisoLegalContent, CondicionesLegalesContent, PoliticaCookiesContent, PoliticaPrivacidadContent } from "./legal/LegalContent";

interface PublicLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PublicLayout({ title, subtitle, children }: PublicLayoutProps): import("react").JSX.Element {
  return (
    <div className="pilot-public">
      <div className="pilot-public__card">
        <p className="pilot-public__brand">Facturales</p>
        <h1 className="pilot-public__title">{title}</h1>
        {subtitle ? <p className="pilot-public__subtitle">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}

function resolveRedirectFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  const resolved = resolveSafeRedirectPath(params.get("redirect"), "/dashboard");

  const blockedAuthRoutes = ["/signin", "/signup", "/verify-email", "/confirm-email", "/reset-password"];
  if (blockedAuthRoutes.some((route) => resolved === route || resolved.startsWith(`${route}?`) || resolved.startsWith(`${route}#`))) {
    return "/dashboard";
  }

  return resolved;
}

const AUTH_LEGAL_LINKS: Array<{ to: string; label: string }> = [
  { to: "/condiciones-legales", label: "Condiciones Legales" },
  { to: "/politica-de-privacidad", label: "Política de Privacidad" },
  { to: "/aviso-legal", label: "Aviso Legal" },
  { to: "/politica-de-cookies", label: "Política de Cookies" },
];

function mapAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Debes confirmar tu email antes de iniciar sesión.";
  }
  if (normalized.includes("rate limit")) {
    return "Has superado el límite de intentos. Espera unos minutos y vuelve a intentarlo.";
  }
  if (normalized.includes("already registered")) {
    return "Este email ya está registrado.";
  }
  if (normalized.includes("user already registered")) {
    return "Este email ya está registrado.";
  }
  if (normalized.includes("google")) {
    return "Esta cuenta está vinculada a Google. Usa el acceso con Google.";
  }

  return message;
}

function GoogleMarkIcon(): import("react").JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M20.8758 11.2137C20.8758 10.4224 20.8103 9.84485 20.6685 9.24597H11.4473V12.8179H16.8599C16.7508 13.7055 16.1615 15.0424 14.852 15.9406L14.8336 16.0602L17.7492 18.2737L17.9512 18.2935C19.8063 16.6144 20.8758 14.144 20.8758 11.2137Z"
        fill="#4285F4"
      />
      <path
        d="M11.4467 20.625C14.0984 20.625 16.3245 19.7694 17.9506 18.2936L14.8514 15.9408C14.022 16.5076 12.9089 16.9033 11.4467 16.9033C8.84946 16.9033 6.64512 15.2243 5.85933 12.9036L5.74415 12.9131L2.7125 15.2125L2.67285 15.3205C4.28791 18.4647 7.60536 20.625 11.4467 20.625Z"
        fill="#34A853"
      />
      <path
        d="M5.86006 12.9036C5.65272 12.3047 5.53273 11.663 5.53273 11C5.53273 10.3369 5.65272 9.69524 5.84915 9.09636L5.84366 8.96881L2.774 6.63257L2.67357 6.67938C2.00792 7.98412 1.62598 9.44929 1.62598 11C1.62598 12.5507 2.00792 14.0158 2.67357 15.3205L5.86006 12.9036Z"
        fill="#FBBC05"
      />
      <path
        d="M11.4467 5.09664C13.2909 5.09664 14.5349 5.87733 15.2443 6.52974L18.0161 3.8775C16.3138 2.32681 14.0985 1.375 11.4467 1.375C7.60539 1.375 4.28792 3.53526 2.67285 6.6794L5.84844 9.09638C6.64514 6.77569 8.84949 5.09664 11.4467 5.09664Z"
        fill="#EB4335"
      />
    </svg>
  );
}

function EyeOffIcon(): import("react").JSX.Element {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M2 1L20 19" stroke="#718096" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M9.58445 8.58704C9.20917 8.96205 8.99823 9.47079 8.99805 10.0013C8.99786 10.5319 9.20844 11.0408 9.58345 11.416C9.95847 11.7913 10.4672 12.0023 10.9977 12.0024C11.5283 12.0026 12.0372 11.7921 12.4125 11.417"
        stroke="#718096"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.363 3.36506C9.22042 3.11978 10.1082 2.9969 11 3.00006C15 3.00006 18.333 5.33306 21 10.0001C20.222 11.3611 19.388 12.5241 18.497 13.4881M16.357 15.3491C14.726 16.4491 12.942 17.0001 11 17.0001C7 17.0001 3.667 14.6671 1 10.0001C2.369 7.60506 3.913 5.82506 5.632 4.65906"
        stroke="#718096"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOnIcon(): import("react").JSX.Element {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M1 10C1 10 5 2 11 2C17 2 21 10 21 10C21 10 17 18 11 18C5 18 1 10 1 10Z" stroke="#718096" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M11 13C12.6569 13 14 11.6569 14 10C14 8.34315 12.6569 7 11 7C9.34315 7 8 8.34315 8 10C8 11.6569 9.34315 13 11 13Z"
        stroke="#718096"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AuthFooter(): import("react").JSX.Element {
  return (
    <footer className="auth-footer">
      <nav>
        {AUTH_LEGAL_LINKS.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p>&copy; 2026 Facturales. Todos los derechos reservados.</p>
    </footer>
  );
}

interface AuthLayoutProps {
  page: "signin" | "signup";
  children: ReactNode;
  rightPane: ReactNode;
}

function AuthLayout({ page, children, rightPane }: AuthLayoutProps): import("react").JSX.Element {
  return (
    <section className={`auth-page auth-page--${page}`}>
      <div className="auth-shell">
        <div className="auth-left">
          <header className="auth-brand">
            <Link to="/signin" aria-label="Facturales">
              <img src={logoColor} className="auth-logo auth-logo--light" alt="Facturales" />
              <img src={logoWhite} className="auth-logo auth-logo--dark" alt="Facturales" />
            </Link>
          </header>
          <div className="auth-form-wrap">{children}</div>
          <AuthFooter />
        </div>
        <div className="auth-divider-vertical" />
        <aside className="auth-right" aria-hidden>
          {rightPane}
        </aside>
      </div>
    </section>
  );
}

const SIGNIN_LAPTOP_MARKUP = `
<div class="lm">
  <div class="lm-sf">
    <div class="lm-sc">
      <div class="lm-tb">
        <div class="lm-brand"><span class="lm-logo"></span><span class="lm-bn">FACTURALES</span></div>
        <div class="lm-hl">Panel de control</div>
        <div class="lm-sr"></div>
        <div class="lm-acts"><span class="lm-ic"></span><span class="lm-ic"></span><span class="lm-ic"></span><span class="lm-ic"></span></div>
      </div>
      <div class="lm-ly">
        <aside class="lm-sb">
          <div class="lm-st">Menu</div>
          <div class="lm-ni act"><span class="lm-dot" style="background:rgba(251,176,83,.35)"></span>Panel de control</div>
          <div class="lm-ni"><span class="lm-dot" style="background:rgba(251,176,83,.35)"></span>Facturas</div>
          <div class="lm-sub"><div class="lm-subi">Emitir factura</div><div class="lm-subi">Borradores</div><div class="lm-subi">Facturas emitidas</div></div>
          <div class="lm-ni"><span class="lm-dot" style="background:rgba(74,163,255,.30)"></span>Presupuestos</div>
          <div class="lm-ni"><span class="lm-dot" style="background:rgba(255,255,255,.20)"></span>Transacciones</div>
          <div class="lm-ni"><span class="lm-dot" style="background:rgba(49,209,123,.28)"></span>Integraciones</div>
          <div class="lm-ni"><span class="lm-dot" style="background:rgba(255,77,95,.25)"></span>Contactos</div>
          <div class="lm-dv"></div>
          <div class="lm-st">Ayuda</div>
          <div class="lm-ni"><span class="lm-dot" style="background:rgba(255,255,255,.20)"></span>Soporte</div>
          <div class="lm-ni"><span class="lm-dot" style="background:rgba(255,255,255,.20)"></span>Configuración</div>
        </aside>
        <div class="lm-mn">
          <div class="lm-cds">
            <div class="lm-cd">
              <div class="lm-ch"><span class="lm-bg lm-bg-g">$</span><span class="lm-ct">Ingresos Totales</span></div>
              <div class="lm-mr"><span class="lm-cv">14.409\u00a0\u20ac</span><svg class="lm-spk" viewBox="0 0 120 36"><path class="sl sl--g" d="M2,28 L16,26 L28,30 L40,18 L54,22 L66,10 L78,16 L90,8 L106,14 L118,6"/><path class="sg sg--g" d="M2,28 L16,26 L28,30 L40,18 L54,22 L66,10 L78,16 L90,8 L106,14 L118,6"/></svg></div>
              <div class="lm-cm"><span class="lm-tu">&#9650; 100%</span> <span style="color:var(--m)">/ Ene</span></div>
            </div>
            <div class="lm-cd">
              <div class="lm-ch"><span class="lm-bg lm-bg-r">$</span><span class="lm-ct">Gastos Totales</span></div>
              <div class="lm-mr"><span class="lm-cv">4.000\u00a0\u20ac</span><svg class="lm-spk" viewBox="0 0 120 36"><path class="sl sl--r" d="M2,10 L16,18 L28,14 L40,22 L54,16 L66,26 L78,20 L90,28 L106,24 L118,30"/><path class="sg sg--r" d="M2,10 L16,18 L28,14 L40,22 L54,16 L66,26 L78,20 L90,28 L106,24 L118,30"/></svg></div>
              <div class="lm-cm"><span class="lm-td">&#9660; 100%</span> <span style="color:var(--m)">/ Ene</span></div>
            </div>
            <div class="lm-cd">
              <div class="lm-ch"><span class="lm-bg lm-bg-b">$</span><span class="lm-ct">Balance</span></div>
              <div class="lm-mr"><span class="lm-cv">10.409\u00a0\u20ac</span><svg class="lm-spk" viewBox="0 0 120 36"><path class="sl sl--b" d="M2,26 L16,22 L28,24 L40,20 L54,18 L66,16 L78,18 L90,14 L106,12 L118,10"/><path class="sg sg--b" d="M2,26 L16,22 L28,24 L40,20 L54,18 L66,16 L78,18 L90,14 L106,12 L118,10"/></svg></div>
              <div class="lm-cm"><span class="lm-tu">&#9650; 100%</span> <span style="color:var(--m)">/ Ene</span></div>
            </div>
          </div>
          <div class="lm-gr">
            <div class="lm-pn" style="display:flex;flex-direction:column;">
              <div class="lm-ph">
                <span class="lm-pt">Mi Evolución</span>
                <div class="lm-lg"><span class="lm-ld lm-ld-g"></span>Ingresos <span class="lm-ld lm-ld-r"></span>Gastos <span class="lm-pill">Año Natural</span></div>
              </div>
              <div class="lm-chart">
                <div class="lm-cgrid"></div>
                <svg class="lm-csvg" viewBox="0 0 640 240"><path class="cl cl-g" d="M20,210 C90,190 130,80 190,120 C250,160 300,95 350,105 C410,117 450,60 510,90 C570,120 600,70 620,50"/><path class="cl cl-r" d="M20,210 C90,200 130,160 190,170 C250,180 300,140 350,150 C410,160 450,130 510,140 C570,150 600,120 620,110"/><path class="cg cg-g" d="M20,210 C90,190 130,80 190,120 C250,160 300,95 350,105 C410,117 450,60 510,90 C570,120 600,70 620,50"/><path class="cg cg-r" d="M20,210 C90,200 130,160 190,170 C250,180 300,140 350,150 C410,160 450,130 510,140 C570,150 600,120 620,110"/></svg>
                <div class="lm-scan"></div>
              </div>
              <div class="lm-ax"><span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span></div>
            </div>
            <div class="lm-pn">
              <div class="lm-ph"><span class="lm-pt">Objetivos</span><span class="lm-pill">Año Natural</span></div>
              <div class="lm-goal">
                <div class="lm-gl">OBJETIVO DE INGRESOS</div>
                <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px"><span class="lm-gv">14.409\u00a0\u20ac</span><span class="lm-gs">de 50.000\u00a0\u20ac</span></div>
                <div class="lm-prog"><div class="lm-progb" style="--p:29%"></div></div>
                <div class="lm-gf"><span class="lm-gp">29%</span><span class="lm-gre">Faltan 35.591\u00a0\u20ac</span></div>
              </div>
              <div class="lm-mi">
                <div class="lm-mii lm-mig"><div class="lm-mico">&uarr;</div><div class="lm-min">14.409\u00a0\u20ac</div><div class="lm-mit">Ingresos</div></div>
                <div class="lm-mii lm-mir"><div class="lm-mico">&darr;</div><div class="lm-min">4.000\u00a0\u20ac</div><div class="lm-mit">Gastos</div></div>
                <div class="lm-mii lm-mib"><div class="lm-mico">&asymp;</div><div class="lm-min">10.409\u00a0\u20ac</div><div class="lm-mit">Beneficio</div></div>
              </div>
              <div class="lm-sts">
                <div class="lm-str"><span>Facturas emitidas</span><b>8</b></div>
                <div class="lm-str"><span>Pendientes de cobro</span><b>1</b></div>
                <div class="lm-str"><span>Presupuestos activos</span><b>3</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="lm-base"><div class="lm-bsh"></div><div class="lm-bt"></div><div class="lm-hn"></div></div>
</div>
`;

function SignInShowcase({ coverEyes }: { coverEyes: boolean }): import("react").JSX.Element {
  const robotRef = useRef<SVGSVGElement | null>(null);
  const eyesMoveRef = useRef<SVGGElement | null>(null);
  const pupilLeftRef = useRef<SVGEllipseElement | null>(null);
  const pupilRightRef = useRef<SVGEllipseElement | null>(null);
  const eyesOpenRef = useRef<SVGGElement | null>(null);
  const eyesClosedRef = useRef<SVGGElement | null>(null);
  const mouthRef = useRef<SVGPathElement | null>(null);
  const LEFT_PUPIL_BASE_X = 96;
  const RIGHT_PUPIL_BASE_X = 156;
  const PUPIL_BASE_Y = 87;

  useEffect(() => {
    let mouseX = window.innerWidth * 0.5;
    let mouseY = window.innerHeight * 0.5;
    const maxTravel = 8;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    document.addEventListener("mousemove", onMouseMove);

    let animationFrame = 0;
    const tick = () => {
      if (!coverEyes && robotRef.current && eyesMoveRef.current) {
        const bounds = robotRef.current.getBoundingClientRect();
        const centerX = bounds.left + bounds.width * 0.5;
        const centerY = bounds.top + bounds.height * 0.3;
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = Math.min(maxTravel, distance * 0.015);
        const offsetX = (dx / distance) * force;
        const offsetY = (dy / distance) * force * 0.7;

        eyesMoveRef.current.setAttribute("transform", `translate(${offsetX},${offsetY})`);
        if (pupilLeftRef.current) {
          pupilLeftRef.current.setAttribute("cx", `${LEFT_PUPIL_BASE_X + offsetX * 0.5}`);
          pupilLeftRef.current.setAttribute("cy", `${PUPIL_BASE_Y + offsetY * 0.5}`);
        }
        if (pupilRightRef.current) {
          pupilRightRef.current.setAttribute("cx", `${RIGHT_PUPIL_BASE_X + offsetX * 0.5}`);
          pupilRightRef.current.setAttribute("cy", `${PUPIL_BASE_Y + offsetY * 0.5}`);
        }
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [coverEyes]);

  useEffect(() => {
    if (eyesOpenRef.current && eyesClosedRef.current) {
      eyesOpenRef.current.style.display = coverEyes ? "none" : "";
      eyesClosedRef.current.style.display = coverEyes ? "" : "none";
    }

    if (mouthRef.current) {
      mouthRef.current.setAttribute("d", coverEyes ? "M114 118 Q130 128 146 118" : "M116 118 Q130 128 144 118");
      mouthRef.current.setAttribute("opacity", coverEyes ? "0.75" : "0.55");
    }

    if (!coverEyes && eyesMoveRef.current) {
      eyesMoveRef.current.setAttribute("transform", "translate(0,0)");
      pupilLeftRef.current?.setAttribute("cx", String(LEFT_PUPIL_BASE_X));
      pupilLeftRef.current?.setAttribute("cy", String(PUPIL_BASE_Y));
      pupilRightRef.current?.setAttribute("cx", String(RIGHT_PUPIL_BASE_X));
      pupilRightRef.current?.setAttribute("cy", String(PUPIL_BASE_Y));
    }
  }, [coverEyes, LEFT_PUPIL_BASE_X, PUPIL_BASE_Y, RIGHT_PUPIL_BASE_X]);

  return (
    <div className="lm-wrap">
      <svg ref={robotRef} className="lm-robot" viewBox="0 0 260 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: "none" }}>
        <defs>
          <linearGradient id="rg-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EEF0F6" /><stop offset="100%" stopColor="#D4D8E4" /></linearGradient>
          <linearGradient id="rg-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F2F4FA" /><stop offset="40%" stopColor="#E4E8F0" /><stop offset="100%" stopColor="#D0D4E0" /></linearGradient>
          <linearGradient id="rg-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4A3828" /><stop offset="100%" stopColor="#2E1E12" /></linearGradient>
          <linearGradient id="rg-eye" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stopColor="#F4B898" /><stop offset="100%" stopColor="#E89070" /></linearGradient>
        </defs>
        {/* Shadow */}
        <ellipse cx="130" cy="288" rx="54" ry="8" fill="black" opacity="0.06" />
        {/* Body */}
        <ellipse cx="130" cy="230" rx="62" ry="56" fill="url(#rg-body)" stroke="#2B2D42" strokeWidth="2.8" />
        <ellipse cx="122" cy="218" rx="32" ry="24" fill="white" opacity="0.14" />
        {/* Collar line */}
        <path d="M84 200 Q130 214 176 200" stroke="#2B2D42" strokeWidth="1.5" fill="none" opacity="0.25" />
        {/* Left arm */}
        <ellipse cx="60" cy="228" rx="18" ry="28" fill="url(#rg-body)" stroke="#2B2D42" strokeWidth="2.3" transform="rotate(-6 60 228)" />
        {/* Right arm */}
        <ellipse cx="200" cy="228" rx="18" ry="28" fill="url(#rg-body)" stroke="#2B2D42" strokeWidth="2.3" transform="rotate(6 200 228)" />
        {/* Neck */}
        <rect x="106" y="158" width="48" height="24" rx="14" fill="#DDE0EA" stroke="#2B2D42" strokeWidth="2" />
        {/* Left ear */}
        <ellipse cx="34" cy="92" rx="15" ry="22" fill="#D8DCE8" stroke="#2B2D42" strokeWidth="2.3" />
        {/* Right ear */}
        <ellipse cx="226" cy="92" rx="15" ry="22" fill="#D8DCE8" stroke="#2B2D42" strokeWidth="2.3" />
        {/* Head */}
        <rect x="36" y="18" width="188" height="148" rx="66" fill="url(#rg-head)" stroke="#2B2D42" strokeWidth="3" />
        {/* Helmet shine spots */}
        <ellipse cx="72" cy="40" rx="6" ry="4.5" fill="white" opacity="0.55" />
        <ellipse cx="62" cy="50" rx="3.5" ry="2.5" fill="white" opacity="0.35" />
        {/* Helmet top shine band */}
        <ellipse cx="118" cy="36" rx="54" ry="14" fill="white" opacity="0.10" />
        {/* Visor */}
        <rect x="50" y="44" width="160" height="110" rx="40" fill="url(#rg-visor)" stroke="#2B2D42" strokeWidth="2.2" />
        {/* Visor inner shine */}
        <ellipse cx="118" cy="64" rx="52" ry="16" fill="white" opacity="0.06" />
        {/* Eyes open */}
        <g ref={eyesOpenRef}>
          <g ref={eyesMoveRef}>
            <path d="M78 96 A22 20 0 0 1 122 96 Z" fill="url(#rg-eye)" />
            <path d="M138 96 A22 20 0 0 1 182 96 Z" fill="url(#rg-eye)" />
          </g>
          <ellipse ref={pupilLeftRef} cx={LEFT_PUPIL_BASE_X} cy={PUPIL_BASE_Y} rx="6" ry="5" fill="white" opacity="0.3" />
          <ellipse ref={pupilRightRef} cx={RIGHT_PUPIL_BASE_X} cy={PUPIL_BASE_Y} rx="6" ry="5" fill="white" opacity="0.3" />
        </g>
        {/* Eyes closed */}
        <g ref={eyesClosedRef} style={{ display: "none" }}>
          <path d="M78 90 Q100 72 122 90" stroke="#E89070" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M138 90 Q160 72 182 90" stroke="#E89070" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </g>
        {/* Mouth */}
        <path ref={mouthRef} d="M116 118 Q130 128 144 118" stroke="#E89070" strokeWidth="2.5" strokeLinecap="round" fill="#E89070" opacity="0.55" />
      </svg>
      <div dangerouslySetInnerHTML={{ __html: SIGNIN_LAPTOP_MARKUP }} />
    </div>
  );
}

function SignUpShowcase(): import("react").JSX.Element {
  return (
    <div className="auth-showcase">
      {/* Card 1: Factura */}
      <article className="auth-card auth-card--one">
        <div className="auth-card__header">
          <span className="auth-card__icon auth-card__icon--orange">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EC8228" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>
          </span>
          <span className="auth-card__title">Factura #0042</span>
        </div>
        <div className="auth-card__inline">
          <span>Cliente: Acme S.L.</span>
          <strong className="auth-accent-success">Pagada</strong>
        </div>
        <p className="auth-card__amount">1.250,00&nbsp;&euro;</p>
      </article>

      {/* Card 2: Gasto */}
      <article className="auth-card auth-card--two">
        <div className="auth-card__header">
          <span className="auth-card__icon auth-card__icon--red">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M21 4H3"/><path d="M10 4v16"/><path d="M21 12H10"/><circle cx="6" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>
          </span>
          <span className="auth-card__title">Gasto</span>
        </div>
        <p className="auth-card__muted">Material oficina</p>
        <div className="auth-card__inline">
          <span>Hoy, 14:32</span>
          <strong className="auth-accent-danger">-89,50&nbsp;&euro;</strong>
        </div>
      </article>

      {/* Card 3: Enviado */}
      <article className="auth-card auth-card--three">
        <div className="auth-card__header">
          <span className="auth-card__icon auth-card__icon--blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </span>
          <span className="auth-card__title">Enviado</span>
        </div>
        <div className="auth-card__check-row">
          <span className="auth-card__check-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
          <span className="auth-card__muted">Factura #0042</span>
        </div>
        <p className="auth-card__muted auth-card__muted--light">acme@empresa.com</p>
      </article>

      {/* Card 4: Presupuesto */}
      <article className="auth-card auth-card--four">
        <div className="auth-card__header">
          <span className="auth-card__icon auth-card__icon--purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
          </span>
          <span className="auth-card__title">Presupuesto</span>
        </div>
        <div className="auth-card__inline">
          <span>Web Redise&ntilde;o</span>
          <strong className="auth-accent-warn">Pendiente</strong>
        </div>
      </article>

      {/* Card 5: Objetivo Q1 */}
      <article className="auth-card auth-card--five">
        <div className="auth-card__header">
          <span className="auth-card__icon auth-card__icon--amber">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </span>
          <span className="auth-card__title">Objetivo Q1</span>
        </div>
        <div className="auth-progress">
          <div className="auth-progress__bar" />
        </div>
        <div className="auth-card__inline">
          <span>72% alcanzado</span>
          <strong className="auth-accent-amber">18k/25k</strong>
        </div>
      </article>

      {/* Card 6: Balance */}
      <article className="auth-card auth-card--six">
        <div className="auth-card__header">
          <span className="auth-card__icon auth-card__icon--green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </span>
          <span className="auth-card__title">Balance</span>
        </div>
        <div className="auth-card__balance-row">
          <span className="auth-balance">+3.480&nbsp;&euro;</span>
          <span className="auth-card__muted auth-card__muted--light">este&nbsp;trimestre</span>
        </div>
      </article>
    </div>
  );
}

export function SignInPage(): import("react").JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [coverEyes, setCoverEyes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    navigate(resolveRedirectFromSearch(location.search), { replace: true });
  }, [location.search, navigate, user]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("facturales_last_login_email");
    if (!rememberedEmail) return;

    setEmail(rememberedEmail);
    setRemember(true);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFlash(null);
    setSubmitting(true);
    const result = await authService.signIn({ email, password });
    setSubmitting(false);

    if (!result.success) {
      const message = mapAuthErrorMessage(result.error.message);
      setError(message);
      if (message.toLowerCase().includes("confirmar")) {
        sessionStorage.setItem("verify_email_address", email.trim());
        setTimeout(() => {
          navigate("/verify-email", { replace: true });
        }, 1500);
      }
      return;
    }

    if (remember) {
      localStorage.setItem("facturales_last_login_email", email.trim().toLowerCase());
    } else {
      localStorage.removeItem("facturales_last_login_email");
    }

    navigate(resolveRedirectFromSearch(location.search), { replace: true });
  };

  const signInWithGoogle = async () => {
    setError(null);
    setFlash(null);
    setOauthSubmitting(true);
    const result = await authService.signInWithGoogle("/signin");
    if (!result.success) {
      setError(mapAuthErrorMessage(result.error.message));
      setOauthSubmitting(false);
      return;
    }
    setFlash("Redirigiendo a Google...");
  };

  return (
    <AuthLayout page="signin" rightPane={<SignInShowcase coverEyes={coverEyes} />}>
      <header>
        <h1 className="auth-form-title">Inicia sesión en Facturales.</h1>
        <p className="auth-form-subtitle">Envía, gasta y ahorra de forma inteligente</p>
      </header>

      <button type="button" className="auth-google-btn" onClick={() => void signInWithGoogle()} disabled={oauthSubmitting || submitting}>
        <GoogleMarkIcon />
        <span>{oauthSubmitting ? "Redirigiendo..." : "Iniciar sesión con Google"}</span>
      </button>

      <div className="auth-divider" aria-hidden>
        <span>O continúa con</span>
      </div>

      <form className="auth-stack" onSubmit={(event) => void submit(event)}>
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="Correo electrónico"
          required
        />
        <div className="auth-password-wrap">
          <input
            className="auth-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onFocus={() => setCoverEyes(true)}
            onBlur={() => setCoverEyes(false)}
            autoComplete="current-password"
            placeholder="Contraseña"
            required
          />
          <button
            type="button"
            className="auth-toggle-btn"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOnIcon /> : <EyeOffIcon />}
          </button>
        </div>
        <div className="auth-row-between">
          <label className="auth-check-inline" htmlFor="remember-login">
            <input id="remember-login" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <span>Recordarme</span>
          </label>
          <Link to="/reset-password" className="auth-link-accent">
            Olvidaste tu contraseña?
          </Link>
        </div>
        {error ? <p className="auth-message auth-message--error">{error}</p> : null}
        {flash ? <p className="auth-message auth-message--success">{flash}</p> : null}
        <button type="submit" className="auth-primary-btn" disabled={submitting || oauthSubmitting}>
          {submitting ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="auth-secondary-text">
        No tienes una cuenta?{" "}
        <Link to="/signup" className="auth-link-inline">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  );
}

export function SignUpPage(): import("react").JSX.Element {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFlash(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!termsAccepted) {
      setError("Debes aceptar la política de privacidad para crear la cuenta.");
      return;
    }

    const metadata: Record<string, unknown> = {};
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (cleanFirstName) metadata.first_name = cleanFirstName;
    if (cleanLastName) metadata.last_name = cleanLastName;
    if (cleanFirstName || cleanLastName) {
      metadata.full_name = `${cleanFirstName} ${cleanLastName}`.trim();
    }

    setSubmitting(true);
    const result = await authService.signUp({ email, password, metadata });
    setSubmitting(false);

    if (!result.success) {
      setError(mapAuthErrorMessage(result.error.message));
      return;
    }

    setFlash("Registro completado. Revisa tu correo para verificar la cuenta.");
    sessionStorage.setItem("verify_email_address", email.trim());
    setTimeout(() => {
      navigate("/verify-email", { replace: true });
    }, 1300);
  };

  const signUpWithGoogle = async () => {
    setError(null);
    setFlash(null);
    setOauthSubmitting(true);
    const result = await authService.signInWithGoogle("/signup");
    if (!result.success) {
      setError(mapAuthErrorMessage(result.error.message));
      setOauthSubmitting(false);
      return;
    }
    setFlash("Redirigiendo a Google...");
  };

  return (
    <AuthLayout page="signup" rightPane={<SignUpShowcase />}>
      <header>
        <h1 className="auth-form-title">Crea una cuenta</h1>
        <p className="auth-form-subtitle">Envía, gasta y ahorra de forma inteligente</p>
      </header>

      <button type="button" className="auth-google-btn" onClick={() => void signUpWithGoogle()} disabled={oauthSubmitting || submitting}>
        <GoogleMarkIcon />
        <span>{oauthSubmitting ? "Redirigiendo..." : "Registrarse con Google"}</span>
      </button>

      <div className="auth-divider" aria-hidden>
        <span>O continúa con</span>
      </div>

      <form className="auth-stack" onSubmit={(event) => void submit(event)}>
        <div className="auth-grid-two">
          <input
            className="auth-input"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            placeholder="Nombre"
          />
          <input
            className="auth-input"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            placeholder="Apellido"
          />
        </div>
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="Correo electrónico"
          required
        />
        <div className="auth-password-wrap">
          <input
            className="auth-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="Contraseña"
            minLength={8}
            required
          />
          <button
            type="button"
            className="auth-toggle-btn"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOnIcon /> : <EyeOffIcon />}
          </button>
        </div>
        <div className="auth-password-wrap">
          <input
            className="auth-input"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="Confirmar contraseña"
            minLength={8}
            required
          />
          <button
            type="button"
            className="auth-toggle-btn"
            aria-label={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
            onClick={() => setShowConfirmPassword((prev) => !prev)}
          >
            {showConfirmPassword ? <EyeOnIcon /> : <EyeOffIcon />}
          </button>
        </div>
        <label className="auth-terms" htmlFor="signup-terms">
          <input
            id="signup-terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            required
          />
          <p>
            Al crear una cuenta, aceptas nuestra <Link to="/politica-de-privacidad">Política de privacidad</Link> y{" "}
            <Link to="/condiciones-legales">Política de comunicaciones electrónicas</Link>.
          </p>
        </label>
        {error ? <p className="auth-message auth-message--error">{error}</p> : null}
        {flash ? <p className="auth-message auth-message--success">{flash}</p> : null}
        <button type="submit" className="auth-primary-btn" disabled={submitting || oauthSubmitting}>
          {submitting ? "Registrando..." : "Registrarse"}
        </button>
      </form>

      <p className="auth-secondary-text">
        Ya tienes una cuenta?{" "}
        <Link to="/signin" className="auth-link-inline">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}

export function VerifyEmailPage(): import("react").JSX.Element {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const { user } = useAuth();

  const handleResend = async () => {
    if (!user?.email) {
      setResendMessage("No hay sesión activa. Vuelve a registrarte.");
      return;
    }
    setResendLoading(true);
    const { error } = await getSupabaseClient().auth.resend({ type: "signup", email: user.email });
    setResendLoading(false);
    setResendMessage(error ? `No se pudo reenviar: ${error.message}` : "Enlace reenviado. Revisa tu bandeja.");
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        <div className="verify-email-card__icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <p className="verify-email-card__brand">FACTURALES</p>
        <h1 className="verify-email-card__title">Confirma tu email</h1>
        <p className="verify-email-card__subtitle">
          {user?.email ? (
            <>Te hemos enviado un enlace de confirmación a <strong>{user.email}</strong>. Haz clic en el enlace para activar tu cuenta.</>
          ) : (
            <>Te hemos enviado un enlace de confirmación. Haz clic en el enlace para activar tu cuenta.</>
          )}
        </p>

        <div className="verify-email-card__tips">
          <p className="verify-email-card__tip">
            <span className="verify-email-card__tip-bullet">•</span>
            Revisa también tu carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>.
          </p>
          <p className="verify-email-card__tip">
            <span className="verify-email-card__tip-bullet">•</span>
            El enlace caduca a las 24 horas.
          </p>
        </div>

        <div className="verify-email-card__actions">
          <button
            type="button"
            className="pilot-btn pilot-btn--primary verify-email-card__btn"
            onClick={() => void handleResend()}
            disabled={resendLoading}
          >
            {resendLoading ? "Reenviando..." : "Reenviar email"}
          </button>
          <Link className="pilot-btn verify-email-card__btn" to="/signin">
            Ir a iniciar sesión
          </Link>
        </div>

        {resendMessage ? <p className="verify-email-card__flash">{resendMessage}</p> : null}
      </div>
    </div>
  );
}

export function ConfirmEmailPage(): import("react").JSX.Element {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Validando confirmación de correo...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const validate = async () => {
      const sessionResult = await authService.getCurrentSession();
      if (!active) return;

      if (!sessionResult.success || !sessionResult.data) {
        setError("No se detectó una sesión válida tras la confirmación.");
        setMessage("Puedes iniciar sesión manualmente.");
        return;
      }

      setError(null);
      setMessage("Correo confirmado correctamente. Redirigiendo...");
      setTimeout(() => {
        navigate("/complete-profile", { replace: true });
      }, 700);
    };
    void validate();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <PublicLayout title="Confirmación de correo">
      <p>{message}</p>
      {error ? <ErrorState title="No se pudo confirmar el correo" description={error} /> : null}
      <div className="pilot-actions">
        <Link className="pilot-btn" to="/signin">
          Iniciar sesión
        </Link>
      </div>
    </PublicLayout>
  );
}

export function ResetPasswordPage(): import("react").JSX.Element {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setError(null);
    setFlash("Contraseña actualizada. Ya puedes iniciar sesión.");
  };

  return (
    <PublicLayout title="Restablecer contraseña" subtitle="Define una nueva contraseña segura para tu cuenta.">
      <form className="pilot-grid" onSubmit={(event) => void submit(event)}>
        <label className="pilot-field">
          Nueva contraseña
          <input className="pilot-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </label>
        <label className="pilot-field">
          Confirmar contraseña
          <input
            className="pilot-input"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        <div className="pilot-actions">
          <button type="submit" className="pilot-btn pilot-btn--primary" disabled={submitting}>
            {submitting ? "Guardando..." : "Actualizar contraseña"}
          </button>
          <Link className="pilot-btn" to="/signin">
            Volver
          </Link>
        </div>
      </form>
      {flash ? <p className="pilot-info-text">{flash}</p> : null}
      {error ? <ErrorState title="No se pudo actualizar la contraseña" description={error} /> : null}
    </PublicLayout>
  );
}

type BusinessProfileMode = "complete" | "settings";

const EMPTY_PROFILE: BusinessInfoInput = {
  nombreFiscal: "",
  nifCif: "",
  nombreComercial: "",
  telefono: "",
  direccionFacturacion: "",
  ciudad: "",
  codigoPostal: "",
  provincia: "",
  pais: "España",
  sector: "",
  businessType: "autonomo",
  brandColor: "#EC8228",
};

function useBusinessProfileForm(): {
  form: BusinessInfoInput;
  setField: (field: keyof BusinessInfoInput, value: string) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  error: string | null;
  setError: (value: string | null) => void;
  flash: string | null;
  setFlash: (value: string | null) => void;
} {
  const [form, setForm] = useState<BusinessInfoInput>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const setField = (field: keyof BusinessInfoInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await businessInfoService.getMine();
      if (!active) return;

      if (!result.success) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      if (result.data) {
        setForm({
          nombreFiscal: result.data.nombreFiscal,
          nifCif: result.data.nifCif,
          nombreComercial: result.data.nombreComercial ?? "",
          telefono: result.data.telefono,
          direccionFacturacion: result.data.direccionFacturacion,
          ciudad: result.data.ciudad,
          codigoPostal: result.data.codigoPostal,
          provincia: result.data.provincia,
          pais: result.data.pais,
          sector: result.data.sector,
          businessType: result.data.businessType ?? "autonomo",
          brandColor: result.data.brandColor ?? "#EC8228",
        });
      }

      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return { form, setField, loading, setLoading, error, setError, flash, setFlash };
}

function BusinessProfileForm({ mode }: { mode: BusinessProfileMode }): import("react").JSX.Element {
  const { form, setField, loading, setLoading, error, setError, flash, setFlash } = useBusinessProfileForm();
  const navigate = useNavigate();
  const isCompleteMode = mode === "complete";
  const isEmpresa = form.businessType === "empresa";
  const nameLabel = isEmpresa ? "Nombre fiscal" : "Nombre / Nombre fiscal";
  const nameHint = isEmpresa
    ? "Razón social tal y como aparece en tu CIF (ej. AVENUE DIGITAL GROUP SL)."
    : "Tu nombre completo tal y como aparece en tu NIF (ej. Francisco Ruiz Chamorro).";

  const subtitle = isCompleteMode
    ? "Solo necesitamos estos datos para emitir facturas válidas. Tardarás menos de un minuto."
    : "Gestiona la información fiscal y comercial de tu negocio.";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      // En complete-profile fijamos España y color por defecto; sector queda opcional (null)
      pais: form.pais || "España",
      sector: form.sector && form.sector.trim() ? form.sector : null,
      brandColor: form.brandColor || "#ec8228",
    };
    const result = await businessInfoService.saveMine(payload);
    setLoading(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setError(null);
    setFlash("Perfil guardado correctamente.");
    if (isCompleteMode) {
      setTimeout(() => {
        navigate("/planes", { replace: true });
      }, 500);
    }
  };

  if (isCompleteMode) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-card">
          <div className="onboarding-card__header">
            <p className="onboarding-card__brand">FACTURALES</p>
            <h1 className="onboarding-card__title">Completa tu perfil</h1>
            <p className="onboarding-card__subtitle">{subtitle}</p>
          </div>

          <div className="onboarding-steps" aria-hidden>
            <div className="onboarding-step onboarding-step--done"><span>1</span><small>Registro</small></div>
            <div className="onboarding-step onboarding-step--done"><span>2</span><small>Email</small></div>
            <div className="onboarding-step onboarding-step--current"><span>3</span><small>Perfil</small></div>
            <div className="onboarding-step"><span>4</span><small>Facturar</small></div>
          </div>

          <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
            <section className="onboarding-section">
              <h3 className="onboarding-section__title">Tipo de cuenta</h3>
              <div className="onboarding-type-toggle" role="tablist" aria-label="Tipo de negocio">
                <button
                  type="button"
                  role="tab"
                  aria-selected={form.businessType !== "empresa"}
                  className={`onboarding-type-toggle__btn${form.businessType !== "empresa" ? " onboarding-type-toggle__btn--active" : ""}`}
                  onClick={() => setField("businessType", "autonomo")}
                >
                  <strong>Autónomo</strong>
                  <small>Persona física con NIF</small>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={form.businessType === "empresa"}
                  className={`onboarding-type-toggle__btn${form.businessType === "empresa" ? " onboarding-type-toggle__btn--active" : ""}`}
                  onClick={() => setField("businessType", "empresa")}
                >
                  <strong>Empresa</strong>
                  <small>Sociedad con CIF</small>
                </button>
              </div>
            </section>

            <section className="onboarding-section">
              <h3 className="onboarding-section__title">Datos fiscales</h3>
              <div className="onboarding-grid onboarding-grid--two">
                <label className="onboarding-field">
                  <span className="onboarding-field__label">{nameLabel} *</span>
                  <input
                    className="onboarding-input"
                    type="text"
                    value={form.nombreFiscal}
                    onChange={(event) => setField("nombreFiscal", event.target.value)}
                    required
                    placeholder={isEmpresa ? "AVENUE DIGITAL GROUP SL" : "Francisco Ruiz Chamorro"}
                  />
                  <small className="onboarding-field__hint">{nameHint}</small>
                </label>
                <label className="onboarding-field">
                  <span className="onboarding-field__label">{isEmpresa ? "CIF" : "NIF"} *</span>
                  <input
                    className="onboarding-input"
                    type="text"
                    value={form.nifCif}
                    onChange={(event) => setField("nifCif", event.target.value.toUpperCase())}
                    required
                    placeholder={isEmpresa ? "B12345678" : "12345678A"}
                  />
                </label>
                <label className="onboarding-field onboarding-field--full">
                  <span className="onboarding-field__label">Nombre comercial (opcional)</span>
                  <input
                    className="onboarding-input"
                    type="text"
                    value={form.nombreComercial ?? ""}
                    onChange={(event) => setField("nombreComercial", event.target.value)}
                    placeholder="Nombre visible en facturas"
                  />
                </label>
              </div>
            </section>

            <section className="onboarding-section">
              <h3 className="onboarding-section__title">Contacto y dirección</h3>
              <div className="onboarding-grid onboarding-grid--two">
                <label className="onboarding-field">
                  <span className="onboarding-field__label">Teléfono *</span>
                  <input
                    className="onboarding-input"
                    type="tel"
                    value={form.telefono}
                    onChange={(event) => setField("telefono", event.target.value)}
                    required
                    placeholder="+34 600 000 000"
                  />
                </label>
                <label className="onboarding-field">
                  <span className="onboarding-field__label">Código postal *</span>
                  <input
                    className="onboarding-input"
                    type="text"
                    value={form.codigoPostal}
                    onChange={(event) => setField("codigoPostal", event.target.value)}
                    required
                    placeholder="28001"
                  />
                </label>
                <label className="onboarding-field onboarding-field--full">
                  <span className="onboarding-field__label">Dirección fiscal *</span>
                  <input
                    className="onboarding-input"
                    type="text"
                    value={form.direccionFacturacion}
                    onChange={(event) => setField("direccionFacturacion", event.target.value)}
                    required
                    placeholder="Calle, número, piso"
                  />
                </label>
                <label className="onboarding-field">
                  <span className="onboarding-field__label">Ciudad *</span>
                  <input
                    className="onboarding-input"
                    type="text"
                    value={form.ciudad}
                    onChange={(event) => setField("ciudad", event.target.value)}
                    required
                    placeholder="Madrid"
                  />
                </label>
                <label className="onboarding-field">
                  <span className="onboarding-field__label">Provincia *</span>
                  <input
                    className="onboarding-input"
                    type="text"
                    value={form.provincia}
                    onChange={(event) => setField("provincia", event.target.value)}
                    required
                    placeholder="Madrid"
                  />
                </label>
              </div>
            </section>

            {error ? <p className="onboarding-error">{error}</p> : null}
            {flash ? <p className="onboarding-flash">{flash}</p> : null}

            <div className="onboarding-actions">
              <button type="submit" className="pilot-btn pilot-btn--primary onboarding-submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar y continuar"}
              </button>
              <small className="onboarding-actions__hint">Podrás editar estos datos en cualquier momento desde Configuración.</small>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Modo "settings" legacy — usa PublicLayout
  return (
    <PublicLayout title="Ajustes de negocio" subtitle={subtitle}>
      <form className="pilot-grid" onSubmit={(event) => void submit(event)}>
        <div className="pilot-grid pilot-grid--two">
          <label className="pilot-field">
            Nombre fiscal
            <input className="pilot-input" type="text" value={form.nombreFiscal} onChange={(event) => setField("nombreFiscal", event.target.value)} required />
          </label>
          <label className="pilot-field">
            NIF/CIF
            <input className="pilot-input" type="text" value={form.nifCif} onChange={(event) => setField("nifCif", event.target.value)} required />
          </label>
          <label className="pilot-field">
            Nombre comercial
            <input className="pilot-input" type="text" value={form.nombreComercial ?? ""} onChange={(event) => setField("nombreComercial", event.target.value)} />
          </label>
          <label className="pilot-field">
            Teléfono
            <input className="pilot-input" type="text" value={form.telefono} onChange={(event) => setField("telefono", event.target.value)} required />
          </label>
          <label className="pilot-field">
            Dirección fiscal
            <input className="pilot-input" type="text" value={form.direccionFacturacion} onChange={(event) => setField("direccionFacturacion", event.target.value)} required />
          </label>
          <label className="pilot-field">
            Ciudad
            <input className="pilot-input" type="text" value={form.ciudad} onChange={(event) => setField("ciudad", event.target.value)} required />
          </label>
          <label className="pilot-field">
            Código postal
            <input className="pilot-input" type="text" value={form.codigoPostal} onChange={(event) => setField("codigoPostal", event.target.value)} required />
          </label>
          <label className="pilot-field">
            Provincia
            <input className="pilot-input" type="text" value={form.provincia} onChange={(event) => setField("provincia", event.target.value)} required />
          </label>
          <label className="pilot-field">
            Tipo de negocio
            <select className="pilot-input" value={form.businessType} onChange={(event) => setField("businessType", event.target.value)}>
              <option value="autonomo">Autónomo</option>
              <option value="empresa">Empresa</option>
            </select>
          </label>
        </div>
        <div className="pilot-actions">
          <button type="submit" className="pilot-btn pilot-btn--primary" disabled={loading}>
            {loading ? "Guardando..." : "Guardar perfil"}
          </button>
          <Link className="pilot-btn" to="/dashboard">
            Volver al dashboard
          </Link>
        </div>
      </form>
      {flash ? <p className="pilot-info-text">{flash}</p> : null}
      {error ? <ErrorState title="No se pudo guardar el perfil" description={error} /> : null}
    </PublicLayout>
  );
}

export function CompleteProfilePage(): import("react").JSX.Element {
  return <BusinessProfileForm mode="complete" />;
}

export function SettingsPage(): import("react").JSX.Element {
  return <BusinessProfileForm mode="settings" />;
}

export function IntegrationsPage(): import("react").JSX.Element {
  return (
    <PublicLayout title="Integraciones" subtitle="Gestión centralizada de servicios externos.">
      <div className="pilot-grid">
        <section className="pilot-panel">
          <h2 className="mb-2 text-base font-bold">Facturación y cobros</h2>
          <p className="mb-3 text-sm opacity-80">Gestiona el estado de tu plan y el acceso a funcionalidades premium.</p>
          <Link className="pilot-btn pilot-btn--primary" to="/subscribe">
            Gestionar suscripción
          </Link>
        </section>
        <section className="pilot-panel">
          <h2 className="mb-2 text-base font-bold">Soporte y monitorización</h2>
          <p className="mb-3 text-sm opacity-80">Para incidencias técnicas, usa el canal de soporte integrado.</p>
          <Link className="pilot-btn" to="/soporte">
            Abrir soporte
          </Link>
        </section>
      </div>
    </PublicLayout>
  );
}

export function FiscalPage(): import("react").JSX.Element {
  return (
    <PublicLayout title="Resumen fiscal" subtitle="Vista fiscal consolidada en React.">
      <section className="pilot-panel">
        <h2 className="mb-2 text-base font-bold">Estado de migración fiscal</h2>
        <p className="mb-3 text-sm opacity-80">
          El módulo fiscal ya opera dentro del shell React. Los cálculos se alimentan de facturas y transacciones vigentes.
        </p>
        <div className="pilot-actions">
          <Link className="pilot-btn" to="/facturas">
            Ir a facturas
          </Link>
          <Link className="pilot-btn" to="/transacciones">
            Ir a transacciones
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

export function SubscribePage(): import("react").JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await subscriptionStatusService.resolveStatus();
      if (!active) return;
      if (!result.success) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      // Con suscripción activa → dashboard. Sin acceso → planes.
      if (result.data.hasAccess) {
        navigate("/dashboard", { replace: true });
        return;
      }
      navigate("/planes", { replace: true });
    };
    void load();
    return () => { active = false; };
  }, [navigate]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await authService.signOut();
    navigate("/signin", { replace: true });
  };

  const supportHref = `mailto:soporte@facturales.es?subject=${encodeURIComponent("Activación de plan")}&body=${encodeURIComponent(`Hola, necesito activar mi plan.\n\nEmail: ${user?.email ?? ""}\n`)}`;

  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        <div className="verify-email-card__icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p className="verify-email-card__brand">FACTURALES</p>
        <h1 className="verify-email-card__title">
          {loading ? "Verificando plan..." : hasAccess ? "Tu plan está activo" : "Activa tu plan"}
        </h1>
        <p className="verify-email-card__subtitle">
          {loading
            ? "Consultando el estado de tu suscripción."
            : hasAccess
              ? "Ya puedes acceder a todas las funciones de Facturales."
              : "Tu cuenta aún no tiene un plan activo. Escríbenos a soporte y lo activamos en minutos."}
        </p>

        {!loading && !hasAccess ? (
          <div className="verify-email-card__tips">
            <p className="verify-email-card__tip">
              <span className="verify-email-card__tip-bullet">•</span>
              Incluye en el email tu nombre y el plan que te interesa.
            </p>
            <p className="verify-email-card__tip">
              <span className="verify-email-card__tip-bullet">•</span>
              Te responderemos con las instrucciones de pago y activación.
            </p>
          </div>
        ) : null}

        <div className="verify-email-card__actions">
          {hasAccess ? (
            <Link className="pilot-btn pilot-btn--primary verify-email-card__btn" to="/dashboard">
              Ir al dashboard
            </Link>
          ) : (
            <a className="pilot-btn pilot-btn--primary verify-email-card__btn" href={supportHref}>
              Contactar a soporte
            </a>
          )}
          <button
            type="button"
            className="pilot-btn verify-email-card__btn"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
          >
            {signingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>

        {error ? <p className="verify-email-card__flash">{error}</p> : null}
      </div>
    </div>
  );
}

function formatPlanPrice(value: number): string {
  return value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PlansPage(): import("react").JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [loadingPlan, setLoadingPlan] = useState<PlanConfig["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasActive, setHasActive] = useState<boolean>(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLAN_CONFIGS);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [statusResult, planConfigs] = await Promise.all([
        subscriptionStatusService.resolveStatus(),
        fetchPlanConfigs(),
      ]);
      if (!active) return;
      if (statusResult.success && statusResult.data.hasAccess) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setPlans(planConfigs);
      setStatusLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [navigate]);

  const handleSelectPlan = async (planId: PlanConfig["id"]): Promise<void> => {
    setError(null);
    setLoadingPlan(planId);
    const result = await subscriptionManagementService.createCheckoutSession(planId as Exclude<BillingPlan, "none">, interval);
    if (!result.success) {
      setLoadingPlan(null);
      setError(`No se pudo iniciar el pago: ${result.error.message}`);
      return;
    }
    window.location.href = result.data.url;
  };

  const handleSignOut = async () => {
    await authService.signOut();
    navigate("/signin", { replace: true });
  };

  return (
    <div className="plans-page">
      <div className="plans-page__inner">
        <header className="plans-page__header">
          <p className="plans-page__brand">FACTURALES</p>
          <h1 className="plans-page__title">
            {hasActive ? "Tu plan está activo" : "Elige tu plan"}
          </h1>
          <p className="plans-page__subtitle">
            {hasActive
              ? "Ya tienes acceso. Puedes gestionar tu suscripción desde Configuración."
              : "Empieza con 14 días de prueba gratis. Cancela cuando quieras."}
          </p>

          {!hasActive ? (
            <div className="plans-page__toggle" role="tablist" aria-label="Frecuencia de facturación">
              <button
                type="button"
                role="tab"
                aria-selected={interval === "monthly"}
                className={`plans-page__toggle-btn${interval === "monthly" ? " plans-page__toggle-btn--active" : ""}`}
                onClick={() => setInterval("monthly")}
              >
                Mensual
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={interval === "yearly"}
                className={`plans-page__toggle-btn${interval === "yearly" ? " plans-page__toggle-btn--active" : ""}`}
                onClick={() => setInterval("yearly")}
              >
                Anual <span className="plans-page__toggle-badge">Ahorra 30%</span>
              </button>
            </div>
          ) : null}
        </header>

        {error ? <p className="plans-page__error">{error}</p> : null}

        <div className="plans-page__grid">
          {plans.map((plan) => {
            const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const isLoading = loadingPlan === plan.id;
            return (
              <article
                key={plan.id}
                className={`plan-card${plan.badge ? " plan-card--featured" : ""}`}
              >
                {plan.badge ? <span className="plan-card__badge">{plan.badge}</span> : null}
                <h3 className="plan-card__title">{plan.label}</h3>
                <p className="plan-card__tagline">{plan.tagline}</p>
                <div className="plan-card__price">
                  <span className="plan-card__price-amount">{formatPlanPrice(price)}</span>
                  <span className="plan-card__price-currency">€</span>
                  <span className="plan-card__price-interval">/mes + IVA</span>
                </div>
                {interval === "yearly" ? (
                  <p className="plan-card__price-note">Facturación anual — {formatPlanPrice(price * 12)} € al año</p>
                ) : (
                  <p className="plan-card__price-note">Facturación mensual — cancela cuando quieras</p>
                )}
                <ul className="plan-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="plan-card__feature">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`pilot-btn plan-card__cta${plan.badge ? " pilot-btn--primary" : ""}`}
                  onClick={() => void handleSelectPlan(plan.id)}
                  disabled={isLoading || statusLoading || hasActive}
                >
                  {isLoading
                    ? "Redirigiendo a Stripe..."
                    : hasActive
                      ? "Ya tienes plan activo"
                      : `Empezar con ${plan.label}`}
                </button>
                <small className="plan-card__trial">14 días de prueba gratis</small>
              </article>
            );
          })}
        </div>

        <footer className="plans-page__footer">
          {hasActive ? (
            <Link className="pilot-btn pilot-btn--primary plans-page__footer-btn" to="/dashboard">
              Ir al dashboard
            </Link>
          ) : (
            <p className="plans-page__footer-text">
              ¿Dudas sobre qué plan elegir?{" "}
              <a href="mailto:soporte@facturales.es?subject=Consulta%20sobre%20planes" className="plans-page__footer-link">
                Escríbenos a soporte
              </a>
            </p>
          )}
          <button type="button" className="plans-page__footer-link plans-page__footer-logout" onClick={() => void handleSignOut()}>
            Cerrar sesión ({user?.email ?? ""})
          </button>
        </footer>
      </div>
    </div>
  );
}

export function BillingSuccessPage(): import("react").JSX.Element {
  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        <div className="verify-email-card__icon" aria-hidden style={{ background: "rgba(34, 197, 94, 0.12)", color: "#15803d" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="verify-email-card__brand">FACTURALES</p>
        <h1 className="verify-email-card__title">Pago completado</h1>
        <p className="verify-email-card__subtitle">
          Tu suscripción se ha activado correctamente. Ya puedes acceder a todas las funciones.
        </p>
        <div className="verify-email-card__actions">
          <Link className="pilot-btn pilot-btn--primary verify-email-card__btn" to="/dashboard">
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BillingCancelPage(): import("react").JSX.Element {
  return (
    <PublicLayout title="Pago cancelado" subtitle="No se ha aplicado ningún cambio en tu plan.">
      <div className="pilot-actions">
        <Link className="pilot-btn pilot-btn--primary" to="/subscribe">
          Reintentar suscripción
        </Link>
      </div>
    </PublicLayout>
  );
}

const LEGAL_PAGES: Record<string, { title: string; subtitle: string; Content: () => import("react").JSX.Element }> = {
  "/aviso-legal": {
    title: "Aviso Legal",
    subtitle: "Última actualización: Noviembre 2026",
    Content: AvisoLegalContent,
  },
  "/condiciones-legales": {
    title: "Condiciones Legales",
    subtitle: "Última actualización: Noviembre 2026 — Por favor, lea atentamente las presentes condiciones legales antes de aceptar las mismas.",
    Content: CondicionesLegalesContent,
  },
  "/politica-de-cookies": {
    title: "Política de Cookies",
    subtitle: "Última actualización: Noviembre 2026",
    Content: PoliticaCookiesContent,
  },
  "/politica-de-privacidad": {
    title: "Política de Privacidad",
    subtitle: "Información sobre el tratamiento de datos personales — Última actualización: Noviembre 2026",
    Content: PoliticaPrivacidadContent,
  },
};

const LEGAL_FOOTER_LINKS: Array<{ to: string; label: string }> = [
  { to: "/condiciones-legales", label: "Condiciones Legales" },
  { to: "/politica-de-privacidad", label: "Política de Privacidad" },
  { to: "/aviso-legal", label: "Aviso Legal" },
  { to: "/politica-de-cookies", label: "Política de Cookies" },
];

export function LegalPage({ path }: { path: string }): import("react").JSX.Element {
  const page = LEGAL_PAGES[path] ?? LEGAL_PAGES["/aviso-legal"];
  const { Content } = page;
  return (
    <div className="legal-page">
      {/* Header */}
      <header className="legal-page__header">
        <div className="legal-page__header-inner">
          <Link to="/signin">
            <img src={logoColor} className="legal-page__header-logo" alt="Facturales" />
          </Link>
          <Link to="/signin" className="legal-page__back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="legal-page__main">
        <div className="legal-page__title-block">
          <h1 className="legal-page__title">{page.title}</h1>
          <p className="legal-page__updated">{page.subtitle}</p>
          <div className="legal-page__accent-bar" />
        </div>
        <div className="legal-prose">
          <Content />
        </div>
      </main>

      {/* Footer */}
      <footer className="legal-page__footer">
        <div className="legal-page__footer-inner">
          <nav className="legal-page__footer-nav">
            {LEGAL_FOOTER_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="legal-page__footer-link">{link.label}</Link>
            ))}
          </nav>
          <p className="legal-page__copyright">&copy; 2026 Facturales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export function NotFoundPage(): import("react").JSX.Element {
  return (
    <PublicLayout title="404 - Ruta no encontrada" subtitle="La ruta solicitada no existe o fue movida a una URL canónica.">
      <div className="pilot-actions">
        <Link className="pilot-btn pilot-btn--primary" to="/dashboard">
          Ir al dashboard
        </Link>
        <Link className="pilot-btn" to="/signin">
          Iniciar sesión
        </Link>
      </div>
    </PublicLayout>
  );
}
