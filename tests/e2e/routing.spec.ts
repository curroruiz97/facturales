import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Canonical routing", () => {
  test("public canonical routes render without .html", async ({ page }) => {
    const checks = [
      { route: "/signin", title: "Inicia sesion en Facturales." },
      { route: "/signup", title: "Crea una cuenta" },
      { route: "/verify-email", title: "Verifica tu correo" },
      { route: "/reset-password", title: "Restablecer contrasena" },
      { route: "/billing/success", title: "Pago completado" },
      { route: "/billing/cancel", title: "Pago cancelado" },
      { route: "/aviso-legal", title: "Aviso legal" },
    ];

    for (const check of checks) {
      await page.goto(check.route);
      await expect(page.locator("h1")).toContainText(check.title);
      expect(page.url()).not.toContain(".html");
    }
  });

  test("private canonical routes redirect to signin with canonical redirect target", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fdashboard/);

    await page.goto("/productos");
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fproductos/);
  });

  test("legacy html aliases normalize to canonical routes", async ({ page }) => {
    await page.goto("/signin.html");
    await expect(page).toHaveURL(/\/signin$/);
    expect(page.url()).not.toContain(".html");

    await page.goto("/index.html");
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fdashboard/);
    expect(page.url()).not.toContain(".html");
  });
});

test.describe("Vercel redirects", () => {
  test("legacy html redirects are declared as permanent", async () => {
    const configPath = path.join(process.cwd(), "vercel.json");
    const vercelConfig = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      redirects: Array<{ source: string; destination: string; permanent: boolean }>;
      rewrites: Array<{ source: string; destination: string }>;
    };

    const requiredRedirects: Array<[string, string]> = [
      ["/index.html", "/dashboard"],
      ["/pilot-dashboard.html", "/dashboard"],
      ["/productos.html", "/productos"],
      ["/users.html", "/contactos"],
      ["/expenses.html", "/transacciones"],
      ["/invoices/quote.html", "/presupuestos/emision"],
      ["/invoices/new.html", "/facturas/emision"],
      ["/scan-ocr.html", "/ocr"],
      ["/support-ticket.html", "/soporte"],
      ["/settings.html", "/ajustes"],
      ["/signin.html", "/signin"],
      ["/signup.html", "/signup"],
      ["/verify-email.html", "/verify-email"],
      ["/confirm-email.html", "/confirm-email"],
      ["/reset-password.html", "/reset-password"],
      ["/complete-profile.html", "/complete-profile"],
      ["/subscribe.html", "/subscribe"],
      ["/billing/success.html", "/billing/success"],
      ["/billing/cancel.html", "/billing/cancel"],
      ["/aviso-legal.html", "/aviso-legal"],
    ];

    for (const [source, destination] of requiredRedirects) {
      expect(
        vercelConfig.redirects.some(
          (redirect) => redirect.source === source && redirect.destination === destination && redirect.permanent === true,
        ),
      ).toBeTruthy();
    }

    expect(vercelConfig.rewrites.some((rewrite) => rewrite.destination === "/index.html")).toBeTruthy();
  });
});
