import { describe, expect, it } from "vitest";
import { resolveSafeRedirectPath } from "../route-metadata";

describe("route-metadata redirect safety", () => {
  it("usa fallback para redirect vacio", () => {
    expect(resolveSafeRedirectPath(null)).toBe("/dashboard");
    expect(resolveSafeRedirectPath("")).toBe("/dashboard");
  });

  it("acepta rutas canonicas internas con query/hash", () => {
    expect(resolveSafeRedirectPath("/dashboard?search=abc#panel")).toBe("/dashboard?search=abc#panel");
  });

  it("normaliza aliases legacy .html al path canonico", () => {
    expect(resolveSafeRedirectPath("/index.html")).toBe("/dashboard");
    expect(resolveSafeRedirectPath("/billing/success.html#ok")).toBe("/billing/success#ok");
  });

  it("bloquea destinos externos o no validos", () => {
    expect(resolveSafeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(resolveSafeRedirectPath("https://evil.com/phishing")).toBe("/dashboard");
    expect(resolveSafeRedirectPath("/ruta-desconocida")).toBe("/dashboard");
  });
});

