const express = require('express');
const path = require('path');
const hbs = require('hbs');
const { PrismaClient } = require('@prisma/client');
const methodOverride = require('method-override');

// Initialisation de Prisma
const prisma = new PrismaClient();
const app = express();
const PORT = 44000;

const defaultGenres = [
  'Action',
  'Aventure',
  'RPG',
  'Simulation',
  'Sport',
  'MMORPG',
];

/**
 * Initialise les genres dans le modèle Genre
 *
 * @param defaultGenres Liste des genres à initialiser
 *
 * @returns {Promise<void>}
 * */
async function initializeGenres(defaultGenres) {
  // Genres déjà existant dans la base
  const existingGenres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
  });

  // Si aucun genre, on les rajoutes
  if (existingGenres.length === 0) {
    console.log('Initializing default genres...');

    // Promise.all pour parralléliser donc optimisation
    await Promise.all(
      // Parcours de la liste des genres mis en paramètres
      defaultGenres.map((genreName) =>
        prisma.genre.create({
          data: { name: genreName },
        })
      )
    );

    console.log('Default genres initialized.');
  } else {
    console.log('Genres already exist. Skipping initialization.');
  }
}

/**
 * Démarre le serveur avec l'initialisation des genres par défaut
 *
 * @returns {Promise<void>}
 */
async function startServer() {
  try {
    await initializeGenres(defaultGenres);

    app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);
    });
  } catch (error) {
    console.error('Error during server initialization:', error);
    process.exit(1);
  }
}

app.set('view engine', 'hbs'); // Permet d'utiliser les templates avec hbs
app.set('views', path.join(__dirname, 'views')); // Les templates sont dans le dossier views

hbs.registerPartials(path.join(__dirname, 'views', 'partials')); // Permet d'utiliser les partials
// Utilisation dans les listes déroulantes de l'éditeur de jeux. Permet de comparer deux éléments et si ceux sont égaux, alors l'élément comparé sera l'élément selectionné dans la liste déroulante
hbs.registerHelper('eq', function (a, b) {
  return a === b ? 'selected' : '';
});

app.use(express.static('public')); // Défini les ressources accessibles par les utilisateurs
app.use(express.json()); // Analyse les requêtes JSON
app.use(express.urlencoded({ extended: true })); // Analyse les données encodées dans le corps des requêtes
app.use(methodOverride('_method')); // Pour PUT, DELETE...

app.get('/', async (req, res) => {
  try {
    // Récupérer les jeux mis en avant
    const highlighted_games = await prisma.game.findMany({
      where: {
        highlighted: true,
      },
      orderBy: { title: 'asc' },
    });

    // Rendre la page d'accueil avec les jeux mis en avant
    res
      .status(200)
      .render('index', { highlighted_games, title: 'Jeux mis en avant' });
  } catch (err) {
    console.error(err);
    return res.status(500).render('errors/error', {
      error: 'Une erreur est survenue.',
      title: 'Erreur',
    });
  }
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const editorsRoutes = require('./routes/editors')(prisma);
app.use('/editors', editorsRoutes);

const gamesRoutes = require('./routes/games')(prisma);
app.use('/games', gamesRoutes);

const genresRoutes = require('./routes/genres')(prisma);
app.use('/genres', genresRoutes);

// Permet de gérer les routes inconnues
app.get('*', (req, res) => {
  return res
    .status(404)
    .render('errors/error', { error: 'Page inconnue !', title: 'Erreur' });
});

startServer()
  .then((req) => {
    console.log('Starting server...');
  })
  .catch((err) => {
    console.error('Error during server initialization:', err);
  });
