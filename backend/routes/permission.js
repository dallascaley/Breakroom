const express = require('express')
const router = express.Router()
const { getClient } = require('../utilities/db')

/**
 * GET /api/permission/all
 * Returns all permissions
 */
router.get('/all', async (req, res) => {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, name, description, is_active
       FROM permissions
       ORDER BY name ASC`
    )
    res.status(200).json({ permissions: result.rows })
  } catch (err) {
    console.error('Error fetching permissions:', err)
    res.status(500).json({ message: 'Failed to fetch permissions' })
  } finally {
    client.release()
  }
})

/**
 * POST /api/permission
 * Create a new permission
 */
router.post('/', async (req, res) => {
  const { name, description, is_active } = req.body

  if (!name || !description) {
    return res.status(400).json({ message: 'Name and description are required.' })
  }

  const client = await getClient()
  try {
    const now = new Date()
    const result = await client.query(
      `INSERT INTO permissions (name, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [name, description, is_active ?? true, now, now]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error creating permission:', err)
    res.status(500).json({ message: 'Failed to create permission' })
  } finally {
    client.release()
  }
})

/**
 * PUT /api/permission/:id
 * Update an existing permission
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, description, is_active } = req.body

  if (!name || !description) {
    return res.status(400).json({ message: 'Name and description are required.' })
  }

  const client = await getClient()
  try {
    const now = new Date()
    const result = await client.query(
      `UPDATE permissions
       SET name = $1, description = $2, is_active = $3, updated_at = $4
       WHERE id = $5
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [name, description, is_active ?? true, now, id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Permission not found' })
    }

    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('Error updating permission:', err)
    res.status(500).json({ message: 'Failed to update permission' })
  } finally {
    client.release()
  }
})

/**
 * DELETE /api/permission/:id
 * Delete a permission
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const client = await getClient()
  try {
    const result = await client.query(
      'DELETE FROM permissions WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Permission not found' })
    }

    res.status(200).json({ message: 'Permission deleted' })
  } catch (err) {
    console.error('Error deleting permission:', err)
    res.status(500).json({ message: 'Failed to delete permission' })
  } finally {
    client.release()
  }
})

module.exports = router
