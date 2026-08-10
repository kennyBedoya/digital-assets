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
15-16 horas
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
## Diagramas
```text
https://drive.google.com/drive/folders/1B8d3bz0k3V0c7LApRtWVeahl3VgAtiy6?usp=sharing
```
## Preguntas de Diseño
```text
a. Separaría suministro autorizado, emisión y colocación. Mantendría un registro del máximo autorizado y, dentro de una transacción, validaría que:
emitido + nuevo tramo <= suministro autorizado
Cada tramo tendría su propio identificador, cantidad, estado y trazabilidad en ledger. La colocación solo podría ejecutarse sobre unidades previamente emitidas y nunca superar el saldo disponible para la coloación. Los límites también se validarían bajo bloqueo transaccional para evitar sobreemisión concurrente.

b. Implementaría la transferencia dentro de una única transacción de base de datos y garantizando el siguiente proceso:

- Bloquear las wallets origen y destino.
- Validar saldo disponible.
- Debitar origen y acreditar destino.
- Registrar ambos movimientos en el ledger.
- Asociar los movimientos a un transferId.
- Usar una idempotencyKey única para evitar duplicados.

Si cualquier paso falla, toda la operación hace rollback. De esta forma se preservan atomicidad, idempotencia y trazabilidad.

c. Mantendría el ledger interno como fuente de verdad contable y realizaría conciliaciones periódicas contra la wallet omnibus administrada por Fireblocks o equivalente.

Compararía lo siguiente:

- saldo total interno por activo
- saldo on-chain/custodiado
- movimientos internos
- depósitos y retiros pendientes
- diferencias de conciliación

Las diferencias generarían una alerta y bloquearían las operaciones afectadas hasta su investigación. También mantendría un registro de cada conciliación y sus resultados para auditoría.

d. Si Sumsub, Chainalysis o equivalente no está disponible:

- no asumiría aprobación
- marcaría la operación como PENDING_COMPLIANCE o equivalente
- mantendría los fondos retenidos cuando corresponda
- no permitiría completar ni liberar la operación
- registraría el motivo y el evento de indisponibilidad

Una vez recuperado el servicio, la operación podría continuar únicamente después de obtener una correcta validación.

e. Antes del despliegue implementaría controles en cuatro niveles:

Técnicos

- Validación estricta de entradas.
- Transacciones y bloqueo de registros para operaciones financieras.
- Ledger inmutable/auditable.
- Pruebas unitarias, integración y end-to-end.
- Manejo de errores y timeouts.
- Backups y recuperación ante desastres.
- Monitoreo, métricas y alertas.

Seguridad

- Autenticación y autorización basada en roles.
- MFA para funciones críticas.
- Gestión segura de secretos.
- Cifrado en tránsito y reposo.
- Rate limiting.
- Análisis de vulnerabilidades y penetration testing.

Operativos

- Segregación de funciones, especialmente para Compliance.
- Procedimientos de aprobación y escalamiento.
- Conciliaciones periódicas.
- Runbooks para incidentes.
- Control de cambios y despliegues.

Regulatorios

- Monitoreo de transacciones.
- Retención de evidencias y registros.

f. Separaría las resposabilidades, teniendo en un frente la plataforma (usuarios, balances, ledger), por otro lado los contratos como la emisión, la transferencia, y todo esto separadoo de la custodia, con la gestión de claves y wallets. Así la custodia queda separada de la lógica de negocio, ademas cada activo debe poder verificarse de forma independiente.

```