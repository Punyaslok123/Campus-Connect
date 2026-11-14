import mongoose from 'mongoose';
import { Message, User } from '../../models/index.js';
import { NotFoundError, ValidationError } from '../../utils/AppError.js';
import { socketService } from '../../services/socketService.js';

export const sendMessage = async ({ senderId, receiverId, content, collegeId }) => {
  if (!content?.trim()) throw new ValidationError('Message content is required.');

  const receiver = await User.findOne({ _id: receiverId, collegeId }).lean();
  if (!receiver) throw new NotFoundError('Recipient not found in this college.');

  const conversationKey = [senderId.toString(), receiverId.toString()].sort().join('_');
  const message = await Message.create({
    senderId, receiverId,
    content: content.trim(),
    collegeId,
    conversationKey,
  });

  // Real-time delivery to receiver
  socketService.emitNewMessage(receiverId.toString(), {
    _id:             message._id,
    senderId:        message.senderId,
    receiverId:      message.receiverId,
    content:         message.content,
    collegeId:       message.collegeId,
    conversationKey: message.conversationKey,
    createdAt:       message.createdAt,
  });

  return message;
};

export const broadcastToDeptAdmins = async ({ senderId, content, collegeId }) => {
  if (!content?.trim()) throw new ValidationError('Message content is required.');

  const admins = await User.find({ collegeId, role: 'deptAdmin', isActive: true }).select('_id').lean();
  if (!admins.length) throw new NotFoundError('No department admins found.');

  const messages = admins.map(a => ({
    senderId,
    receiverId: a._id,
    content:    content.trim(),
    collegeId,
    conversationKey: [senderId.toString(), a._id.toString()].sort().join('_'),
  }));

  const created = await Message.insertMany(messages);

  // Real-time delivery to each dept admin
  created.forEach((msg, i) => {
    socketService.emitNewMessage(admins[i]._id.toString(), {
      _id:             msg._id,
      senderId:        msg.senderId,
      receiverId:      msg.receiverId,
      content:         msg.content,
      collegeId:       msg.collegeId,
      conversationKey: msg.conversationKey,
      createdAt:       msg.createdAt,
    });
  });

  return { sent: admins.length };
};

// For collegeAdmin — list deptAdmins they can message
export const listDeptAdmins = async (collegeId) => {
  return User.find({ collegeId, role: 'deptAdmin', isActive: true })
    .select('firstName lastName email profileImage departmentId')
    .populate('departmentId', 'name code')
    .lean();
};

// For deptAdmin — list collegeAdmins they can message
export const listCollegeAdmins = async (collegeId) => {
  return User.find({ collegeId, role: 'collegeAdmin', isActive: true })
    .select('firstName lastName email profileImage')
    .lean();
};

// For deptAdmin/faculty — list users by role within their department
export const listDeptMembers = async ({ collegeId, departmentId, role }) => {
  const filter = { collegeId, departmentId, isActive: true };
  if (role) filter.role = role;
  return User.find(filter)
    .select('firstName lastName email profileImage role rollNumber semester designation isVerified')
    .lean();
};

export const getThread = async ({ userId, otherUserId, collegeId, page = 1, limit = 50 }) => {
  const conversationKey = [userId.toString(), otherUserId.toString()].sort().join('_');
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversationKey, collegeId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments({ conversationKey, collegeId }),
  ]);

  await Message.updateMany(
    { conversationKey, collegeId, receiverId: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { messages: messages.reverse(), total, page, limit };
};

export const getInbox = async ({ userId, collegeId }) => {
  const uId = new mongoose.Types.ObjectId(userId);
  const cId = new mongoose.Types.ObjectId(collegeId);
  return Message.getInbox(uId, cId);
};

/**
 * For student/faculty/alumni: list contactable people in their college.
 * Supports filtering by role + semester (for students) + search.
 */
export const listContacts = async ({ collegeId, excludeUserId, role, semester, search }) => {
  const filter = {
    collegeId,
    isActive:   true,
    isVerified: true,
    _id:        { $ne: excludeUserId },
  };

  if (role) {
    filter.role = role;
  } else {
    // Default: show students, faculty, alumni
    filter.role = { $in: ['student', 'faculty', 'alumni'] };
  }

  if (semester && role === 'student') filter.semester = Number(semester);

  let query = User.find(filter).select(
    'firstName lastName email profileImage role semester rollNumber designation currentCompany currentRole'
  );

  if (search) {
    const re = new RegExp(search, 'i');
    query = query.where({
      $or: [
        { firstName:  re },
        { lastName:   re },
        { rollNumber: re },
        { email:      re },
      ],
    });
  }

  return query.sort({ firstName: 1 }).limit(100).lean();
};
