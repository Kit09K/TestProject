const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const bookingRoutes = require('../backend/src/routes/booking.routes');
const contextMiddleware = require('../backend/src/middlewares/contextMiddleware');
const ApiError = require('../backend/src/utils/ApiError');
const { errorHandler } = require('../backend/src/middlewares/errorHandler');

jest.mock('../backend/src/lib/prisma', () => ({
  booking: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  systemLog: {
    create: jest.fn(), 
  },
  $transaction: jest.fn((callback) => callback(require('../backend/src/lib/prisma'))),
}));

const prisma = require('../backend/src/lib/prisma');

jest.mock('../backend/src/middlewares/auth', () => ({
  protect: (req, res, next) => {
    req.user = { sub: 'user-123', role: 'PASSENGER', id: 'user-123' };
    next();
  },
  requireAdmin: (req, res, next) => {
    if (req.user.role !== 'ADMIN') return next(new Error('Forbidden'));
    next();
  }
}));

jest.mock('../backend/src/middlewares/suspension', () => ({
  requirePassengerNotSuspended: (req, res, next) => next(),
}));

jest.mock('../backend/src/middlewares/driverVerified', () => ({
  requirePassengerNotSuspended: (req, res, next) => next(),
}));

const app = express();
app.use(bodyParser.json());

app.use(contextMiddleware);

app.use('/bookings', bookingRoutes);

app.use(errorHandler);


describe('Booking API Integration Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /bookings (Create Booking)', () => {
    it('should create a booking and capture context info', async () => {
      const mockBookingData = {
        routeId: 'route-999',
        numberOfSeats: 2,
        pickupLocation: { lat: 13.7, lng: 100.5, name: 'Start' },
        dropoffLocation: { lat: 13.8, lng: 100.6, name: 'End' }
      };

      const mockCreatedBooking = {
        id: 'booking-new',
        ...mockBookingData,
        passengerId: 'user-123',
        status: 'PENDING',
        createdAt: new Date()
      };

      prisma.booking.create.mockResolvedValue(mockCreatedBooking);


      const res = await request(app)
        .post('/bookings')
        .set('X-Forwarded-For', '10.0.0.5')
        .set('User-Agent', 'TestRunner/1.0')
        .send(mockBookingData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('booking-new');

      expect(prisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          routeId: 'route-999',
          passengerId: 'user-123'
        })
      }));
    });

    it('should return 400 if validation fails (missing seats)', async () => {
        const res = await request(app)
          .post('/bookings')
          .send({
            routeId: 'route-999',
          });
  
        expect(res.status).toBe(400); 
    });
  });

  describe('DELETE /bookings/:id', () => {
    it('should delete booking successfully', async () => {
      const bookingId = 'booking-123';

      prisma.booking.findUnique.mockResolvedValue({ 
        id: bookingId, 
        passengerId: 'user-123' 
      });

      prisma.booking.delete.mockResolvedValue({ id: bookingId });

      const res = await request(app).delete(`/bookings/${bookingId}`);

      expect(res.status).toBe(200);
      expect(prisma.booking.delete).toHaveBeenCalledWith({
        where: { id: bookingId }
      });
    });
  });
});