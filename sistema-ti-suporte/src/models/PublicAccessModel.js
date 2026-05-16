const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const connectDatabase = require('../database/connection');

class PublicAccessModel {
  static async emailExists(email) {
    const db = await connectDatabase();

    const user = await db.get(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [String(email).trim().toLowerCase()]
    );

    return !!user;
  }

  static async createClientAccess(data) {
    const db = await connectDatabase();

    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');

    if (!name || !email || !password) {
      throw new Error('Nome, e-mail e senha são obrigatórios.');
    }

    if (password.length < 6) {
      throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    }

    const exists = await this.emailExists(email);

    if (exists) {
      throw new Error('Este e-mail já possui acesso cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await db.exec('BEGIN TRANSACTION');

      const userResult = await db.run(
        `
        INSERT INTO users (
          name,
          email,
          password,
          role,
          status
        ) VALUES (?, ?, ?, 'client', 'active')
        `,
        [name, email, hashedPassword]
      );

      await db.run(
        `
        INSERT INTO clients (
          user_id,
          name,
          email,
          phone,
          document,
          address,
          city,
          state,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `,
        [
          userResult.lastID,
          name,
          email,
          data.phone || null,
          data.document || null,
          data.address || null,
          data.city || null,
          data.state || null
        ]
      );

      await db.exec('COMMIT');

      return userResult.lastID;
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async createPasswordReset(email) {
    const db = await connectDatabase();

    const cleanEmail = String(email || '').trim().toLowerCase();

    const user = await db.get(
      `
      SELECT id, name, email
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (!user) {
      return null;
    }

    const token = crypto.randomBytes(32).toString('hex');

    await db.run(
      `
      INSERT INTO password_reset_tokens (
        user_id,
        token,
        expires_at
      ) VALUES (?, ?, datetime('now', '+30 minutes'))
      `,
      [user.id, token]
    );

    return {
      user,
      token
    };
  }

  static async findResetToken(token) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        password_reset_tokens.*,
        users.email,
        users.name
      FROM password_reset_tokens
      INNER JOIN users ON users.id = password_reset_tokens.user_id
      WHERE password_reset_tokens.token = ?
      AND password_reset_tokens.used_at IS NULL
      AND datetime(password_reset_tokens.expires_at) >= datetime('now')
      LIMIT 1
      `,
      [token]
    );
  }

  static async resetPassword(token, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
    }

    const db = await connectDatabase();

    const resetToken = await this.findResetToken(token);

    if (!resetToken) {
      throw new Error('Link de recuperação inválido ou expirado.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      await db.exec('BEGIN TRANSACTION');

      await db.run(
        `
        UPDATE users
        SET
          password = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [hashedPassword, resetToken.user_id]
      );

      await db.run(
        `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [resetToken.id]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }
}

module.exports = PublicAccessModel;
