import express from 'express'
import {
  getNetworkStats,
  getNetworkBranches,
  getNetworkTrends,
  getNetworkStaff
} from '../controllers/adminControllers.js'

const router = express.Router()

router.get('/stats', getNetworkStats)
router.get('/branches', getNetworkBranches)
router.get('/trends', getNetworkTrends)
router.get('/staff', getNetworkStaff)

export default router
