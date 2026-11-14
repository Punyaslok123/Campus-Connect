import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const AnnouncementSchema = new Schema(
  {
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    title: {
      type:      String,
      required:  [true, 'Title is required'],
      trim:      true,
      maxlength: 200,
    },

    body: {
      type:      String,
      required:  [true, 'Body is required'],
      trim:      true,
      maxlength: 5000,
    },

    // 'college' = visible to entire college; 'department' = scoped
    audience: {
      type:    String,
      enum:    ['college', 'department'],
      default: 'college',
    },

    departmentId: {
      type:    Schema.Types.ObjectId,
      ref:     'Department',
      default: null,
    },

    postedBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    isPinned: {
      type:    Boolean,
      default: false,
    },

    isDeleted: {
      type:    Boolean,
      default: false,
      select:  false,
    },

    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true, collection: 'announcements' }
);

AnnouncementSchema.index({ collegeId: 1, createdAt: -1 });
AnnouncementSchema.index({ collegeId: 1, audience: 1, createdAt: -1 });

AnnouncementSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

const Announcement = model('Announcement', AnnouncementSchema);
export default Announcement;
