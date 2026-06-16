import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.json', '.csv', '.txt', '.dat', '.inp', '.msh'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

router.post('/', authenticateToken, requireRoles('analyst', 'admin'), upload.array('files', 10), (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    res.status(400).json({ error: '未上传文件' });
    return;
  }

  const uploadedFiles = files.map((file) => {
    const fileInfo = {
      id: uuidv4(),
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      uploadTime: new Date().toISOString(),
      path: file.path,
    };

    return fileInfo;
  });

  const mockParams = {
    geologicalModel: uploadedFiles[0] || {
      id: uuidv4(),
      name: '示例地质模型.json',
      size: 15234567,
      type: 'application/json',
      uploadTime: new Date().toISOString(),
    },
    wastePackageParams: {
      type: 'UO2',
      material: '硼硅酸盐玻璃',
      radioactivity: 1.2e15,
      heatOutput: 1500,
      spacing: 6.0,
      count: 24,
    },
    engineeringBarrierParams: {
      bufferLayer: {
        material: '膨润土',
        thickness: 0.75,
        permeability: 1.0e-12,
      },
      backfill: {
        material: '膨润土/砂混合物',
        ratio: '70:30',
        compactness: 0.95,
      },
    },
  };

  const validation = db.validateParams(mockParams);

  res.json({
    files: uploadedFiles.map(({ path, ...rest }) => rest),
    params: mockParams,
    validation,
  });
});

router.get('/validate/:fileId', authenticateToken, (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;

  const mockParams = {
    geologicalModel: {
      id: fileId,
      name: '花岗岩地质模型_v3.2',
      size: 15234567,
      type: 'application/json',
      uploadTime: new Date().toISOString(),
    },
    wastePackageParams: {
      type: 'UO2',
      material: '硼硅酸盐玻璃',
      radioactivity: 1.2e15,
      heatOutput: 1500,
      spacing: 6.0,
      count: 24,
    },
    engineeringBarrierParams: {
      bufferLayer: {
        material: '膨润土',
        thickness: 0.75,
        permeability: 1.0e-12,
      },
      backfill: {
        material: '膨润土/砂混合物',
        ratio: '70:30',
        compactness: 0.95,
      },
    },
  };

  const validation = db.validateParams(mockParams);

  res.json(validation);
});

export default router;
