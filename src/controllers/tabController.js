const tabService = require('../services/tabService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/tabs
 * @desc    Create a new tab
 * @access  Private (Admin only)
 */
const createTab = async (req, res, next) => {
  try {
    const tab = await tabService.createTab(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Tab created successfully',
      data: {
        tab,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tabs
 * @desc    Get all tabs (filtered by examId)
 * @access  Public
 */
const getTabs = async (req, res, next) => {
  try {
    if (!req.query.examId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'examId query parameter is required',
      });
    }

    const tabs = await tabService.getTabs(req.query.examId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        tabs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tabs/:id
 * @desc    Get tab by ID
 * @access  Public
 */
const getTabById = async (req, res, next) => {
  try {
    const tab = await tabService.getTabById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        tab,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/tabs/:id
 * @desc    Update tab
 * @access  Private (Admin only)
 */
const updateTab = async (req, res, next) => {
  try {
    const tab = await tabService.updateTab(req.params.id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tab updated successfully',
      data: {
        tab,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/tabs/:id
 * @desc    Delete tab
 * @access  Private (Admin only)
 */
const deleteTab = async (req, res, next) => {
  try {
    await tabService.deleteTab(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Tab deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTab,
  getTabs,
  getTabById,
  updateTab,
  deleteTab,
};

