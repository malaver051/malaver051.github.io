---
title: Sistema de Gestión de Gimnasio
description: Proyecto final de Bases de Datos 2. Sistema web para administrar clientes, membresías, pagos, entrenadores, rutinas y clases, con PostgreSQL como base relacional y MongoDB para los datos de estructura variable.
tech: [PostgreSQL, MongoDB, Java, Spring Boot, React, Vite]
order: 1
publishDate: 2026-05-01
---

## De qué se trata

Un gimnasio tiene que registrar clientes, asignarles membresías, cobrar pagos, organizar entrenadores, crear rutinas e inscribir gente a clases. Cuando todo eso está suelto, cuesta saber si una membresía sigue activa, si un pago se hizo o qué rutina tiene cada cliente. Este proyecto centraliza esa información en un sistema web.

**Curso:** Bases de Datos 2 · Universidad El Bosque · Ingeniería de Sistemas
**Docente:** Christian Felipe Duarte
**Equipo:** Julian Valencia, Kariana Rivas y Kevin Rojas

## Arquitectura

| Capa | Tecnología |
|---|---|
| Base relacional | PostgreSQL |
| Base NoSQL | MongoDB |
| Backend | Java + Spring Boot (API REST) |
| Frontend | React + Vite |
| Servidor | Ubuntu Server en VirtualBox |

La idea es usar cada base de datos para lo que hace mejor:

- **PostgreSQL** guarda lo que necesita integridad estricta: usuarios, roles, clientes, membresías, pagos, entrenadores, clases e inscripciones. Aquí va la lógica de negocio dentro del motor (procedimientos, funciones, triggers y transacciones).
- **MongoDB** guarda lo que cambia de forma de un registro a otro: el detalle de las rutinas, el progreso físico de cada cliente y los comentarios de las clases.

## Modelo relacional (SQL)

El esquema tiene 13 tablas normalizadas hasta tercera forma normal:

`Usuarios`, `Rol`, `Usuario_Rol`, `Pais`, `Clientes`, `Tipos_Membresia`, `Membresias_Asignadas`, `Pagos`, `Entrenadores`, `Rutinas`, `Rutinas_Cliente`, `Clases` e `Inscripciones_Clase`.

El script `init.sql` crea el esquema y carga datos semilla: roles, países, planes de membresía, 7 entrenadores, 100 clientes con sus membresías y pagos, 105 rutinas, clases e inscripciones.

### Consulta de requerimiento real

Listar los entrenadores con la cantidad de clientes que tienen rutina asignada, el promedio pagado por esos clientes y el porcentaje de pagos exitosos. Solo entrenadores con al menos 2 clientes, ordenados por promedio de pago.

```sql
SELECT
    e.id_entrenador,
    u.nombre                                        AS entrenador,
    e.especialidad,
    COUNT(DISTINCT rc.id_cliente)                   AS total_clientes,
    ROUND(AVG(p.monto), 2)                          AS promedio_pago,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE p.estado_pago = 'Pagado')
        / NULLIF(COUNT(p.id_pago), 0)
    , 1)                                            AS pct_pagos_exitosos
FROM Entrenadores e
JOIN Usuarios u              ON e.id_usuario        = u.id_usuario
JOIN Rutinas r               ON r.id_entrenador     = e.id_entrenador
JOIN Rutinas_Cliente rc      ON rc.id_rutina        = r.id_rutina
JOIN Membresias_Asignadas ma ON ma.id_cliente       = rc.id_cliente
JOIN Pagos p                 ON p.id_membresia_asig = ma.id_membresia_asig
GROUP BY e.id_entrenador, u.nombre, e.especialidad
HAVING COUNT(DISTINCT rc.id_cliente) >= 2
ORDER BY promedio_pago DESC;
```

Lo que practiqué aquí: varios `JOIN` encadenados, agregación con `GROUP BY` y `HAVING`, `COUNT(*) FILTER (...)` para contar condicionalmente y `NULLIF` para no dividir por cero.

### Otros casos del script

- **INSERT en orden de llaves foráneas:** registrar un cliente nuevo con membresía y pago respetando el orden `Usuarios → Clientes → Membresias_Asignadas → Pagos`. Insertar primero en una tabla hija falla porque la fila padre todavía no existe.
- **NULL válido y valores de borde:** `fecha_nacimiento` puede ir vacía y el documento usa la longitud máxima permitida.
- **UPDATE seguro:** primero se cuenta cuántas filas coinciden, luego se actualiza por llave primaria exacta y al final se verifica el resultado.

## Frontend

La aplicación en React ya tiene las pantallas de inicio de sesión, panel principal, clientes, membresías, pagos, entrenadores, rutinas, clases, progreso, comentarios, reportes y "mi cuenta". Por ahora funciona con datos simulados mientras se conecta al backend.

## Lo que sigue

- Triggers para validar cupos de clase y actualizar el estado de la membresía.
- Funciones (por ejemplo, días restantes de membresía) y procedimientos almacenados (registrar pago, renovar membresía), con manejo de excepciones en PL/pgSQL.
- Roles de PostgreSQL con `GRANT` / `REVOKE`.
- Modelo documental y scripts de MongoDB.
- API en Spring Boot conectada a las dos bases.
