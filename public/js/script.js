const sidebarItems = document.querySelectorAll('.sidebar-nav-ul > li'); // Récupération de tous les li de la sidebar

const activeItemKey = 'activeSidebarItem'; // Clé pour le localStorage

/**
 * Fonction pour récupérer l'élément actif depuis le localStorage
 *
 * @return string
 */
function getActiveItemFromStorage() {
    return localStorage.getItem(activeItemKey);
}

/**
 * Fonction pour appliquer l'état actif
 */
function setActiveItem(item) {
    // Désactiver l'état actif pour tous les éléments
    sidebarItems.forEach((el) => {
        el.classList.remove('active');
        resetIcon(el); // Réinitialiser l'icône pour tous les éléments
    });

    // Marquer l'élément comme actif
    item.classList.add('active');
    // Sauvegarder l'élément actif dans le localStorage
    localStorage.setItem(activeItemKey, item.id);

    // Appliquer l'icône active correspondante
    updateIcon(item);
}

/**
 * Fonction pour mettre à jour l'icône active
 *
 * @param item Item où l'icône doit être mis à jour
 */
function updateIcon(item) {
    const icon = item.querySelector('.icon-house, .icon-games, .icon-editors, .icon-genres');
    let iconUrl;

    // Vérifier l'élément et définir l'icône correspondante
    switch (item.id) {
        case 'sidebar-nav-item-home':
            iconUrl = '/img/svg/home-active.svg';
            break;
        case 'sidebar-nav-item-games':
            iconUrl = '/img/svg/games-active.svg';
            break;
        case 'sidebar-nav-item-editors':
            iconUrl = '/img/svg/editors-active.svg';
            break;
        case 'sidebar-nav-item-genres':
            iconUrl = '/img/svg/genres-active.svg';
            break;
        default:
            break;
    }

    // Mettre à jour l'icône
    if (icon) {
        icon.style.backgroundImage = `url("${iconUrl}")`;
    }
}

/**
 * Fonction pour réinitialiser l'icône au statut par défaut
 *
 * @param item Item où l'icône doit être réinitialisée
 */
function resetIcon(item) {
    const icon = item.querySelector('.icon-house, .icon-games, .icon-editors, .icon-genres');
    let iconUrl;

    // Vérifier l'élément et définir l'icône par défaut
    switch (item.id) {
        case 'sidebar-nav-item-home':
            iconUrl = '/img/svg/home.svg';
            break;
        case 'sidebar-nav-item-games':
            iconUrl = '/img/svg/games.svg';
            break;
        case 'sidebar-nav-item-editors':
            iconUrl = '/img/svg/editors.svg';
            break;
        case 'sidebar-nav-item-genres':
            iconUrl = '/img/svg/genres.svg';
            break;
        default:
            break;
    }

    // Mettre à jour l'icône avec l'icône par défaut
    if (icon) {
        icon.style.backgroundImage = `url("${iconUrl}")`;
    }
}

// Appliquer l'élément actif si déjà défini dans le localStorage
sidebarItems.forEach((item) => {
    let isActive = false; // Variable pour vérifier si l'élément est actif

    // Appliquer l'élément actif si déjà défini dans le localStorage
    if (getActiveItemFromStorage() === item.id) {
        setActiveItem(item);
        isActive = true;
    }

    // Survol de l'élément
    item.addEventListener('mouseenter', () => {
        if (!isActive) { // Appliquer le survol seulement si l'élément n'est pas actif
            item.classList.add('hover');
            updateIcon(item); // Appliquer l'icône active au survol
        }
    });

    // Quand la souris quitte l'élément
    item.addEventListener('mouseleave', () => {
        if (!isActive) { // Ne réinitialiser que si l'élément n'est pas actif
            item.classList.remove('hover');
            resetIcon(item); // Réinitialiser l'icône au statut par défaut
        }
    });

    // Quand on clique sur l'élément
    item.addEventListener('click', (event) => {
        // Marquer l'élément comme actif
        setActiveItem(item);
    });
});

const sidebarTitle = document.querySelector('#sidebar-title');

// Permet de mettre le lien actif du menu sur accueil quand on clique sur le titre de la sidebar
sidebarTitle.addEventListener('click', () => {
    const homeItem = document.getElementById('sidebar-nav-item-home'); // Récupérer l'élément Accueil
    setActiveItem(homeItem); // Appliquer l'état actif à cet élément
});

const gameItems = document.querySelectorAll('.list-games ul li a');

// Appliquer l'état actif au menu "Jeu" quand un élément de la liste des jeux est cliqué
gameItems.forEach((gameItem) => {
    gameItem.addEventListener('click', () => {
        const gamesNavItem = document.getElementById('sidebar-nav-item-games'); // Récupérer l'élément "Jeux"
        setActiveItem(gamesNavItem); // Appliquer l'état actif à l'élément "Jeux"
    });
});

const addGameLink = document.querySelector('.create-game');

// Ajouter un événement de clic pour appliquer l'état actif au menu "Jeux"
if (addGameLink) {
    addGameLink.addEventListener('click', () => {
        const gamesNavItem = document.getElementById('sidebar-nav-item-games'); // Récupérer l'élément "Jeux"
        setActiveItem(gamesNavItem); // Appliquer l'état actif à l'élément "Jeux"
    });
}

const backToGenre = document.querySelector('.back-genres');

if (backToGenre) {
    backToGenre.addEventListener('click', () => {
        const gamesNavItem = document.getElementById('sidebar-nav-item-genres'); // Récupérer l'élément "Genres"
        setActiveItem(gamesNavItem); // Appliquer l'état actif à l'élément "Jeux"
    });
}

const gameEditor = document.querySelector('.game-editor');

if (gameEditor) {
    gameEditor.addEventListener('click', () => {
        const gamesNavItem = document.getElementById('sidebar-nav-item-editors'); // Récupérer l'élément "Editeurs"
        setActiveItem(gamesNavItem); // Appliquer l'état actif à l'élément "Jeux"
    });
}

const gameGenre = document.querySelector('.game-genre');

if (gameGenre) {
    gameGenre.addEventListener('click', () => {
        const gamesNavItem = document.getElementById('sidebar-nav-item-genres'); // Récupérer l'élément "Genres"
        setActiveItem(gamesNavItem); // Appliquer l'état actif à l'élément "Jeux"
    });
}