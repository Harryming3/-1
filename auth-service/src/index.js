import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '24h'

app.use(cors())
app.use(express.json())

const dbPath = path.join(__dirname, '..', 'filebrowser.db')
const db = new Database(dbPath)

initializeDatabase()

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'supervisor', 'admin')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS read_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_read_records_user ON read_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_read_records_time ON read_records(read_at);
  `)
  
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin')
    console.log('默认管理员账号已创建: admin / admin123')
  }
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权访问' })
  }
  
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (e) {
    return res.status(401).json({ message: 'Token无效或已过期' })
  }
}

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足' })
    }
    next()
  }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ message: '请提供用户名和密码' })
    }
    
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active')
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    
    const isPasswordValid = bcrypt.compareSync(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    
    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })
  } catch (e) {
    console.error('登录错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.sub)
  if (!user) {
    return res.status(404).json({ message: '用户不存在' })
  }
  res.json({ user })
})

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ message: '登出成功' })
})

app.post('/api/read-records', authMiddleware, (req, res) => {
  try {
    const { filePath, fileName } = req.body
    
    if (!filePath || !fileName) {
      return res.status(400).json({ message: '缺少文件信息' })
    }
    
    const result = db.prepare('INSERT INTO read_records (user_id, file_path, file_name) VALUES (?, ?, ?)').run(
      req.user.sub,
      filePath,
      fileName
    )
    
    res.json({ success: true, id: result.lastInsertRowid })
  } catch (e) {
    console.error('记录阅读错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/read-records', authMiddleware, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    
    const records = db.prepare(`
      SELECT * FROM read_records 
      WHERE user_id = ? 
      ORDER BY read_at DESC 
      LIMIT ? OFFSET ?
    `).all(req.user.sub, parseInt(limit), parseInt(offset))
    
    const total = db.prepare('SELECT COUNT(*) as count FROM read_records WHERE user_id = ?').get(req.user.sub).count
    
    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    })
  } catch (e) {
    console.error('获取阅读记录错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/read-records/stats', authMiddleware, (req, res) => {
  try {
    const userId = req.user.sub
    
    const total = db.prepare('SELECT COUNT(*) as count FROM read_records WHERE user_id = ?').get(userId).count
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM read_records 
      WHERE user_id = ? AND read_at >= ?
    `).get(userId, today.toISOString()).count
    
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const weekCount = db.prepare(`
      SELECT COUNT(*) as count FROM read_records 
      WHERE user_id = ? AND read_at >= ?
    `).get(userId, weekAgo.toISOString()).count
    
    res.json({
      total,
      today: todayCount,
      thisWeek: weekCount
    })
  } catch (e) {
    console.error('获取统计数据错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/users', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC').all()
    res.json({ users })
  } catch (e) {
    console.error('获取用户列表错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.post('/api/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role = 'employee' } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ message: '请提供用户名和密码' })
    }
    
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      return res.status(400).json({ message: '用户名已存在' })
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10)
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
      username,
      hashedPassword,
      role
    )
    
    res.json({ success: true, id: result.lastInsertRowid })
  } catch (e) {
    console.error('创建用户错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.put('/api/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { password, role, status } = req.body
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10)
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id)
    }
    
    if (role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
    }
    
    if (status) {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id)
    }
    
    res.json({ success: true })
  } catch (e) {
    console.error('更新用户错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.delete('/api/users/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    
    if (parseInt(id) === req.user.sub) {
      return res.status(400).json({ message: '不能删除自己的账号' })
    }
    
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
    db.prepare('DELETE FROM read_records WHERE user_id = ?').run(id)
    
    res.json({ success: true })
  } catch (e) {
    console.error('删除用户错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/stats', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('active').count
    const totalReads = db.prepare('SELECT COUNT(*) as count FROM read_records').get().count
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayReads = db.prepare('SELECT COUNT(*) as count FROM read_records WHERE read_at >= ?').get(today.toISOString()).count
    
    res.json({
      totalUsers,
      totalReads,
      todayReads
    })
  } catch (e) {
    console.error('获取统计数据错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/permissions', authMiddleware, (req, res) => {
  const permissions = {
    canView: true,
    canDownload: req.user.role === 'supervisor' || req.user.role === 'admin',
    canUpload: req.user.role === 'supervisor' || req.user.role === 'admin',
    canDelete: req.user.role === 'admin',
    canManageUsers: req.user.role === 'admin',
    canViewStats: req.user.role === 'admin' || req.user.role === 'supervisor'
  }
  
  res.json({ permissions })
})

app.listen(PORT, () => {
  console.log(`认证服务运行在 http://localhost:${PORT}`)
  console.log('默认管理员账号: admin / admin123')
})
