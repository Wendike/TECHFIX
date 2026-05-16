const fs = require('fs');
const path = require('path');
const connectDatabase = require('../database/connection');

const backupDir = path.join(process.cwd(), 'storage', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

class AdminModel {
  static async listLogs() {
    const db = await connectDatabase();

    return db.all(`
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 500
    `);
  }

  static async clearLogs() {
    const db = await connectDatabase();
    await db.run('DELETE FROM audit_logs');
  }

  static async createBackup() {
    ensureBackupDir();

    const db = await connectDatabase();

    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-');

    const filename = `techfix-backup-${timestamp}.sqlite`;
    const fullPath = path.join(backupDir, filename);
    const safePath = fullPath.replace(/'/g, "''");

    await db.exec(`VACUUM INTO '${safePath}'`);

    return filename;
  }

  static listBackups() {
    ensureBackupDir();

    const files = fs.readdirSync(backupDir)
      .filter((file) => file.endsWith('.sqlite') || file.endsWith('.db'))
      .map((file) => {
        const fullPath = path.join(backupDir, file);
        const stat = fs.statSync(fullPath);

        return {
          filename: file,
          size: stat.size,
          created_at: stat.birthtime,
          modified_at: stat.mtime
        };
      })
      .sort((a, b) => b.modified_at - a.modified_at);

    return files;
  }

  static getBackupPath(filename) {
    ensureBackupDir();

    const fullPath = path.join(backupDir, filename);
    const normalized = path.normalize(fullPath);

    if (!normalized.startsWith(backupDir)) {
      throw new Error('Arquivo inválido.');
    }

    if (!fs.existsSync(normalized)) {
      throw new Error('Backup não encontrado.');
    }

    return normalized;
  }

  static deleteBackup(filename) {
    const fullPath = this.getBackupPath(filename);
    fs.unlinkSync(fullPath);
  }

  static getPermissions() {
    return [
      {
        role: 'admin',
        label: 'Administrador',
        permissions: [
          'Acesso total ao sistema',
          'Gerenciar usuários',
          'Gerenciar clientes',
          'Gerenciar fornecedores',
          'Gerenciar estoque',
          'Gerenciar reparos',
          'Gerenciar vendas',
          'Gerenciar financeiro',
          'Criar backups',
          'Visualizar logs'
        ]
      },
      {
        role: 'standard',
        label: 'Usuário padrão / Técnico',
        permissions: [
          'Acessar dashboard',
          'Cadastrar dispositivos',
          'Gerenciar reparos',
          'Usar peças em reparos',
          'Consultar estoque',
          'Registrar entregas'
        ]
      },
      {
        role: 'client',
        label: 'Cliente',
        permissions: [
          'Perfil reservado para portal do cliente',
          'Pode ser vinculado ao cadastro de cliente'
        ]
      },
      {
        role: 'supplier',
        label: 'Fornecedor',
        permissions: [
          'Perfil reservado para fornecedores',
          'Pode ser vinculado ao cadastro de fornecedor'
        ]
      }
    ];
  }
}

module.exports = AdminModel;
