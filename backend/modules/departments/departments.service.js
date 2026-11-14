import mongoose from 'mongoose';
import {
  Department, User, Note, Event, AuditLog, AUDIT_ACTIONS
} from '../../models/index.js';
import {
  ConflictError, NotFoundError, ValidationError
} from '../../utils/AppError.js';

export const createDepartment = async ({
  name, code, description, collegeId, performedBy, ipAddress,
  adminFirstName, adminLastName, adminEmail, adminPassword,
}) => {
  const existing = await Department.findOne({ collegeId, name: name.trim() });
  if (existing) throw new ConflictError(`A department named "${name}" already exists.`);

  let dept;
  try {
    dept = await Department.create({ name, code: code || null, description: description || null, collegeId });
  } catch (err) {
    if (err.code === 11000) throw new ConflictError(`A department named "${name}" already exists.`);
    throw err;
  }

  let admin = null;
  if (adminEmail && adminPassword && adminFirstName) {
    const emailTaken = await User.findOne({ email: adminEmail.trim().toLowerCase() });
    if (emailTaken) {
      await dept.softDelete(performedBy);
      throw new ConflictError(`Email '${adminEmail}' is already registered.`);
    }
    admin = await User.create({
      firstName: adminFirstName, lastName: adminLastName || '',
      email: adminEmail.trim().toLowerCase(),
      passwordHash: adminPassword,
      role: 'deptAdmin',
      collegeId,
      departmentId: dept._id,
      isVerified: true,
      isActive: true,
    });
    dept.adminUserId = admin._id;
    await dept.save();
  }

  await AuditLog.record({
    action: AUDIT_ACTIONS.DEPARTMENT_CREATED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: dept._id, targetModel: 'Department',
    metadata: { name, code, adminCreated: !!admin }, ipAddress,
  });

  return { dept, admin: admin ? admin.toSafeObject() : null };
};

export const listDepartments = async ({ collegeId }) => {
  const departments = await Department
    .find({ collegeId })
    .sort({ name: 1 })
    .populate('adminUserId', 'firstName lastName email')
    .lean();
  return { departments, total: departments.length };
};

export const getDepartment = async ({ id, collegeId }) => {
  const dept = await Department.findOne({ _id: id, collegeId }).lean();
  if (!dept) throw new NotFoundError('Department not found.');
  return dept;
};

export const getDepartmentDetails = async ({ id, collegeId }) => {
  const dept = await Department
    .findOne({ _id: id, collegeId })
    .populate('previousAdmins.userId', 'firstName lastName email isActive role')
    .lean();
  if (!dept) throw new NotFoundError('Department not found.');

  const [admin, studentCount, facultyCount, alumniCount] = await Promise.all([
    dept.adminUserId
      ? User.findById(dept.adminUserId).select('firstName lastName email profileImage isActive').lean()
      : null,
    User.countDocuments({ collegeId, departmentId: id, role: 'student',  isActive: true }),
    User.countDocuments({ collegeId, departmentId: id, role: 'faculty',  isActive: true }),
    User.countDocuments({ collegeId, departmentId: id, role: 'alumni',   isActive: true }),
  ]);

  return { ...dept, admin, studentCount, facultyCount, alumniCount };
};

export const updateDepartment = async ({ id, collegeId, updates, performedBy, ipAddress }) => {
  const dept = await Department.findOne({ _id: id, collegeId });
  if (!dept) throw new NotFoundError('Department not found.');

  if (updates.name && updates.name !== dept.name) {
    const clash = await Department.findOne({ collegeId, name: updates.name.trim(), _id: { $ne: id } });
    if (clash) throw new ConflictError(`A department named "${updates.name}" already exists.`);
  }

  const before = { name: dept.name, code: dept.code, isActive: dept.isActive };
  Object.assign(dept, updates);
  await dept.save();

  await AuditLog.record({
    action: AUDIT_ACTIONS.DEPARTMENT_UPDATED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: dept._id, targetModel: 'Department',
    diff: { before, after: updates }, ipAddress,
  });

  return dept;
};

// Full cascade delete
export const deleteDepartment = async ({ id, collegeId, performedBy, ipAddress }) => {
  const dept = await Department.findOne({ _id: id, collegeId });
  if (!dept) throw new NotFoundError('Department not found.');

  const deptObjectId = new mongoose.Types.ObjectId(id);

  // Deactivate all members; preserve their accounts so re-assignment is possible
  await User.updateMany(
    { collegeId, departmentId: deptObjectId },
    { $set: { isActive: false, departmentId: null } }
  );

  await Note.updateMany(
    { collegeId, departmentId: deptObjectId },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: performedBy } }
  );

  await Event.updateMany(
    { collegeId, departmentId: deptObjectId },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: performedBy, status: 'cancelled' } }
  );

  await dept.softDelete(performedBy);

  await AuditLog.record({
    action: AUDIT_ACTIONS.DEPARTMENT_DELETED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: dept._id, targetModel: 'Department',
    metadata: { name: dept.name }, ipAddress,
  });
};

/**
 * Remove the current HOD from a department.
 * The user account is preserved and downgraded to 'faculty' so they can be
 * re-assigned later. The removed HOD is recorded in `previousAdmins`.
 * Department data (students, notes, events, etc.) is never touched.
 */
export const removeDeptAdmin = async ({ deptId, collegeId, performedBy, ipAddress }) => {
  const dept = await Department.findOne({ _id: deptId, collegeId });
  if (!dept) throw new NotFoundError('Department not found.');
  if (!dept.adminUserId) throw new ValidationError('This department has no HOD to remove.');

  const adminId = dept.adminUserId;

  // Downgrade role to faculty — keep account active and departmentId for now
  // so they still have a "home" dept until reassigned or explicitly deleted.
  await User.findByIdAndUpdate(adminId, {
    $set: { role: 'faculty' },
  });

  // Record in history
  dept.previousAdmins.push({
    userId:    adminId,
    removedAt: new Date(),
    removedBy: performedBy,
    reason:    'removed',
  });
  dept.adminUserId = null;
  await dept.save();

  await AuditLog.record({
    action: AUDIT_ACTIONS.DEPARTMENT_ADMIN_ASSIGNED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: dept._id, targetModel: 'Department',
    metadata: { removedAdminId: adminId, action: 'removed' }, ipAddress,
  });

  return dept;
};

/**
 * Permanently delete a previous HOD account.
 * Only works for users in previousAdmins who are no longer the active HOD.
 * Department data is never affected.
 */
export const permanentlyRemoveAdmin = async ({ deptId, userId, collegeId, performedBy, ipAddress }) => {
  const dept = await Department.findOne({ _id: deptId, collegeId });
  if (!dept) throw new NotFoundError('Department not found.');

  // Safety: cannot permanently remove the active HOD this way
  if (dept.adminUserId?.toString() === userId.toString()) {
    throw new ValidationError('Cannot permanently delete the active HOD. Remove them first.');
  }

  const isPrevious = dept.previousAdmins.some(p => p.userId.toString() === userId.toString());
  if (!isPrevious) throw new NotFoundError('User is not a previous HOD of this department.');

  const user = await User.findOne({ _id: userId, collegeId });
  if (!user) throw new NotFoundError('User not found.');

  // Hard-delete the user account
  await User.deleteOne({ _id: userId });

  // Remove from previousAdmins list
  dept.previousAdmins = dept.previousAdmins.filter(p => p.userId.toString() !== userId.toString());
  await dept.save();

  await AuditLog.record({
    action: AUDIT_ACTIONS.DEPARTMENT_ADMIN_ASSIGNED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: dept._id, targetModel: 'Department',
    metadata: { deletedUserId: userId, action: 'permanent_delete' }, ipAddress,
  });
};

/**
 * Assign an existing user (faculty or previous HOD) as HOD of a department.
 * Rules:
 *  - User must be active and belong to this college
 *  - Students and alumni cannot be HODs
 *  - A user already HOD of another department cannot be assigned (one dept at a time)
 *  - Previous HOD (if different) is downgraded to faculty and added to previousAdmins
 */
export const assignDeptAdmin = async ({ deptId, userId, collegeId, performedBy, ipAddress }) => {
  const dept = await Department.findOne({ _id: deptId, collegeId });
  if (!dept) throw new NotFoundError('Department not found.');

  const user = await User.findOne({ _id: userId, collegeId, isActive: true });
  if (!user) throw new NotFoundError('User not found in this college.');

  if (user.role === 'student' || user.role === 'alumni') {
    throw new ValidationError('Students and alumni cannot be assigned as HOD.');
  }

  // Prevent assigning someone who is already HOD of a different department
  if (user.role === 'deptAdmin') {
    const otherDept = await Department.findOne({
      adminUserId: userId,
      _id: { $ne: deptId },
      collegeId,
    });
    if (otherDept) {
      throw new ValidationError(
        `This person is already HOD of "${otherDept.name}". Remove them there first.`
      );
    }
  }

  const previousAdminId = dept.adminUserId;

  // Downgrade previous HOD to faculty and record in history (if different person)
  if (previousAdminId && previousAdminId.toString() !== userId.toString()) {
    await User.findByIdAndUpdate(previousAdminId, { $set: { role: 'faculty' } });

    dept.previousAdmins.push({
      userId:    previousAdminId,
      removedAt: new Date(),
      removedBy: performedBy,
      reason:    'reassigned',
    });
  }

  // Promote new user to deptAdmin and bind to this department
  user.role         = 'deptAdmin';
  user.departmentId = deptId;
  user.isActive     = true;   // reactivate if they were a previous admin who got deactivated
  await user.save({ validateBeforeSave: false });

  dept.adminUserId = userId;
  await dept.save();

  await AuditLog.record({
    action: AUDIT_ACTIONS.DEPARTMENT_ADMIN_ASSIGNED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: dept._id, targetModel: 'Department',
    metadata: { newAdminId: userId, previousAdminId, action: 'assigned' }, ipAddress,
  });

  return dept;
};

/**
 * Create a brand-new user account as HOD and assign them.
 * Previous HOD (if any) is downgraded to faculty and added to previousAdmins.
 */
export const createDeptAdmin = async ({ deptId, firstName, lastName, email, password, collegeId, performedBy, ipAddress }) => {
  const dept = await Department.findOne({ _id: deptId, collegeId });
  if (!dept) throw new NotFoundError('Department not found.');

  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) throw new ConflictError(`Email '${email}' is already registered.`);

  // Downgrade previous HOD to faculty and record history
  if (dept.adminUserId) {
    await User.findByIdAndUpdate(dept.adminUserId, { $set: { role: 'faculty' } });
    dept.previousAdmins.push({
      userId:    dept.adminUserId,
      removedAt: new Date(),
      removedBy: performedBy,
      reason:    'reassigned',
    });
  }

  const admin = await User.create({
    firstName, lastName, email: email.trim().toLowerCase(),
    passwordHash: password,
    role: 'deptAdmin',
    collegeId,
    departmentId: deptId,
    isVerified: true,
    isActive: true,
  });

  dept.adminUserId = admin._id;
  await dept.save();

  await AuditLog.record({
    action: AUDIT_ACTIONS.USER_CREATED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: admin._id, targetModel: 'User',
    metadata: { email, role: 'deptAdmin', deptId }, ipAddress,
  });

  await AuditLog.record({
    action: AUDIT_ACTIONS.DEPARTMENT_ADMIN_ASSIGNED, collegeId, performedBy,
    performedByRole: 'collegeAdmin', targetId: dept._id, targetModel: 'Department',
    metadata: { newAdminId: admin._id, action: 'created_and_assigned' }, ipAddress,
  });

  return { admin: admin.toSafeObject(), dept };
};

/**
 * List faculty eligible for HOD assignment:
 *  - Active faculty in this college
 *  - Previous HODs of this department (even if currently in other roles)
 * Excludes users already HOD of a different department.
 */
export const listAssignableFaculty = async ({ collegeId, deptId }) => {
  // All active faculty + deptAdmins in this college
  const allCandidates = await User.find({
    collegeId,
    role: { $in: ['faculty', 'deptAdmin'] },
    isActive: true,
  }).select('firstName lastName email role departmentId').lean();

  // Filter out users who are HOD of a *different* department
  const deptIdStr = deptId?.toString();
  const eligible = allCandidates.filter(u => {
    if (u.role !== 'deptAdmin') return true;
    // deptAdmin is eligible only if their dept is THIS dept
    return u.departmentId?.toString() === deptIdStr;
  });

  // Also include inactive previous HODs of this specific department
  // so the college admin can re-activate them
  const dept = deptId
    ? await Department.findOne({ _id: deptId, collegeId })
        .populate('previousAdmins.userId', 'firstName lastName email role isActive departmentId')
        .lean()
    : null;

  const previousHODIds = new Set(
    (dept?.previousAdmins ?? []).map(p => p.userId?._id?.toString() ?? p.userId?.toString())
  );
  const eligibleIds = new Set(eligible.map(u => u._id.toString()));

  // Merge: previous HODs not already in the list
  const previousHODs = (dept?.previousAdmins ?? [])
    .map(p => p.userId)
    .filter(u => u && !eligibleIds.has(u._id?.toString() ?? u.toString()))
    .map(u => ({ ...u, _isPreviousHOD: true }));

  return { users: eligible, previousHODs };
};

/**
 * Get the previous HODs list for a department (for display in UI).
 */
export const getPreviousAdmins = async ({ deptId, collegeId }) => {
  const dept = await Department
    .findOne({ _id: deptId, collegeId })
    .populate('previousAdmins.userId', 'firstName lastName email role isActive profileImage')
    .lean();
  if (!dept) throw new NotFoundError('Department not found.');

  return dept.previousAdmins ?? [];
};
