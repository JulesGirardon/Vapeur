const request = require('supertest');
const express = require('express');
const genresRoutes = require('../../../routes/genres');

const mockPrisma = {
  genre: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('view engine', 'hbs');
  app.use('/genres', genresRoutes(mockPrisma));
  app.response.render = function (view, options) {
    this.json({ view, ...options });
  };
  return app;
}

describe('Routes /genres', () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test('GET /genres doit retourner la liste des genres', async () => {
    mockPrisma.genre.findMany.mockResolvedValue([
      { id: 1, name: 'Action' },
      { id: 2, name: 'RPG' },
    ]);
    const res = await request(app).get('/genres');
    expect(res.status).toBe(200);
    expect(res.body.genres).toHaveLength(2);
    expect(res.body.view).toBe('genres/genres');
    expect(mockPrisma.genre.findMany).toHaveBeenCalled();
  });

  test('GET /genres erreur serveur', async () => {
    mockPrisma.genre.findMany.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/genres');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /genres/:id/games doit retourner les jeux du genre', async () => {
    mockPrisma.genre.findUnique.mockResolvedValue({
      id: 1,
      name: 'Action',
      games: [{ id: 10, title: 'Half-Life' }],
    });
    const res = await request(app).get('/genres/1/games');
    expect(res.status).toBe(200);
    expect(res.body.genre.name).toBe('Action');
    expect(res.body.view).toBe('genres/games');
    expect(mockPrisma.genre.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { games: true },
    });
  });

  test('GET /genres/:id/games retourne 404 si genre non trouvé', async () => {
    mockPrisma.genre.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/genres/999/games');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Le genre n'existe pas.");
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /genres/:id/games erreur serveur', async () => {
    mockPrisma.genre.findUnique.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/genres/1/games');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });
});
