const request = require('supertest');
const express = require('express');
const gamesRoutes = require('../../../routes/games');
const { fileFilter } = require('../../../routes/games');

const mockPrisma = {
  game: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  genre: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  editor: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('view engine', 'hbs');
  app.use('/games', gamesRoutes(mockPrisma));
  app.response.render = function (view, options) {
    this.json({ view, ...options });
  };
  return app;
}

describe('fileFilter (unitaire)', () => {
  it('accepte les images jpeg/png/jpg', () => {
    const cb = jest.fn();
    const req = {};
    const file = { mimetype: 'image/jpeg' };
    fileFilter(req, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);

    cb.mockClear();
    file.mimetype = 'image/png';
    fileFilter(req, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);

    cb.mockClear();
    file.mimetype = 'image/jpg';
    fileFilter(req, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('refuse les autres types', () => {
    const cb = jest.fn();
    const req = {};
    const file = { mimetype: 'application/pdf' };
    fileFilter(req, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    expect(cb.mock.calls[0][0].message).toBe(
      'Seules les images sont autorisées'
    );
  });
});

describe('Routes /games', () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test('GET /games doit retourner la liste des jeux', async () => {
    mockPrisma.game.findMany.mockResolvedValue([
      { id: 1, title: 'Half-Life' },
      { id: 2, title: 'Portal' },
    ]);
    const res = await request(app).get('/games');
    expect(res.status).toBe(200);
    expect(res.body.games).toHaveLength(2);
    expect(res.body.view).toBe('games/index');
    expect(mockPrisma.game.findMany).toHaveBeenCalled();
  });

  test('GET /games erreur serveur', async () => {
    mockPrisma.game.findMany.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/games');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /games/create doit retourner le formulaire de création', async () => {
    mockPrisma.genre.findMany.mockResolvedValue([{ id: 1, name: 'Action' }]);
    mockPrisma.editor.findMany.mockResolvedValue([{ id: 1, name: 'Valve' }]);
    const res = await request(app).get('/games/create');
    expect(res.status).toBe(200);
    expect(res.body.genres).toHaveLength(1);
    expect(res.body.editors).toHaveLength(1);
    expect(res.body.view).toBe('games/create');
  });

  test('GET /games/create erreur serveur', async () => {
    mockPrisma.genre.findMany.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/games/create');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /games/create retourne 403 si aucun éditeur', async () => {
    mockPrisma.genre.findMany.mockResolvedValue([{ id: 1, name: 'Action' }]);
    mockPrisma.editor.findMany.mockResolvedValue([]);
    const res = await request(app).get('/games/create');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('ajouter des éditeurs');
    expect(res.body.title).toBe('Erreur');
  });

  test('POST /games/create doit créer un jeu', async () => {
    mockPrisma.genre.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.editor.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.game.create.mockResolvedValue({ id: 1 });
    const res = await request(app).post('/games/create').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(302); // Redirection
    expect(mockPrisma.game.create).toHaveBeenCalled();
  });

  test('POST /games/create retourne 404 si genre non trouvé', async () => {
    mockPrisma.genre.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/games/create').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Le genre n'existe pas.");
  });

  test('POST /games/create retourne 404 si éditeur non trouvé', async () => {
    mockPrisma.genre.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.editor.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/games/create').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("L'éditeur n'existe pas.");
  });

  test('POST /games/create erreur serveur', async () => {
    mockPrisma.genre.findUnique.mockRejectedValue(new Error('fail'));
    const res = await request(app).post('/games/create').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /games/:id/details doit retourner les détails du jeu', async () => {
    mockPrisma.game.findUnique.mockResolvedValue({
      id: 1,
      title: 'Half-Life',
      releaseDate: new Date('2000-01-01'),
      genre: { id: 1, name: 'Action' },
      editor: { id: 1, name: 'Valve' },
    });
    const res = await request(app).get('/games/1/details');
    expect(res.status).toBe(200);
    expect(res.body.game.title).toBe('Half-Life');
    expect(res.body.view).toBe('games/details');
  });

  test('GET /games/:id/details retourne 404 si jeu non trouvé', async () => {
    mockPrisma.game.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/games/999/details');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Le jeu n'existe pas.");
  });

  test('GET /games/:id/details erreur serveur', async () => {
    mockPrisma.game.findUnique.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/games/1/details');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('GET /games/:id/edit doit retourner le formulaire d’édition', async () => {
    mockPrisma.game.findUnique.mockResolvedValue({
      id: 1,
      releaseDate: new Date('2000-01-01'),
    });
    mockPrisma.genre.findMany.mockResolvedValue([{ id: 1, name: 'Action' }]);
    mockPrisma.editor.findMany.mockResolvedValue([{ id: 1, name: 'Valve' }]);
    const res = await request(app).get('/games/1/edit');
    expect(res.status).toBe(200);
    expect(res.body.game.id).toBe(1);
    expect(res.body.view).toBe('games/edit');
  });

  test('GET /games/:id/edit retourne 404 si jeu non trouvé', async () => {
    mockPrisma.game.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/games/999/edit');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Le jeu n'existe pas.");
  });

  test('GET /games/:id/edit retourne 404 si genre non trouvé', async () => {
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.genre.findMany.mockResolvedValue(null);
    const res = await request(app).get('/games/1/edit');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Le genre n'existe pas.");
  });

  test('GET /games/:id/edit retourne 404 si éditeur non trouvé', async () => {
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.genre.findMany.mockResolvedValue([{ id: 1, name: 'Action' }]);
    mockPrisma.editor.findMany.mockResolvedValue(null);
    const res = await request(app).get('/games/1/edit');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("L'éditeur n'existe pas.");
  });

  test('GET /games/:id/edit erreur serveur', async () => {
    mockPrisma.game.findUnique.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/games/1/edit');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('PUT /games/:id/edit doit mettre à jour un jeu', async () => {
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1, image: null });
    mockPrisma.genre.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.editor.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.game.update.mockResolvedValue({ id: 1 });
    const res = await request(app).put('/games/1/edit').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(302); // Redirection
    expect(mockPrisma.game.update).toHaveBeenCalled();
  });

  test("PUT /games/:id/edit met à jour l'image et supprime l'ancienne", async () => {
    const oldImage = 'uploads/old-image.jpg';
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1, image: oldImage });
    mockPrisma.genre.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.editor.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.game.update.mockResolvedValue({ id: 1 });

    const existsSyncSpy = jest
      .spyOn(require('fs'), 'existsSync')
      .mockReturnValue(true);
    const unlinkSyncSpy = jest
      .spyOn(require('fs'), 'unlinkSync')
      .mockImplementation(() => {});

    const res = await request(app)
      .put('/games/1/edit')
      .attach('image', Buffer.from('fake image'), 'new-image.jpg')
      .field('title', 'Half-Life')
      .field('genre', 1)
      .field('editor', 1)
      .field('releaseDate', '2000-01-01');

    expect(res.status).toBe(302);
    expect(mockPrisma.game.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          image: expect.stringMatching(/\/uploads\/.+/),
        }),
      })
    );
    expect(existsSyncSpy).toHaveBeenCalledWith(
      expect.stringContaining(oldImage)
    );
    expect(unlinkSyncSpy).toHaveBeenCalledWith(
      expect.stringContaining(oldImage)
    );

    existsSyncSpy.mockRestore();
    unlinkSyncSpy.mockRestore();
  });

  test("PUT /games/:id/edit garde l'image si aucune nouvelle image", async () => {
    const oldImage = '/uploads/old-image.jpg';
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1, image: oldImage });
    mockPrisma.genre.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.editor.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.game.update.mockResolvedValue({ id: 1 });

    const res = await request(app).put('/games/1/edit').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });

    expect(res.status).toBe(302);
    expect(mockPrisma.game.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ image: oldImage }),
      })
    );
  });

  test('PUT /games/:id/edit retourne 404 si jeu non trouvé', async () => {
    mockPrisma.game.findUnique.mockResolvedValue(null);
    const res = await request(app).put('/games/999/edit').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Le jeu n'existe pas.");
  });

  test('PUT /games/:id/edit retourne 404 si genre ou éditeur non trouvé', async () => {
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.genre.findUnique.mockResolvedValue(null);
    const res = await request(app).put('/games/1/edit').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Genre ou éditeur non trouvé.');
  });

  test('PUT /games/:id/edit erreur serveur', async () => {
    mockPrisma.game.findUnique.mockRejectedValue(new Error('fail'));
    const res = await request(app).put('/games/1/edit').send({
      title: 'Half-Life',
      genre: 1,
      editor: 1,
      releaseDate: '2000-01-01',
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });

  test('DELETE /games/:id/delete doit supprimer un jeu', async () => {
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1, image: null });
    mockPrisma.game.delete.mockResolvedValue({ id: 1 });
    const res = await request(app).delete('/games/1/delete');
    expect(res.status).toBe(302); // Redirection
    expect(mockPrisma.game.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test("DELETE /games/:id/delete supprime l'image du jeu si elle existe", async () => {
    const imageName = 'image-test.jpg';
    const imagePath = `/uploads/${imageName}`;
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1, image: imagePath });
    mockPrisma.game.delete.mockResolvedValue({ id: 1 });

    // Mock fs.unlink
    const unlinkSpy = jest
      .spyOn(require('fs'), 'unlink')
      .mockImplementation((p, cb) => cb(null));

    const res = await request(app).delete('/games/1/delete');
    expect(res.status).toBe(302);
    expect(unlinkSpy).toHaveBeenCalledWith(
      expect.stringContaining(imageName),
      expect.any(Function)
    );

    unlinkSpy.mockRestore();
  });

  test("DELETE /games/:id/delete log l'erreur si fs.unlink échoue", async () => {
    const imageName = 'image-test.jpg';
    const imagePath = `/uploads/${imageName}`;
    mockPrisma.game.findUnique.mockResolvedValue({ id: 1, image: imagePath });
    mockPrisma.game.delete.mockResolvedValue({ id: 1 });

    const unlinkSpy = jest
      .spyOn(require('fs'), 'unlink')
      .mockImplementation((p, cb) => cb(new Error('unlink fail')));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).delete('/games/1/delete');
    expect(res.status).toBe(302);
    expect(unlinkSpy).toHaveBeenCalledWith(
      expect.stringContaining(imageName),
      expect.any(Function)
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Erreur lors de la suppression de l'image:"),
      expect.any(Error)
    );

    unlinkSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('DELETE /games/:id/delete retourne 404 si jeu non trouvé', async () => {
    mockPrisma.game.findUnique.mockResolvedValue(null);
    const res = await request(app).delete('/games/999/delete');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Le jeu n'existe pas.");
  });

  test('DELETE /games/:id/delete erreur serveur', async () => {
    mockPrisma.game.findUnique.mockRejectedValue(new Error('fail'));
    const res = await request(app).delete('/games/1/delete');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Une erreur est survenue.');
    expect(res.body.title).toBe('Erreur');
  });
});
