import { SupportTicket, User } from '../../models/index.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/AppError.js';

// College admin raises a new ticket
export const createTicket = async ({ collegeId, raisedBy, subject, description }) => {
  if (!subject?.trim()) throw new ValidationError('Subject is required.');
  if (!description?.trim()) throw new ValidationError('Description is required.');

  const ticket = await SupportTicket.create({
    collegeId,
    raisedBy,
    subject:     subject.trim(),
    description: description.trim(),
    status:      'open',
  });

  return ticket;
};

// College admin lists their own tickets
export const listTickets = async ({ collegeId, status, page = 1, limit = 20 }) => {
  const filter = { collegeId };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-messages') // exclude thread from list view
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  return { tickets, total, page, limit };
};

// Get single ticket with full message thread
export const getTicket = async ({ ticketId, collegeId, requesterId, requesterRole }) => {
  const ticket = await SupportTicket.findOne({ _id: ticketId })
    .populate('raisedBy', 'firstName lastName email')
    .populate('messages.senderId', 'firstName lastName role')
    .lean();

  if (!ticket) throw new NotFoundError('Ticket not found.');

  // College admin can only see their own college's tickets
  if (requesterRole === 'collegeAdmin' && ticket.collegeId.toString() !== collegeId.toString()) {
    throw new ForbiddenError('Access denied.');
  }

  return ticket;
};

// Post a reply message on a ticket (college admin or owner)
export const replyToTicket = async ({ ticketId, senderId, senderRole, body, collegeId }) => {
  if (!body?.trim()) throw new ValidationError('Reply cannot be empty.');

  const filter = { _id: ticketId };
  if (senderRole === 'collegeAdmin') filter.collegeId = collegeId;

  const ticket = await SupportTicket.findOne(filter);
  if (!ticket) throw new NotFoundError('Ticket not found.');
  if (ticket.status === 'closed') throw new ValidationError('Cannot reply to a closed ticket.');

  ticket.messages.push({ senderId, senderRole, body: body.trim() });

  if (senderRole === 'owner') {
    ticket.lastOwnerReplyAt = new Date();
    if (ticket.status === 'open') ticket.status = 'in_progress';
  } else {
    ticket.lastAdminReplyAt = new Date();
    // Re-open if resolved, so owner sees it again
    if (ticket.status === 'resolved') ticket.status = 'open';
  }

  await ticket.save();
  return ticket;
};

// Owner updates status
export const updateTicketStatus = async ({ ticketId, status }) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) throw new NotFoundError('Ticket not found.');

  ticket.status = status;
  if (status === 'resolved' || status === 'closed') {
    ticket.resolvedAt = new Date();
  }
  await ticket.save();
  return ticket;
};

// Owner: list all tickets across all colleges
export const listAllTickets = async ({ status, page = 1, limit = 30 }) => {
  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-messages')
      .populate('raisedBy', 'firstName lastName email')
      .populate('collegeId', 'name')
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  return { tickets, total, page, limit };
};
