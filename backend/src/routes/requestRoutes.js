import { Router } from 'express'
import {
  acceptRequest,
  cancelRequest,
  createRequest,
  deleteRequest,
  fulfillRequest,
  getRequest,
  getRequestMatches,
  listRequests,
  updateRequest,
} from '../controllers/requestController.js'
import { validateAcceptAction, validateRequestCreate, validateRequestQuery, validateRequestUpdate } from '../middleware/validate.js'
import { authenticate, authorizeRoles } from '../middleware/auth.js'

const router = Router()

router.get('/', validateRequestQuery, listRequests)
router.post('/', authenticate, authorizeRoles('HOSPITAL'), validateRequestCreate, createRequest)
router.get('/:id/matches', getRequestMatches)
router.post('/:id/accept', authenticate, authorizeRoles('DONOR'), validateAcceptAction, acceptRequest)
router.post('/:id/fulfill', authenticate, authorizeRoles('HOSPITAL'), fulfillRequest)
router.post('/:id/cancel', authenticate, authorizeRoles('HOSPITAL'), cancelRequest)
router.get('/:id', getRequest)
router.put('/:id', authenticate, authorizeRoles('HOSPITAL'), validateRequestUpdate, updateRequest)
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), deleteRequest)

export default router
