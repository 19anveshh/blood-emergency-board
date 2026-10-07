import { Router } from 'express'
import { createDonor, getDonor, listDonors, updateDonor } from '../controllers/donorController.js'
import { validateDonorCreate, validateDonorQuery, validateDonorUpdate } from '../middleware/validate.js'
import { authenticate, authorizeRoles } from '../middleware/auth.js'

const router = Router()

router.get('/', validateDonorQuery, listDonors)
router.post('/', authenticate, authorizeRoles('ADMIN'), validateDonorCreate, createDonor)
router.get('/:id', getDonor)
router.put('/:id', authenticate, authorizeRoles('DONOR'), validateDonorUpdate, updateDonor)

export default router
