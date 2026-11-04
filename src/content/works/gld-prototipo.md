---
title: GLD · Gobiernos Locales Digitales
description: Prototipo funcional de una plataforma municipal multi-tenant con tres microservicios en Spring Boot (identidad, trámites y comunidad), cada uno con su propio esquema en PostgreSQL versionado con Flyway.
tech: [PostgreSQL, Flyway, Java 21, Spring Boot, React, Vite, JWT]
repo: https://github.com/malaver051/GLD_Prototipo
order: 2
publishDate: 2026-10-20
---

## De qué se trata

GLD es una plataforma para que los gobiernos municipales atiendan a sus ciudadanos en línea: crear una cuenta, solicitar trámites, pagarlos, reportar incidencias en la vía pública y hacerles seguimiento. Cada municipio funciona como un "inquilino" separado dentro del mismo sistema. El caso está ambientado en México, así que la base trae 43 municipios con su clave del INEGI.

**Equipo:** Grupo 3 · 2026-2

## Arquitectura

Tres microservicios en **Spring Boot 3.5 con Java 21** y un frontend en **React 19 + Vite**:

| Servicio       | Puerto | Esquema en PostgreSQL | Qué maneja                                                        |
| -------------- | ------ | --------------------- | ----------------------------------------------------------------- |
| `ms-identidad` | 8081   | `identidad`           | Usuarios, roles, municipios, MFA y recuperación de contraseña     |
| `ms-tramites`  | 8082   | `tramites`            | Catálogo de trámites, requisitos, solicitudes, pagos y documentos |
| `ms-comunidad` | 8083   | `comunidad`           | Reporte de incidencias, dependencias y ubicación en mapa          |

## La parte de base de datos

**Una base por servicio.** Los tres servicios usan la misma instancia de PostgreSQL, pero cada uno tiene su propio esquema. Como `municipio` y `usuario` viven en `ms-identidad`, los otros servicios guardan solo su identificador, sin llave foránea entre esquemas, y una copia de los datos que necesitan mostrar. Así un servicio no depende de las tablas de otro.

**Migraciones con Flyway.** No hay que crear tablas a mano: al arrancar, cada servicio ejecuta sus scripts versionados (`V1__esquema_...sql`, `V2__datos_iniciales.sql`) y deja el esquema y los datos listos.

**Restricciones en el motor.** Las reglas se validan en la base y no solo en el código. Por ejemplo, en la tabla de incidencias:

```sql
CREATE TABLE incidencia (
    id_incidencia       SERIAL         PRIMARY KEY,
    numero_seguimiento  VARCHAR(30)    NOT NULL UNIQUE,
    categoria           VARCHAR(20)    NOT NULL
        CHECK (categoria IN ('VIAS', 'ALUMBRADO', 'ASEO', 'SEGURIDAD', 'OTRO')),
    latitud             NUMERIC(9, 6)  NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud            NUMERIC(9, 6)  NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    estado              VARCHAR(20)    NOT NULL
        CHECK (estado IN ('REPORTADA', 'ASIGNADA', 'EN_ATENCION', 'RESUELTA', 'CERRADA')),
    ...
);
```

**Índices pensados para las consultas.** Los listados se filtran casi siempre por municipio y estado, así que hay índices compuestos como `ix_incidencia_municipio (municipio_id_municipio, estado)` e `ix_solicitud_municipio (municipio_id_municipio, estado)`, además de índices por ciudadano y por historial.

**Tablas principales**

- Identidad: `municipio`, `rol`, `usuario`, `usuario_rol`, `token_recuperacion`, `solicitud_restablecimiento`
- Trámites: `tipo_tramite`, `requisito_tramite`, `solicitud_tramite`, `historial`, `pago`, `documento`
- Comunidad: `dependencia`, `centro_municipio`, `incidencia`, `historial_incidencia`

## Seguridad y acceso

- Tres roles: **administrador**, **funcionario** (solo correos `@gobierno.com`, creado por el admin con contraseña temporal) y **ciudadano**.
- Los ciudadanos siempre entran con contraseña más un código de **Microsoft Authenticator** (TOTP). La base guarda el último paso usado para que un código no se pueda reutilizar.
- Contraseñas con **BCrypt** y sesiones con **JWT**: el token de acceso dura 60 minutos y los tokens de pasos intermedios (MFA, cambio de clave) solo 10.
- Enlaces de recuperación de un solo uso que vencen a los 30 minutos.

## Diseño del código

El backend sigue MVC (controladores REST, servicios, entidades JPA y repositorios) y aplica principios GRASP: por ejemplo, `Usuario` decide si requiere MFA (experto en información) y `NotificadorCorreo` permite pasar del correo simulado en consola a SMTP sin tocar los servicios (variaciones protegidas).
