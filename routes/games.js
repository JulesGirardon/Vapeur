const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { debug } = require('console');

// Chemin absolu vers le dossier uploads à la racine du projet
const uploadDir = path.join(process.cwd(), 'uploads');

// Configuration de Multer pour gérer le stockage des fichiers téléchargés
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Définition d'un filtre pour les fichiers téléchargés
const fileFilter = (req, file, cb) => {
  // MIME = Multipurpose Internet Mail Extensions
  // MIME permet d'identifier le type de contenu
  // Type MIME : type/subtype (exemple image/jpeg)

  // Type autorisé
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

  if (allowedTypes.includes(file.mimetype)) {
    // Si le type est valide, appelle le callback avec null (pas d'erreur) et true (autorisation du fichier)
    cb(null, true);
  } else {
    // Si le type n'est pas valide, appelle le callback avec une erreur et false (refus du fichier)
    cb(new Error('Seules les images sont autorisées'), false);
  }
};

const gamesRoutes = (prisma) => {
  const router = express.Router();

  const upload = multer({ storage, fileFilter });
  // L'ajout du middleware static doit se faire dans l'app principale, pas ici

  // Vérifie que le dossier uploads existe à la racine et création du dossier si besoin
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // Affichage de la liste de tous les jeux
  router.get('/', async (req, res) => {
    try {
      const games = await prisma.game.findMany({
        orderBy: { title: 'asc' },
      });
      res.status(200).render('games/index', { games, title: 'Liste des jeux' });
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Création d'un jeu : frontend
  router.get('/create', async (req, res) => {
    try {
      const genres = await prisma.genre.findMany({
        orderBy: { name: 'asc' },
      });
      const editors = await prisma.editor.findMany({
        orderBy: { name: 'asc' },
      });

      if (editors.length === 0) {
        return res.status(403).render('errors/error', {
          error:
            'Vous devez ajouter des éditeurs pour pouvoir ajouter des jeux',
          title: 'Erreur',
        });
      }

      res.status(200).render('games/create', {
        genres,
        editors,
        title: 'Créer un jeu',
        text_action: 'Créer le jeu',
      });
    } catch (err) {
      console.error(err);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Création d'un jeu : backend
  router.post('/create', upload.single('image'), async (req, res) => {
    try {
      const gameData = req.body;

      const genreExists = await prisma.genre.findUnique({
        where: {
          id: parseInt(gameData.genre),
        },
      });

      if (!genreExists) {
        return res.status(404).render('errors/error', {
          error: "Le genre n'existe pas.",
          title: 'Erreur',
        });
      }

      const editorExists = await prisma.editor.findUnique({
        where: {
          id: parseInt(gameData.editor),
        },
      });

      if (!editorExists) {
        return res.status(404).render('errors/error', {
          error: "L'éditeur n'existe pas.",
          title: 'Erreur',
        });
      }

      const imagePath = req.file
        ? path.posix.join('/uploads', req.file.filename)
        : null;

      const game = await prisma.game.create({
        data: {
          title: gameData.title,
          description: gameData.description,
          releaseDate: new Date(gameData.releaseDate),
          genre: {
            connect: { id: parseInt(gameData.genre) }, // Permet de "lié le jeu au genre qui lui est associé
          },
          editor: {
            connect: { id: parseInt(gameData.editor) }, // Permet de "lié le jeu à l'éditeur qui lui est associé
          },
          highlighted: gameData.highlighted === 'on',
          image: imagePath, // Image stockée dans le dossier "uploads/"
        },
      });

      res.status(200).redirect('/games');
    } catch (err) {
      console.log(err);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Affichage détails d'un jeu
  router.get('/:id/details', async (req, res) => {
    try {
      const game = await prisma.game.findUnique({
        where: {
          id: parseInt(req.params.id),
        },
        include: {
          // Permet de récupérer les informations du genre et de l'éditeur
          genre: true,
          editor: true,
        },
      });

      if (!game) {
        return res.status(404).render('errors/error', {
          error: "Le jeu n'existe pas.",
          title: 'Erreur',
        });
      }

      // Formate la date de sortie du jeu en format "YYYY-MM-DD".
      // La méthode toISOString() renvoie la date au format ISO (ex : "2024-12-15T00:00:00.000Z").
      // Ensuite, on utilise split('T') pour séparer la date de l'heure et on prend la première partie (la date).
      // Le résultat est une chaîne de caractères représentant la date au format "YYYY-MM-DD".
      const releaseDateFormatted = game.releaseDate.toISOString().split('T')[0]; // .split('T') -> [ "2024-12-15", "00:00:00.000Z"] donc .split('T')[0] -> "2024-12-15"

      res.status(200).render('games/details', {
        game,
        releaseDateFormatted,
        title: game.title,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Modification d'un jeu : frontend
  router.get('/:id/edit', async (req, res) => {
    try {
      const game = await prisma.game.findUnique({
        where: { id: parseInt(req.params.id) },
      });

      if (!game) {
        return res.status(404).render('errors/error', {
          error: "Le jeu n'existe pas.",
          title: 'Erreur',
        });
      }

      const genres = await prisma.genre.findMany({
        orderBy: { name: 'asc' },
      });

      if (!genres) {
        return res.status(404).render('errors/error', {
          error: "Le genre n'existe pas.",
          title: 'Erreur',
        });
      }

      const editors = await prisma.editor.findMany({
        orderBy: { name: 'asc' },
      });

      if (!editors) {
        return res.status(404).render('errors/error', {
          error: "L'éditeur n'existe pas.",
          title: 'Erreur',
        });
      }

      // Formate la date de sortie du jeu en format "YYYY-MM-DD".
      // La méthode toISOString() renvoie la date au format ISO (ex : "2024-12-15T00:00:00.000Z").
      // Ensuite, on utilise split('T') pour séparer la date de l'heure et on prend la première partie (la date).
      // Le résultat est une chaîne de caractères représentant la date au format "YYYY-MM-DD".
      const releaseDateFormatted = game.releaseDate.toISOString().split('T')[0]; // .split('T') -> [ "2024-12-15", "00:00:00.000Z"] donc .split('T')[0] -> "2024-12-15"

      res.render('games/edit', {
        game,
        genres,
        editors,
        releaseDate: releaseDateFormatted, // Passe la date formatée à la vue
        title: 'Editeur de jeu',
        text_action: 'Editer le jeu',
      });
    } catch (err) {
      console.log(err);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Modification d'un jeu : backend
  router.put('/:id/edit', upload.single('image'), async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { title, description, releaseDate, genre, editor, highlighted } =
        req.body;
      const genreId = parseInt(genre);
      const editorId = editor ? parseInt(editor) : null; // Si editor est fourni, on le convertit en entier, sinon on le laisse null. Cas où l'on supprime un éditeur qui possède des jeux

      // Vérifie si le jeu existe
      const gameExists = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!gameExists) {
        return res.status(404).render('errors/error', {
          error: "Le jeu n'existe pas.",
          title: 'Erreur',
        });
      }

      // Vérifie si le genre et l'éditeur existent
      const genreExists = await prisma.genre.findUnique({
        where: { id: genreId },
      });

      // Si l'éditeur est fourni, on vérifie qu'il existe
      let editorExists = true; // On assume que l'éditeur est valide si l'input est vide
      if (editorId) {
        editorExists = await prisma.editor.findUnique({
          where: { id: editorId },
        });
      }

      if (!genreExists || !editorExists) {
        return res.status(404).render('errors/error', {
          error: 'Genre ou éditeur non trouvé.',
          title: 'Erreur',
        });
      }

      // Si une nouvelle image est téléchargée, on met à jour le chemin de l'image
      let imagePath = gameExists.image; // Garde l'image existante par défaut

      if (req.file) {
        // Si un fichier (image) a été téléchargé dans la requête, on procède à la gestion de l'image

        // Supprime l'ancienne image si elle existe
        if (gameExists.image) {
          // On crée le chemin complet de l'ancienne image à partir du nom du fichier stocké dans gameExists.image
          const oldImagePath = path.join(process.cwd(), gameExists.image); // Exemple: "uploads/image1.jpg"

          // Vérifie si l'ancienne image existe dans le système de fichiers
          if (fs.existsSync(oldImagePath)) {
            // Si l'image existe, on la supprime du disque dur
            fs.unlinkSync(oldImagePath); // Cela supprime le fichier image
          }
        }

        // Nouveau chemin de l'image téléchargée
        // Le fichier téléchargé est accessible via req.file, et on génère son chemin relatif
        imagePath = `/uploads/${req.file.filename}`; // Exemple: "/uploads/1631137654425-image2.jpg"
      }

      // Met à jour le jeu
      await prisma.game.update({
        where: { id: gameId },
        data: {
          title,
          description,
          releaseDate: new Date(releaseDate),
          genre: { connect: { id: genreId } },
          editor: editorId ? { connect: { id: editorId } } : undefined, // Si editorId est fourni, on le connecte, sinon on l'ignore
          highlighted: highlighted === 'on',
          image: imagePath, // Met à jour l'image
        },
      });

      res.status(200).redirect(`/games/${gameId}/details`);
    } catch (error) {
      console.error(error);
      return res.status(500).render('errors/error', {
        error: 'Une erreur est survenue.',
        title: 'Erreur',
      });
    }
  });

  // Suppression d'un jeu
  router.delete('/:id/delete', async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);

      const gameExists = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!gameExists) {
        return res.status(404).json({ error: "Le jeu n'existe pas." });
      }

      // Vérifie si une image existe et la supprime du système de fichiers
      if (gameExists.image) {
        const imagePath = path.join(
          process.cwd(),
          'uploads',
          path.basename(gameExists.image)
        );

        // Supprime l'image si elle existe
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error("Erreur lors de la suppression de l'image:", err);
          }
        });
      }

      // Supprime le jeu de la base de données
      await prisma.game.delete({
        where: { id: gameId },
      });

      res.status(200).redirect('/games');
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

module.exports = gamesRoutes;
module.exports.fileFilter = fileFilter;
