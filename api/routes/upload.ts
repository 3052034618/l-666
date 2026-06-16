import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';
import type { TaskParams, FileInfo, ValidationResult, WastePackageParams, EngineeringBarrierParams } from '../../shared/types.js';

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

function parseJSONFile(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e: any) {
    return null;
  }
}

function parseCSVFile(filePath: string): Record<string, any> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    const result: Record<string, any> = {};
    
    for (const line of lines) {
      const parts = line.split(/[,;\t=]/).map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const key = parts[0].replace(/["'\s]/g, '').toLowerCase();
        const value = parts[1].replace(/["'\s]/g, '');
        const numValue = Number(value);
        result[key] = isNaN(numValue) ? value : numValue;
      }
    }
    return result;
  } catch (e: any) {
    return {};
  }
}

function parseTxtFile(filePath: string): Record<string, any> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    const result: Record<string, any> = {};
    
    for (const line of lines) {
      const match = line.match(/([\w\u4e00-\u9fa5]+)[\s:=：]+([^\s,，]+)/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2];
        const numValue = Number(value);
        result[key] = isNaN(numValue) ? value : numValue;
      }
    }
    return result;
  } catch (e: any) {
    return {};
  }
}

function parseFileContent(file: Express.Multer.File): Record<string, any> {
  const ext = path.extname(file.originalname).toLowerCase();
  switch (ext) {
    case '.json':
      return parseJSONFile(file.path) || {};
    case '.csv':
    case '.dat':
      return parseCSVFile(file.path);
    case '.txt':
    case '.inp':
    case '.msh':
      return parseTxtFile(file.path);
    default:
      return {};
  }
}

function extractParamsFromFiles(files: Express.Multer.File[], uploadedFiles: FileInfo[]): {
  params: TaskParams;
  validation: ValidationResult;
} {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];
  const allData: Record<string, any> = {};

  for (let i = 0; i < files.length; i++) {
    const parsed = parseFileContent(files[i]);
    Object.assign(allData, parsed);
  }

  const getValue = (keys: string[], defaultValue: any, fieldName: string, required: boolean = false): any => {
    for (const key of keys) {
      if (allData[key] !== undefined && allData[key] !== null && allData[key] !== '') {
        return allData[key];
      }
    }
    if (required && defaultValue === undefined) {
      errors.push({ field: fieldName, message: `缺少必填字段 ${fieldName}` });
    }
    return defaultValue;
  };

  const getNumberValue = (keys: string[], defaultValue: number | undefined, fieldName: string, min?: number, max?: number): number | undefined => {
    const raw = getValue(keys, defaultValue, fieldName, min !== undefined);
    if (raw === undefined || raw === null) return raw;
    
    const num = Number(raw);
    if (isNaN(num)) {
      errors.push({ field: fieldName, message: `${fieldName} 必须是数字，当前值: ${raw}` });
      return defaultValue;
    }
    
    if (min !== undefined && num < min) {
      errors.push({ field: fieldName, message: `${fieldName} 不能小于 ${min}，当前值: ${num}` });
    }
    if (max !== undefined && num > max) {
      errors.push({ field: fieldName, message: `${fieldName} 不能大于 ${max}，当前值: ${num}` });
    }
    return num;
  };

  const wasteType = String(getValue(['was tetype', 'type', '废物类型', 'waste_type', 'fueltype'], 'UO2', 'wastePackageParams.type'));
  const wasteMaterial = String(getValue(['wastematerial', 'material', '包壳材料', 'waste_material', 'matrix'], '硼硅酸盐玻璃', 'wastePackageParams.material'));
  const radioactivity = getNumberValue(['radioactivity', '放射性活度', '活度', 'activity'], undefined, 'wastePackageParams.radioactivity', 0);
  const heatOutput = getNumberValue(['heatoutput', 'heat_output', '热输出', '功率', 'power', 'heat'], undefined, 'wastePackageParams.heatOutput', 0, 5000);
  const spacing = getNumberValue(['spacing', '废物包间距', '间距', 'distance', 'gap'], undefined, 'wastePackageParams.spacing', 3, 15);
  const count = getNumberValue(['count', '废物包数量', '数量', 'number', 'packagecount'], undefined, 'wastePackageParams.count', 1);

  const bufferMaterial = String(getValue(['buffermaterial', 'buffer_material', '缓冲层材料', 'buffer'], '膨润土', 'engineeringBarrierParams.bufferLayer.material'));
  const bufferThickness = getNumberValue(['bufferthickness', 'buffer_thickness', '缓冲层厚度', 'thickness'], undefined, 'engineeringBarrierParams.bufferLayer.thickness', 0.3, 2.0);
  const permeability = getNumberValue(['permeability', '渗透系数', '渗透率', 'k'], undefined, 'engineeringBarrierParams.bufferLayer.permeability', 1e-20, 1e-6);

  const backfillMaterial = String(getValue(['backfillmaterial', 'backfill_material', '回填材料', 'backfill'], '膨润土/砂混合物', 'engineeringBarrierParams.backfill.material'));
  const backfillRatio = String(getValue(['backfillratio', 'backfill_ratio', '配比', 'ratio'], '70:30', 'engineeringBarrierParams.backfill.ratio'));
  const compactness = getNumberValue(['compactness', '压实度', 'density'], undefined, 'engineeringBarrierParams.backfill.compactness', 0, 1);

  if (radioactivity === undefined) {
    errors.push({ field: 'wastePackageParams.radioactivity', message: '废物包参数文件缺少放射性活度字段 (radioactivity/放射性活度/activity)' });
  }
  if (heatOutput === undefined) {
    errors.push({ field: 'wastePackageParams.heatOutput', message: '废物包参数文件缺少热输出字段 (heatOutput/热输出/power)' });
  }
  if (spacing === undefined) {
    errors.push({ field: 'wastePackageParams.spacing', message: '废物包参数文件缺少间距字段 (spacing/废物包间距/distance)' });
  }
  if (count === undefined) {
    errors.push({ field: 'wastePackageParams.count', message: '废物包参数文件缺少数量字段 (count/废物包数量/number)' });
  }
  if (bufferThickness === undefined) {
    errors.push({ field: 'engineeringBarrierParams.bufferLayer.thickness', message: '工程屏障参数文件缺少缓冲层厚度字段 (bufferThickness/缓冲层厚度/thickness)' });
  }
  if (permeability === undefined) {
    errors.push({ field: 'engineeringBarrierParams.bufferLayer.permeability', message: '工程屏障参数文件缺少渗透系数字段 (permeability/渗透系数/k)' });
  }
  if (compactness === undefined) {
    errors.push({ field: 'engineeringBarrierParams.backfill.compactness', message: '工程屏障参数文件缺少压实度字段 (compactness/压实度/density)' });
  }

  if (files.length < 2) {
    warnings.push({ field: 'files', message: '建议至少上传2个文件（地质模型+参数文件），当前参数使用默认值或推断值' });
  }

  const wastePackageParams: WastePackageParams = {
    type: wasteType,
    material: wasteMaterial,
    radioactivity: radioactivity ?? 1.2e15,
    heatOutput: heatOutput ?? 1500,
    spacing: spacing ?? 6.0,
    count: count ?? 24,
  };

  const engineeringBarrierParams: EngineeringBarrierParams = {
    bufferLayer: {
      material: bufferMaterial,
      thickness: bufferThickness ?? 0.75,
      permeability: permeability ?? 1.0e-12,
    },
    backfill: {
      material: backfillMaterial,
      ratio: backfillRatio,
      compactness: compactness ?? 0.95,
    },
  };

  const params: TaskParams = {
    geologicalModel: uploadedFiles[0] || {
      id: uuidv4(),
      name: '未上传地质模型',
      size: 0,
      type: 'application/json',
      uploadTime: new Date().toISOString(),
    },
    wastePackageParams,
    engineeringBarrierParams,
  };

  const dbValidation = db.validateParams(params);
  errors.push(...dbValidation.errors);
  warnings.push(...dbValidation.warnings);

  if (Object.keys(allData).length === 0 && files.length > 0) {
    errors.unshift({ field: 'file_format', message: '上传的文件内容无法解析，请确保文件格式正确（JSON键值对、CSV、键=值格式）' });
  }

  return {
    params,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
  };
}

router.post('/', authenticateToken, requireRoles('analyst', 'admin'), upload.array('files', 10), (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    res.status(400).json({ error: '未上传文件' });
    return;
  }

  const uploadedFiles: FileInfo[] = files.map((file) => ({
    id: uuidv4(),
    name: file.originalname,
    size: file.size,
    type: file.mimetype,
    uploadTime: new Date().toISOString(),
  }));

  const { params, validation } = extractParamsFromFiles(files, uploadedFiles);

  res.json({
    files: uploadedFiles,
    params,
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
