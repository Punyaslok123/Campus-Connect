import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const SubjectSchema = new Schema(
  {
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },
    departmentId: {
      type:     Schema.Types.ObjectId,
      ref:      'Department',
      required: [true, 'departmentId is required'],
    },
    name: {
      type:      String,
      required:  [true, 'Subject name is required'],
      trim:      true,
      maxlength: 120,
    },
    code: {
      type:      String,
      trim:      true,
      default:   null,
      maxlength: 20,
    },
    semester: {
      type:     Number,
      required: [true, 'Semester is required'],
      min:      1,
      max:      8,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'subjects' }
);

SubjectSchema.index({ collegeId: 1, departmentId: 1, semester: 1 });
SubjectSchema.index({ collegeId: 1, departmentId: 1, code: 1 });

const Subject = model('Subject', SubjectSchema);
export default Subject;
