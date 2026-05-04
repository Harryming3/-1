import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { PDFParse } from 'pdf-parse'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

let JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('错误: 生产环境必须设置 JWT_SECRET 环境变量')
    process.exit(1)
  }
  const crypto = await import('crypto')
  JWT_SECRET = crypto.randomBytes(64).toString('hex')
  console.log('警告: 使用随机生成的JWT密钥，仅限开发环境使用')
}

const JWT_EXPIRES_IN = '24h'

app.use(cors())
app.use(express.json())

const dbPath = path.join(__dirname, '..', 'filebrowser.db')

const SQL = await initSqlJs()
let db

if (fs.existsSync(dbPath)) {
  const buffer = fs.readFileSync(dbPath)
  db = new SQL.Database(buffer)
} else {
  db = new SQL.Database()
}

function saveDb() {
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

function dbPrepare(sql) {
  return {
    get(...params) {
      const stmt = db.prepare(sql)
      try {
        if (params.length > 0) stmt.bind(params)
        if (stmt.step()) {
          return stmt.getAsObject()
        }
        return undefined
      } finally {
        stmt.free()
      }
    },
    all(...params) {
      const stmt = db.prepare(sql)
      try {
        if (params.length > 0) stmt.bind(params)
        const results = []
        while (stmt.step()) {
          results.push(stmt.getAsObject())
        }
        return results
      } finally {
        stmt.free()
      }
    },
    run(...params) {
      const stmt = db.prepare(sql)
      try {
        if (params.length > 0) stmt.bind(params)
        stmt.step()
        const changes = db.getRowsModified()
        const lastInsertRowid = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0
        saveDb()
        return { changes, lastInsertRowid }
      } finally {
        stmt.free()
      }
    }
  }
}

initializeDatabase()

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'supervisor', 'admin')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS read_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_read_records_user ON read_records(user_id);')
  db.run('CREATE INDEX IF NOT EXISTS idx_read_records_time ON read_records(read_at);')
  saveDb()

  const adminExists = dbPrepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10)
    dbPrepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin')
    console.log('默认管理员账号已创建: admin / admin123')
  }

  const rolesResult = dbPrepare('SELECT COUNT(*) as count FROM roles').get()
  const rolesExist = rolesResult ? rolesResult.count : 0
  if (rolesExist === 0) {
    const defaultRoles = [
      {
        name: 'admin',
        display_name: '管理员',
        description: '系统管理员，拥有所有权限',
        permissions: JSON.stringify({
          canView: true,
          canDownload: true,
          canUpload: true,
          canDelete: true,
          canManageUsers: true,
          canViewStats: true,
          canManageRoles: true,
          canManageFolders: true
        })
      },
      {
        name: 'supervisor',
        display_name: '班组长',
        description: '班组长，可上传下载文档',
        permissions: JSON.stringify({
          canView: true,
          canDownload: true,
          canUpload: true,
          canDelete: false,
          canManageUsers: false,
          canViewStats: true,
          canManageRoles: false,
          canManageFolders: true
        })
      },
      {
        name: 'employee',
        display_name: '员工',
        description: '普通员工，仅可查看文档',
        permissions: JSON.stringify({
          canView: true,
          canDownload: false,
          canUpload: false,
          canDelete: false,
          canManageUsers: false,
          canViewStats: false,
          canManageRoles: false,
          canManageFolders: false
        })
      }
    ]

    for (const role of defaultRoles) {
      dbPrepare('INSERT INTO roles (name, display_name, description, permissions) VALUES (?, ?, ?, ?)')
        .run(role.name, role.display_name, role.description, role.permissions)
    }
    console.log('默认角色已创建')
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
    
    const user = dbPrepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active')
    
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
  const user = dbPrepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.sub)
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
    
    const result = dbPrepare('INSERT INTO read_records (user_id, file_path, file_name) VALUES (?, ?, ?)').run(
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
    
    const records = dbPrepare(`
      SELECT * FROM read_records 
      WHERE user_id = ? 
      ORDER BY read_at DESC 
      LIMIT ? OFFSET ?
    `).all(req.user.sub, parseInt(limit), parseInt(offset))
    
    const total = dbPrepare('SELECT COUNT(*) as count FROM read_records WHERE user_id = ?').get(req.user.sub).count
    
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
    
    const total = dbPrepare('SELECT COUNT(*) as count FROM read_records WHERE user_id = ?').get(userId).count
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayCount = dbPrepare(`
      SELECT COUNT(*) as count FROM read_records 
      WHERE user_id = ? AND read_at >= ?
    `).get(userId, today.toISOString()).count
    
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const weekCount = dbPrepare(`
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
    const users = dbPrepare('SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC').all()
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
    
    const existing = dbPrepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      return res.status(400).json({ message: '用户名已存在' })
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10)
    const result = dbPrepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
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
    
    const user = dbPrepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10)
      dbPrepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id)
    }
    
    if (role) {
      dbPrepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
    }
    
    if (status) {
      dbPrepare('UPDATE users SET status = ? WHERE id = ?').run(status, id)
    }
    
    res.json({ success: true })
  } catch (e) {
    console.error('更新用户错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.put('/api/users/:id/reset-password', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body
    
    if (!password || password.length < 6) {
      return res.status(400).json({ message: '密码长度至少6位' })
    }
    
    const user = dbPrepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10)
    dbPrepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id)
    
    res.json({ success: true, message: '密码重置成功' })
  } catch (e) {
    console.error('重置密码错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.put('/api/users/:id/status', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!status || !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' })
    }
    
    if (parseInt(id) === req.user.sub) {
      return res.status(400).json({ message: '不能禁用自己的账号' })
    }
    
    const user = dbPrepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    dbPrepare('UPDATE users SET status = ? WHERE id = ?').run(status, id)
    
    res.json({ success: true, message: status === 'active' ? '账号已启用' : '账号已禁用' })
  } catch (e) {
    console.error('更新状态错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.delete('/api/users/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    
    if (parseInt(id) === req.user.sub) {
      return res.status(400).json({ message: '不能删除自己的账号' })
    }
    
    dbPrepare('DELETE FROM users WHERE id = ?').run(id)
    dbPrepare('DELETE FROM read_records WHERE user_id = ?').run(id)
    
    res.json({ success: true })
  } catch (e) {
    console.error('删除用户错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/stats', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  try {
    const totalUsers = dbPrepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('active').count
    const totalReads = dbPrepare('SELECT COUNT(*) as count FROM read_records').get().count
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayReads = dbPrepare('SELECT COUNT(*) as count FROM read_records WHERE read_at >= ?').get(today.toISOString()).count
    
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
  try {
    const roleData = dbPrepare('SELECT permissions FROM roles WHERE name = ?').get(req.user.role)
    let permissions
    if (roleData) {
      permissions = JSON.parse(roleData.permissions)
    } else {
      permissions = {
        canView: true,
        canDownload: req.user.role === 'supervisor' || req.user.role === 'admin',
        canUpload: req.user.role === 'supervisor' || req.user.role === 'admin',
        canDelete: req.user.role === 'admin',
        canManageUsers: req.user.role === 'admin',
        canViewStats: req.user.role === 'admin' || req.user.role === 'supervisor',
        canManageRoles: req.user.role === 'admin',
        canManageFolders: req.user.role === 'supervisor' || req.user.role === 'admin'
      }
    }
    res.json({ permissions })
  } catch (e) {
    console.error('获取权限错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.get('/api/roles', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const roles = dbPrepare('SELECT id, name, display_name, description, permissions, created_at FROM roles').all()
    const parsedRoles = roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions)
    }))
    res.json({ roles: parsedRoles })
  } catch (e) {
    console.error('获取角色列表错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.post('/api/roles', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { name, display_name, description, permissions } = req.body
    
    if (!name || !display_name) {
      return res.status(400).json({ message: '请提供角色名称和显示名称' })
    }
    
    const existing = dbPrepare('SELECT id FROM roles WHERE name = ?').get(name)
    if (existing) {
      return res.status(400).json({ message: '角色名称已存在' })
    }
    
    const permsJson = JSON.stringify(permissions || {})
    const result = dbPrepare('INSERT INTO roles (name, display_name, description, permissions) VALUES (?, ?, ?, ?)')
      .run(name, display_name, description || '', permsJson)
    
    res.json({ success: true, id: result.lastInsertRowid })
  } catch (e) {
    console.error('创建角色错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.put('/api/roles/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    const { display_name, description, permissions } = req.body
    
    const role = dbPrepare('SELECT * FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ message: '角色不存在' })
    }
    
    if (role.name === 'admin' && permissions && !permissions.canManageUsers) {
      return res.status(400).json({ message: '管理员角色必须拥有用户管理权限' })
    }
    
    if (display_name) {
      dbPrepare('UPDATE roles SET display_name = ? WHERE id = ?').run(display_name, id)
    }
    if (description !== undefined) {
      dbPrepare('UPDATE roles SET description = ? WHERE id = ?').run(description, id)
    }
    if (permissions) {
      dbPrepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify(permissions), id)
    }
    
    res.json({ success: true })
  } catch (e) {
    console.error('更新角色错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.delete('/api/roles/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    
    const role = dbPrepare('SELECT * FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ message: '角色不存在' })
    }
    
    if (['admin', 'supervisor', 'employee'].includes(role.name)) {
      return res.status(400).json({ message: '系统默认角色不能删除' })
    }
    
    const usersWithRole = dbPrepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role.name).count
    if (usersWithRole > 0) {
      return res.status(400).json({ message: '该角色下还有用户，无法删除' })
    }
    
    dbPrepare('DELETE FROM roles WHERE id = ?').run(id)
    res.json({ success: true })
  } catch (e) {
    console.error('删除角色错误:', e)
    res.status(500).json({ message: '服务器错误' })
  }
})

app.post('/api/folders', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const { parentPath, folderName } = req.body
    
    if (!folderName) {
      return res.status(400).json({ message: '请提供文件夹名称' })
    }
    
    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName
    const fsMod = await import('fs')
    const dataPath = process.env.DATA_PATH || '/srv'
    const fullPath = `${dataPath}/${folderPath}`
    
    if (!fsMod.existsSync(fullPath)) {
      fsMod.mkdirSync(fullPath, { recursive: true })
    }
    
    res.json({ success: true, path: folderPath, message: '文件夹创建成功' })
  } catch (e) {
    console.error('创建文件夹错误:', e)
    res.status(500).json({ message: '创建文件夹失败' })
  }
})

app.delete('/api/folders', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { path: folderPath } = req.query
    
    if (!folderPath) {
      return res.status(400).json({ message: '请提供文件夹路径' })
    }
    
    const fsMod = await import('fs')
    const dataPath = process.env.DATA_PATH || '/srv'
    const fullPath = `${dataPath}/${folderPath}`
    
    if (fsMod.existsSync(fullPath)) {
      fsMod.rmSync(fullPath, { recursive: true, force: true })
    }
    
    res.json({ success: true, message: '文件夹删除成功' })
  } catch (e) {
    console.error('删除文件夹错误:', e)
    res.status(500).json({ message: '删除文件夹失败' })
  }
})

app.get('/api/documents/versions', authMiddleware, (req, res) => {
  try {
    const { path: docPath } = req.query
    
    if (!docPath) {
      return res.json({ versions: [] })
    }
    
    const mockVersions = [
      { version: 1, created_at: new Date().toISOString(), uploadedBy: 'admin', isCurrent: 1 }
    ]
    res.json({ versions: mockVersions })
  } catch (e) {
    console.error('获取版本错误:', e)
    const mockVersions = [
      { version: 1, created_at: new Date().toISOString(), uploadedBy: 'admin', isCurrent: 1 }
    ]
    res.json({ versions: mockVersions })
  }
})

const DATA_DIR = path.join(__dirname, '..', '..', 'data')

function scanDirectory(dirPath, relativePath = '') {
  const items = []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const itemPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'directory',
          size: 0,
          modified: new Date().toISOString()
        })
      } else {
        const stats = fs.statSync(fullPath)
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime.toISOString()
        })
      }
    }
  } catch (e) {
    console.error('扫描目录错误:', e)
  }
  return items
}

app.get('/api/filebrowser/resources', authMiddleware, (req, res) => {
  try {
    const folderPath = req.query.path || ''
    const targetPath = folderPath ? path.join(DATA_DIR, folderPath) : DATA_DIR
    
    if (!fs.existsSync(targetPath)) {
      return res.json({ items: [] })
    }
    
    const items = scanDirectory(targetPath, folderPath)
    res.json({ items })
  } catch (e) {
    console.error('获取文件列表错误:', e)
    res.status(500).json({ message: '获取文件列表失败' })
  }
})

app.get('/api/filebrowser/search', authMiddleware, async (req, res) => {
  try {
    const keyword = req.query.q || ''
    const category = req.query.category || ''
    const searchMode = req.query.mode || 'filename'
    
    if (!keyword && !category) {
      return res.json({ items: [] })
    }
    
    async function searchRecursive(dirPath, relativePath = '') {
      const results = []
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        for (const entry of entries) {
          const itemPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
          const fullPath = path.join(dirPath, entry.name)
          
          if (entry.isDirectory()) {
            const subResults = await searchRecursive(fullPath, itemPath)
            results.push(...subResults)
          } else {
            let match = false
            
            if (category) {
              const pathParts = itemPath.split('/')
              if (!pathParts[0] || pathParts[0] !== category) {
                continue
              }
            }
            
            if (!keyword) {
              match = true
            } else if (searchMode === 'filename') {
              match = entry.name.toLowerCase().includes(keyword.toLowerCase())
            } else if (searchMode === 'content') {
              match = entry.name.toLowerCase().includes(keyword.toLowerCase())
              if (!match && fullPath.toLowerCase().endsWith('.pdf')) {
                try {
                  const dataBuffer = fs.readFileSync(fullPath)
                  const parser = new PDFParse({ data: dataBuffer })
                  const textResult = await parser.getText()
                  match = textResult.text.toLowerCase().includes(keyword.toLowerCase())
                  await parser.destroy()
                } catch (e) {
                  console.error('PDF解析错误:', fullPath, e.message)
                }
              }
            }
            
            if (match) {
              const stats = fs.statSync(fullPath)
              const pathParts = itemPath.split('/')
              results.push({
                name: entry.name,
                path: itemPath,
                type: 'file',
                size: stats.size,
                modified: stats.mtime.toISOString(),
                category: pathParts[0] || '其他'
              })
            }
          }
        }
      } catch (e) {
        console.error('搜索错误:', e)
      }
      return results
    }
    
    const items = await searchRecursive(DATA_DIR)
    res.json({ items })
  } catch (e) {
    console.error('搜索错误:', e)
    res.status(500).json({ message: '搜索失败' })
  }
})

app.get('/api/filebrowser/stats', authMiddleware, (req, res) => {
  try {
    const categories = ['安全制度', '作业指导书', '质量规范', '其他']
    const stats = {}
    
    for (const category of categories) {
      const categoryPath = path.join(DATA_DIR, category)
      let count = 0
      if (fs.existsSync(categoryPath)) {
        const entries = fs.readdirSync(categoryPath, { withFileTypes: true })
        count = entries.filter(e => e.isFile()).length
      }
      stats[category] = count
    }
    
    res.json({ stats })
  } catch (e) {
    console.error('获取统计错误:', e)
    res.status(500).json({ message: '获取统计失败' })
  }
})

app.get('/api/filebrowser/file', authMiddleware, (req, res) => {
  try {
    const filePath = req.query.path || ''
    const targetPath = path.join(DATA_DIR, filePath)
    
    console.log('请求文件:', filePath)
    console.log('目标路径:', targetPath)
    
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      console.log('文件不存在:', targetPath)
      return res.status(404).json({ message: '文件不存在' })
    }
    
    const ext = path.extname(targetPath).toLowerCase()
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    
    const data = fs.readFileSync(targetPath)
    res.send(data)
  } catch (e) {
    console.error('读取文件错误:', e)
    res.status(500).json({ message: '读取文件失败: ' + e.message })
  }
})

app.listen(PORT, () => {
  console.log(`认证服务运行在 http://localhost:${PORT}`)
  console.log('默认管理员账号: admin / admin123')
})
