import app from './app';
import { connectDB } from './config/database';

const PORT = process.env.PORT || 3000;

// MongoDB 연결
connectDB();

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
