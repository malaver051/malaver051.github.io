// Spanish UI dictionary. Scope is UI chrome only — see the note at the top of `en.ts`.

import type { UIStrings } from './en';

export const es: UIStrings = {
  // Header, footer, and other chrome
  'nav.home': 'Inicio',
  'nav.about': 'Sobre mí',
  'nav.works': 'Proyectos',
  'nav.blog': 'Blog',
  'nav.search': 'Buscar',
  'nav.label': 'Navegación principal',
  'nav.brandHome': 'Inicio de {site}',
  'theme.toggle': 'Cambiar tema de color',
  'footer.notes': 'Notas',
  'social.label': 'Redes sociales',

  // Pagination
  'pagination.label': 'Paginación',
  'pagination.newer': '← Más recientes',
  'pagination.older': 'Anteriores →',
  'pagination.status': 'Página {current} de {total}',

  // Home
  'home.primaryLinks': 'Enlaces principales',
  'home.viewWorks': 'Ver proyectos',
  'home.readNotes': 'Leer notas',
  'home.overviewLabel': 'Resumen',
  'home.latestWorksEyebrow': 'Últimos proyectos',
  'home.allWorks': 'Todos los proyectos',
  'home.workTech': 'Tecnología de {title}',
  'home.worksEmpty':
    'Agrega proyectos en <code>src/content/works</code> para mostrarlos aquí.',
  'home.latestBlogEyebrow': 'Últimas notas',
  'home.allPosts': 'Todas las notas',
  'home.postsEmpty':
    'Agrega entradas en <code>src/content/blog</code> para mostrarlas aquí.',

  // Blog index
  'blog.title': 'Blog',
  'blog.titlePaged': 'Blog · Página {page}',
  'blog.eyebrow': 'Blog',
  'blog.listLabel': 'Entradas del blog',
  'blog.tagsEyebrow': 'Etiquetas',
  'blog.tagsNavLabel': 'Etiquetas del blog',

  // Tag archive
  'tag.title': 'Entradas con la etiqueta “{tag}”',
  'tag.titlePaged': 'Entradas con la etiqueta “{tag}” · Página {page}',
  'tag.description': 'Entradas con la etiqueta {tag} en {site}.',
  'tag.eyebrow': 'Etiqueta',
  'tag.lead': 'Notas reunidas bajo la etiqueta {tag}.',
  'tag.listLabel': 'Entradas de {tag}',
  'tag.moreTagsEyebrow': 'Más etiquetas',
  'tag.otherTagsNavLabel': 'Otras etiquetas',
  'tag.allPosts': 'Todas las entradas',

  // Blog post
  'post.eyebrow': 'Blog',
  'post.readingTime': '{minutes} min de lectura',
  'post.tocLabel': 'Tabla de contenido',
  'post.contentsEyebrow': 'Contenido',
  'post.adjacentLabel': 'Entradas cercanas',
  'post.previous': 'Anterior',
  'post.next': 'Siguiente',
  'post.relatedEyebrow': 'Relacionado',
  'post.breadcrumbHome': 'Inicio',
  'post.breadcrumbBlog': 'Blog',

  // Comments
  'comments.eyebrow': 'Comentarios',
  'comments.failed': 'No se pudieron cargar los comentarios. Lee la conversación en {link}.',
  'comments.failedLink': 'GitHub Discussions ↗',
  'comments.noscript': 'Los comentarios necesitan JavaScript. Están alojados en GitHub Discussions.',

  // Works
  'works.title': 'Proyectos',
  'works.eyebrow': 'Proyectos',
  'works.listLabel': 'Proyectos seleccionados',
  'work.eyebrow': 'Proyecto',
  'work.visit': 'Ver proyecto',
  'work.repository': 'Ver repositorio',
  'work.stackEyebrow': 'Tecnologías',

  // About
  'about.title': 'Sobre mí',
  'about.eyebrow': 'Sobre mí',
  'about.ledgerLabel': 'Resumen de experiencia',

  // Search
  'search.title': 'Buscar',
  'search.eyebrow': 'Buscar',
  'search.sectionLabel': 'Búsqueda en el sitio',
  'search.fallback':
    'El índice de búsqueda se genera al compilar. Ejecuta <code>npm run build</code> y previsualiza el sitio para probarlo; no funciona en el servidor de desarrollo.',

  // 404
  'notFound.title': 'Página no encontrada',
  'notFound.description': 'La página que buscas no existe.',
  'notFound.eyebrow': '404 — No encontrada',
  'notFound.heading': 'Esta página se perdió.',
  'notFound.lead': 'Puede que la dirección haya cambiado o que nunca haya existido.',
  'notFound.linksLabel': 'Enlaces para volver',
  'notFound.home': 'Volver al inicio',
  'notFound.blog': 'Leer el blog',
  'notFound.works': 'Ver proyectos',
};
