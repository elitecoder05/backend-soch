/**
 * Script History — CRUD Routes
 * 
 * POST   /api/script-history/save    — Save a generated script
 * GET    /api/script-history         — List user's scripts (paginated)
 * DELETE /api/script-history/:id     — Delete a single script
 */

const express = require('express');
const router = express.Router();
const ScriptHistory = require('../../models/ScriptHistory');
const { authenticateToken } = require('../../middleware/auth');

/**
 * POST /save
 * Save a generated script to history
 */
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { topic, params, result, sessionId, userPrompt, isFollowUp = false } = req.body;

    if (!topic || !result) {
      return res.status(400).json({
        success: false,
        error: 'Topic and result are required.',
      });
    }

    const normalizedSessionId = String(sessionId || '').trim() || new (require('mongoose')).Types.ObjectId().toString();
    const latestTurn = await ScriptHistory.findOne({
      userId: req.user._id,
      sessionId: normalizedSessionId,
    })
      .sort({ turnNumber: -1 })
      .select('turnNumber')
      .lean();

    const nextTurn = (latestTurn?.turnNumber || 0) + 1;

    const entry = await ScriptHistory.create({
      userId: req.user._id,
      topic: topic.trim(),
      sessionId: normalizedSessionId,
      turnNumber: nextTurn,
      userPrompt: String(userPrompt || topic || '').trim(),
      isFollowUp: Boolean(isFollowUp),
      params: params || {},
      result,
    });

    res.status(201).json({
      success: true,
      data: {
        id: entry._id,
        topic: entry.topic,
        sessionId: entry.sessionId,
        turnNumber: entry.turnNumber,
        createdAt: entry.createdAt,
      },
    });
  } catch (error) {
    console.error('[ScriptHistory] Save error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save script.' });
  }
});

/**
 * GET /
 * List user's script history (newest first, paginated)
 * Query params: page (default 1), limit (default 30)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const [scripts, total] = await Promise.all([
      ScriptHistory.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('topic sessionId turnNumber userPrompt isFollowUp result.hook.text result.metadata.wordCount result.metadata.estimatedDuration createdAt')
        .lean(),
      ScriptHistory.countDocuments({ userId: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      data: scripts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[ScriptHistory] List error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch history.' });
  }
});

/**
 * GET /session/:sessionId
 * Get the full conversation turns for a script session
 */
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required.' });
    }

    const turns = await ScriptHistory.find({
      userId: req.user._id,
      sessionId,
    })
      .sort({ turnNumber: 1, createdAt: 1 })
      .lean();

    if (!turns || turns.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    res.status(200).json({ success: true, data: turns });
  } catch (error) {
    console.error('[ScriptHistory] Session get error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch script session.' });
  }
});

/**
 * GET /:id
 * Get a single script by ID (full details)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const script = await ScriptHistory.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!script) {
      return res.status(404).json({ success: false, error: 'Script not found.' });
    }

    res.status(200).json({ success: true, data: script });
  } catch (error) {
    console.error('[ScriptHistory] Get error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch script.' });
  }
});

/**
 * DELETE /session/:sessionId
 * Delete all turns from a session
 */
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required.' });
    }

    const result = await ScriptHistory.deleteMany({
      userId: req.user._id,
      sessionId,
    });

    if (!result || result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    res.status(200).json({ success: true, message: 'Session deleted.', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('[ScriptHistory] Session delete error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete script session.' });
  }
});

/**
 * DELETE /:id
 * Delete a single script from history
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await ScriptHistory.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Script not found.' });
    }

    res.status(200).json({ success: true, message: 'Script deleted.' });
  } catch (error) {
    console.error('[ScriptHistory] Delete error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete script.' });
  }
});

module.exports = router;
