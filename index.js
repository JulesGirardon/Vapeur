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

app.get("/games/create", (req, res) => {
    res.status(200).render("games/create");
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Quelque chose s'est mal passé !");
});

startServer()
    .then((req) => {
        console.log(req);
    })
    .catch((err) => {
        console.error("Error during server initialization:", err);
    });