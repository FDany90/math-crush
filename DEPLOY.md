# Deploy — QA y Producción (Math Crush)

Flujo de deploy con dos ambientes en Vercel. Objetivo: probar en **QA** antes de tocar
**producción** (nunca más meter algo a medio probar directo al celu de todos).

## Ambientes

| Ambiente | Rama git | Deploy Vercel | URL |
|----------|----------|---------------|-----|
| **Producción** | `main` | Production (automático al pushear) | dominio de prod |
| **QA / Preview** | `qa` | Preview (automático al pushear) | URL de preview de la rama `qa` |

Vercel genera el deploy solo con el push: `main` → producción, `qa` (o cualquier otra rama) → preview.

### URLs de QA — usar la ESTABLE por rama
Cada deploy tiene una URL **única** (`math-crush-<hash>.vercel.app`) que **cambia en cada push**.
Pero Vercel también da una **URL estable por rama** que SIEMPRE apunta al último deploy de esa rama:

```
math-crush-git-qa-<scope>.vercel.app     ← estable, no cambia entre deploys de qa
```

(`<scope>` = tu usuario/equipo de Vercel, ej. `fdany90`). **Esa es la que va a favoritos en el celu.**
Se ve en **Vercel → el deploy de `qa` → sección "Domains"** (aparecen las dos: la única y la `-git-qa-`).
Opcional: un dominio más corto/lindo (`mathcrush-qa.vercel.app`) en Settings → Domains apuntando a `qa`.

## Flujo de trabajo (día a día)

```
1. Trabajar y commitear en  qa
2. git push origin qa            → Vercel deploya QA (preview)
3. Probar en la URL de QA (celu incluido)
4. ¿OK?  → promover a producción (abajo)
   ¿No?  → seguir en qa y repetir
```

## Promover QA → Producción

Cuando QA está aprobado, se lleva `qa` a `main`:

```bash
git checkout main
git merge qa            # trae lo aprobado (fast-forward si main no divergió)
git push origin main    # → Vercel deploya PRODUCCIÓN
git checkout qa         # volver a trabajar en qa
```

## ✅ Checklist antes de promover a PRODUCCIÓN

- [ ] `cd app && npm run build` pasa sin errores.
- [ ] Probado en la URL de QA (en celu, no solo desktop).
- [ ] **`DAILY_UNLIMITED = false`** en `app/src/App.jsx` (en QA puede quedar `true` para testear;
      en prod NO — si no, el regalo diario es infinito).
- [ ] Si cambió la **cantidad u orden de niveles** (no solo el contenido): subir `PROGRESS_VERSION`
      en `app/src/App.jsx` (resetea el progreso de todos). Si solo cambió el contenido de un nivel
      en su misma posición, NO hace falta.
- [ ] Sin `console.log` ni flags de debug de más.

## Datos / Supabase

- **Hoy:** QA y producción comparten la MISMA base Supabase → las pruebas de QA ensucian un poco
  las métricas de prod. Aceptable en etapa de desarrollo.
- **Antes del lanzamiento (recomendado):** crear un proyecto Supabase aparte para QA y cargar sus
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en el scope **"Preview"** de Vercel
  (Settings → Environment Variables). Así las métricas de retención de prod quedan limpias. Ver
  `DISEÑO_PROGRESION.md §10` (retención = norte).

## Rollback (si un deploy de prod salió mal)

En **Vercel → Deployments**, buscar el último deploy bueno de producción y usar **"Promote to
Production"** (redeploy instantáneo). Alternativa git: `git revert <commit>` en `main` + push.
