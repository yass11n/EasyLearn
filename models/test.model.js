const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
  },
  choices: [
    {
      type: String,
    }
  ],
  correctAnswer: {
    type: Number,
  },
});

const testSchema = new mongoose.Schema({
  test: {
    type: [questionSchema],
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },
},
  { timestamps: true }
);

const Test = mongoose.model("Test", testSchema);

module.exports = Test;
