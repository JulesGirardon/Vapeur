const express = require('express');

module.exports = (prisma) => {
  const router = express.Router();

  // Ajout d'un éditeur : backend
  router.post('/', async (req, res) => {
    try {
      const { name } = req.body;
      await prisma.editor.create({ data: { name } });
      res.redirect('/editors');
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Liste des éditeurs : frontend
  router.get('/', async (req, res) => {
    try {
      const editors = await prisma.editor.findMany({
        orderBy: { name: 'asc' },
      });
      res
        .status(200)
        .render('editors/editors', { editors, title: 'Liste des éditeurs' });
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Liste des jeux d'un éditeur : frontend
  router.get('/:id/games', async (req, res) => {
    try {
      const editorId = parseInt(req.params.id);

      if (!editorId) {
        return res.status(404).render('errors/error', {
          error: "L'éditeur n'existe pas.",
          title: 'Erreur',
        });
      }

      const editor = await prisma.editor.findUnique({
        where: { id: editorId },
        // Permet de récupérer les informations des jeux "associées"
        include: { games: true },
      });

      if (!editor) {
        return res.status(404).render('errors/error', {
          error: "L'éditeur n'existe pas.",
          title: 'Erreur',
        });
      }

      res.render('editors/games', { editor, title: editor.name });
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Mise à jour d'un éditeur : backend
  router.put('/:id/update', async (req, res) => {
    try {
      const editorId = parseInt(req.params.id, 10);

      if (!editorId) {
        return res.status(404).json({ error: "L'éditeur n'existe pas." });
      }

      const { name } = req.body;

      await prisma.editor.update({
        where: { id: editorId },
        data: { name },
      });

      res.redirect('/editors');
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Supprimer un éditeur : backend
  router.delete('/:id/delete', async (req, res) => {
    try {
      const editorId = parseInt(req.params.id, 10);

      if (!editorId) {
        return res.status(404).json({ error: "L'éditeur n'existe pas." });
      }

      await prisma.editor.delete({
        where: { id: editorId },
      });

      res.redirect('/editors');
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
