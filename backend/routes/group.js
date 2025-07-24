const express = require('express')
const router = express.Router()
const { getClient } = require('../utilities/db')

/**
 * GET /api/group/all
 * Returns all groups
 */
router.get('/all', async (req, res) => {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, name, description, is_active, created_at, updated_at
       FROM groups
       ORDER BY name ASC`
    )
    res.status(200).json({ groups: result.rows })
  } catch (err) {
    console.error('Error fetching groups:', err)
    res.status(500).json({ message: 'Failed to fetch groups' })
  } finally {
    client.release()
  }
})

/**
 * POST /api/group
 * Create a new group
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
      `INSERT INTO groups (name, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [name, description, is_active ?? true, now, now]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error creating group:', err)
    res.status(500).json({ message: 'Failed to create group' })
  } finally {
    client.release()
  }
})

/**
 * PUT /api/group/:id
 * Update an existing group
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
      `UPDATE groups
       SET name = $1, description = $2, is_active = $3, updated_at = $4
       WHERE id = $5
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [name, description, is_active ?? true, now, id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'group not found' })
    }

    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('Error updating group:', err)
    res.status(500).json({ message: 'Failed to update group' })
  } finally {
    client.release()
  }
})

/**
 * DELETE /api/group/:id
 * Delete a group
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const client = await getClient()
  try {
    const result = await client.query(
      'DELETE FROM groups WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'group not found' })
    }

    res.status(200).json({ message: 'group deleted' })
  } catch (err) {
    console.error('Error deleting group:', err)
    res.status(500).json({ message: 'Failed to delete group' })
  } finally {
    client.release()
  }
})

module.exports = router
