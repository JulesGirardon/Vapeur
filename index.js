const express = require("express");
const path = require("path");
const hbs = require("hbs");
const { PrismaClient } = require("@prisma/client");
const methodOverride = require('method-override');
const multer = require('multer');
const fs = require('fs');

// Initialisation de Prisma
const prisma = new PrismaClient();
const app = express();
const PORT = 44000;

const defaultGenres = ["Action", "Aventure", "RPG", "Simulation", "Sport", "MMORPG"];

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
        orderBy: { name: 'asc' }
    });

    // Si aucun genre, on les rajoutes
    if (existingGenres.length === 0) {
        console.log("Initializing default genres...");

        // Promise.all pour parralléliser donc optimisation
        await Promise.all(
            // Parcours de la liste des genres mis en paramètres
            defaultGenres.map((genreName) =>
                prisma.genre.create({
                    data: { name: genreName },
                })
            )
        );

        console.log("Default genres initialized.");
    } else {
        console.log("Genres already exist. Skipping initialization.");
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
        console.error("Error during server initialization:", error);
        process.exit(1);
    }
}

app.set("view engine", "hbs"); // Permet d'utiliser les templates avec hbs
app.set("views", path.join(__dirname, "views")); // Les templates sont dans le dossier views

hbs.registerPartials(path.join(__dirname, "views", "partials")); // Permet d'utiliser les partials
// Utilisation dans les listes déroulantes de l'éditeur de jeux. Permet de comparer deux éléments et si ceux sont égaux, alors l'élément comparé sera l'élément selectionné dans la liste déroulante
hbs.registerHelper('eq', function(a, b) {
    return a === b ? 'selected' : '';
});

app.use(express.static("public")); // Défini les ressources accessibles par les utilisateurs
app.use(express.json()); // Analyse les requêtes JSON
app.use(express.urlencoded({ extended: true })); // Analyse les données encodées dans le corps des requêtes
app.use(methodOverride('_method')); // Pour PUT, DELETE...

// Configuration de Multer pour gérer le stockage des fichiers téléchargés
const storage = multer.diskStorage({
    // cb = callback
    // null = Convention des APIs asynchrones basées sur les callbacks en Node.js pour dire qu'il n'y a pas d'erreur

    // Spécifie le dossier avec lequel les fichiers seront enregistrés, ici "uploads"
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    // Génère un nom unique basé sur l'heure actuelle et conserve l'extension d'origine
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nom unique pour éviter les conflits
    }
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

const upload = multer({ storage, fileFilter });
app.use('/uploads', express.static('uploads'));

// Vérifie que le dossier uploads existe et création du dossier si besoin
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.get("/", async (req, res) => {
    try {
        // Récupérer les jeux mis en avant
        const highlighted_games = await prisma.game.findMany({
            where: {
                highlighted: true
            },
            orderBy: { title: 'asc' }
        });

        // Rendre la page d'accueil avec les jeux mis en avant
        res.status(200).render("index", { highlighted_games, title: "Jeux mis en avant" });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Affichage de la liste de tous les jeux
app.get("/games", async (req, res) => {
    try {
        const games = await prisma.game.findMany({
            orderBy: { title: 'asc' }
        });
        res.status(200).render("games/index", { games, title: "Liste des jeux" });
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur"});
    }
});

// Création d'un jeu : frontend
app.get("/games/create", async (req, res) => {
    try {
        const genres = await prisma.genre.findMany({
            orderBy: { name: 'asc' }
        });
        const editors = await prisma.editor.findMany({
            orderBy: { name: 'asc' }
        });

        if(editors.length === 0) {
            res.status(403).render("error", { error: "Vous devez avoir des éditeurs pour créer un jeu.", title: "Erreur"});
        }

        res.status(200).render("games/create", {genres, editors, title: "Créer un jeu"});
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur"});
    }
});

// Création d'un jeu : backend
app.post("/games/create", upload.single('image'), async (req, res) => {
    try {
        const gameData = req.body;

        const genreExists = await prisma.genre.findUnique({
            where: {
                id: parseInt(gameData.genre)
            },
        });

        if (!genreExists) {
            throw new Error("Le genre spécifié n'existe pas.");
        }

        const editorExists = await prisma.editor.findUnique({
            where: {
                id: parseInt(gameData.editor)
            },
        });

        if (!editorExists) {
            throw new Error("L'éditeur spécifié n'existe pas.");
        }

        const imagePath = req.file ? path.join('/uploads', req.file.filename) : null;

        const game = await prisma.game.create({
            data: {
                title: gameData.title,
                description: gameData.description,
                releaseDate: new Date(gameData.releaseDate),
                genre: {
                    connect: { id: parseInt(gameData.genre) }  // Permet de "lié le jeu au genre qui lui est associé
                },
                editor: {
                    connect: { id: parseInt(gameData.editor) } // Permet de "lié le jeu à l'éditeur qui lui est associé
                },
                highlighted: gameData.highlighted === 'on',
                image: imagePath // Image stockée dans le dossier "uploads/"
            },
        });

        res.status(200).redirect("/games");
    } catch (err) {
        console.log(err);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Affichage détails d'un jeu
app.get("/games/:id/details", async (req, res) => {
    try {
        const game = await prisma.game.findUnique({
            where: {
                id: parseInt(req.params.id)
            },
            include: {
                // Permet de récupérer les informations du genre et de l'éditeur
                genre: true,
                editor: true
            }
        });

        if (!game) {
            return res.status(404).render("error", { error: "Le jeu n'existe pas.", title: "Erreur" });
        }

        // Formate la date de sortie du jeu en format "YYYY-MM-DD".
        // La méthode toISOString() renvoie la date au format ISO (ex : "2024-12-15T00:00:00.000Z").
        // Ensuite, on utilise split('T') pour séparer la date de l'heure et on prend la première partie (la date).
        // Le résultat est une chaîne de caractères représentant la date au format "YYYY-MM-DD".
        const releaseDateFormatted = game.releaseDate.toISOString().split('T')[0]; // .split('T') -> [ "2024-12-15", "00:00:00.000Z"] donc .split('T')[0] -> "2024-12-15"

        res.status(200).render("games/details", { game, releaseDateFormatted, title: game.title });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Modification d'un jeu : frontend
app.get("/games/:id/edit", async (req, res) => {
    try {
        const game = await prisma.game.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!game) {
            return res.status(404).render("error", { error: "Le jeu n'existe pas.", title: "Erreur" });
        }

        const genres = await prisma.genre.findMany({
            orderBy: { name: 'asc' }
        });

        if (!genres) {
            return res.status(404).render("error", { error: "Le genre n'existe pas.", title: "Erreur" });
        }

        const editors = await prisma.editor.findMany({
            orderBy: { name: 'asc' }
        });

        if (!editors) {
            return res.status(404).render("error", { error: "L'éditeur n'existe pas.", title: "Erreur" });
        }

        // Formate la date de sortie du jeu en format "YYYY-MM-DD".
        // La méthode toISOString() renvoie la date au format ISO (ex : "2024-12-15T00:00:00.000Z").
        // Ensuite, on utilise split('T') pour séparer la date de l'heure et on prend la première partie (la date).
        // Le résultat est une chaîne de caractères représentant la date au format "YYYY-MM-DD".
        const releaseDateFormatted = game.releaseDate.toISOString().split('T')[0];  // .split('T') -> [ "2024-12-15", "00:00:00.000Z"] donc .split('T')[0] -> "2024-12-15"

        res.render("games/edit", {
            game,
            genres,
            editors,
            releaseDate: releaseDateFormatted, // Passe la date formatée à la vue
            title: "Editeur de jeu"
        });
    } catch (err) {
        console.log(err);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Modification d'un jeu : backend
app.put("/games/:id/edit", upload.single('image'), async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);
        const { title, description, releaseDate, genre, editor, highlighted } = req.body;
        const genreId = parseInt(genre);
        const editorId = parseInt(editor);

        // Vérifie si le jeu existe
        const gameExists = await prisma.game.findUnique({
            where: { id: gameId },
        });

        if (!gameExists) {
            return res.status(404).render("error", { error: "Le jeu n'existe pas.", title: "Erreur" });
        }

        // Vérifie si le genre et l'éditeur existent
        const genreExists = await prisma.genre.findUnique({
            where: { id: genreId },
        });

        const editorExists = await prisma.editor.findUnique({
            where: { id: editorId },
        });

        if (!genreExists || !editorExists) {
            return res.status(404).render("error", { error: "Genre ou éditeur non trouvé.", title: "Erreur" });
        }

        // Si une nouvelle image est téléchargée, on met à jour le chemin de l'image
        let imagePath = gameExists.image; // Garde l'image existante par défaut

        if (req.file) {
            // Si un fichier (image) a été téléchargé dans la requête, on procède à la gestion de l'image

            // Supprime l'ancienne image si elle existe
            if (gameExists.image) {
                // On crée le chemin complet de l'ancienne image à partir du nom du fichier stocké dans gameExists.image
                const oldImagePath = path.join(__dirname, gameExists.image); // Exemple: "uploads/image1.jpg"

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
                editor: { connect: { id: editorId } },
                highlighted: highlighted === 'on',
                image: imagePath, // Met à jour l'image
            },
        });

        res.status(200).redirect(`/games/${gameId}/details`);
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Suppression d'un jeu
app.delete("/games/:id/delete", async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);

        const gameExists = await prisma.game.findUnique({
            where: { id: gameId },
        });

        if (!gameExists) {
            return res.status(404).json({ error: "Le jeu n'existe pas."});
        }

        // Vérifie si une image existe et la supprime du système de fichiers
        if (gameExists.image) {
            const imagePath = path.join(__dirname, 'uploads', path.basename(gameExists.image));

            // Supprime l'image si elle existe
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression de l\'image:', err);
                }
            });
        }

        // Supprime le jeu de la base de données
        await prisma.game.delete({
            where: { id: gameId },
        });

        res.status(200).redirect("/games");
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Liste des genres : frontend
app.get('/genres', async (req, res) => {
    try {
        const genres = await prisma.genre.findMany({
            orderBy: { name: 'asc' }
        });
        res.render('genres/genres', { genres, title: "Liste des genres" });
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});


// Liste des jeux associés au genre : frontend
app.get('/genres/:id/games', async (req, res) => {
    try {
        const genreId = parseInt(req.params.id, 10);
        const genre = await prisma.genre.findUnique({
            where: { id: genreId },
            include: {
                // Permet de récupérer les informations des jeux "associées"
                games: true
            },
        });

        if (!genre) {
            return res.status(404).render("error", {error: "Le genre n'existe pas.", title: "Erreur" });
        }

        res.render('genres/games', { genre, title: genre.name });

    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});


// Ajout d'un éditeur : backend
app.post('/editors', async (req, res) => {
    res.render('genres/games', { genre, title: genre.name });
    try {
        const { name } = req.body;
        await prisma.editor.create(
            { data: { name } }
        );
        res.redirect('/editors');
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
})


// Liste des éditeurs : frontend
app.get('/editors', async (req, res) => {
    try {
        const editors = await prisma.editor.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).render('editors/editors', { editors, title: "Liste des éditeurs" });
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
})


// Liste des jeux d'un éditeur : frontend
app.get('/editors/:id/games', async (req, res) => {
    try {
        const editorId = parseInt(req.params.id);

        if (!editorId) {
            return res.status(404).render("error", {error: "L'éditeur n'existe pas.", title: "Erreur" });
        }

        const editor = await prisma.editor.findUnique({
            where: { id: editorId },
            include: { games: true }
        });

        if (!editor) {
            return res.status(404).render("error", {error: "L'éditeur n'existe pas.", title: "Erreur" });
        }

        res.render('editors/games', { editor, title: editor.name });
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Mise à jour d'un éditeur : backend
app.put('/editors/:id/update', async (req, res) => {
    try {
        const editorId = parseInt(req.params.id, 10);

        if(!editorId) {
            return res.status(404).json({ error: "L'éditeur n'existe pas."});
        }

        const { name } = req.body;

        await prisma.editor.update({
            where: { id: editorId },
            data: { name },
        });

        res.redirect('/editors');
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Supprimer un éditeur : backend
app.delete ('/editors/:id/delete', async (req, res) => {
    try {
        const editorId = parseInt(req.params.id, 10);

        if(!editorId) {
            return res.status(404).json({ error: "L'éditeur n'existe pas."});
        }

        await prisma.editor.delete({
            where: { id: editorId },
        });

        res.redirect('/editors');

    } catch (error) {
        console.error(error);
        res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
    }
});

// Permet de gérer les routes inconnues
app.get("*", (req, res) => {
    res.status(404).render("404", {title: "Erreur"});
})

// Middleware pour gérer les erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render("error", { error: "Une erreur est survenue.", title: "Erreur" });
});

startServer()
    .then((req) => {
        console.log("Starting server...");
    })
    .catch((err) => {
        console.error("Error during server initialization:", err);
    });