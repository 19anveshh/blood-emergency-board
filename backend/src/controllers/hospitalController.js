import { asyncHandler } from '../middleware/errors.js'
import { sendSuccess } from '../middleware/response.js'
import { hospitalService } from '../services/hospitalService.js'

export const listHospitals = asyncHandler(async (_req, res) => {
  sendSuccess(res, await hospitalService.list())
})

export const getHospital = asyncHandler(async (req, res) => {
  sendSuccess(res, await hospitalService.getById(req.params.id))
})

export const createHospital = asyncHandler(async (req, res) => {
  sendSuccess(res, await hospitalService.create(req.body), 201)
})

export const updateHospital = asyncHandler(async (req, res) => {
  sendSuccess(res, await hospitalService.update(req.params.id, req.body))
})
