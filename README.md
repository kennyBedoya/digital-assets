# Digital Assets API

## Arquitectura

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Prisma ORM
  ↓
PostgreSQL
```

## Tecnologías

* Node.js
* Express
* PostgreSQL
* Prisma
* Jest
* JavaScript

## Instalación y ejecución

### 1. Instalar dependencias

```bash
npm install
```

### 2. Inicializar base de datos

Generar Prisma Client:

```bash
npx prisma generate
```

Ejecutar migraciones:

```bash
npx prisma migrate dev
```

Ejecutar datos semilla:

```bash
psql -U <usuario> -d <base_de_datos> -f seed.sql
```

### 3. Ejecutar aplicación

```bash
npm run dev
```

API:

```text
http://localhost:3000
```

## Pruebas

Ejecutar las pruebas unitarias:

```bash
npm test
```

Las pruebas implementadas son:

1. Intercambio exitoso con riesgo `LOW`.
2. Operación `MEDIUM` completada y marcada para seguimiento.
3. Saldo insuficiente.
4. Cotización vencida.
5. Repetición de la misma clave de idempotencia.
6. Reutilización de una clave de idempotencia con contenido diferente.
7. Operación `HIGH` retenida.
8. Aprobación de una operación retenida.
9. Rechazo de una operación retenida y liberación del saldo.
10. Intento de aprobación por un usuario sin rol de Compliance.

## Usuarios de prueba

Definidos mediante `seed.sql`.

| ID | Rol        |
| -- | ---------- |
| 1  | USER       |
| 2  | COMPLIANCE |

## Ejemplos de consumo de API

### Crear cotización

```http
POST http://localhost:3000/api/quotes
```

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "userId": "1",
  "sourceAssetId": "1",
  "targetAssetId": "2",
  "sourceAmount": "100",
  "price": "1.05",
  "fee": "0.50",
  "estimatedTargetAmount": "99.50",
  "expiresAt": "2026-08-09T23:59:59.000Z"
}
```

### Crear intercambio

```http
POST http://localhost:3000/api/exchanges
```

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "userId": "1",
  "quoteId": "11111111-1111-1111-1111-111111111111",
  "sourceAssetId": "1",
  "targetAssetId": "2",
  "sourceAmount": "100",
  "price": "1.05",
  "fee": "0.50",
  "targetAmount": "99.50",
  "riskLevel": "LOW",
  "requiresFollowUp": false,
  "idempotencyKey": "exchange-001",
  "expiresAt": "2026-08-09T23:59:59.000Z"
}
```

### Consultar intercambios pendientes

```http
GET http://localhost:3000/api/exchanges/pending
```

### Aprobar una operación

```http
POST http://localhost:3000/api/exchanges/{exchangeId}/decision
```

```json
{
  "complianceUserId": "2",
  "decision": "APPROVE"
}
```

### Rechazar una operación

```http
POST http://localhost:3000/api/exchanges/{exchangeId}/decision
```

```json
{
  "complianceUserId": "2",
  "decision": "REJECT"
}
```

### Consultar ledger

```http
GET http://localhost:3000/api/ledger
```

## Supuestos

* PostgreSQL está disponible.
* `seed.sql` contiene los datos necesarios para las pruebas.
* Los usuarios, assets y wallets utilizados en las pruebas existen.
* La API se ejecuta localmente en el puerto `3000`.

## Limitaciones

* No incluye autenticación mediante JWT/OAuth.
* No incluye integración con proveedores externos de activos digitales.
* Las pruebas unitarias utilizan mocks de Prisma.
* No se incluyen pruebas de integración ni end-to-end.

## Tiempo aproximado empleado

```text
11-12 horas
```

## Decisiones técnicas

* **Express:** API REST.
* **PostgreSQL:** persistencia transaccional.
* **Prisma:** acceso a base de datos.
* **Services:** centralización de reglas de negocio.
* **Ledger:** trazabilidad de movimientos.
* **Idempotencia:** prevención de operaciones duplicadas.
* **FOR UPDATE:** bloqueo de wallets durante operaciones concurrentes.
* **Jest:** pruebas unitarias de las reglas de intercambio.

## Mejoras necesarias para producción

* Autenticación y autorización.
* Validación robusta de entradas.
* Rate limiting.
* Logging y monitoreo.
* Tests de integración y end-to-end.
* CI/CD.
* Backups y recuperación ante fallos.
* Manejo de concurrencia y alta disponibilidad.
* Revisión de seguridad.
* Integración con proveedores reales de precios/liquidez.

## Comandos principales

```bash
npm install
npm run dev
npm test
```

### Prisma

```bash
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma migrate status
```

### Seed

```bash
psql -U <usuario> -d <base_de_datos> -f seed.sql
```

## frontend Mockups
```text
https://drive.google.com/file/d/1nwrWFisnwK_efjTEe0VTN840cQt42azg/view?usp=sharing
```