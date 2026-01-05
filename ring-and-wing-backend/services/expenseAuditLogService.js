const ExpenseAuditLog = require('../models/ExpenseAuditLog');

const safeString = (value) => (value == null ? '' : String(value));

class ExpenseAuditLogService {
  static async log({
    action,
    description,
    expenseId,
    user,
    userId,
    details
  }) {
    if (!action || !description || !expenseId) return;

    try {
      await ExpenseAuditLog.create({
        action,
        description: safeString(description),
        expenseId,
        user: user || 'system',
        userId: userId || null,
        details: details || {},
        timestamp: new Date()
      });
    } catch (error) {
      // Non-blocking by design
      console.error('[ExpenseAuditLog] Failed to write audit log:', error);
    }
  }
}

module.exports = ExpenseAuditLogService;
