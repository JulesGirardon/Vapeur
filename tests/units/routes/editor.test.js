const request = require('supertest');
const express = require('express');
const editorsRoutes = require('../../../routes/editors');

const mockPrisma = {
  editor: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('view engine', 'hbs');
  app.use('/editors', editorsRoutes(mockPrisma));

  // Mock render qui respecte le code de statut déjà défini
  app.response.render = function (view, options) {
    this.json({ view, ...options });
  };
  return app;
}

describe('Routes /editors', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test('GET /editors doit retourner la liste des éditeurs', async () => {
    mockPrisma.editor.findMany.mockResolvedValue([
      { id: 1, name: 'Ubisoft' },
      { id: 2, name: 'EA' },
    ]);
    const res = await request(app).get('/editors');
    expect(res.status).toBe(200);
    expect(res.body.editors).toHaveLength(2);
    expect(res.body.view).toBe('editors/editors');
    expect(mockPrisma.editor.findMany).toHaveBeenCalled();
  });

  test('GET /editors erreur serveur', async () => {
    mockPrisma.editor.findMany.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/editors');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('POST /editors doit créer un éditeur', async () => {
    mockPrisma.editor.create.mockResolvedValue({ id: 1, name: 'Valve' });
    const res = await request(app).post('/editors').send({ name: 'Valve' });
    expect(res.status).toBe(302);
    expect(mockPrisma.editor.create).toHaveBeenCalledWith({
      data: { name: 'Valve' },
    });
  });

  test('POST /editors erreur serveur', async () => {
    mockPrisma.editor.create.mockRejectedValue(new Error('fail'));
    const res = await request(app).post('/editors').send({ name: 'Valve' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /editors/:id/games doit retourner les jeux de l’éditeur', async () => {
    mockPrisma.editor.findUnique.mockResolvedValue({
      id: 1,
      name: 'Valve',
      games: [{ id: 10, title: 'Half-Life' }],
    });
    const res = await request(app).get('/editors/1/games');
    expect(res.status).toBe(200);
    expect(res.body.editor.name).toBe('Valve');
    expect(res.body.view).toBe('editors/games');
    expect(mockPrisma.editor.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { games: true },
    });
  });

  test('GET /editors/:id/games retourne 404 si id non numérique', async () => {
    const res = await request(app).get('/editors/abc/games');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("L'éditeur n'existe pas.");
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /editors/:id/games retourne 404 si éditeur non trouvé', async () => {
    mockPrisma.editor.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/editors/999/games');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("L'éditeur n'existe pas.");
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /editors/:id/games erreur serveur', async () => {
    mockPrisma.editor.findUnique.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/editors/1/games');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('PUT /editors/:id/update doit mettre à jour un éditeur', async () => {
    mockPrisma.editor.update.mockResolvedValue({ id: 1, name: 'Valve Corp' });
    const res = await request(app)
      .put('/editors/1/update')
      .send({ name: 'Valve Corp' });
    expect(res.status).toBe(302);
    expect(mockPrisma.editor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Valve Corp' },
    });
  });

  test('PUT /editors/:id/update retourne 404 si id non numérique', async () => {
    const res = await request(app)
      .put('/editors/abc/update')
      .send({ name: 'Valve Corp' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("L'éditeur n'existe pas.");
  });

  test('PUT /editors/:id/update erreur serveur', async () => {
    mockPrisma.editor.update.mockRejectedValue(new Error('fail'));
    const res = await request(app)
      .put('/editors/1/update')
      .send({ name: 'Valve Corp' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('DELETE /editors/:id/delete doit supprimer un éditeur', async () => {
    mockPrisma.editor.delete.mockResolvedValue({ id: 1 });
    const res = await request(app).delete('/editors/1/delete');
    expect(res.status).toBe(302);
    expect(mockPrisma.editor.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test('DELETE /editors/:id/delete retourne 404 si id non numérique', async () => {
    const res = await request(app).delete('/editors/abc/delete');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("L'éditeur n'existe pas.");
  });

  test('DELETE /editors/:id/delete erreur serveur', async () => {
    mockPrisma.editor.delete.mockRejectedValue(new Error('fail'));
    const res = await request(app).delete('/editors/1/delete');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });
});
