/**
 * User management routes.
 * Handles CRUD operations for user accounts.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const UserService = require('../services/user-service');

const router = express.Router();
const userService = new UserService();

/**
 * Get all users with optional filtering.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
router.get('/users', authenticate, async (req, res) => {
  const { role, active } = req.query;
  const users = await userService.findAll({ role, active });
  res.json({ data: users });
});

// Get single user by ID
router.get('/users/:id', authenticate, async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ data: user });
});

// Create a new user
router.post('/users', authenticate, validate, async (req, res) => {
  const user = await userService.create(req.body);
  res.status(201).json({ data: user });
});

// Update user
router.put('/users/:id', authenticate, async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  res.json({ data: user });
});

// Delete user
router.delete('/users/:id', authenticate, async (req, res) => {
  await userService.delete(req.params.id);
  res.status(204).send();
});

/**
 * Format a user object for API response.
 * Strips sensitive fields like password.
 * @param {Object} user - Raw user object
 * @returns {Object} Sanitized user
 */
function formatUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function isAdmin(user) {
  return user.role === 'admin';
}

module.exports = router;
