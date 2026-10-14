import { getDatabase } from '../db';
import { User, UserRole } from '../../types/domain';

export class UserRepository {
  static async getUsers(): Promise<User[]> {
    const db = await getDatabase();
    return await db.getAllAsync<User>('SELECT * FROM users WHERE is_active = 1 ORDER BY name ASC;');
  }

  static async getUserById(id: string): Promise<User | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?;', [id]);
  }

  static async verifyPin(userId: string, pin: string): Promise<boolean> {
    const db = await getDatabase();
    const user = await db.getFirstAsync<{ pin: string }>(
      'SELECT pin FROM users WHERE id = ? AND is_active = 1;',
      [userId]
    );
    return user?.pin === pin;
  }
}
