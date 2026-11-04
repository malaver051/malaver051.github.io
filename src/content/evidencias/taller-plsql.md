---
title: Taller PL/SQL · Inventario y ventas
description: Procedimientos, funciones, cursores, excepciones, disparadores y un paquete integrador sobre un esquema de inventario en Oracle, con la justificación de cada decisión de diseño.
categoria: PL/SQL
tech: [Oracle, PL/SQL]
integrantes: [Julian Felipe Valencia Malaver, Kariana Rivas, Kevin Rojas]
archivo: /evidencias/taller-plsql-grupo-1.sql
fecha: 2026-10-03
order: 1
---

## Contexto

Taller de Bases de Datos 2 (Grupo 1) sobre un esquema de inventario: productos, bodegas, existencias, clientes, pedidos y movimientos. Cada objeto lleva su justificación: por qué se eligió esa construcción y no otra, y cómo se comporta con concurrencia, volumen y errores.

## Lo que se construyó

| Parte              | Objetos                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Procedimientos  | `SP_REGISTRAR_PRODUCTO`, `SP_AJUSTAR_STOCK`, `SP_CREAR_PEDIDO`                                                                                                      |
| 2. Funciones       | `FN_STOCK_DISPONIBLE`, `FN_CUPO_DISPONIBLE`, `FN_CALCULAR_DESCUENTO`                                                                                                |
| 3. Cursores        | Cursor explícito, cursor con parámetros y `SP_LISTAR_MOVIMIENTOS` con `SYS_REFCURSOR`                                                                               |
| 4. Excepciones     | `FN_PRECIO_PRODUCTO`, `SP_VALIDAR_DESPACHO`, `SP_ANULAR_PEDIDO`, `SP_REGISTRAR_ERROR` (transacción autónoma)                                                        |
| 5. Disparadores    | `TRG_CLIENTE_BI`, `TRG_PRODUCTO_AU_PRECIO`, `TRG_PRODUCTO_BIU_MARGEN`, `TRG_DETALLE_AI_STOCK`, `TRG_DETALLE_TOTAL`, `TRG_V_STOCK_IO` (`INSTEAD OF` sobre una vista) |
| 6. Caso integrador | Paquete `PKG_VENTAS` con `SP_FACTURAR_PEDIDO`                                                                                                                       |

## Antes de empezar: dos hallazgos en el script base

- **Secuencias desincronizadas.** El script del esquema inserta productos y clientes con identificador explícito, pero no avanza `SEQ_PRODUCTO` ni `SEQ_CLIENTE`. El segundo `NEXTVAL` chocaba con una fila existente (`ORA-00001`). Agregamos un bloque que las sincroniza con el máximo existente.
- **Índices de apoyo.** Oracle no indexa las llaves foráneas por sí solo, y la llave primaria de `EXISTENCIA` empieza por `id_bodega`, así que las búsquedas solo por producto no la pueden usar. Creamos tres índices de forma reejecutable.

## Caso integrador: facturar un pedido

`SP_FACTURAR_PEDIDO` valida el pedido, recorre sus líneas con un cursor, calcula el descuento, revisa el cupo del cliente, confirma el pedido y actualiza el saldo. Reutiliza las funciones de las partes anteriores en lugar de repetir su lógica.

```sql
SAVEPOINT sp_facturar;

-- El pedido debe existir y estar en BORRADOR (se bloquea la cabecera)
SELECT id_cliente, estado INTO vn_Id_Cliente, vv_Estado
  FROM PEDIDO WHERE id_pedido = p_Id_Pedido
   FOR UPDATE;

-- Bloqueo del cliente ANTES de leer saldo y cupo
SELECT activo INTO vc_Activo
  FROM CLIENTE WHERE id_cliente = vn_Id_Cliente
   FOR UPDATE;

FOR r_Fila IN c_Lineas(p_Id_Pedido) LOOP
    vn_Subtotal := vn_Subtotal + r_Fila.subtotal;
END LOOP;

p_Descuento := FN_CALCULAR_DESCUENTO(vn_Id_Cliente, vn_Subtotal);
p_Total     := vn_Subtotal - p_Descuento;

IF p_Total > FN_CUPO_DISPONIBLE(vn_Id_Cliente) THEN
    RAISE_APPLICATION_ERROR(-20304, 'Cupo insuficiente');
END IF;

UPDATE PEDIDO  SET total = p_Total, estado = 'CONFIRMADO' WHERE id_pedido = p_Id_Pedido;
UPDATE CLIENTE SET saldo_pendiente = saldo_pendiente + p_Total WHERE id_cliente = vn_Id_Cliente;

EXCEPTION
    WHEN OTHERS THEN
        SP_REGISTRAR_ERROR('PKG_VENTAS.SP_FACTURAR_PEDIDO', 'id_pedido=' || p_Id_Pedido);
        ROLLBACK TO sp_facturar;
        RAISE;
```

Las decisiones que justificamos:

- **Sin `COMMIT` dentro del paquete.** Un `COMMIT` ahí confirmaría todo lo pendiente de la sesión, no solo la facturación. La decisión queda en quien llama, que así puede facturar varios pedidos y confirmar al final.
- **`SAVEPOINT` + `ROLLBACK TO`.** Ante un fallo se deshace solo lo que hizo el procedimiento, sin tocar el trabajo previo del llamador, y el error se vuelve a lanzar para que se entere.
- **Registro de errores autónomo.** `SP_REGISTRAR_ERROR` corre en su propia transacción, así el registro sobrevive al `ROLLBACK`.
- **Orden de bloqueo fijo: primero el pedido, después el cliente.** Evita interbloqueos entre facturaciones, y bloquear al cliente antes de calcular el cupo impide que dos facturas simultáneas lo sobrepasen.
