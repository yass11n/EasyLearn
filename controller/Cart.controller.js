const asyncHandler = require("express-async-handler");
const { 
  failure,
  recordNotFound, } = require("../utils/response/errors");
const { success } = require("../utils/response/response");
const Course = require("../models/Course.model");
const Coupon = require("../models/coupon.model");
const Cart = require("../models/Cart.model");


const calcTotalCartPrice = (cart) => {
  let totalPrice = 0;

  cart.cartItems.forEach((item) => {
    // Check if item.price is a valid number
    if (typeof item.price === "number" && !isNaN(item.price)) {
      totalPrice += item.price;
    } else {
      console.error("Invalid price for cart item:", item);
    }
  });
  return totalPrice;
};


// @desc    Add course to cart
// @route   POST /api/v1/cart
// @access  Private/User
const addCourseToCart = asyncHandler(async (req, res) => {
  // Find course by id
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  // Get Cart for logged user
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    // Create cart for logged user with product
    cart = await Cart.create({
      user: req.user._id,
      cartItems: [{ course: courseId, price: course.price }],
    });
  } else {
    // Check if the course already exists in the cart
    const existingCartItemIndex = cart.cartItems.findIndex(item => item.course.equals(courseId));

    if (existingCartItemIndex !== -1) {
      // Course already exists in the cart, return an error message
      const { body, statusCode } = failure({ message: "Course already in the cart" });
      return res.status(statusCode).json(body);
    }

    // Course not exist in cart, push product to cartItems array
    cart.cartItems.push({ course: courseId, price: course.price });
  }

  // Calculate total cart price
  calcTotalCartPrice(cart);

  // Save the cart
  await cart.save();

  // Prepare final response
  const { body, statusCode } = success({
    message: "Course added successfully",
    data: {
      cart,
      numOfCartItems: cart.cartItems.length,
    },
  });

  // Send the response
  res.status(statusCode).json(body);
});


// @desc    Get logged user cart
// @route   GET /api/v1/cart
// @access  Private/User
const getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(
      recordNotFound({
        message: `There is no cart for this user id : ${req.user._id}`,
      })
    );
  }

  res.success({
    numOfCartItems: cart.cartItems.length,
    data: {
      cart,
      numOfCartItems: cart.cartItems.length,
    },
  });
});


// @desc    Remove specific cart item
// @route   DELETE /api/v1/cart/:itemId
// @access  Private/User
const removeSpecificCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    {
      $pull: { cartItems: { _id: req.params.itemId } },
    },
    { new: true }
  );

  calcTotalCartPrice(cart);
  cart.save();

  const { statusCode, body } = success({
    message: "course removed successfully",
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
  res.status(statusCode).json(body);
});

// @desc    Apply coupon on logged user cart
// @route   PUT /api/v1/cart/applyCoupon
// @access  Private/User
const applyCoupon = asyncHandler(async (req, res, next) => {
  try {
    // 1) Get coupon based on coupon name
    const coupon = await Coupon.findOne({
      name: req.body.coupon,
      expire: { $gt: Date.now() },
    });

    if (!coupon) {
      return next(new recordNotFound(`Coupon is invalid or expired`));
    }

    // 2) Get logged user cart to get total cart price
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "cartItems.course"
    );

    // 3) Check if the coupon applies to all courses or a specific course
    let totalPrice = 0;
    if (coupon.appliesToAll) {
      // If coupon applies to all courses, calculate the total price of all courses in the cart
      totalPrice = cart.cartItems.reduce(
        (acc, item) => acc + item.course.price * item.quantity,
        0
      );
    } else {
      // If coupon applies to a specific course, find the course in the cart and calculate its price
      const courseItem = cart.cartItems.find(
        (item) => item.course._id.toString() === req.body.courseId
      );
      if (!courseItem) {
        return next(new recordNotFound(`Course not found in the cart`));
      }
      totalPrice = courseItem.course.price;
    }

    // 4) Calculate price after discount
    const totalPriceAfterDiscount = (
      totalPrice -
      (totalPrice * coupon.discount) / 100
    ).toFixed(2);

    cart.totalPriceAfterDiscount = totalPriceAfterDiscount;
    await cart.save();

    res.status(200).json({
      status: "success",
      numOfCartItems: cart.cartItems.length,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    claer logged user cart
// @route   Delete /api/v1/cart
// @access  Private/User
const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.status(204).send();
});

module.exports = {
  applyCoupon,
  clearCart,
  removeSpecificCartItem,
  getLoggedUserCart,
  addCourseToCart,
};
