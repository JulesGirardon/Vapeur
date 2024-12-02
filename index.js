const express = require("express");
const path = require("path");
const hbs = require("hbs");
const { PrismaClient } = require("@prisma/client");

/**
 * Initialise les genres dans le modèle Genre
 *
 * @param defaultGenres Liste des genres à initialiser
 *
 * @returns {Promise<void>}
 * */
async function initializeGenres(defaultGenres) {
    const existingGenres = await prisma.genre.findMany();

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

const prisma = new PrismaClient();
const app = express();
const PORT = 3008;

const defaultGenres = ["Action", "Aventure", "RPG", "Simulation", "Sport", "MMORPG"];

app.set("view engine", "hbs"); // Permet d'utiliser les templates avec hbs
app.set("views", path.join(__dirname, "views")); // Les templates sont dans le dossier views
hbs.registerPartials(path.join(__dirname, "views", "partials")); // Permet d'utiliser les partials

app.use(express.static("public"));
app.use(express.json()); // Analyse les requêtes JSON
app.use(express.urlencoded({ extended: true })); // Analyse les données encodées dans le corps des requêtes

// Affichage de la liste de tous les jeux
app.get("/games", async (req, res) => {
    try {
        const games = await prisma.game.findMany();
        res.status(200).render("games/index", { games });
    } catch (error) {
        console.error(error);
        res.status(500).render("error", {error: "Une erreur est survenue."});
    }
});

app.get("/games/:id", async (req, res) => {
    try {
        const game = await prisma.game.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        res.status(200).render("games/details", { game });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", {error: "Une erreur est survenue."});
    }
})

// Création d'un jeu : frontend
app.get("/games/create", async (req, res) => {
    try {
        const genres = await prisma.genre.findMany();
        const editor = await prisma.editor.findMany();
        res.status(200).render("games/create", {genres, editor});
    } catch (err) {
        console.error(err);
        res.status(500).render("error", {error: "Une erreur est survenue."});
    }
});

// Création d'un jeu : backend
app.post("/games/create", async (req, res) => {
    try {
        const gameData = req.body;

        const genreExists = await prisma.genre.findUnique({
            where: { id: parseInt(gameData.genre) },
        });

        if (!genreExists) {
            throw new Error("Le genre spécifié n'existe pas.");
        }

        const editorExists = await prisma.editor.findUnique({
            where: { id: parseInt(gameData.editor) },
        });

        if (!editorExists) {
            throw new Error("L'éditeur spécifié n'existe pas.");
        }

        const game = await prisma.game.create({
            data: {
                title: gameData.title,
                description: gameData.description,
                releaseDate: new Date(gameData.date),
                genre: {
                    connect: { id: parseInt(gameData.genre) }
                },
                editor: {
                    connect: { id: parseInt(gameData.editor) }
                }
            },
        });

        res.status(200).render("games/create");
    } catch (err) {
        console.log(err);
        res.status(500).render("error", {error: "Une erreur est survenue."});
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Quelque chose s'est mal passé !");
});

startServer()
    .then((req) => {
        console.log("Starting server...");
    })
    .catch((err) => {
        console.error("Error during server initialization:", err);
    });