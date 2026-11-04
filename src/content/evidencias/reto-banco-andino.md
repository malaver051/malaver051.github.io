---
title: Reto · Banco Andino, descuadres en transferencias
description: Diagnóstico y corrección de la secuencia que aplica una transferencia (concurrencia, atomicidad e interbloqueos) y optimización de la consulta de un tablero gerencial con un índice.
categoria: SQL
tech: [Oracle, SQL, Transacciones, Índices]
integrantes: [Julian Valencia, Joses Rodriguez]
archivo: /evidencias/reto-banco-andino.sql
order: 1
---

## El caso

Un ticket de la Gerencia de Operaciones reporta tres problemas: la cuenta de compensación no cuadra, hay transferencias que salen del origen y nunca llegan al destino (o al revés), y el tablero de la Vicepresidencia tarda casi un minuto en abrir. Se recibe la secuencia de sentencias que ejecuta el core para aplicar una transferencia y la consulta del tablero.

## Diagnóstico de la secuencia original

```sql
SELECT saldo FROM cuenta WHERE id_cuenta = 1001;
UPDATE cuenta SET saldo = 700000 WHERE id_cuenta = 1001;   -- valor calculado en la aplicación
COMMIT;
SELECT saldo FROM cuenta WHERE id_cuenta = 1002;
UPDATE cuenta SET saldo = 1300000 WHERE id_cuenta = 1002;
COMMIT;
-- ... dos INSERT de movimientos, cada uno con su COMMIT ...
UPDATE transferencia SET estado = 'APLICADA' WHERE id_transferencia = 950001;
COMMIT;
```

- **Concurrencia (actualización perdida).** La aplicación lee el saldo, hace la cuenta por fuera y escribe un valor absoluto. Si dos transferencias leen el mismo saldo al tiempo, la segunda pisa a la primera y el dinero de una desaparece. Con 12.000 transferencias por hora, los choques sobre cuentas muy usadas son constantes: de ahí el descuadre "pequeño pero constante".
- **Transaccionalidad.** Hay un `COMMIT` después de cada paso. Si el proceso se cae entre el débito y el crédito, el débito ya quedó confirmado.
- **Falla silenciosa.** Nada verifica cuántas filas afectó cada sentencia, y el estado se cambia sin condición. Una transferencia a medias queda como `REGISTRADA` y ningún reporte la detecta.
- **Rendimiento.** El tablero filtra con `TO_CHAR(t.fecha_transf, 'YYYY-MM') = '2026-03'`. Aplicar una función a la columna impide usar un índice sobre ella, así que recorre toda la tabla en cada consulta.

### Reproducción de la falla a mitad de camino

```sql
UPDATE cuenta SET saldo = 700000 WHERE id_cuenta = 1001;
COMMIT;
-- *** aquí se cae el proceso: el crédito nunca se ejecuta ***

SELECT id_cuenta, saldo FROM cuenta WHERE id_cuenta IN (1001, 1002);
--> 1001 = 700.000   (debitado y confirmado)
--> 1002 = 1.000.000 (nunca recibió el crédito)
SELECT estado FROM transferencia WHERE id_transferencia = 950001;
--> sigue en 'REGISTRADA': 300.000 salieron de la cuenta y no están en ningún lado
```

## Corrección

```sql
-- 1. Bloquear las DOS cuentas en una sola sentencia, ordenadas por id.
--    El orden fijo es lo que evita el interbloqueo entre 1001->1002 y 1002->1001.
SELECT id_cuenta, saldo
  FROM cuenta
 WHERE id_cuenta IN (1001, 1002)
 ORDER BY id_cuenta
   FOR UPDATE;

-- 2 y 3. Débito y crédito sobre el valor ACTUAL de la fila
UPDATE cuenta SET saldo = saldo - 300000 WHERE id_cuenta = 1001;
UPDATE cuenta SET saldo = saldo + 300000 WHERE id_cuenta = 1002;

-- 4. Movimientos contables (sin COMMIT intermedio)
INSERT INTO movimiento (...) VALUES (9500001, 1001, 950001, SYSDATE, 'DEBITO', 300000);
INSERT INTO movimiento (...) VALUES (9500002, 1002, 950001, SYSDATE, 'CREDITO', 300000);

-- 5. Cambio de estado condicionado al estado esperado
UPDATE transferencia
   SET estado = 'APLICADA'
 WHERE id_transferencia = 950001
   AND estado = 'REGISTRADA';

-- 6. Un solo COMMIT al final (o ROLLBACK si algo falló)
COMMIT;
```

- `saldo = saldo - n` sobre filas bloqueadas elimina la actualización perdida.
- Un único `COMMIT` hace que débito, crédito, movimientos y estado ocurran todos o ninguno.
- El `UPDATE` condicionado a `'REGISTRADA'` impide aplicar dos veces la misma transferencia.
- El saldo negativo lo rechaza la restricción `CHECK` que ya tiene la tabla `CUENTA`.

## Optimización del tablero

Se cambió la función sobre la columna por un rango de fechas, que sí puede usar un índice, y se creó un índice compuesto por fecha y estado:

```sql
CREATE INDEX ix_transf_fecha_estado ON transferencia (fecha_transf, estado);

SELECT s.ciudad, COUNT(*) AS operaciones,
       ROUND(SUM(t.valor)) AS valor_total, ROUND(AVG(t.valor)) AS ticket
  FROM transferencia t
  JOIN cuenta   c ON c.id_cuenta   = t.cuenta_origen
  JOIN sucursal s ON s.id_sucursal = c.id_sucursal
 WHERE t.fecha_transf >= DATE '2026-03-01'
   AND t.fecha_transf <  DATE '2026-04-01'
   AND t.estado = 'APLICADA'
 GROUP BY s.ciudad
 ORDER BY valor_total DESC;
```

Además, `COUNT(DISTINCT t.id_transferencia)` pasó a `COUNT(*)`: el `JOIN` es uno a uno con la cuenta de origen, así que no hay duplicados que eliminar y el `DISTINCT` solo agregaba un ordenamiento.
