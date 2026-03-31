import fs from 'fs'
import path from 'path'
import { createHmac } from 'crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const SECRET = process.env.SESSION_SECRET ?? 'tuk-secret'

type User = { id: string; passwordHash: string }

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf-8')
}

function readUsers(): User[] {
  ensureFile()
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) } catch { return [] }
}

function writeUsers(users: User[]) {
  ensureFile()
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

function hashPassword(password: string): string {
  return createHmac('sha256', SECRET).update(password).digest('hex')
}

export function registerUser(id: string, password: string): { ok: boolean; error?: string } {
  const users = readUsers()
  if (users.find(u => u.id === id)) return { ok: false, error: '이미 사용 중인 아이디입니다.' }
  users.push({ id, passwordHash: hashPassword(password) })
  writeUsers(users)
  return { ok: true }
}

export function verifyUser(id: string, password: string): boolean {
  const users = readUsers()
  const user = users.find(u => u.id === id)
  return !!user && user.passwordHash === hashPassword(password)
}
