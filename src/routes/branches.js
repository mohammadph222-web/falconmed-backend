import express from 'express'
import {
  getBranchStats,
  getBranchPerformers,
  getBranchHourly,
  getBranchAlerts
} from '../controllers/branchControllers.js'

const router = express.Router()

router.get('/:id/stats', getBranchStats)
router.get('/:id/performers', getBranchPerformers)
router.get('/:id/hourly', getBranchHourly)
router.get('/:id/alerts', getBranchAlerts)

export default router
