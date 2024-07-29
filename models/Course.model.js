// course.model.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    // required: true,
  },
  subTitle: {
    type: String,
    // required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    //required: true,
  },
  language: {
    type: String,
    //required: true,
  },
  level: {
    type: String,
    enum: ["beginner", "intermidiate", "advanced", "Proficient"],
  },
  // first page

  thumbnail: {
    type: String, // Assuming the image will be stored as a URL
    //required: true,
    default: "https://res.cloudinary.com/djcwvsuw1/image/upload/v1714917058/course/user-27920994-837a-4fb4-9cc1-989f5635ad03-1714917057677.jpeg.jpg"
  },
  videoTrailer: {
    type: String, // Assuming the video trailer will be stored as a URL
    //required: true,
    default: "https://res.cloudinary.com/djcwvsuw1/video/upload/v1717086147/course/user-2ab65b23-bb1d-447c-80ec-dc59c64d6a4b-1717086130374.jpeg.mp4"
  },
  courseDescription: {
    type: String,
    //required: true,
  },
  whatWillBeTaught: {
    type: String,
    //required: true,
  },
  targetAudience: {
    type: String,
    // required: true,
  },
  requirements: {
    type: String,
    //required: true,
  },
  // second page

  sections: [{
    type: mongoose.Types.ObjectId,
    ref: "Section"
  }],

  ratingsAverage: {
    type: Number,
    min: [0, "Rating must be above or equal 0.0"],
    max: [5, "Rating must be below or equal 5.0"],
    default : 0,
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  duration: {
    hours: {
      type: Number,
      default: 0,
    },
    minutes: {
      type: Number,
      default: 0,
    },
    seconds: {
      type: Number,
      default: 0,
    },
  },
  price: {
    amount: {
      type: String,
      default: "0",
    },
    currency: {
      type: String,
      enum: ["EGP", "USD"],
      default: "EGP",
    },
  },
  enrolledUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
    },
  ],
  publish: {
    type: Boolean,
    default: false,
  },
  compiler: {
    type: String,
  },
  spreadsheetlink: {
    type: String,
  },
  profits: {
    // ارباحه
    type: Number,
    default: 0,
  },
  ratings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
},
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

courseSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "courses",
  localField: "_id",
});

// Pre-find hook to populate category name
courseSchema.pre(/^find/, function (next) {
  this.populate("reviews");
  this.populate({
    path: "category",
    select: "name",
  });
  next();
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;