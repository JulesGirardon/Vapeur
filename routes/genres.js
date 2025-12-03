const express = require('express');

module.exports = (prisma) => {
  const router = express.Router();

  // Liste des genres : frontend
  router.get('/', async (req, res) => {
    try {
      const genres = await prisma.genre.findMany({
        orderBy: { name: 'asc' },
      });
      res.render('genres/genres', { genres, title: 'Liste des genres' });
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Liste des jeux associés au genre : frontend
  router.get('/:id/games', async (req, res) => {
    try {
      const genreId = parseInt(req.params.id, 10);
      const genre = await prisma.genre.findUnique({
        where: { id: genreId },
        include: {
          // Permet de récupérer les informations des jeux "associées"
          games: true,
        },
      });

      if (!genre) {
        return res.status(404).render('errors/error', {
          error: "Le genre n'existe pas.",
          title: 'Erreur',
        });
      }

      res.render('genres/games', { genre, title: genre.name });
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  return router;
};
