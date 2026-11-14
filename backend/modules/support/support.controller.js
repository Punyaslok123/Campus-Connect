import * as svc from './support.service.js';
import { sendSuccess } from '../../utils/response.js';

export const create = async (req, res) => {
  const { subject, description } = req.body;
  const ticket = await svc.createTicket({
    collegeId:   req.user.collegeId,
    raisedBy:    req.user._id,
    subject,
    description,
  });
  return sendSuccess(res, 201, 'Support ticket created', { ticket });
};

export const list = async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await svc.listTickets({
    collegeId: req.user.collegeId,
    status,
    page:  Number(page  ?? 1),
    limit: Number(limit ?? 20),
  });
  return sendSuccess(res, 200, 'Tickets fetched', result);
};

export const getOne = async (req, res) => {
  const ticket = await svc.getTicket({
    ticketId:      req.params.id,
    collegeId:     req.user.collegeId,
    requesterId:   req.user._id,
    requesterRole: req.user.role,
  });
  return sendSuccess(res, 200, 'Ticket fetched', { ticket });
};

export const reply = async (req, res) => {
  const { body } = req.body;
  const ticket = await svc.replyToTicket({
    ticketId:   req.params.id,
    senderId:   req.user._id,
    senderRole: req.user.role,
    body,
    collegeId:  req.user.collegeId,
  });
  return sendSuccess(res, 200, 'Reply sent', { ticket });
};

// Owner only
export const listAll = async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await svc.listAllTickets({
    status,
    page:  Number(page  ?? 1),
    limit: Number(limit ?? 30),
  });
  return sendSuccess(res, 200, 'All tickets fetched', result);
};

export const updateStatus = async (req, res) => {
  const { status } = req.body;
  const ticket = await svc.updateTicketStatus({ ticketId: req.params.id, status });
  return sendSuccess(res, 200, 'Ticket status updated', { ticket });
};
