// backend/src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');
const { getContext } = require('../utils/context');

// รายชื่อ Table ที่ถือว่าเป็นข้อมูลอ่อนไหว
const SENSITIVE_MODELS = ['DriverVerification', 'User'];

// แปลง Operation ของ Prisma เป็น Action ใน Enum ของเรา
const ACTION_MAP = {
  create: 'CREATE_DATA',
  createMany: 'CREATE_DATA',
  update: 'UPDATE_DATA',
  updateMany: 'UPDATE_DATA',
  upsert: 'UPDATE_DATA',
  delete: 'DELETE_DATA',
  deleteMany: 'DELETE_DATA',
};

const prismaOriginal = new PrismaClient();

const prisma = prismaOriginal.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const ctx = getContext();
        
        // รัน Query จริงๆ ก่อน
        const result = await query(args);

        // --- Logic การเก็บ Log ---
        if (model === 'SystemLog' || !ctx) {
          return result;
        }

        // 1. ดักจับการแก้ไขข้อมูล (CUD)
        if (Object.keys(ACTION_MAP).includes(operation)) {
          const action = ACTION_MAP[operation];
          
          let targetId = null;
          if (result && result.id) targetId = result.id;
          else if (args.where && args.where.id) targetId = args.where.id;

          prismaOriginal.systemLog.create({
            data: {
              userId: ctx.userId || null,
              action: action,
              ipAddress: ctx.ipAddress || 'unknown',
              userAgent: ctx.userAgent || 'unknown',
              targetTable: model,
              targetId: typeof targetId === 'string' ? targetId : JSON.stringify(targetId),
              details: { operation, args: JSON.stringify(args) }, 
            },
          }).catch(err => console.error('Auto-Log Error:', err));
        }

        // 2. ดักจับการดูข้อมูลอ่อนไหว (Read Sensitive)
        const isReadOperation = ['findUnique', 'findFirst', 'findMany'].includes(operation);
        if (isReadOperation && SENSITIVE_MODELS.includes(model)) {
          let isSensitiveAccess = false;
          if (model === 'DriverVerification') isSensitiveAccess = true;
          else if (model === 'User') {
            const select = args.select || {};
            if (select.nationalIdNumber || select.nationalIdPhotoUrl || select.nationalIdExpiryDate) {
              isSensitiveAccess = true;
            }
          }

          if (isSensitiveAccess) {
            prismaOriginal.systemLog.create({
              data: {
                userId: ctx.userId || null,
                action: 'ACCESS_SENSITIVE_DATA',
                ipAddress: ctx.ipAddress || 'unknown',
                userAgent: ctx.userAgent || 'unknown',
                targetTable: model,
                details: { operation, queryArgs: JSON.stringify(args) },
              },
            }).catch(err => console.error('Sensitive-Log Error:', err));
          }
        }

        return result;
      },
    },
  },
});

module.exports = prisma;