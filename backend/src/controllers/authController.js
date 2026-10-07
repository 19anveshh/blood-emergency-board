import { asyncHandler } from '../middleware/errors.js'
import { sendSuccess } from '../middleware/response.js'
import { authService } from '../services/authService.js'

export const register = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.register(req.body), 201)
})

export const login = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.login(req.body.email, req.body.password))
})

export const me = (req, res) => sendSuccess(res, { user: req.user })
