import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import authRouter from './routes/auth.js';
import tasksRouter from './routes/tasks.js';
import alertsRouter from './routes/alerts.js';
import approvalsRouter from './routes/approvals.js';
import reportsRouter from './routes/reports.js';
import dashboardRouter from './routes/dashboard.js';
import usersRouter from './routes/users.js';
import uploadRouter from './routes/upload.js';
import recommendationsRouter from './routes/recommendations.js';
import exportRouter from './routes/export.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/export', exportRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-task', (taskId: string) => {
    socket.join(`task:${taskId}`);
    console.log(`Client ${socket.id} joined task ${taskId}`);
  });

  socket.on('leave-task', (taskId: string) => {
    socket.leave(`task:${taskId}`);
    console.log(`Client ${socket.id} left task ${taskId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const simulateTaskProgress = () => {
  setInterval(() => {
    const tasks = ['task-2', 'task-6', 'task-13'];
    tasks.forEach((taskId) => {
      const progress = Math.floor(Math.random() * 100);
      const statuses = ['pending_validation', 'parsing', 'meshing', 'computing', 'evaluating', 'completed'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      io.to(`task:${taskId}`).emit('task:status', {
        taskId,
        status,
        progress,
      });

      if (Math.random() > 0.7) {
        io.to(`task:${taskId}`).emit('task:log', {
          taskId,
          log: {
            level: 'info',
            message: `计算进度: ${progress}%`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (Math.random() > 0.8) {
        io.to(`task:${taskId}`).emit('monitor:data', {
          taskId,
          temperature: {
            current: 60 + Math.random() * 35,
            max: 95,
            threshold: 100,
            units: '°C',
            timestamp: Date.now(),
          },
          pressure: {
            current: 2 + Math.random() * 3,
            max: 4.8,
            threshold: 10,
            units: 'MPa',
            timestamp: Date.now(),
          },
          concentration: {
            current: 1e-7 + Math.random() * 1e-6,
            max: 8.5e-6,
            threshold: 1e-5,
            units: 'mol/L',
            timestamp: Date.now(),
          },
        });
      }
    });
  }, 3000);
};

simulateTaskProgress();

export { app, server, io };
