import { asyncHandler } from '../middleware/errors.js'
import { sendSuccess } from '../middleware/response.js'
import { donorService, publicDonor } from '../services/donorService.js'

export const listDonors = asyncHandler(async (req, res) => {
  sendSuccess(res, (await donorService.list(req.validatedQuery)).map(publicDonor))
})

export const getDonor = asyncHandler(async (req, res) => {
  sendSuccess(res, publicDonor(await donorService.getById(req.params.id)))
})

export const createDonor = asyncHandler(async (req, res) => {
  sendSuccess(res, await donorService.create(req.body), 201)
})

export const updateDonor = asyncHandler(async (req, res) => {
  sendSuccess(res, await donorService.update(req.params.id, req.body, req.user))
})
