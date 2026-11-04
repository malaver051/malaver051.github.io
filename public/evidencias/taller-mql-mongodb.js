// UNIVERSIDAD EL BOSQUE
// BASES DE DATOS 2
// TALLER MQL – CONSULTAS, AGREGACIÓN E ÍNDICES EN MONGODB
// Integrantes: Julian Valencia, Kariana Rivas, Kevin Rojas


// PARTE A – CONSULTAS (find)

// PUNTO 1
// Filtra Drama con year entre 2000 y 2010 ($gte/$lte) e imdb.rating >= 8; como genres es un arreglo,
// basta con igualarlo a "Drama". Proyecta solo title, year e imdb.rating sin _id, ordena por rating
// descendente y limita a 10. countDocuments con el mismo filtro da el conteo total.
use('sample_mflix');
db.movies.find(
  {
    genres: "Drama",
    year: { $gte: 2000, $lte: 2010 },
    "imdb.rating": { $gte: 8 }
  },
  {
    _id: 0,
    title: 1,
    year: 1,
    "imdb.rating": 1
  }
).sort({ "imdb.rating": -1 }).limit(10);

db.movies.countDocuments({
  genres: "Drama",
  year: { $gte: 2000, $lte: 2010 },
  "imdb.rating": { $gte: 8 }
});


// PUNTO 2
// cast: "Tom Hanks" busca al actor dentro del arreglo de reparto. Sobre un arreglo, $ne descarta la
// película si cualquier elemento de directors es "Steven Spielberg", así que también excluye las que codirigió.
use('sample_mflix');
db.movies.find(
  {
    cast: "Tom Hanks",
    directors: { $ne: "Steven Spielberg" }
  },
  {
    _id: 0,
    title: 1,
    year: 1,
    directors: 1
  }
).sort({ year: 1 });

db.movies.countDocuments({
  cast: "Tom Hanks",
  directors: { $ne: "Steven Spielberg" }
});


// PUNTO 3
// $all exige que el arreglo genres contenga Comedy y Romance (en cualquier orden) y $size exige que
// tenga exactamente 3 elementos. Con $in bastaría que estuviera solo uno de los dos géneros.
use('sample_mflix');
db.movies.find(
  {
    genres: {
      $size: 3,
      $all: ["Comedy", "Romance"]
    }
  },
  {
    _id: 0,
    title: 1,
    genres: 1,
    year: 1
  }
);

db.movies.countDocuments({
  genres: { $size: 3, $all: ["Comedy", "Romance"] }
});


// PUNTO 4
// $or combina dos condiciones: que el campo rated no exista ($exists: false) o que su valor esté en
// la lista "UNRATED" / "NOT RATED" ($in). countDocuments con el mismo filtro da el conteo.
use('sample_mflix');
db.movies.find(
  {
    $or: [
      { rated: { $exists: false } },
      { rated: { $in: ["UNRATED", "NOT RATED"] } }
    ]
  },
  {
    _id: 0,
    title: 1,
    year: 1,
    rated: 1
  }
).limit(20);

db.movies.countDocuments({
  $or: [
    { rated: { $exists: false } },
    { rated: { $in: ["UNRATED", "NOT RATED"] } }
  ]
});


// PUNTO 5
// La expresión regular ancla "The" al inicio (^) y "Man" al final ($); .* permite cualquier texto en
// medio y la opción i ignora mayúsculas y minúsculas.
use('sample_mflix');
db.movies.find(
  {
    title: { $regex: /^The.*Man$/i }
  },
  {
    _id: 0,
    title: 1,
    year: 1
  }
).sort({ title: 1 });


// PARTE B – AGREGACIÓN (aggregate)

// PUNTO 6
// $match deja solo ratings numéricos ($type) antes del $unwind para procesar menos documentos; $unwind
// separa cada género y $group calcula conteo, promedio y máximo. El segundo $match deja los géneros con
// más de 500 películas, $project redondea el promedio a 2 decimales y $sort lo ordena descendente.
use('sample_mflix');
db.movies.aggregate([
  {
    $match: {
      genres: { $exists: true, $ne: null },
      "imdb.rating": { $type: "number" }
    }
  },
  {
    $unwind: "$genres"
  },
  {
    $group: {
      _id: "$genres",
      numeroPeliculas: { $sum: 1 },
      ratingPromedioRaw: { $avg: "$imdb.rating" },
      ratingMaximo: { $max: "$imdb.rating" }
    }
  },
  {
    $match: {
      numeroPeliculas: { $gt: 500 }
    }
  },
  {
    $project: {
      _id: 0,
      genero: "$_id",
      numeroPeliculas: 1,
      ratingPromedio: { $round: ["$ratingPromedioRaw", 2] },
      ratingMaximo: 1
    }
  },
  {
    $sort: { ratingPromedio: -1 }
  }
]);


// PUNTO 7
// Filtra películas con rating >= 7.5 y las ordena por rating para que los títulos guardados sean los mejores.
// $unwind separa los directores, $group cuenta y acumula títulos, $match exige mínimo 5 películas,
// $sort y $limit dejan el top 5 y $slice muestra máximo 3 títulos.
use('sample_mflix');
db.movies.aggregate([
  {
    $match: {
      directors: { $exists: true, $ne: null },
      "imdb.rating": { $gte: 7.5 }
    }
  },
  {
    $sort: { "imdb.rating": -1 }
  },
  {
    $unwind: "$directors"
  },
  {
    $group: {
      _id: "$directors",
      cantidadPeliculas: { $sum: 1 },
      titulos: { $push: "$title" }
    }
  },
  {
    $match: {
      cantidadPeliculas: { $gte: 5 }
    }
  },
  {
    $sort: { cantidadPeliculas: -1 }
  },
  {
    $limit: 5
  },
  {
    $project: {
      _id: 0,
      director: "$_id",
      cantidadPeliculas: 1,
      ejemplosTitulos: { $slice: ["$titulos", 3] }
    }
  }
]);


// PUNTO 8
// Filtra años numéricos desde 1950 (algunos year vienen como texto). La década se calcula como
// year - (year mod 10), por ejemplo 1987 -> 1980; se agrupa por ese valor, se arma la etiqueta "1980s"
// con $concat y se ordena cronológicamente.
use('sample_mflix');
db.movies.aggregate([
  {
    $match: {
      year: { $gte: 1950, $type: "number" }
    }
  },
  {
    $group: {
      _id: {
        $subtract: ["$year", { $mod: ["$year", 10] }]
      },
      totalPeliculas: { $sum: 1 }
    }
  },
  {
    $sort: { _id: 1 }
  },
  {
    $project: {
      _id: 0,
      decada: {
        $concat: [{ $toString: "$_id" }, "s"]
      },
      totalPeliculas: 1
    }
  }
]);


// PUNTO 9
// Desde comments, $group cuenta los comentarios por movie_id y $sort/$limit dejan las 10 películas con más.
// Solo después $lookup trae título y año desde movies (10 uniones en vez de una por comentario);
// $unwind convierte el arreglo del $lookup en documento y $project muestra el resultado.
use('sample_mflix');
db.comments.aggregate([
  {
    $group: {
      _id: "$movie_id",
      numeroComentarios: { $sum: 1 }
    }
  },
  {
    $sort: { numeroComentarios: -1 }
  },
  {
    $limit: 10
  },
  {
    $lookup: {
      from: "movies",
      localField: "_id",
      foreignField: "_id",
      as: "pelicula"
    }
  },
  {
    $unwind: "$pelicula"
  },
  {
    $project: {
      _id: 0,
      titulo: "$pelicula.title",
      anio: "$pelicula.year",
      numeroComentarios: 1
    }
  }
]);


// PUNTO 10
// Agrupa los comentarios por email; $sum cuenta cuántos hizo cada usuario y $min / $max sobre date dan
// la fecha del primer y del último comentario. El $match final deja solo los usuarios con más de 250.
use('sample_mflix');
db.comments.aggregate([
  {
    $group: {
      _id: "$email",
      nombre: { $first: "$name" },
      totalComentarios: { $sum: 1 },
      primerComentario: { $min: "$date" },
      ultimoComentario: { $max: "$date" }
    }
  },
  {
    $match: {
      totalComentarios: { $gt: 250 }
    }
  },
  {
    $sort: { totalComentarios: -1 }
  },
  {
    $project: {
      _id: 0,
      email: "$_id",
      nombre: 1,
      totalComentarios: 1,
      primerComentario: 1,
      ultimoComentario: 1
    }
  }
]);


// PARTE C – ESCRITURA E ÍNDICES

// PUNTO 11
// Toma las películas de 2015 con rating numérico (un texto "" valdría más que cualquier número y quedaría
// como "Alta"). $switch evalúa las ramas en orden: >= 7.5 "Alta", >= 6 "Media" y el resto "Baja";
// $out guarda el resultado en la colección peliculas_pareja.
use('sample_mflix');
db.movies.aggregate([
  {
    $match: {
      year: 2015,
      "imdb.rating": { $type: "number" }
    }
  },
  {
    $project: {
      _id: 0,
      titulo: "$title",
      generos: "$genres",
      rating: "$imdb.rating",
      categoria: {
        $switch: {
          branches: [
            { case: { $gte: ["$imdb.rating", 7.5] }, then: "Alta" },
            { case: { $gte: ["$imdb.rating", 6] }, then: "Media" }
          ],
          default: "Baja"
        }
      }
    }
  },
  {
    $out: "peliculas_pareja"
  }
]);

db.peliculas_pareja.find({}, { _id: 0 }).limit(10);

db.peliculas_pareja.countDocuments();


// PUNTO 12
// updateMany filtra las películas de categoría "Media"; $set agrega revisado: true y $inc suma 0.1 al rating.
// El resultado muestra matchedCount (documentos que cumplen el filtro) y modifiedCount (documentos cambiados).
use('sample_mflix');
db.peliculas_pareja.updateMany(
  {
    categoria: "Media"
  },
  {
    $set: { revisado: true },
    $inc: { rating: 0.1 }
  }
);

db.peliculas_pareja.find({ categoria: "Media" }, { _id: 0 }).limit(10);


// PUNTO 13
// deleteMany elimina todos los documentos con categoria "Baja" y devuelve deletedCount con la cantidad
// borrada. El countDocuments posterior confirma que ya no queda ninguna película "Baja".
use('sample_mflix');
db.peliculas_pareja.deleteMany({
  categoria: "Baja"
});

db.peliculas_pareja.countDocuments({ categoria: "Baja" });


// PUNTO 14
// Sin índice el plan ganador es COLLSCAN y recorre toda la colección. El índice sigue la regla ESR: genres
// (igualdad), imdb.rating (orden) y year (rango); así el plan pasa a IXSCAN, sin ordenar en memoria y con muchos
// menos documentos examinados. Se comparan totalDocsExamined, executionTimeMillis y la etapa del plan; al final se elimina el índice.
use('sample_mflix');
db.movies.find(
  {
    genres: "Drama",
    year: { $gte: 2000, $lte: 2010 },
    "imdb.rating": { $gte: 8 }
  },
  {
    _id: 0,
    title: 1,
    year: 1,
    "imdb.rating": 1
  }
).sort({ "imdb.rating": -1 }).limit(10).explain("executionStats");

db.movies.createIndex(
  { genres: 1, "imdb.rating": -1, year: 1 },
  { name: "idx_genres_rating_year" }
);

db.movies.find(
  {
    genres: "Drama",
    year: { $gte: 2000, $lte: 2010 },
    "imdb.rating": { $gte: 8 }
  },
  {
    _id: 0,
    title: 1,
    year: 1,
    "imdb.rating": 1
  }
).sort({ "imdb.rating": -1 }).limit(10).explain("executionStats");

db.movies.dropIndex("idx_genres_rating_year");
