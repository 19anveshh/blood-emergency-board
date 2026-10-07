import { asyncHandler } from '../middleware/errors.js'
import { sendSuccess } from '../middleware/response.js'
import { matchingService } from '../services/matchingService.js'
import { requestService } from '../services/requestService.js'

export const listRequests = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.list(req.validatedQuery))
})

export const getRequest = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.getById(req.params.id))
})

export const createRequest = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.create(req.body, req.user), 201)
})

export const updateRequest = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.update(req.params.id, req.body, req.user))
})

export const deleteRequest = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.remove(req.params.id))
})

export const getRequestMatches = asyncHandler(async (req, res) => {
  sendSuccess(res, await matchingService.getMatches(req.params.id))
})

export const acceptRequest = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.accept(req.params.id, req.body.donorId, req.user))
})

export const fulfillRequest = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.fulfill(req.params.id, req.user))
})

export const cancelRequest = asyncHandler(async (req, res) => {
  sendSuccess(res, await requestService.cancel(req.params.id, req.user))
})
