import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from './routes';
import { db } from './db';

// Mock cloudinary
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: { upload: vi.fn().mockResolvedValue({ secure_url: 'https://cloudinary.com/test.jpg' }) }
  }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('hashed_pw')
  }
}));

// Mock DB
vi.mock('./db', () => {
  const dbMock = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return { db: dbMock };
});

const app = express();
app.use(express.json());
registerRoutes(app);

describe('Backend API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth Routes', () => {
    it('POST /api/login should login admin successfully', async () => {
      // Setup mock return for admin user
      const mockUser = { id: 'user-1', email: 'admin@test.com', passwordHash: 'hash', role: 'admin' };
      (db.where as any).mockResolvedValueOnce([mockUser]);

      const res = await request(app)
        .post('/api/login')
        .send({ email: 'admin@test.com', password: 'password', role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
      expect(res.body.id).toBe('user-1');
    });

    it('POST /api/login should login tenant successfully', async () => {
      const mockTenant = { id: 'tenant-1', email: 'tenant@test.com' };
      (db.where as any).mockResolvedValueOnce([mockTenant]);

      const res = await request(app)
        .post('/api/login')
        .send({ email: 'tenant@test.com', password: 'password123', role: 'tenant' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('tenant');
    });
  });

  describe('Tenant Routes', () => {
    it('GET /api/tenants should return list of tenants', async () => {
      (db.from as any).mockResolvedValueOnce([{ id: 'tenant-1' }]);
      const res = await request(app).get('/api/tenants');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('POST /api/tenants should create a tenant', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'new-tenant-1' }]);
      const res = await request(app).post('/api/tenants').send({ fullName: 'John Doe', email: 'j@d.com' });
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('new-tenant-1');
    });

    it('PUT /api/tenants/:id should update a tenant', async () => {
      (db.where as any).mockReturnValueOnce({ returning: vi.fn().mockResolvedValueOnce([{ id: 'tenant-1', status: 'active' }]) });
      const res = await request(app).put('/api/tenants/tenant-1').send({ status: 'active' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
    });
  });

  describe('Maintenance Routes', () => {
    it('GET /api/maintenance should return tickets', async () => {
      (db.from as any).mockResolvedValueOnce([{ id: 'ticket-1' }]);
      const res = await request(app).get('/api/maintenance');
      expect(res.status).toBe(200);
    });

    it('POST /api/maintenance should create ticket', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'new-ticket-1' }]);
      const res = await request(app).post('/api/maintenance').send({ subject: 'Leak' });
      expect(res.status).toBe(200);
    });
  });

  describe('Housekeeping Routes', () => {
    it('GET /api/housekeeping should return requests', async () => {
      (db.from as any).mockResolvedValueOnce([]);
      const res = await request(app).get('/api/housekeeping');
      expect(res.status).toBe(200);
    });

    it('POST /api/housekeeping should create request', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'hk-1' }]);
      const res = await request(app).post('/api/housekeeping').send({ date: '2026-08-10' });
      expect(res.status).toBe(200);
    });
  });

  describe('Addon Routes', () => {
    it('GET /api/addons should return catalog', async () => {
      (db.from as any).mockResolvedValueOnce([]);
      const res = await request(app).get('/api/addons');
      expect(res.status).toBe(200);
    });

    it('POST /api/addons should create addon', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'addon-1' }]);
      const res = await request(app).post('/api/addons').send({ name: 'Gym' });
      expect(res.status).toBe(200);
    });

    it('POST /api/addons/requests should request addon', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'req-1' }]);
      const res = await request(app).post('/api/addons/requests').send({ serviceId: 's1' });
      expect(res.status).toBe(200);
    });
  });

  describe('Invoice Routes', () => {
    it('GET /api/invoices should return invoices', async () => {
      (db.from as any).mockResolvedValueOnce([]);
      const res = await request(app).get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('POST /api/invoices should create invoice', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'inv-1' }]);
      const res = await request(app).post('/api/invoices').send({ amount: '100' });
      expect(res.status).toBe(200);
    });
  });

  describe('Inspection Routes', () => {
    it('POST /api/inspections should create inspection', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'insp-1' }]);
      const res = await request(app).post('/api/inspections').send({ notes: 'ok' });
      expect(res.status).toBe(200);
    });

    it('POST /api/inspections/:id/photos should attach photo', async () => {
      (db.returning as any).mockResolvedValueOnce([{ id: 'photo-1' }]);
      const res = await request(app).post('/api/inspections/1/photos').send({ photoUrl: 'img.jpg' });
      expect(res.status).toBe(200);
    });
  });
});
