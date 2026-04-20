import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { businessInfoService } from "../../services/business/business-info.service";

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "FA";
}

export function UserMenu(): import("react").JSX.Element {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    const loadBusiness = async () => {
      try {
        const result = await businessInfoService.getMine();
        if (!active) return;

        if (result.success && result.data) {
          const nextCompanyName = result.data.nombreFiscal || result.data.nombreComercial || "";
          setCompanyName(nextCompanyName);
          if (result.data.profileImageUrl) {
            setProfileImageUrl(result.data.profileImageUrl);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBusiness();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const initials = useMemo(() => (companyName ? initialsFromName(companyName) : ""), [companyName]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/signin", { replace: true });
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="pilot-user-menu" role="group" aria-label="Perfil">
      <button
        type="button"
        className="pilot-user-menu__trigger"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="pilot-user-menu__avatar" aria-hidden>
          {loading ? (
            <span className="pilot-user-menu__avatar-skeleton" />
          ) : profileImageUrl ? (
            <img src={profileImageUrl} alt="" className="pilot-user-menu__avatar-img" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="pilot-user-menu__info">
          {loading ? (
            <>
              <span className="pilot-user-menu__text-skeleton" style={{ width: "120px", height: "14px" }} />
              <span className="pilot-user-menu__text-skeleton" style={{ width: "160px", height: "11px", marginTop: "4px" }} />
            </>
          ) : (
            <>
              <strong>{companyName}</strong>
              <span>{user?.email ?? ""}</span>
            </>
          )}
        </div>
        <span className="pilot-user-menu__caret" aria-hidden>
          {open ? "˄" : "˅"}
        </span>
      </button>

      {open ? (
        <div className="pilot-user-menu__panel" role="menu">
          <Link to="/ajustes?tab=business" className="pilot-user-menu__option" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Mi Perfil
          </Link>
          <Link to="/soporte" className="pilot-user-menu__option" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" /><path d="M12 16v-1a3 3 0 013-3 2 2 0 002-2 3 3 0 00-5-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="19" r="0.5" fill="currentColor" /></svg>
            Soporte
          </Link>
          <button type="button" className="pilot-user-menu__option pilot-user-menu__option--signout" role="menuitem" onClick={() => void handleSignOut()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {signingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
          </button>
          <div className="pilot-user-menu__divider" />
          <Link to="/ajustes" className="pilot-user-menu__option" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Configuración
          </Link>
          <Link to="/contactos" className="pilot-user-menu__option" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Contactos
          </Link>
        </div>
      ) : null}
    </div>
  );
}
