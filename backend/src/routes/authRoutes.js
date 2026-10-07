import { Router } from 'express'
import { register, login, me } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { validateRegister, validateLogin } from '../middleware/authValidation.js'

const router = Router()
router.post('/register', validateRegister, register)
router.post('/login', validateLogin, login)
router.get('/me', authenticate, me)
export default router
