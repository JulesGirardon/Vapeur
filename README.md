
# Vapeur - Gestion de Collection de Jeux Vidéo

Vapeur est une application web dynamique qui permet de gérer une collection de jeux vidéo. Cette application est construite avec **Express.js** et utilise **SQLite** comme base de données. Le moteur de template **Handlebars (hbs)** est utilisé pour rendre les vues et **Prisma** pour gérer l'accès à la base de données.

## Fonctionnalités

- Gestion des jeux vidéo : ajout, modification, suppression.
- Affichage des jeux vidéo, avec possibilité de filtrer par genre ou éditeur.
- Gestion des genres et éditeurs associés aux jeux vidéo.
- Téléchargement d'images pour chaque jeu vidéo.

## Prérequis

Avant de démarrer, assurez-vous d'avoir installé les outils suivants sur votre machine :

- [Node.js](https://nodejs.org/) (version 14 ou supérieure)
- [SQLite](https://www.sqlite.org/) (pour la gestion de la base de données)

## Installation

1. Clonez ce dépôt sur votre machine locale :
    ```bash
    git clone https://github.com/JulesGirardon/vapeur.git
    cd vapeur
    ```

2. Installez les dépendances :
    ```bash
    npm install
    ```
    
3. Initialiser Prisma : Si Prisma n'a pas encore été initialisé dans le projet, fais-le avec cette commande :
    ```bash
    npx prisma init
    ```
    
4. Créez un fichier `.env` à la racine du projet avec la variable suivante :
    ```env
    DATABASE_URL="file:./database.db"
    ```

    Cela configure la connexion à la base de données SQLite.

5. Créer la base de données : Si tu n'as pas encore de base de données SQLite ou si tu veux appliquer le schéma, tu peux exécuter la migration initiale avec la commande suivante :
    ```bash
    npx prisma migrate dev --name init
    ```

6. Générer le client Prisma : Si tu as modifié le schéma de la base de données, tu dois générer le client Prisma pour pouvoir l'utiliser dans ton application :
   ```bash
   npx prisma generate
   ```
   
7. Vérifier la base de données : Pour vérifier que la base de données est correctement configurée, tu peux utiliser la commande suivante pour inspecter les données :
   ```bash
   npx prisma studio
   ```

8. Assurez-vous que le dossier `uploads/` existe pour stocker les images des jeux. Si ce dossier n'existe pas, vous pouvez le créer manuellement ou il sera créé automatiquement lors du premier téléchargement d'une image.

## Lancer l'application

Pour démarrer l'application en mode développement, utilisez la commande suivante :

```bash
npm start
```

L'application sera accessible sur `http://localhost:3008`.

## Structure du projet

Voici la structure du projet :

```
vapeur/
│
├── uploads/                # Dossier pour les images des jeux
├── node_modules/           # Dépendances Node.js
├── prisma/                 # Dossier Prisma
│   ├── schema.prisma       # Schéma de la base de données Prisma
├── views/                  # Dossier contenant les vues Handlebars
│   ├── partials/           # Partiels Handlebars
│   │   ├── games/          # Partiels pour les jeux
│   ├── 404.hbs             # Vue pour les pages inconnues
│   ├── error.hbs           # Vue pour les erreurs
│   ├── index.hbs           # Page d'accueil
│   ├── layout.hbs          # Layout du site
│   ├── games/              # Vues pour la gestion des jeux
│   ├── genres/             # Vues pour la gestion des genres
│   └── editors/            # Vues pour la gestion des éditeurs
├── public/                 # Dossier pour les ressources statiques (CSS, JS, images)
├── .env                    # Fichier de configuration de l'environnement
├── package.json            # Dépendances et scripts du projet
└── index.js                # Fichier principal de l'application
```

## Fonctionnement de l'application

### Pages principales

- **Page d'accueil** : Affiche les jeux vidéo mis en avant.
- **Liste des jeux** : Affiche tous les jeux vidéo disponibles.
- **Création de jeu** : Permet d'ajouter un nouveau jeu à la collection.
- **Détails du jeu** : Affiche les détails d'un jeu spécifique, y compris son genre, éditeur et image.
- **Modification de jeu** : Permet de modifier un jeu existant.
- **Suppression de jeu** : Permet de supprimer un jeu de la base de données.

### Gestion des genres et éditeurs

- Vous pouvez gérer les genres et les éditeurs des jeux via les pages correspondantes.
- Chaque jeu peut être associé à un genre et à un éditeur, et vous pouvez voir tous les jeux associés à un genre ou un éditeur.

### Téléchargement d'images

Les images des jeux sont téléchargées via **Multer** et stockées dans le dossier `uploads/`. Vous pouvez télécharger des fichiers d'image au format `.jpg`, `.jpeg`, ou `.png`.

## Technologies utilisées

- **Node.js** : Environnement d'exécution pour JavaScript côté serveur.
- **Express.js** : Framework pour construire des applications web.
- **Prisma** : ORM pour la gestion de la base de données.
- **SQLite** : Base de données légère utilisée pour stocker les informations des jeux.
- **Handlebars (hbs)** : Moteur de template pour générer des vues HTML dynamiques.
- **Multer** : Middleware pour la gestion du téléchargement de fichiers.
- **Method-Override** : Middleware pour simuler des requêtes PUT et DELETE.

## Routes de l'application

### 1. **Page d'accueil**
- **GET** `/`
- Affiche les jeux mis en avant.
  
### 2. **Liste des jeux**
- **GET** `/games`
- Affiche la liste de tous les jeux.

### 3. **Créer un jeu**
- **GET** `/games/create`
  - Affiche le formulaire pour créer un jeu (avec les genres et éditeurs disponibles).
- **POST** `/games/create`
  - Crée un nouveau jeu avec les informations envoyées depuis le formulaire. Gère l'upload d'image pour le jeu.

### 4. **Détails d'un jeu**
- **GET** `/games/:id/details`
  - Affiche les détails d'un jeu spécifique, y compris le genre et l'éditeur associés.

### 5. **Modifier un jeu**
- **GET** `/games/:id/edit`
  - Affiche le formulaire pour modifier un jeu existant.
- **PUT** `/games/:id/edit`
  - Met à jour un jeu avec les nouvelles informations envoyées depuis le formulaire. Permet aussi de mettre à jour l'image du jeu.

### 6. **Supprimer un jeu**
- **DELETE** `/games/:id/delete`
  - Supprime un jeu de la base de données ainsi que son image associée.

### 7. **Liste des genres**
- **GET** `/genres`
  - Affiche la liste de tous les genres de jeux.

### 8. **Liste des jeux par genre**
- **GET** `/genres/:id/games`
  - Affiche les jeux associés à un genre spécifique.

### 9. **Liste des éditeurs**
- **GET** `/editors`
  - Affiche la liste de tous les éditeurs.

### 10. **Liste des jeux par éditeur**
- **GET** `/editors/:id/games`
  - Affiche les jeux associés à un éditeur spécifique.

### 11. **Ajouter un éditeur**
- **POST** `/editors`
  - Crée un nouvel éditeur avec le nom fourni dans le formulaire.

### 12. **Mettre à jour un éditeur**
- **PUT** `/editors/:id/update`
  - Met à jour le nom d'un éditeur existant.

### 13. **Supprimer un éditeur**
- **DELETE** `/editors/:id/delete`
  - Supprime un éditeur de la base de données.

### 14. **Page d'erreur 404**
- **GET** `*`
  - Route pour gérer les pages non trouvées (erreur 404).

 ## Membres du projet
- [Jules Girardon](https://github.com/JulesGirardon)
- [Eudes Charlot](https://github.com/JulesGirardon)
- [Lucas Vial](https://github.com/Lumo6)

