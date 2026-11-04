---
title: Taller MQL · Consultas, agregación e índices en MongoDB
description: Catorce ejercicios sobre la base sample_mflix: consultas con find, pipelines de agregación, escritura con $out, updateMany y deleteMany, y un índice compuesto diseñado con la regla ESR.
categoria: NoSQL
tech: [MongoDB, MQL, mongosh]
integrantes: [Julian Valencia, Kariana Rivas, Kevin Rojas]
archivo: /evidencias/taller-mql-mongodb.js
fecha: 2026-11-03
order: 1
---

## Contexto

Taller de Bases de Datos 2 sobre `sample_mflix`, la base de ejemplo de MongoDB con películas (`movies`) y comentarios (`comments`). Cada punto lleva una explicación de por qué se usó cada operador.

## Parte A · Consultas con `find`

- **Filtros sobre arreglos.** `genres: "Drama"` encuentra la película si el arreglo contiene ese género, sin tener que recorrerlo.
- **`$ne` sobre un arreglo.** `directors: { $ne: "Steven Spielberg" }` descarta la película si _cualquier_ director es Spielberg, así que también excluye las que codirigió.
- **`$all` + `$size`.** Exige que estén Comedy _y_ Romance y que la película tenga exactamente 3 géneros. Con `$in` bastaría con uno de los dos.
- **Campos ausentes.** `$or` entre `$exists: false` y `$in` para encontrar películas sin clasificación.
- **Expresiones regulares.** `/^The.*Man$/i` ancla el inicio y el final del título e ignora mayúsculas.

## Parte B · Agregación

Las películas con más comentarios. El orden de las etapas importa: primero se agrupa y se recorta a 10, y solo después se hace el `$lookup`, así son 10 uniones en lugar de una por comentario.

```js
db.comments.aggregate([
  { $group: { _id: '$movie_id', numeroComentarios: { $sum: 1 } } },
  { $sort: { numeroComentarios: -1 } },
  { $limit: 10 },
  { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'pelicula' } },
  { $unwind: '$pelicula' },
  { $project: { _id: 0, titulo: '$pelicula.title', anio: '$pelicula.year', numeroComentarios: 1 } },
]);
```

Los otros pipelines:

- **Estadísticas por género.** `$match` antes del `$unwind` para procesar menos documentos, y `$type: "number"` para ignorar ratings guardados como texto.
- **Top 5 de directores.** Se ordena por rating _antes_ de agrupar para que los títulos de ejemplo sean los mejores, y `$slice` muestra máximo 3.
- **Películas por década.** `year - (year mod 10)` convierte 1987 en 1980 y `$concat` arma la etiqueta "1980s".
- **Usuarios más activos.** `$min` y `$max` sobre la fecha dan el primer y el último comentario de cada usuario.

## Parte C · Escritura e índices

- **`$out` con `$switch`.** Clasifica las películas de 2015 en Alta, Media o Baja según su rating y guarda el resultado en una colección nueva. El filtro por rating numérico evita que un texto vacío quede como "Alta", porque en MongoDB un texto es mayor que cualquier número.
- **`updateMany`** con `$set` y `$inc` sobre la categoría Media, revisando `matchedCount` y `modifiedCount`.
- **`deleteMany`** de la categoría Baja, confirmando después con `countDocuments` que no quedó ninguna.

### Índice con la regla ESR

La consulta del punto 1 filtra por género, ordena por rating y pide un rango de años. Sin índice, el plan es `COLLSCAN`: recorre toda la colección. El índice sigue la regla **Igualdad → Orden → Rango**:

```js
db.movies.createIndex(
  { genres: 1, 'imdb.rating': -1, year: 1 },
  { name: 'idx_genres_rating_year' },
);
```

Con el índice, el plan pasa a `IXSCAN`, ya no ordena en memoria y examina muchos menos documentos. La comparación se hizo con `explain("executionStats")`, mirando `totalDocsExamined`, `executionTimeMillis` y la etapa del plan.
