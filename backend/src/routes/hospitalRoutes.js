import { Router } from 'express'
import { createHospital, getHospital, listHospitals, updateHospital } from '../controllers/hospitalController.js'
import { validateHospitalCreate, validateHospitalUpdate } from '../middleware/validate.js'
import { authenticate, authorizeRoles } from '../middleware/auth.js'

const router = Router()

router.get('/', listHospitals)
router.post('/', authenticate, authorizeRoles('ADMIN'), validateHospitalCreate, createHospital)
router.get('/:id', getHospital)
router.put('/:id', authenticate, authorizeRoles('ADMIN'), validateHospitalUpdate, updateHospital)

export default router
